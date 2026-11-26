import ffmpeg from 'fluent-ffmpeg';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
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

// Codecs that go into an MP4 as-is and play in current browsers. Anything else is re-encoded.
const MP4_VIDEO_CODECS = new Set(['h264', 'hevc', 'av1', 'vp9']);
const MP4_AUDIO_CODECS = new Set(['aac', 'mp3', 'opus']);
// 8-bit 4:2:0; other pixel formats (10-bit, 4:2:2, 4:4:4) won't play in most browsers as H.264.
const PLAYABLE_PIX_FMTS = new Set(['yuv420p', 'yuvj420p']);

interface ProbeStream {
  index: number;
  codec_type: string;
  codec_name?: string;
  pix_fmt?: string;
  disposition?: { attached_pic?: number };
}

export interface Mp4Result {
  /** what happened to each stream: 'copy' keeps the source bits, otherwise the encoder used */
  video: 'copy' | 'libx264';
  audio: 'copy' | 'aac' | 'none';
}

/**
 * Writes `inputPath` as a browser-playable MP4 at `outputPath`, changing as little as possible:
 * streams whose codec MP4 can hold are copied untouched (H.264/HEVC/AV1/VP9 video, AAC/MP3/Opus
 * audio); only the others are re-encoded, video as near-lossless H.264 (CRF 18) and audio as
 * 256k AAC. Keeps the first real video stream and the first audio stream, drops subtitles and
 * data, and moves the index to the front so playback starts before the whole file loads.
 * Throws if there is no video stream. `outputPath` may equal `inputPath`.
 */
export async function convertToMp4(inputPath: string, outputPath: string): Promise<Mp4Result> {
  const { stdout } = await execFileAsync(
    'ffprobe',
    ['-v', 'error', '-show_streams', '-of', 'json', inputPath],
    { maxBuffer: 16 * 1024 * 1024 },
  ).catch((err: Error & { stderr?: string }) => {
    throw new Error(`Not a readable video file: ${(err.stderr || err.message).trim()}`);
  });
  const streams: ProbeStream[] = JSON.parse(stdout).streams || [];
  const video = streams.find((s) => s.codec_type === 'video' && !s.disposition?.attached_pic);
  const audio = streams.find((s) => s.codec_type === 'audio');
  if (!video) throw new Error('No video stream found in file');

  const copyVideo =
    MP4_VIDEO_CODECS.has(video.codec_name || '') &&
    (video.codec_name !== 'h264' || PLAYABLE_PIX_FMTS.has(video.pix_fmt || ''));
  const copyAudio = !!audio && MP4_AUDIO_CODECS.has(audio.codec_name || '');
  const result: Mp4Result = {
    video: copyVideo ? 'copy' : 'libx264',
    audio: !audio ? 'none' : copyAudio ? 'copy' : 'aac',
  };

  const args = ['-hide_banner', '-loglevel', 'error', '-y', '-i', inputPath, '-map', `0:${video.index}`];
  if (audio) args.push('-map', `0:${audio.index}`);
  if (copyVideo) {
    args.push('-c:v', 'copy');
    if (video.codec_name === 'hevc') args.push('-tag:v', 'hvc1'); // Safari needs the hvc1 tag
  } else {
    args.push('-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p');
  }
  if (audio) args.push(...(copyAudio ? ['-c:a', 'copy'] : ['-c:a', 'aac', '-b:a', '256k']));
  // write beside the target first, so a failure never leaves a half-written file in its place
  const partial = `${outputPath}.partial.mp4`;
  args.push('-movflags', '+faststart', '-f', 'mp4', partial);

  try {
    await execFileAsync('ffmpeg', args, { maxBuffer: 16 * 1024 * 1024 });
    await fs.rename(partial, outputPath);
  } catch (err) {
    await fs.unlink(partial).catch(() => {});
    const e = err as Error & { stderr?: string };
    throw new Error(`Failed to convert video to mp4: ${(e.stderr || e.message).trim().slice(-500)}`);
  }
  return result;
}

/** True if ffprobe finds a real video stream (not just cover art) in the file. Fast: reads headers only. */
export async function hasVideoStream(filePath: string): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync(
      'ffprobe',
      ['-v', 'error', '-show_streams', '-of', 'json', filePath],
      { maxBuffer: 16 * 1024 * 1024 },
    );
    const streams: ProbeStream[] = JSON.parse(stdout).streams || [];
    return streams.some((s) => s.codec_type === 'video' && !s.disposition?.attached_pic);
  } catch {
    return false;
  }
}
