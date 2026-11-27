// Generates thumbnails for videos that have none (no thumbnailFilename, or the file is
// missing) and records them in each video's metadata. Safe to re-run.
// --regenerate remakes every thumbnail (e.g. after the thumbnail size changed) under a new
// filename, so link previews that cached the old image URL pick up the new one.
//
//   node server/dist/backfillThumbnails.js            # as the app user, from the checkout
//   node server/dist/backfillThumbnails.js --dry-run
//   node server/dist/backfillThumbnails.js --regenerate [--dry-run]
import fs from 'fs/promises';
import {
  deleteThumbnailFile,
  getAllVideoMetadata,
  getThumbnailPath,
  getVideoPath,
  writeVideoMetadata,
} from './utils/fileStorage.js';
import { generateThumbnail } from './utils/videoMetadata.js';

const dryRun = process.argv.includes('--dry-run');
const regenerate = process.argv.includes('--regenerate');

async function exists(file: string): Promise<boolean> {
  return fs.access(file).then(() => true, () => false);
}

let made = 0;
let failed = 0;
let skipped = 0;
for (const video of await getAllVideoMetadata()) {
  if (!regenerate && video.thumbnailFilename && (await exists(getThumbnailPath(video.thumbnailFilename)))) {
    skipped++;
    continue;
  }
  const videoPath = getVideoPath(video.filename);
  if (!(await exists(videoPath))) {
    console.error(`${video.id}: video file ${video.filename} missing, skipped`);
    failed++;
    continue;
  }
  const name = regenerate ? `${video.id}-${Date.now().toString(36)}.jpg` : `${video.id}.jpg`;
  if (dryRun) {
    console.log(`${video.id}: would create ${name} ("${video.title}")`);
    made++;
    continue;
  }
  try {
    await generateThumbnail(videoPath, name, Math.min(1, (video.duration || 0) * 0.1));
    await writeVideoMetadata(video.id, { ...video, thumbnailFilename: name });
    if (video.thumbnailFilename && video.thumbnailFilename !== name) {
      await deleteThumbnailFile(video.thumbnailFilename);
    }
    console.log(`${video.id}: created ${name} ("${video.title}")`);
    made++;
  } catch (err) {
    console.error(`${video.id}: ${(err as Error).message}`);
    failed++;
  }
}
console.log(`${dryRun ? 'would create' : 'created'} ${made}, already had one ${skipped}, failed ${failed}`);
process.exitCode = failed ? 1 : 0;
