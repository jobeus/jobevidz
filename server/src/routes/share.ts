// POST /api/share: the one-call way in for scripts and the iOS share shortcut.
//
//   Authorization: Bearer vz_...            (a personal API key, or a signed-in token)
//   Content-Type: application/json         {"url": "https://...", "title"?: "..."}
//   Content-Type: text/plain               https://...
//   Content-Type: video/* (or anything)    the raw video file; optional X-Filename / X-Title headers
//   Content-Type: multipart/form-data      field "video" (plus optional "title")
//
// Replies 201 with the new video's short link as plain text (JSON with ?format=json), straight
// away: the video processes in the background and the link works meanwhile. Errors are plain
// text too, so a shortcut can show them as they are.
import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { createWriteStream } from 'fs';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';
import { nanoid } from 'nanoid';
import { fileURLToPath } from 'url';
import { authenticateToken } from '../middleware/auth.js';
import type { AuthRequest } from '../types/index.js';
import { getVideoPath, deleteVideoFile } from '../utils/fileStorage.js';
import { hasVideoStream } from '../utils/videoMetadata.js';
import { createProcessingVideo } from '../utils/processing.js';
import { logger } from '../utils/logger.js';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAX_BYTES = parseInt(process.env.MAX_FILE_SIZE || '1073741824');

const multipart = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, '../../../uploads/videos'),
    filename: (_req, file, cb) => cb(null, `${nanoid()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: MAX_BYTES },
});

const EXT_BY_TYPE: Record<string, string> = {
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/x-m4v': '.m4v',
  'video/webm': '.webm',
  'video/x-matroska': '.mkv',
  'video/x-msvideo': '.avi',
  'video/3gpp': '.3gp',
};

/** Where people open videos: the public site, not the API host. */
function publicBaseUrl(req: AuthRequest): string {
  return (
    process.env.PUBLIC_URL ||
    process.env.ALLOWED_ORIGINS?.split(',')[0]?.trim() ||
    `${req.protocol}://${req.get('host')}`
  ).replace(/\/$/, '');
}

function fail(res: Response, status: number, message: string): void {
  res.status(status).type('text/plain').send(`${message}\n`);
}

/** Streams the request body to the videos folder, refusing anything over the size limit. */
async function saveRawBody(req: AuthRequest, filename: string): Promise<number> {
  let bytes = 0;
  const counter = new Transform({
    transform(chunk: Buffer, _enc, done) {
      bytes += chunk.length;
      done(bytes > MAX_BYTES ? new Error('too large') : null, chunk);
    },
  });
  try {
    await pipeline(req, counter, createWriteStream(getVideoPath(filename)));
    return bytes;
  } catch (error) {
    await deleteVideoFile(filename);
    throw error;
  }
}

async function readText(req: AuthRequest): Promise<string> {
  let text = '';
  for await (const chunk of req) {
    text += chunk;
    if (text.length > 10_000) break;
  }
  return text;
}

router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const type = (req.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const reply = (shortId: string) => {
    const link = `${publicBaseUrl(req)}/v/${shortId}`;
    if (req.query.format === 'json') res.status(201).json({ url: link, shortId });
    else res.status(201).type('text/plain').send(link);
  };

  try {
    // A link
    if (type === 'application/json' || type === 'application/x-www-form-urlencoded' || type === 'text/plain') {
      const body = type === 'text/plain' ? { url: await readText(req) } : req.body || {};
      const raw = String(body.url || '').trim();
      const url = raw.match(/https?:\/\/\S+/)?.[0];
      if (!url) {
        fail(res, 400, 'Send a link starting with https://');
        return;
      }
      const video = await createProcessingVideo(user, {
        title: String(body.title || '').trim(),
        description: '',
        originalFilename: url,
        filename: `${nanoid()}.mp4`,
        sourceUrl: url,
      });
      logger.info({ userId: user.userId, viaApiKey: !!req.viaApiKey, shortId: video.shortId }, 'Share: link');
      reply(video.shortId);
      return;
    }

    // A file: multipart form, or the raw body
    let stored: string;
    let originalName: string;
    let size: number;
    let title = String(req.get('x-title') || '').trim();
    if (type === 'multipart/form-data') {
      await new Promise<void>((resolve, reject) => multipart.single('video')(req, res, (err) => (err ? reject(err) : resolve())));
      if (!req.file) {
        fail(res, 400, 'Send the video in a form field named "video".');
        return;
      }
      stored = req.file.filename;
      originalName = req.file.originalname;
      size = req.file.size;
      title = title || String(req.body?.title || '').trim();
    } else {
      originalName = path.basename(decodeURIComponent(String(req.get('x-filename') || ''))) || 'Shared video';
      const ext = path.extname(originalName) || EXT_BY_TYPE[type] || '.upload';
      stored = `${nanoid()}${ext}`;
      try {
        size = await saveRawBody(req, stored);
      } catch {
        fail(res, 413, 'That video is too big (the limit is 1 GB) or the upload was cut off.');
        return;
      }
    }

    if (!size || !(await hasVideoStream(getVideoPath(stored)))) {
      await deleteVideoFile(stored);
      fail(res, 400, "That doesn't look like a video. Share a video or a link to one.");
      return;
    }

    const video = await createProcessingVideo(user, {
      title: title || path.parse(originalName).name || 'Shared video',
      description: '',
      originalFilename: originalName,
      filename: `${path.parse(stored).name}.mp4`,
      sourceFile: stored,
      fileSize: size,
    });
    logger.info({ userId: user.userId, viaApiKey: !!req.viaApiKey, shortId: video.shortId, size }, 'Share: file');
    reply(video.shortId);
  } catch (error) {
    logger.error({ err: error, userId: user.userId }, 'Share failed');
    if (!res.headersSent) fail(res, 500, 'Something went wrong on the server. Try again.');
  }
});

// Anything other than POST gets a short usage note.
router.all('/', (_req, res) => {
  fail(res, 405, 'POST a link or a video here with your API key. See the Account page at vidz.jobe.wtf.');
});

export default router;
