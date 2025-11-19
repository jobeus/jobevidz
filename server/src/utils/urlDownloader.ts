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
  const args: string[] = [];

  // Read proxy from environment variable at runtime (after dotenv.config() has run)
  const YTDLP_PROXY = process.env.YTDLP_PROXY;

  if (YTDLP_PROXY) {
    args.push('--proxy', YTDLP_PROXY);
    logger.info({ proxy: YTDLP_PROXY }, 'Using proxy for yt-dlp');
  }

  return args;
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
    throw new Error(`Failed to extract metadata from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      '--format', 'best[ext=mp4]/best', // Prefer mp4, fallback to best available
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

    throw new Error(`Failed to download video: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    throw new Error(`Failed to get stream URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
