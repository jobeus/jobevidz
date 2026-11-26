import * as YTDlpWrapModule from 'yt-dlp-wrap';
import path from 'path';
import fs from 'fs/promises';
import { nanoid } from 'nanoid';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';
import { convertToMp4, type Mp4Result } from './videoMetadata.js';

const YTDlpWrap = (YTDlpWrapModule as any).default.default;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMP_DIR = path.join(__dirname, '../../../uploads/temp');

/** Attempts per download. Rotating proxy IPs sometimes get YouTube's bot check; a new connection usually doesn't. */
const MAX_ATTEMPTS = 3;
const RETRYABLE = /not a bot|HTTP Error (403|429|5\d\d)|Unable to connect to proxy|timed out|Connection reset|Remote end closed/i;

/**
 * The proxy for one download attempt (read at call time, after dotenv.config() has run;
 * http(s):// or socks5:// both work). With YTDLP_PROXY_STICKY_PORTS (e.g. "10000-10099",
 * DataImpulse's sticky ports, each one a fixed exit IP) a random port from the range replaces
 * YTDLP_PROXY's port, so every connection of the attempt shares one IP (YouTube ties media URLs
 * to the IP that asked for them) and a retry gets a different one.
 */
function proxyForAttempt(): string | undefined {
  const proxy = process.env.YTDLP_PROXY;
  const range = process.env.YTDLP_PROXY_STICKY_PORTS?.match(/^(\d+)-(\d+)$/);
  if (!proxy || !range) return proxy;
  const [lo, hi] = [Number(range[1]), Number(range[2])];
  const port = lo + Math.floor(Math.random() * (hi - lo + 1));
  return proxy.replace(/:\d+(\/?)$/, `:${port}$1`);
}

/** yt-dlp arguments shared by every call, including the proxy if one is configured. */
function getCommonYtDlpArgs(): string[] {
  // YouTube needs a JS runtime to solve its download challenges (without one, downloads get
  // HTTP 403). yt-dlp only looks for deno by default; node is already on every server.
  const args = ['--js-runtimes', 'node'];
  const proxy = proxyForAttempt();
  if (proxy) args.push('--proxy', proxy);
  return args;
}

/** Replaces the user:password part of any URL in `text` (the proxy URL is in yt-dlp's command line). */
export function redactCredentials(text: string): string {
  const proxy = process.env.YTDLP_PROXY;
  if (proxy) text = text.split(proxy).join('<proxy>');
  // greedy up to the last @ before the host, so a password containing @ is covered too
  return text.replace(/([a-z][a-z0-9+.-]*:\/\/)[^\s/]*@/gi, '$1<redacted>@');
}

/**
 * The useful part of a failed yt-dlp call. The raw message is yt-dlp's whole command line
 * (proxy credentials included) plus every retry warning; keep yt-dlp's ERROR: line, redacted.
 */
function ytDlpErrorDetail(error: unknown): string {
  const raw = redactCredentials(error instanceof Error ? error.message : String(error));
  const errorLine = raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('ERROR:'))
    .pop();
  return (errorLine || raw)
    .replace(/^ERROR:\s*/, '')
    .replace(/; please report this issue on .*$/s, '')
    .replace(/\. Use --cookies.*$/s, '.')
    .slice(0, 400);
}

export async function initializeTempDirectory(): Promise<void> {
  await fs.mkdir(TEMP_DIR, { recursive: true });
}

export interface SourceInfo {
  title: string;
  description: string;
  uploader: string;
}

export interface DownloadedVideo {
  /** browser-playable mp4 in the temp folder; the caller moves it */
  filePath: string;
  source: SourceInfo;
  conversion: Mp4Result;
}

async function removeTempFiles(prefix: string): Promise<void> {
  const files = await fs.readdir(TEMP_DIR).catch(() => [] as string[]);
  await Promise.all(
    files.filter((f) => f.startsWith(prefix)).map((f) => fs.unlink(path.join(TEMP_DIR, f)).catch(() => {})),
  );
}

async function downloadOnce(url: string, tempId: string): Promise<DownloadedVideo> {
  const ytDlp = new YTDlpWrap();
  const base = path.join(TEMP_DIR, tempId);
  await ytDlp.execPromise([
    ...getCommonYtDlpArgs(),
    // Never fail on format choice: best video + best audio, else the best single file, else
    // video alone. -S only ranks (prefer H.264/AAC, which play everywhere and copy straight
    // into mp4); it never rules a format out. Merge into mkv, which holds any codec.
    '--format', 'bv*+ba/b/bv*',
    '-S', 'vcodec:h264,acodec:aac',
    '--merge-output-format', 'mkv',
    '--no-playlist',
    '--max-filesize', process.env.MAX_FILE_SIZE || '1073741824',
    '--write-info-json',
    '--output', `${base}.%(ext)s`,
    url,
  ]);

  const infoPath = `${base}.info.json`;
  const info = JSON.parse(await fs.readFile(infoPath, 'utf-8').catch(() => '{}'));
  await fs.unlink(infoPath).catch(() => {});
  const downloaded = (await fs.readdir(TEMP_DIR)).find(
    (f) => f.startsWith(`${tempId}.`) && !f.endsWith('.part') && !f.endsWith('.json'),
  );
  if (!downloaded) throw new Error('yt-dlp finished but no video file was written');

  // Whatever came down, make it a browser-playable mp4 (stream copy where possible).
  const downloadedPath = path.join(TEMP_DIR, downloaded);
  const mp4Path = `${base}.final.mp4`;
  const conversion = await convertToMp4(downloadedPath, mp4Path);
  await fs.unlink(downloadedPath).catch(() => {});

  return {
    filePath: mp4Path,
    conversion,
    source: {
      title: String(info.title || '').trim(),
      description: String(info.description || '').trim(),
      uploader: String(info.uploader || info.channel || '').trim(),
    },
  };
}

/**
 * Downloads the video at `url` with yt-dlp and converts it to mp4. Retries (each attempt is a
 * fresh proxy connection) when the failure looks like a blocked or flaky connection.
 * Errors are user-facing, with credentials redacted.
 */
export async function downloadVideoFromUrl(url: string): Promise<DownloadedVideo> {
  await initializeTempDirectory();
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const tempId = nanoid();
    try {
      const result = await downloadOnce(url, tempId);
      logger.info({ url, attempt, ...result.conversion }, 'URL video downloaded');
      return result;
    } catch (error) {
      lastError = error;
      await removeTempFiles(tempId);
      const detail = ytDlpErrorDetail(error);
      const retry = attempt < MAX_ATTEMPTS && RETRYABLE.test(detail);
      logger.warn({ url, attempt, retry, detail }, 'URL download attempt failed');
      if (!retry) break;
    }
  }
  throw new Error(ytDlpErrorDetail(lastError));
}
