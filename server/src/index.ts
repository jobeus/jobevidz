import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import videoRoutes from './routes/videos.js';
import shortUrlRoutes from './routes/shortUrl.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initializeDirectories } from './utils/fileStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded videos statically
app.use('/uploads/videos', express.static(path.join(__dirname, '../../uploads/videos')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/v', shortUrlRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// Initialize and start server
async function startServer() {
  try {
    await initializeDirectories();
    console.log('✅ Directories initialized');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📁 Uploads directory: ${path.join(__dirname, '../../uploads')}`);
      console.log(`📊 Data directory: ${path.join(__dirname, '../../data')}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

