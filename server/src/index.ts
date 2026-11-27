import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import { chmodSync, rmSync } from 'fs';
import authRoutes from './routes/auth.js';
import videoRoutes from './routes/videos.js';
import shortUrlRoutes from './routes/shortUrl.js';
import oembedRoutes from './routes/oembed.js';
import embedRoutes from './routes/embed.js';
import shareRoutes from './routes/share.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initializeDirectories } from './utils/fileStorage.js';
import { initializeTempDirectory } from './utils/urlDownloader.js';
import { logger } from './utils/logger.js';
import { resumeProcessing } from './utils/processing.js';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the checkout root (__dirname is server/dist). On grizzly start.sh has
// already exported it; values already in the environment win.
dotenv.config({ path: path.join(__dirname, '../../.env') });

const app = express();
// On grizzly the unit sets APP_SOCKET and Apache proxies to that unix socket.
const SOCKET = process.env.APP_SOCKET;
// Trust X-Forwarded-* only from a proxy on this machine (Apache in production). Without it,
// req.protocol is always "http" (share/embed/oEmbed URLs came out as http://) and req.ip is
// Apache's 127.0.0.1, so the rate limiter treated every visitor as one client. A unix
// socket has no peer address to check, and only Apache connects to it: trust that one hop.
app.set('trust proxy', SOCKET ? 1 : 'loopback');
const PORT = process.env.PORT || 3000;
// Bind address: loopback unless HOST says otherwise (Apache proxies to it on grizzly).
const HOST = process.env.HOST || '127.0.0.1';
const isProduction = process.env.NODE_ENV === 'production';

// Security middleware
app.use((req, res, next) => {
  // Allow embedding for /embed routes
  if (req.path.startsWith('/embed/')) {
    return next();
  }

  // Apply helmet for other routes
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow video streaming
    contentSecurityPolicy: false, // Disable CSP to allow embedding
  })(req, res, next);
});

// CORS configuration - restrict in production
const allowedOrigins = isProduction
  ? (process.env.ALLOWED_ORIGINS?.split(',') || ['https://yourdomain.com'])
  : ['http://localhost:5173', 'http://localhost:5174'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 100 : 1000, // Limit each IP to 100 requests per windowMs in production
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Body parsing middleware with size limits
// /api/share reads its own body (a raw video can arrive with any Content-Type, including the
// form type curl uses by default), so it goes before the global body parsers.
app.use('/api/share', shareRoutes);

app.use(express.json({ limit: '10mb' })); // Limit JSON payloads
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware to set proper MIME types for video files
app.use('/uploads/videos', (req, res, next) => {
  const ext = path.extname(req.path).toLowerCase();
  const mimeTypes: { [key: string]: string } = {
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.mkv': 'video/x-matroska',
    '.webm': 'video/webm',
    '.avi': 'video/x-msvideo',
    '.m4v': 'video/x-m4v',
  };

  if (mimeTypes[ext]) {
    res.setHeader('Content-Type', mimeTypes[ext]);
  }

  next();
});

// Serve uploaded videos and thumbnails statically
app.use('/uploads/videos', express.static(path.join(__dirname, '../../uploads/videos')));
app.use('/uploads/thumbnails', express.static(path.join(__dirname, '../../uploads/thumbnails')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/v', shortUrlRoutes);
app.use('/oembed', oembedRoutes);
app.use('/embed', embedRoutes);

// Enhanced health check
app.get('/health', async (_req, res) => {
  const health: any = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  };

  try {
    // Check FFmpeg
    try {
      await execAsync('ffmpeg -version');
      health.ffmpeg = 'available';
    } catch {
      health.ffmpeg = 'unavailable';
      health.status = 'degraded';
    }

    // Check yt-dlp
    try {
      await execAsync('yt-dlp --version');
      health.ytdlp = 'available';
    } catch {
      health.ytdlp = 'unavailable';
      health.status = 'degraded';
    }

    // Check disk space (uploads directory)
    try {
      const uploadsPath = path.join(__dirname, '../../uploads');
      const { stdout } = await execAsync(`du -sh ${uploadsPath}`);
      health.uploadsSize = stdout.split('\t')[0];
    } catch {
      health.uploadsSize = 'unknown';
    }

    // Check write permissions
    try {
      const uploadsPath = path.join(__dirname, '../../uploads/videos');
      const testFile = path.join(uploadsPath, '.write-test');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
      health.writePermissions = 'ok';
    } catch {
      health.writePermissions = 'failed';
      health.status = 'degraded';
    }

    res.json(health);
  } catch (error) {
    logger.error({ err: error }, 'Health check failed');
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

// Error handling
app.use(errorHandler);

// Initialize and start server
async function startServer() {
  try {
    await initializeDirectories();
    await initializeTempDirectory();
    logger.info('Directories initialized');
    await resumeProcessing();

    const started = () => {
      // Apache runs as another user and needs write access to connect.
      if (SOCKET) chmodSync(SOCKET, 0o666);
      logger.info({
        listen: SOCKET ? `unix:${SOCKET}` : `${HOST}:${PORT}`,
        environment: process.env.NODE_ENV || 'development',
        uploadsDir: path.join(__dirname, '../../uploads'),
        dataDir: path.join(__dirname, '../../data'),
      }, 'Server started successfully');
    };
    // (a socket left behind by a process that was killed would make listen fail)
    if (SOCKET) rmSync(SOCKET, { force: true });
    const server = SOCKET
      ? app.listen(SOCKET, started)
      : app.listen(Number(PORT), HOST as string, started);

    // Graceful shutdown
    const gracefulShutdown = (signal: string, exitCode = 0) => {
      logger.info({ signal }, 'Graceful shutdown initiated');

      server.close(() => {
        logger.info('HTTP server closed');
        logger.info('Process terminated gracefully');
        process.exit(exitCode);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(exitCode || 1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.fatal({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

startServer();

