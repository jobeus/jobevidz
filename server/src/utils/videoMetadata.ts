import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const THUMBNAILS_DIR = path.join(__dirname, '../../../uploads/thumbnails');

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
 * Generate a thumbnail from a video file optimized for Open Graph (1200x630)
 * Preserves aspect ratio and adds padding if necessary
 * @param videoPath - Path to the video file
 * @param thumbnailFilename - Desired filename for the thumbnail (e.g., 'abc123.jpg')
 * @param timeInSeconds - Time position in the video to capture (default: 1 second)
 * @returns Promise that resolves to the thumbnail filename
 */
export async function generateThumbnail(
  videoPath: string,
  thumbnailFilename: string,
  timeInSeconds: number = 1
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Open Graph recommended size: 1200x630 (1.905:1 aspect ratio)
    // We'll scale the video to fit within these dimensions while preserving aspect ratio
    // and add black padding (letterbox/pillarbox) if needed

    ffmpeg(videoPath)
      .screenshots({
        timestamps: [timeInSeconds],
        filename: thumbnailFilename,
        folder: THUMBNAILS_DIR,
        size: '1200x630',
        // Use 'contain' to preserve aspect ratio and add padding
        // This ensures the thumbnail is exactly 1200x630 with black bars if needed
      })
      .outputOptions([
        '-vf',
        'scale=1200:630:force_original_aspect_ratio=decrease,pad=1200:630:(ow-iw)/2:(oh-ih)/2:black'
      ])
      .on('end', () => {
        resolve(thumbnailFilename);
      })
      .on('error', (err) => {
        reject(new Error(`Failed to generate thumbnail: ${err.message}`));
      });
  });
}

