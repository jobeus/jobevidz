// Background processing for new videos. Upload and import requests create the video record
// (status 'processing') and return the short link at once; this queue then downloads (for
// links), converts to mp4, measures and thumbnails the video, and marks it 'ready' or 'failed'.
//
// ffmpeg and yt-dlp run as child processes, so the work never blocks the event loop; the
// concurrency limit only keeps the CPU from being swamped by several transcodes at once.
// Jobs live in the video records themselves, so ones cut off by a restart (a deploy, say)
// are picked up again at startup.
import fs from 'fs/promises';
import { getAllVideoMetadata, getVideoPath, readVideoMetadata, writeVideoMetadata, deleteVideoFile, deleteThumbnailFile } from './fileStorage.js';
import { convertToMp4, extractVideoMetadata, generateThumbnail } from './videoMetadata.js';
import { downloadVideoFromUrl, redactCredentials } from './urlDownloader.js';
import { logger } from './logger.js';
import type { VideoMetadata } from '../types/index.js';

import { nanoid } from 'nanoid';
import { generateUniqueShortId, mapShortIdToVideoId } from './idGenerator.js';

const CONCURRENCY = Number(process.env.PROCESSING_CONCURRENCY || 2);
const waiting: string[] = [];
const running = new Set<string>();

export function enqueueVideo(videoId: string): void {
  if (running.has(videoId) || waiting.includes(videoId)) return;
  waiting.push(videoId);
  pump();
}

function pump(): void {
  while (running.size < CONCURRENCY && waiting.length) {
    const videoId = waiting.shift()!;
    running.add(videoId);
    void processVideo(videoId).finally(() => {
      running.delete(videoId);
      pump();
    });
  }
}

/** Re-queues every video left 'processing' (e.g. by a restart mid-job). */
export async function resumeProcessing(): Promise<void> {
  const pending = (await getAllVideoMetadata()).filter((v: VideoMetadata) => v.status === 'processing');
  if (pending.length) logger.info({ count: pending.length }, 'Resuming video processing');
  for (const v of pending) enqueueVideo(v.id);
}

/** Removes everything a job produced for a video that was deleted while it ran. */
async function discardOutputs(video: VideoMetadata, thumbnail?: string): Promise<void> {
  await deleteVideoFile(video.filename);
  if (video.sourceFile && video.sourceFile !== video.filename) await deleteVideoFile(video.sourceFile);
  if (thumbnail) await deleteThumbnailFile(thumbnail);
}

async function processVideo(videoId: string): Promise<void> {
  const video: VideoMetadata | null = await readVideoMetadata(videoId);
  if (!video || video.status !== 'processing') return;
  const started = Date.now();
  const finalPath = getVideoPath(video.filename);
  let source = { title: '', description: '' };
  let thumbnailFilename: string | undefined;

  try {
    if (video.sourceUrl) {
      const downloaded = await downloadVideoFromUrl(video.sourceUrl);
      await fs.rename(downloaded.filePath, finalPath);
      source = downloaded.source;
    } else if (video.sourceFile) {
      const sourcePath = getVideoPath(video.sourceFile);
      const conversion = await convertToMp4(sourcePath, finalPath);
      if (video.sourceFile !== video.filename) await deleteVideoFile(video.sourceFile);
      logger.info({ videoId, ...conversion }, 'Upload converted to mp4');
    } else {
      throw new Error('Nothing to process');
    }

    const measured = await extractVideoMetadata(finalPath);
    const { size } = await fs.stat(finalPath);
    try {
      thumbnailFilename = await generateThumbnail(finalPath, `${videoId}.jpg`, Math.min(1, measured.duration * 0.1));
    } catch (error) {
      logger.error({ err: error, videoId }, 'Failed to generate thumbnail');
    }

    // Re-read: the owner may have renamed or deleted the video while it was processing.
    const current: VideoMetadata | null = await readVideoMetadata(videoId);
    if (!current) {
      await discardOutputs(video, thumbnailFilename);
      return;
    }
    const { sourceFile: _done, error: _none, ...rest } = current;
    await writeVideoMetadata(videoId, {
      ...rest,
      title: current.title || source.title || 'Untitled video',
      description: current.description || source.description.slice(0, 5000),
      fileSize: size,
      duration: measured.duration,
      width: measured.width,
      height: measured.height,
      format: 'mp4',
      codec: measured.codec,
      thumbnailFilename,
      status: 'ready',
      updatedAt: new Date().toISOString(),
    });
    logger.info({ videoId, seconds: Math.round((Date.now() - started) / 1000) }, 'Video ready');
  } catch (error) {
    const message = redactCredentials(error instanceof Error ? error.message : String(error));
    logger.error({ videoId, error: message }, 'Video processing failed');
    const current: VideoMetadata | null = await readVideoMetadata(videoId);
    if (!current) {
      await discardOutputs(video, thumbnailFilename);
      return;
    }
    await deleteVideoFile(video.filename).catch(() => {});
    if (video.sourceFile && video.sourceFile !== video.filename) await deleteVideoFile(video.sourceFile).catch(() => {});
    const { sourceFile: _gone, ...rest } = current;
    await writeVideoMetadata(videoId, {
      ...rest,
      title: current.title || 'Untitled video',
      status: 'failed',
      error: message,
      updatedAt: new Date().toISOString(),
    });
  }
}

/** A new video record that the processing queue will fill in. */
export async function createProcessingVideo(
  user: { userId: string; username: string },
  fields: { title: string; description: string; originalFilename: string; sourceUrl?: string; sourceFile?: string; fileSize?: number; filename: string },
): Promise<VideoMetadata> {
  const now = new Date().toISOString();
  const video: VideoMetadata = {
    id: nanoid(),
    shortId: await generateUniqueShortId(),
    userId: user.userId,
    username: user.username,
    filename: fields.filename,
    originalFilename: fields.originalFilename,
    title: fields.title,
    description: fields.description,
    fileSize: fields.fileSize || 0,
    duration: 0,
    width: 0,
    height: 0,
    format: 'mp4',
    codec: '',
    status: 'processing',
    sourceUrl: fields.sourceUrl,
    sourceFile: fields.sourceFile,
    uploadedAt: now,
    updatedAt: now,
  };
  await writeVideoMetadata(video.id, video);
  await mapShortIdToVideoId(video.shortId, video.id);
  enqueueVideo(video.id);
  return video;
}
