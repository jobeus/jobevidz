import ffmpeg from 'fluent-ffmpeg';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { getThumbnailPath } from './fileStorage.js';

const execFileAsync = promisify(execFile);

export interface ExtractedMetadata {
  duration: number;
  width: number;
  height: number;
  format: string;
  codec: string;
}

export async function extractVideoMetadata(filePath: string): Promise<ExtractedMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(new Error(`Failed to extract video metadata: ${err.message}`));
        return;
      }

      const videoStream = metadata.streams.find(s => s.codec_type === 'video');

      if (!videoStream) {
        reject(new Error('No video stream found in file'));
        return;
      }

      resolve({
        duration: metadata.format.duration || 0,
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        format: metadata.format.format_name || 'unknown',
        codec: videoStream.codec_name || 'unknown',
      });
    });
  });
}

/**
 * Generate a 1200x630 JPEG thumbnail (Open Graph size) from one frame of a video,
 * scaled to fit and padded with black so the aspect ratio is preserved.
 *
 * Runs ffmpeg directly: fluent-ffmpeg's screenshots() adds its own -filter_complex/-map,
 * which ffmpeg 8+ refuses to combine with this -vf ("Error opening output file").
 *
 * @param videoPath - Path to the video file
 * @param thumbnailFilename - Filename to write in the thumbnails folder (e.g. 'abc123.jpg')
 * @param timeInSeconds - Where in the video to take the frame
 * @returns The thumbnail filename
 */
export async function generateThumbnail(
  videoPath: string,
  thumbnailFilename: string,
  timeInSeconds: number = 1
): Promise<string> {
  await execFileAsync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-ss', String(Math.max(0, timeInSeconds)),
    '-i', videoPath,
    '-vf', 'scale=1200:630:force_original_aspect_ratio=decrease,pad=1200:630:(ow-iw)/2:(oh-ih)/2:black',
    '-frames:v', '1',
    '-q:v', '3',
    '-update', '1',
    getThumbnailPath(thumbnailFilename),
  ]).catch((err: Error & { stderr?: string }) => {
    throw new Error(`Failed to generate thumbnail: ${(err.stderr || err.message).trim()}`);
  });
  return thumbnailFilename;
}
