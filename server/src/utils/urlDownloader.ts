import * as YTDlpWrapModule from 'yt-dlp-wrap';

const YTDlpWrap = (YTDlpWrapModule as any).default.default;
import path from 'path';
import fs from 'fs/promises';
import { nanoid } from 'nanoid';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMP_DIR = path.join(__dirname, '../../../uploads/temp');
const VIDEOS_DIR = path.join(__dirname, '../../../uploads/videos');

/**
 * Get common yt-dlp arguments including proxy if configured
 */
function getCommonYtDlpArgs(): string[] {
  // YouTube now needs a JS runtime to solve its download challenges (without one, downloads
  // get HTTP 403). yt-dlp only looks for deno by default; node is already on every server.
  const args: string[] = ['--js-runtimes', 'node'];

  // Read proxy from environment variable at runtime (after dotenv.config() has run)
  const YTDLP_PROXY = process.env.YTDLP_PROXY;

  if (YTDLP_PROXY) {
    args.push('--proxy', YTDLP_PROXY);
    logger.info({ proxy: redactCredentials(YTDLP_PROXY) }, 'Using proxy for yt-dlp');
  }

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
 * A user-facing error for a failed yt-dlp call. The raw message is yt-dlp's whole command line
 * (proxy credentials included) plus every retry warning; keep yt-dlp's ERROR: line, redacted.
 */
function ytDlpError(what: string, error: unknown): Error {
  const raw = redactCredentials(error instanceof Error ? error.message : String(error));
  const errorLine = raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('ERROR:'))
    .pop();
  const detail = (errorLine || raw).replace(/; please report this issue on .*$/s, '').slice(0, 500);
  logger.warn({ detail }, what);
  return new Error(`${what}: ${detail}`);
}

// Ensure temp directory exists
export async function initializeTempDirectory(): Promise<void> {
  await fs.mkdir(TEMP_DIR, { recursive: true });
}

export interface UrlVideoMetadata {
  title: string;
  description: string;
  uploader: string;
  duration: number;
  width: number;
  height: number;
  format: string;
  originalUrl: string;
  thumbnailUrl?: string;
  uploadDate?: string;
}

export interface DownloadedVideo {
  tempFilePath: string;
  filename: string;
  metadata: UrlVideoMetadata;
}

/**
 * Extract metadata from a video URL without downloading
 */
export async function extractUrlMetadata(url: string): Promise<UrlVideoMetadata> {
  const ytDlp = new YTDlpWrap();

  try {
    // Get video info without downloading
    // Note: getVideoInfo internally calls yt-dlp, so we need to use execPromise with --dump-json instead
    const commonArgs = getCommonYtDlpArgs();
    const args = [...commonArgs, '--dump-json', '--no-playlist', url];

    const output = await ytDlp.execPromise(args);
    const info = JSON.parse(output);

    return {
      title: info.title || 'Untitled Video',
      description: info.description || '',
      uploader: info.uploader || info.channel || 'Unknown',
      duration: info.duration || 0,
      width: info.width || 0,
      height: info.height || 0,
      format: info.ext || 'mp4',
      originalUrl: url,
      thumbnailUrl: info.thumbnail,
      uploadDate: info.upload_date,
    };
  } catch (error) {
    throw ytDlpError('Failed to extract metadata from URL', error);
  }
}

/**
 * Download video from URL to temporary location
 */
export async function downloadVideoFromUrl(url: string): Promise<DownloadedVideo> {
  const ytDlp = new YTDlpWrap();
  const tempId = nanoid();

  try {
    // First get metadata
    const metadata = await extractUrlMetadata(url);

    // Create temp filename
    const tempFilename = `${tempId}.%(ext)s`;
    const tempFilePath = path.join(TEMP_DIR, tempFilename);

    // Get common args (including proxy if configured)
    const commonArgs = getCommonYtDlpArgs();

    // Download options
    const downloadOptions = [
      ...commonArgs,
      // Best H.264 video (plays everywhere) + AAC audio, up to 1080p, merged into one mp4 by
      // ffmpeg. Many sites (YouTube included) no longer offer a single combined file, which
      // the old 'best[ext=mp4]/best' required ("Requested format is not available").
      '--format', 'bv*[vcodec^=avc1][height<=1080]+ba[ext=m4a]/bv*[height<=1080]+ba/b[height<=1080]/b',
      '--merge-output-format', 'mp4',
      '--output', tempFilePath,
      '--no-playlist', // Only download single video
      '--max-filesize', '1G', // Respect 1GB limit
      url,
    ];

    // Download the video
    await ytDlp.execPromise(downloadOptions);

    // Find the actual downloaded file (yt-dlp replaces %(ext)s with actual extension)
    const tempDir = await fs.readdir(TEMP_DIR);
    const downloadedFile = tempDir.find(file => file.startsWith(tempId));

    if (!downloadedFile) {
      throw new Error('Downloaded file not found');
    }

    const actualTempFilePath = path.join(TEMP_DIR, downloadedFile);

    return {
      tempFilePath: actualTempFilePath,
      filename: downloadedFile,
      metadata,
    };
  } catch (error) {
    // Clean up any partial downloads
    try {
      const tempDir = await fs.readdir(TEMP_DIR);
      const partialFiles = tempDir.filter(file => file.startsWith(tempId));
      await Promise.all(partialFiles.map(file =>
        fs.unlink(path.join(TEMP_DIR, file)).catch(() => {})
      ));
    } catch {}

    throw ytDlpError('Failed to download video', error);
  }
}

/**
 * Normalize video format string
 */
export function normalizeVideoFormat(format: string): string {
  // If format contains mp4, normalize to mp4
  if (format.toLowerCase().includes('mp4')) {
    return 'mp4';
  }

  // Handle other common formats
  const formatMap: { [key: string]: string } = {
    'mov': 'mov',
    'mkv': 'mkv',
    'webm': 'webm',
    'avi': 'avi',
    'm4v': 'mp4', // Treat m4v as mp4
  };

  const lowerFormat = format.toLowerCase();
  for (const [key, value] of Object.entries(formatMap)) {
    if (lowerFormat.includes(key)) {
      return value;
    }
  }

  return format; // Return original if no match
}

/**
 * Move downloaded video from temp to final location
 */
export async function moveVideoToFinal(tempFilePath: string, format?: string): Promise<{ filename: string; fileSize: number; normalizedFormat: string }> {
  const finalId = nanoid();
  let ext = path.extname(tempFilePath);

  // Normalize format and extension if provided
  let normalizedFormat = format || ext.slice(1);
  if (format) {
    normalizedFormat = normalizeVideoFormat(format);
    // Update extension to match normalized format
    if (normalizedFormat === 'mp4' && ext !== '.mp4') {
      ext = '.mp4';
    }
  }

  const finalFilename = `${finalId}${ext}`;
  const finalPath = path.join(VIDEOS_DIR, finalFilename);

  try {
    // Get file size before moving
    const stats = await fs.stat(tempFilePath);
    const fileSize = stats.size;

    await fs.rename(tempFilePath, finalPath);
    return { filename: finalFilename, fileSize, normalizedFormat };
  } catch (error) {
    throw new Error(`Failed to move video to final location: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Clean up temporary file
 */
export async function cleanupTempFile(tempFilePath: string): Promise<void> {
  try {
    await fs.unlink(tempFilePath);
  } catch (error) {
    // Ignore cleanup errors
    logger.warn({ err: error, tempFilePath }, 'Failed to cleanup temp file');
  }
}

/**
 * Get video stream URL for preview (without downloading full video)
 */
export async function getVideoStreamUrl(url: string): Promise<string> {
  const ytDlp = new YTDlpWrap();

  try {
    // Get common args (including proxy if configured)
    const commonArgs = getCommonYtDlpArgs();
    const args = [...commonArgs, '--dump-json', '--no-playlist', url];

    const output = await ytDlp.execPromise(args);
    const info = JSON.parse(output);

    // Try to get a direct stream URL for preview
    if (info.url) {
      return info.url;
    }

    // Fallback to thumbnail if no direct stream
    if (info.thumbnail) {
      return info.thumbnail;
    }

    throw new Error('No preview URL available');
  } catch (error) {
    throw ytDlpError('Failed to get stream URL', error);
  }
}
