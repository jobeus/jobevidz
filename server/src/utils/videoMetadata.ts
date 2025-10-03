import ffmpeg from 'fluent-ffmpeg';

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

