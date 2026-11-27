import { Router, Request, Response } from 'express';
import { getVideoIdFromShortId } from '../utils/idGenerator.js';
import { readVideoMetadata } from '../utils/fileStorage.js';
import { logger } from '../utils/logger.js';
import { thumbnailSize } from '../utils/videoMetadata.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Cache the client index.html template
let clientIndexTemplate: string | null = null;

async function getClientIndexTemplate(): Promise<string> {
  if (clientIndexTemplate) {
    return clientIndexTemplate;
  }

  // Path to the built client index.html
  const indexPath = path.join(__dirname, '../../../client/dist/index.html');

  try {
    clientIndexTemplate = await fs.readFile(indexPath, 'utf-8');
    return clientIndexTemplate;
  } catch (error) {
    logger.error({ err: error }, 'Failed to read client index.html');
    // Return a basic fallback
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>JobeVidz</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;
  }
}



/**
 * Generate meta tags to inject into the client HTML
 */
function generateMetaTags(
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
  const thumb = thumbnailSize(video.width, video.height);

  return `
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
    ${thumbnailUrl && thumb ? `<meta property="og:image:width" content="${thumb.width}" />` : ''}
    ${thumbnailUrl && thumb ? `<meta property="og:image:height" content="${thumb.height}" />` : ''}
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
  `;
}

// Link-preview fetchers (Discord, iMessage, Slack, ...). They read the page once and cache
// what they got, so a page fetched while the video is still processing leaves the link
// without a preview for good.
const PREVIEW_BOT = /bot\b|facebookexternalhit|facebot|slack|whatsapp|telegram|embedly|preview|skype|vkshare|pinterest|redditbot|mastodon/i;
// How long such a fetcher is kept waiting for a video to finish (most give up at ~10 s).
const PREVIEW_WAIT_MS = 8000;

/** Re-reads the video until it is ready (or failed), for at most PREVIEW_WAIT_MS. */
async function waitUntilProcessed(videoId: string) {
  const deadline = Date.now() + PREVIEW_WAIT_MS;
  let metadata = await readVideoMetadata(videoId);
  while (metadata?.status === 'processing' && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 400));
    metadata = await readVideoMetadata(videoId);
  }
  return metadata;
}

// Get video by short ID - returns HTML with meta tags by default, JSON if requested
router.get('/:shortId', async (req: Request<{ shortId: string }>, res: Response): Promise<void> => {
  try {
    const { shortId } = req.params;

    const videoId = await getVideoIdFromShortId(shortId);
    if (!videoId) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }

    let metadata = await readVideoMetadata(videoId);
    if (!metadata) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }

    // Check if JSON is explicitly requested via Accept header or query parameter
    const acceptHeader = req.get('accept') || '';
    const wantsJson = req.query.format === 'json' || acceptHeader.includes('application/json');

    // A link pasted the moment it was made reaches preview fetchers before the video is
    // ready (a shared Instagram link takes ~10 s to download): hold them a few seconds.
    if (!wantsJson && metadata.status === 'processing' && PREVIEW_BOT.test(req.get('user-agent') || '')) {
      const waited = await waitUntilProcessed(videoId);
      logger.info({ shortId, status: waited?.status }, 'Held a preview fetcher while the video was processing');
      if (waited) metadata = waited;
    }

    if (wantsJson) {
      // For API calls, return JSON
      logger.info({ shortId }, 'Serving JSON response');
      const { sourceFile: _internal, ...video } = metadata;
      res.json({ video });
      return;
    }

    // Still processing (or failed): no video to describe yet, so serve the plain app, which
    // shows the status. Crawlers get no preview rather than caching a broken one.
    if (metadata.status && metadata.status !== 'ready') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.send(await getClientIndexTemplate());
      return;
    }

    // Serve HTML with meta tags for everyone (crawlers AND browsers)
    const userAgent = req.get('user-agent') || '';
    logger.info({ shortId, userAgent }, 'Serving HTML with meta tags');

    // Build URLs
    const protocol = req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;
    const videoUrl = `${baseUrl}/uploads/videos/${metadata.filename}`;
    const thumbnailUrl = metadata.thumbnailFilename
      ? `${baseUrl}/uploads/thumbnails/${metadata.thumbnailFilename}`
      : null;

    // Get the client index.html template
    const clientHtml = await getClientIndexTemplate();

    // Generate meta tags
    const metaTags = generateMetaTags(metadata, baseUrl, videoUrl, thumbnailUrl);

    // Inject meta tags into the <head> section
    // Replace the existing <title> and inject our meta tags after <head>
    const htmlWithMeta = clientHtml.replace(
      /<head>/i,
      `<head>${metaTags}`
    ).replace(
      /<title>.*?<\/title>/i,
      '' // Remove the default title since we're injecting our own
    );

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(htmlWithMeta);
  } catch (error) {
    logger.error({ err: error, shortId: req.params.shortId }, 'Error resolving short URL');
    res.status(500).json({ error: 'Failed to resolve short URL' });
  }
});

export default router;

