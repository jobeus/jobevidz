import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { nanoid } from 'nanoid';
import { fileURLToPath } from 'url';
import { authenticateToken } from '../middleware/auth.js';
import { AuthRequest, VideoMetadata, VideoMetadataUpdate } from '../types/index.js';
import {
  writeVideoMetadata,
  readVideoMetadata,
  getAllVideoMetadata,
  getVideoPath,
  deleteVideoFile,
  deleteVideoMetadata,
} from '../utils/fileStorage.js';
import { extractVideoMetadata } from '../utils/videoMetadata.js';
import {
  generateUniqueShortId,
  mapShortIdToVideoId,
  deleteShortIdMapping,
} from '../utils/idGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../../uploads/videos'),
  filename: (req, file, cb) => {
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
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'video/mp4',
      'video/quicktime',
      'video/x-matroska',
      'video/x-msvideo',
      'video/webm',
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video files are allowed.'));
    }
  },
});

// Upload video
router.post(
  '/upload',
  authenticateToken,
  upload.single('video'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No video file provided' });
        return;
      }

      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { title, description } = req.body;
      const videoId = nanoid();
      const shortId = await generateUniqueShortId();

      // Extract video metadata
      const filePath = req.file.path;
      const extractedMetadata = await extractVideoMetadata(filePath);

      // Create metadata object
      const metadata: VideoMetadata = {
        id: videoId,
        shortId,
        userId: req.user.userId,
        username: req.user.username,
        filename: req.file.filename,
        originalFilename: req.file.originalname,
        title: title || req.file.originalname,
        description: description || '',
        fileSize: req.file.size,
        duration: extractedMetadata.duration,
        width: extractedMetadata.width,
        height: extractedMetadata.height,
        format: extractedMetadata.format,
        codec: extractedMetadata.codec,
        uploadedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save metadata
      await writeVideoMetadata(videoId, metadata);
      await mapShortIdToVideoId(shortId, videoId);

      res.status(201).json({
        message: 'Video uploaded successfully',
        video: metadata,
        url: `/v/${shortId}`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Failed to upload video' });
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

    res.json({ videos: userVideos });
  } catch (error) {
    console.error('Error fetching user videos:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

// Get all videos by specific user (public)
router.get('/user/:username', async (req, res): Promise<void> => {
  try {
    const { username } = req.params;
    const allVideos = await getAllVideoMetadata();
    const userVideos = allVideos.filter(v => v.username === username);

    res.json({ videos: userVideos });
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

    res.json({ video: metadata });
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
      const updates: VideoMetadataUpdate = req.body;

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

      res.json({ video: updatedMetadata });
    } catch (error) {
      console.error('Error updating video:', error);
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

      // Delete video file, metadata, and short ID mapping
      await deleteVideoFile(metadata.filename);
      await deleteVideoMetadata(videoId);
      await deleteShortIdMapping(metadata.shortId);

      res.json({ message: 'Video deleted successfully' });
    } catch (error) {
      console.error('Error deleting video:', error);
      res.status(500).json({ error: 'Failed to delete video' });
    }
  }
);

export default router;

