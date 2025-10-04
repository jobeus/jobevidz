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
 * Generate a thumbnail from a video file
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
    ffmpeg(videoPath)
      .screenshots({
        timestamps: [timeInSeconds],
        filename: thumbnailFilename,
        folder: THUMBNAILS_DIR,
        size: '1280x720', // 720p thumbnail
      })
      .on('end', () => {
        resolve(thumbnailFilename);
      })
      .on('error', (err) => {
        reject(new Error(`Failed to generate thumbnail: ${err.message}`));
      });
  });
}

