import { Router, Request, Response } from 'express';
import { getVideoIdFromShortId } from '../utils/idGenerator.js';
import { readVideoMetadata } from '../utils/fileStorage.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * Generate embeddable video player HTML
 */
function generateEmbedHTML(
  video: any,
  baseUrl: string,
  videoUrl: string
): string {
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
  const shareUrl = `${baseUrl}/v/${video.shortId}`;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        background: #000;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      }
      
      .embed-container {
        position: relative;
        width: 100%;
        height: 100vh;
        display: flex;
        flex-direction: column;
        background: #000;
      }
      
      .video-wrapper {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #000;
      }
      
      video {
        width: 100%;
        height: 100%;
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }
      
      .video-info {
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .video-title {
        font-size: 14px;
        font-weight: 600;
        margin: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
      }
      
      .watch-link {
        color: #667eea;
        text-decoration: none;
        font-size: 13px;
        font-weight: 500;
        padding: 6px 12px;
        border-radius: 4px;
        background: rgba(102, 126, 234, 0.1);
        transition: background 0.2s;
        white-space: nowrap;
        margin-left: 12px;
      }
      
      .watch-link:hover {
        background: rgba(102, 126, 234, 0.2);
      }
      
      .error-message {
        color: white;
        text-align: center;
        padding: 2rem;
        font-size: 16px;
      }
    </style>
  </head>
  <body>
    <div class="embed-container">
      <div class="video-wrapper">
        <video 
          controls 
          autoplay 
          preload="metadata"
          controlsList="nodownload"
        >
          <source src="${videoUrl}" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
      <div class="video-info">
        <h1 class="video-title">${title}</h1>
        <a href="${shareUrl}" target="_blank" rel="noopener noreferrer" class="watch-link">
          Watch on JobeVidz
        </a>
      </div>
    </div>
  </body>
</html>`;
}

/**
 * Embed video player endpoint
 * Serves a minimal HTML page with just the video player for iframe embedding
 */
router.get('/:shortId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { shortId } = req.params;
    
    // Get video metadata
    const videoId = await getVideoIdFromShortId(shortId);
    if (!videoId) {
      res.status(404).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <title>Video Not Found</title>
            <style>
              body {
                background: #000;
                color: white;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
              }
              .error {
                text-align: center;
              }
            </style>
          </head>
          <body>
            <div class="error">
              <h1>Video Not Found</h1>
              <p>The video you're looking for doesn't exist.</p>
            </div>
          </body>
        </html>
      `);
      return;
    }

    const video = await readVideoMetadata(videoId);
    if (!video) {
      res.status(404).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <title>Video Not Found</title>
            <style>
              body {
                background: #000;
                color: white;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
              }
              .error {
                text-align: center;
              }
            </style>
          </head>
          <body>
            <div class="error">
              <h1>Video Not Found</h1>
              <p>The video you're looking for doesn't exist.</p>
            </div>
          </body>
        </html>
      `);
      return;
    }

    // Build URLs
    const protocol = req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;
    const videoUrl = `${baseUrl}/uploads/videos/${video.filename}`;

    // Generate and send embed HTML
    const html = generateEmbedHTML(video, baseUrl, videoUrl);
    
    // Set headers to allow embedding
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Frame-Options', 'ALLOWALL'); // Allow embedding in iframes
    res.setHeader('Content-Security-Policy', "frame-ancestors *"); // Allow embedding from any origin
    
    res.send(html);
    
    logger.info({ shortId }, 'Embed page served');
  } catch (error) {
    logger.error({ err: error, shortId: req.params.shortId }, 'Error serving embed page');
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Error</title>
          <style>
            body {
              background: #000;
              color: white;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
            }
            .error {
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>Error</h1>
            <p>Failed to load video.</p>
          </div>
        </body>
      </html>
    `);
  }
});

export default router;

