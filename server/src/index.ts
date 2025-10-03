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
import authRoutes from './routes/auth.js';
import videoRoutes from './routes/videos.js';
import shortUrlRoutes from './routes/shortUrl.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initializeDirectories } from './utils/fileStorage.js';
import { initializeTempDirectory } from './utils/urlDownloader.js';
import { logger } from './utils/logger.js';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow video streaming
}));

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
app.use(express.json({ limit: '10mb' })); // Limit JSON payloads
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded videos statically
app.use('/uploads/videos', express.static(path.join(__dirname, '../../uploads/videos')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/v', shortUrlRoutes);

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

    const server = app.listen(PORT, () => {
      logger.info({
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        uploadsDir: path.join(__dirname, '../../uploads'),
        dataDir: path.join(__dirname, '../../data'),
      }, 'Server started successfully');
    });

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      logger.info({ signal }, 'Graceful shutdown initiated');

      server.close(() => {
        logger.info('HTTP server closed');
        logger.info('Process terminated gracefully');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
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

