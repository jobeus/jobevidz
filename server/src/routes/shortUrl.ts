import { Router, Request, Response } from 'express';
import { getVideoIdFromShortId } from '../utils/idGenerator.js';
import { readVideoMetadata } from '../utils/fileStorage.js';
import { logger } from '../utils/logger.js';

const router = Router();



/**
 * Generate HTML with Open Graph and Twitter Card meta tags for a video
 */
function generateVideoMetaHTML(
  video: any,
  baseUrl: string,
  videoUrl: string,
  thumbnailUrl: string | null
): string {
  const shareUrl = `${baseUrl}/v/${video.shortId}`;
  const embedUrl = `${baseUrl}/embed/${video.shortId}`;

  // Escape HTML entities in text content
  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const title = escapeHtml(video.title || 'Video');
  const description = escapeHtml(video.description || `Watch ${video.title} on JobeVidz`);
  const siteName = 'JobeVidz';

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <!-- Primary Meta Tags -->
    <title>${title}</title>
    <meta name="title" content="${title}" />
    <meta name="description" content="${description}" />

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="video.other" />
    <meta property="og:url" content="${shareUrl}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:site_name" content="${siteName}" />
    ${thumbnailUrl ? `<meta property="og:image" content="${thumbnailUrl}" />` : ''}
    ${thumbnailUrl ? `<meta property="og:image:secure_url" content="${thumbnailUrl}" />` : ''}
    ${thumbnailUrl ? `<meta property="og:image:type" content="image/jpeg" />` : ''}
    ${thumbnailUrl ? `<meta property="og:image:width" content="1200" />` : ''}
    ${thumbnailUrl ? `<meta property="og:image:height" content="630" />` : ''}
    ${thumbnailUrl ? `<meta property="og:image:alt" content="${title}" />` : ''}

    <!-- Video Meta Tags for Direct Playback (Discord, iMessage, etc.) -->
    <meta property="og:video" content="${videoUrl}" />
    <meta property="og:video:url" content="${videoUrl}" />
    <meta property="og:video:secure_url" content="${videoUrl}" />
    <meta property="og:video:type" content="video/mp4" />
    <meta property="og:video:width" content="${video.width}" />
    <meta property="og:video:height" content="${video.height}" />

    <!-- Additional video metadata -->
    <meta property="video:duration" content="${Math.floor(video.duration)}" />
    <meta property="video:release_date" content="${video.uploadedAt}" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="player" />
    <meta name="twitter:url" content="${shareUrl}" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    ${thumbnailUrl ? `<meta name="twitter:image" content="${thumbnailUrl}" />` : ''}
    ${thumbnailUrl ? `<meta name="twitter:image:alt" content="${title}" />` : ''}
    <meta name="twitter:player" content="${embedUrl}" />
    <meta name="twitter:player:width" content="${video.width}" />
    <meta name="twitter:player:height" content="${video.height}" />
    <meta name="twitter:player:stream" content="${videoUrl}" />
    <meta name="twitter:player:stream:content_type" content="video/mp4" />

    <!-- Apple/iMessage specific meta tags -->
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black" />
    <meta name="apple-mobile-web-app-title" content="${siteName}" />
    ${thumbnailUrl ? `<link rel="apple-touch-icon" href="${thumbnailUrl}" />` : ''}

    <!-- oEmbed Discovery -->
    <link rel="alternate" type="application/json+oembed"
          href="${baseUrl}/oembed?url=${encodeURIComponent(shareUrl)}&format=json"
          title="${title}" />
    <link rel="alternate" type="text/xml+oembed"
          href="${baseUrl}/oembed?url=${encodeURIComponent(shareUrl)}&format=xml"
          title="${title}" />

    <!-- Additional Meta -->
    <meta name="author" content="${escapeHtml(video.username)}" />
    <meta name="duration" content="${Math.floor(video.duration)}" />

    <!-- Canonical URL -->
    <link rel="canonical" href="${shareUrl}" />

    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        margin: 0;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      .container {
        text-align: center;
        padding: 2rem;
      }
      h1 {
        font-size: 2rem;
        margin-bottom: 1rem;
      }
      p {
        font-size: 1.2rem;
        opacity: 0.9;
      }
      .loading {
        margin-top: 2rem;
        font-size: 3rem;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="loading">🎬</div>
      <h1>${title}</h1>
      <p>Video preview for social media</p>
    </div>
  </body>
</html>`;
}

// Get video by short ID - returns HTML with meta tags by default, JSON if requested
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

    // Check if JSON is explicitly requested via Accept header or query parameter
    const acceptHeader = req.get('accept') || '';
    const wantsJson = req.query.format === 'json' || acceptHeader.includes('application/json');

    if (wantsJson) {
      // For API calls, return JSON
      logger.info({ shortId }, 'Serving JSON response');
      res.json({ video: metadata });
      return;
    }

    // Default: serve HTML with meta tags for everyone (crawlers, browsers, validators, etc.)
    const userAgent = req.get('user-agent');
    logger.info({ shortId, userAgent }, 'Serving HTML with meta tags');

    // Build URLs
    const protocol = req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;
    const videoUrl = `${baseUrl}/uploads/videos/${metadata.filename}`;
    const thumbnailUrl = metadata.thumbnailFilename
      ? `${baseUrl}/uploads/thumbnails/${metadata.thumbnailFilename}`
      : null;

    // Generate and send HTML with meta tags
    const html = generateVideoMetaHTML(metadata, baseUrl, videoUrl, thumbnailUrl);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    logger.error({ err: error, shortId: req.params.shortId }, 'Error resolving short URL');
    res.status(500).json({ error: 'Failed to resolve short URL' });
  }
});

export default router;

