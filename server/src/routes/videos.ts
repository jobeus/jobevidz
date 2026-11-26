import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { nanoid } from 'nanoid';
import { fileURLToPath } from 'url';
import { authenticateToken } from '../middleware/auth.js';
import { AuthRequest, VideoMetadata, VideoMetadataUpdate, UrlUploadRequest } from '../types/index.js';
import {
  writeVideoMetadata,
  readVideoMetadata,
  getAllVideoMetadata,
  deleteVideoFile,
  deleteVideoMetadata,
  deleteThumbnailFile,
} from '../utils/fileStorage.js';
import { hasVideoStream } from '../utils/videoMetadata.js';
import { enqueueVideo } from '../utils/processing.js';
import {
  generateUniqueShortId,
  mapShortIdToVideoId,
  deleteShortIdMapping,
} from '../utils/idGenerator.js';
import { logger, logVideoUpload, logVideoDelete } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../../uploads/videos'),
  filename: (_req, file, cb) => {
    const uniqueId = nanoid();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueId}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '1073741824'), // 1GB default
  },
  // Any video type the browser reports (some report .mkv/.flv as octet-stream). The upload
  // route then checks with ffprobe that there is a real video stream and converts to mp4.
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('video/') || file.mimetype === 'application/octet-stream') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video files are allowed.'));
    }
  },
});

/** What the API shows of a video: no server-side file paths. */
function publicVideo(video: VideoMetadata): Omit<VideoMetadata, 'sourceFile'> {
  const { sourceFile: _internal, ...rest } = video;
  return rest;
}

/** A new video record that the processing queue will fill in. */
async function createProcessingVideo(
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

// Upload a video file. Replies as soon as the file is stored; conversion runs in the background.
router.post(
  '/upload',
  authenticateToken,
  upload.single('video'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }
      if (!req.file) {
        res.status(400).json({ error: 'No video file provided' });
        return;
      }
      // Quick header check, so a non-video is refused now rather than failing later.
      if (!(await hasVideoStream(req.file.path))) {
        await deleteVideoFile(req.file.filename);
        res.status(400).json({ error: "That file doesn't contain a video we can read." });
        return;
      }

      const { title, description } = req.body;
      const video = await createProcessingVideo(req.user, {
        title: (title || '').trim() || path.parse(req.file.originalname).name,
        description: (description || '').trim(),
        originalFilename: req.file.originalname,
        filename: `${path.parse(req.file.filename).name}.mp4`,
        sourceFile: req.file.filename,
        fileSize: req.file.size,
      });

      logVideoUpload(video.id, req.user.userId, req.file.size);
      res.status(201).json({ message: 'Video uploaded; processing', video: publicVideo(video), url: `/v/${video.shortId}` });
    } catch (error) {
      logger.error({ err: error, userId: req.user?.userId }, 'Upload error');
      res.status(500).json({ error: 'Failed to upload video' });
    }
  }
);

// Import a video from a link (YouTube, Instagram, TikTok, ...). Replies at once with the new
// video's short link; the download and conversion run in the background.
router.post(
  '/url-upload',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }
      const { url, title, description }: UrlUploadRequest = req.body;
      let parsed: URL;
      try {
        parsed = new URL(String(url || '').trim());
        if (!/^https?:$/.test(parsed.protocol)) throw new Error('not http');
      } catch {
        res.status(400).json({ error: 'Enter a full link starting with https://' });
        return;
      }

      const video = await createProcessingVideo(req.user, {
        // empty until processing fills in the source's own title, unless one was given
        title: (title || '').trim(),
        description: (description || '').trim(),
        originalFilename: parsed.toString(),
        filename: `${nanoid()}.mp4`,
        sourceUrl: parsed.toString(),
      });

      res.status(201).json({ message: 'Import started', video: publicVideo(video), url: `/v/${video.shortId}` });
    } catch (error) {
      logger.error({ err: error, userId: req.user?.userId }, 'URL import error');
      res.status(500).json({ error: 'Failed to start the import' });
    }
  }
);

// Get all videos by authenticated user
router.get('/my-videos', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const allVideos = await getAllVideoMetadata();
    const userVideos = allVideos.filter(v => v.userId === req.user!.userId);

    res.json({ videos: userVideos.map(publicVideo) });
  } catch (error) {
    logger.error({ err: error, userId: req.user?.userId }, 'Error fetching user videos');
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

// Get all videos by specific user (public)
router.get('/user/:username', async (req, res): Promise<void> => {
  try {
    const { username } = req.params;
    const allVideos = await getAllVideoMetadata();
    const userVideos = allVideos.filter(v => v.username === username);

    res.json({ videos: userVideos.map(publicVideo) });
  } catch (error) {
    console.error('Error fetching user videos:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

// Get video metadata by ID
router.get('/:videoId', async (req, res): Promise<void> => {
  try {
    const { videoId } = req.params;
    const metadata = await readVideoMetadata(videoId);

    if (!metadata) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }

    res.json({ video: publicVideo(metadata) });
  } catch (error) {
    console.error('Error fetching video:', error);
    res.status(500).json({ error: 'Failed to fetch video' });
  }
});

// Update video metadata
router.patch(
  '/:videoId',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { videoId } = req.params;
      // Only these fields are editable. (This used to spread the whole request body into the
      // record, letting an owner overwrite filename/userId/status; a crafted filename then made
      // delete remove arbitrary files.)
      const body = (req.body || {}) as Record<string, unknown>;
      const updates: VideoMetadataUpdate = {};
      if (typeof body.title === 'string') updates.title = body.title.trim().slice(0, 200);
      if (typeof body.description === 'string') updates.description = body.description.slice(0, 5000);

      const metadata = await readVideoMetadata(videoId);
      if (!metadata) {
        res.status(404).json({ error: 'Video not found' });
        return;
      }

      // Check ownership
      if (metadata.userId !== req.user.userId) {
        res.status(403).json({ error: 'Not authorized to update this video' });
        return;
      }

      // Update metadata
      const updatedMetadata = {
        ...metadata,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await writeVideoMetadata(videoId, updatedMetadata);

      res.json({ video: publicVideo(updatedMetadata) });
    } catch (error) {
      logger.error({ err: error, videoId: req.params.videoId, userId: req.user?.userId }, 'Error updating video');
      res.status(500).json({ error: 'Failed to update video' });
    }
  }
);

// Delete video
router.delete(
  '/:videoId',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { videoId } = req.params;
      const metadata = await readVideoMetadata(videoId);

      if (!metadata) {
        res.status(404).json({ error: 'Video not found' });
        return;
      }

      // Check ownership
      if (metadata.userId !== req.user.userId) {
        res.status(403).json({ error: 'Not authorized to delete this video' });
        return;
      }

      // Delete video file, thumbnail, metadata, and short ID mapping
      await deleteVideoFile(metadata.filename);
      if (metadata.sourceFile && metadata.sourceFile !== metadata.filename) {
        await deleteVideoFile(metadata.sourceFile);
      }
      if (metadata.thumbnailFilename) {
        await deleteThumbnailFile(metadata.thumbnailFilename);
      }
      await deleteVideoMetadata(videoId);
      await deleteShortIdMapping(metadata.shortId);

      logVideoDelete(videoId, req.user.userId);
      res.json({ message: 'Video deleted successfully' });
    } catch (error) {
      logger.error({ err: error, videoId: req.params.videoId, userId: req.user?.userId }, 'Error deleting video');
      res.status(500).json({ error: 'Failed to delete video' });
    }
  }
);

export default router;

