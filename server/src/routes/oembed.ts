import { Router, Request, Response } from 'express';
import { getVideoIdFromShortId } from '../utils/idGenerator.js';
import { readVideoMetadata } from '../utils/fileStorage.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * Generate oEmbed JSON response
 */
function generateOEmbedJSON(
  video: any,
  baseUrl: string,
  maxWidth?: number,
  maxHeight?: number
): any {
  const embedUrl = `${baseUrl}/embed/${video.shortId}`;
  const thumbnailUrl = video.thumbnailFilename 
    ? `${baseUrl}/uploads/thumbnails/${video.thumbnailFilename}`
    : undefined;

  // Calculate dimensions respecting maxWidth and maxHeight
  let width = video.width;
  let height = video.height;
  
  if (maxWidth && width > maxWidth) {
    height = Math.round((height * maxWidth) / width);
    width = maxWidth;
  }
  
  if (maxHeight && height > maxHeight) {
    width = Math.round((width * maxHeight) / height);
    height = maxHeight;
  }

  const embedHTML = `<iframe width="${width}" height="${height}" src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;

  return {
    version: '1.0',
    type: 'video',
    provider_name: 'JobeVidz',
    provider_url: baseUrl,
    title: video.title,
    author_name: video.username,
    author_url: `${baseUrl}/user/${video.username}`,
    width,
    height,
    html: embedHTML,
    thumbnail_url: thumbnailUrl,
    thumbnail_width: 1280,
    thumbnail_height: 720,
  };
}

/**
 * Generate oEmbed XML response
 */
function generateOEmbedXML(
  video: any,
  baseUrl: string,
  maxWidth?: number,
  maxHeight?: number
): string {
  const data = generateOEmbedJSON(video, baseUrl, maxWidth, maxHeight);
  
  const escapeXml = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  return `<?xml version="1.0" encoding="utf-8"?>
<oembed>
  <version>${data.version}</version>
  <type>${data.type}</type>
  <provider_name>${escapeXml(data.provider_name)}</provider_name>
  <provider_url>${escapeXml(data.provider_url)}</provider_url>
  <title>${escapeXml(data.title)}</title>
  <author_name>${escapeXml(data.author_name)}</author_name>
  <author_url>${escapeXml(data.author_url)}</author_url>
  <width>${data.width}</width>
  <height>${data.height}</height>
  <html>${escapeXml(data.html)}</html>
  ${data.thumbnail_url ? `<thumbnail_url>${escapeXml(data.thumbnail_url)}</thumbnail_url>` : ''}
  ${data.thumbnail_url ? `<thumbnail_width>${data.thumbnail_width}</thumbnail_width>` : ''}
  ${data.thumbnail_url ? `<thumbnail_height>${data.thumbnail_height}</thumbnail_height>` : ''}
</oembed>`;
}

/**
 * oEmbed endpoint
 * Supports both JSON and XML formats
 * 
 * Query parameters:
 * - url: The URL to get embed information for (required)
 * - format: Response format - 'json' or 'xml' (default: 'json')
 * - maxwidth: Maximum width of the embed (optional)
 * - maxheight: Maximum height of the embed (optional)
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { url, format = 'json', maxwidth, maxheight } = req.query;

    // Validate URL parameter
    if (!url || typeof url !== 'string') {
      res.status(400).json({ error: 'URL parameter is required' });
      return;
    }

    // Extract shortId from URL
    // Supports formats like: https://domain.com/v/abc123 or /v/abc123
    const urlMatch = url.match(/\/v\/([a-zA-Z0-9_-]+)/);
    if (!urlMatch) {
      res.status(404).json({ error: 'Invalid video URL' });
      return;
    }

    const shortId = urlMatch[1];

    // Get video metadata
    const videoId = await getVideoIdFromShortId(shortId);
    if (!videoId) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }

    const video = await readVideoMetadata(videoId);
    if (!video) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }

    // Build base URL
    const protocol = req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;

    // Parse max dimensions
    const maxWidth = maxwidth ? parseInt(maxwidth as string, 10) : undefined;
    const maxHeight = maxheight ? parseInt(maxheight as string, 10) : undefined;

    // Generate response based on format
    if (format === 'xml') {
      const xml = generateOEmbedXML(video, baseUrl, maxWidth, maxHeight);
      res.setHeader('Content-Type', 'text/xml; charset=utf-8');
      res.send(xml);
    } else {
      const json = generateOEmbedJSON(video, baseUrl, maxWidth, maxHeight);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.json(json);
    }

    logger.info({ shortId, format }, 'oEmbed request served');
  } catch (error) {
    logger.error({ err: error, url: req.query.url }, 'Error in oEmbed endpoint');
    res.status(500).json({ error: 'Failed to generate oEmbed response' });
  }
});

export default router;

