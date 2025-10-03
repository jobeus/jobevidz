import { Router, Request, Response } from 'express';
import { getVideoIdFromShortId } from '../utils/idGenerator.js';
import { readVideoMetadata } from '../utils/fileStorage.js';

const router = Router();

// Redirect short URL to video
router.get('/:shortId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { shortId } = req.params;
    
    const videoId = await getVideoIdFromShortId(shortId);
    if (!videoId) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }

    const metadata = await readVideoMetadata(videoId);
    if (!metadata) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }

    res.json({ video: metadata });
  } catch (error) {
    console.error('Error resolving short URL:', error);
    res.status(500).json({ error: 'Failed to resolve short URL' });
  }
});

export default router;

