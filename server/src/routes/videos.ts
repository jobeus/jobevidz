import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { nanoid } from 'nanoid';
import { fileURLToPath } from 'url';
import { authenticateToken } from '../middleware/auth.js';
import { AuthRequest, VideoMetadata, VideoMetadataUpdate, UrlPreviewResponse, UrlUploadRequest } from '../types/index.js';
import {
  writeVideoMetadata,
  readVideoMetadata,
  getAllVideoMetadata,
  getVideoPath,
  deleteVideoFile,
  deleteVideoMetadata,
  deleteThumbnailFile,
} from '../utils/fileStorage.js';
import { extractVideoMetadata, generateThumbnail } from '../utils/videoMetadata.js';
import {
  generateUniqueShortId,
  mapShortIdToVideoId,
  deleteShortIdMapping,
} from '../utils/idGenerator.js';
import {
  downloadVideoFromUrl,
  moveVideoToFinal,
  cleanupTempFile,
  initializeTempDirectory,
} from '../utils/urlDownloader.js';
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
  fileFilter: (_req, file, cb) => {
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

      // Generate thumbnail
      let thumbnailFilename: string | undefined;
      try {
        const thumbnailName = `${videoId}.jpg`;
        // Generate thumbnail at 1 second or 10% of duration, whichever is smaller
        const thumbnailTime = Math.min(1, extractedMetadata.duration * 0.1);
        thumbnailFilename = await generateThumbnail(filePath, thumbnailName, thumbnailTime);
      } catch (error) {
        logger.warn({ err: error, videoId }, 'Failed to generate thumbnail');
        // Continue without thumbnail
      }

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
        thumbnailFilename,
        uploadedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save metadata
      await writeVideoMetadata(videoId, metadata);
      await mapShortIdToVideoId(shortId, videoId);

      logVideoUpload(videoId, req.user.userId, req.file.size);
      res.status(201).json({
        message: 'Video uploaded successfully',
        video: metadata,
        url: `/v/${shortId}`,
      });
    } catch (error) {
      logger.error({ err: error, userId: req.user?.userId }, 'Upload error');
      res.status(500).json({ error: 'Failed to upload video' });
    }
  }
);

// Store for temporary downloads (in production, use Redis or database)
const tempDownloads = new Map<string, { filePath: string; metadata: any; timestamp: number; userId: string }>();

// Cleanup old temp downloads (older than 1 hour)
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [previewId, data] of tempDownloads.entries()) {
    if (data.timestamp < oneHourAgo) {
      cleanupTempFile(data.filePath).catch(console.error);
      tempDownloads.delete(previewId);
    }
  }
}, 15 * 60 * 1000); // Run every 15 minutes

// Preview video from URL
router.post(
  '/url-preview',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { url } = req.body;
      if (!url || typeof url !== 'string') {
        res.status(400).json({ error: 'URL is required' });
        return;
      }

      // Initialize temp directory
      await initializeTempDirectory();

      // Download video to temp location (this also extracts metadata)
      const downloadResult = await downloadVideoFromUrl(url);

      // Generate preview ID
      const previewId = nanoid();

      // Store temp download info with user ID for access control
      tempDownloads.set(previewId, {
        filePath: downloadResult.tempFilePath,
        metadata: downloadResult.metadata,
        timestamp: Date.now(),
        userId: req.user.userId,
      });

      // Build absolute URL for video streaming
      // Must use API_BASE_URL env variable to ensure correct domain
      const baseUrl = process.env.API_BASE_URL;
      if (!baseUrl) {
        throw new Error('API_BASE_URL environment variable is not set');
      }

      const response: UrlPreviewResponse = {
        metadata: downloadResult.metadata,
        previewId,
        streamUrl: `${baseUrl}/api/videos/temp/${previewId}`,
      };

      res.json(response);
    } catch (error) {
      console.error('URL preview error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to preview video from URL'
      });
    }
  }
);

// Serve temporary video for preview
// Note: This route does NOT require authentication because <video> tags can't send auth headers
// Instead, we rely on the previewId being a secure random token that's hard to guess
router.get('/temp/:previewId', async (req, res): Promise<void> => {
  try {
    const { previewId } = req.params;
    const tempData = tempDownloads.get(previewId);

    if (!tempData) {
      res.status(404).send('Preview not found or expired');
      return;
    }

    // Check if file exists
    try {
      await fs.access(tempData.filePath);
    } catch {
      res.status(404).send('Video file not found');
      return;
    }

    // Set appropriate headers for video streaming
    const stat = await fs.stat(tempData.filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Handle range requests for video streaming
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;

      res.status(206);
      res.set({
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize.toString(),
        'Content-Type': 'video/mp4',
      });

      // Stream the requested range
      const stream = (await import('fs')).createReadStream(tempData.filePath, { start, end });
      stream.pipe(res);
    } else {
      // Serve entire file
      res.set({
        'Content-Length': fileSize.toString(),
        'Content-Type': 'video/mp4',
      });

      const stream = (await import('fs')).createReadStream(tempData.filePath);
      stream.pipe(res);
    }
  } catch (error) {
    logger.error({ err: error, previewId: req.params.previewId }, 'Temp video serve error');
    res.status(500).send('Failed to serve video');
  }
});

// Upload video from URL (finalize)
router.post(
  '/url-upload',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { previewId, title, description }: UrlUploadRequest = req.body;

      if (!previewId || !title) {
        res.status(400).json({ error: 'Preview ID and title are required' });
        return;
      }

      // Get temp download info
      const tempData = tempDownloads.get(previewId);
      if (!tempData) {
        res.status(404).json({ error: 'Preview not found or expired' });
        return;
      }

      // Move video to final location
      const { filename: finalFilename, fileSize, normalizedFormat } = await moveVideoToFinal(tempData.filePath, tempData.metadata.format);

      // Extract video metadata using FFmpeg
      const finalPath = getVideoPath(finalFilename);
      const extractedMetadata = await extractVideoMetadata(finalPath);

      // Generate IDs
      const videoId = nanoid();
      const shortId = await generateUniqueShortId();

      // Generate thumbnail
      let thumbnailFilename: string | undefined;
      try {
        const thumbnailName = `${videoId}.jpg`;
        const duration = extractedMetadata.duration || tempData.metadata.duration;
        const thumbnailTime = Math.min(1, duration * 0.1);
        thumbnailFilename = await generateThumbnail(finalPath, thumbnailName, thumbnailTime);
      } catch (error) {
        logger.warn({ err: error, videoId }, 'Failed to generate thumbnail');
        // Continue without thumbnail
      }

      // Create metadata object
      const metadata: VideoMetadata = {
        id: videoId,
        shortId,
        userId: req.user.userId,
        username: req.user.username,
        filename: finalFilename,
        originalFilename: `${tempData.metadata.title}.${tempData.metadata.format}`,
        title: title,
        description: description || tempData.metadata.description || '',
        fileSize: fileSize,
        duration: extractedMetadata.duration || tempData.metadata.duration,
        width: extractedMetadata.width || tempData.metadata.width,
        height: extractedMetadata.height || tempData.metadata.height,
        format: normalizedFormat,
        codec: extractedMetadata.codec,
        thumbnailFilename,
        uploadedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save metadata
      await writeVideoMetadata(videoId, metadata);
      await mapShortIdToVideoId(shortId, videoId);

      // Clean up temp data
      tempDownloads.delete(previewId);

      res.status(201).json({
        message: 'Video uploaded successfully from URL',
        video: metadata,
        url: `/v/${shortId}`,
      });
    } catch (error) {
      console.error('URL upload error:', error);
      res.status(500).json({ error: 'Failed to upload video from URL' });
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

