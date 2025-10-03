# 🎥 JobeVidz - Video Upload & Sharing Platform

A modern, production-ready video upload and sharing platform built with Node.js, TypeScript, React, and Vite.

## ✨ Features

### Core Features
- **🔐 Secure Authentication**: User registration and login with bcrypt password hashing and JWT tokens
- **☁️ Video Upload**: Upload videos up to 1GB with real-time progress tracking
- **🌐 URL-Based Upload**: Download and upload videos from YouTube, Instagram, TikTok, and other platforms using yt-dlp
- **📹 Multiple Formats**: Support for MP4, MOV, MKV, AVI, and WebM video formats
- **🔗 Short URLs**: Automatically generated 5-character alphanumeric short URLs for easy sharing
- **📊 Metadata Extraction**: Automatic extraction of video metadata (resolution, duration, format, codec)
- **🎬 HTML5 Player**: Cross-browser compatible video player with controls
- **📱 API Ready**: RESTful API designed for future mobile app integration
- **🎨 Modern UI**: Clean, responsive interface built with React

### Production Features
- **🔒 Environment-Based CORS**: Hardcoded production domains for security
- **⚡ Rate Limiting**: 100 requests per 15 minutes in production (configurable)
- **📝 Production Logging**: Structured JSON logging with Pino for monitoring and debugging
- **🛡️ Security Headers**: Helmet middleware for comprehensive security
- **💾 Request Size Limits**: Configurable limits for JSON payloads and file uploads
- **🏥 Health Checks**: Comprehensive health endpoint with FFmpeg, yt-dlp, disk space, and write permission checks
- **🔄 Graceful Shutdown**: Proper SIGTERM/SIGINT handling for zero-downtime deployments

## 🏗️ Architecture

```
jobevidz/
├── server/          # Backend API (Node.js + Express + TypeScript)
│   ├── src/
│   │   ├── routes/      # API routes
│   │   ├── middleware/  # Auth & error handling
│   │   ├── utils/       # Helper functions
│   │   └── types/       # TypeScript types
│   └── package.json
├── client/          # Frontend (React + Vite + TypeScript)
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API client
│   │   ├── utils/       # Auth context
│   │   └── types/       # TypeScript types
│   └── package.json
├── uploads/         # Video files and metadata
│   ├── videos/      # Uploaded video files
│   └── metadata/    # JSON metadata files
└── data/            # User data and short URL mappings
```

## 🚀 Getting Started

### Prerequisites

- **Node.js 18+** and npm
- **FFmpeg** (for video metadata extraction)
- **yt-dlp** (for URL-based video downloads)

#### Install FFmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**Windows:**
Download from [ffmpeg.org](https://ffmpeg.org/download.html)

#### Install yt-dlp

**macOS:**
```bash
brew install yt-dlp
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install yt-dlp
```

**Windows:**
Download from [yt-dlp GitHub](https://github.com/yt-dlp/yt-dlp/releases)

### Installation

1. **Clone the repository:**
```bash
git clone <repository-url>
cd jobevidz
```

2. **Install server dependencies:**
```bash
cd server
npm install
cp .env.example .env
```

3. **Install client dependencies:**
```bash
cd ../client
npm install
cp .env.example .env
```

### Configuration

**Server (.env):**
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# File Upload
MAX_FILE_SIZE=1073741824  # 1GB in bytes

# Directories
UPLOAD_DIR=../uploads
DATA_DIR=../data

# Logging
LOG_LEVEL=info  # Options: trace, debug, info, warn, error, fatal
```

**Client (.env):**
```env
VITE_API_URL=http://localhost:3000
```

### Development

**Start the backend server:**
```bash
cd server
npm run dev
```
Server runs on http://localhost:3000

**Start the frontend (in a new terminal):**
```bash
cd client
npm run dev
```
Client runs on http://localhost:5173

**View logs:**
- Development logs are pretty-printed with colors
- Production logs are structured JSON for log aggregation tools

---

## 🚀 Production Deployment

### Build the Application

**Build server:**
```bash
cd server
npm run build
```

**Build client:**
```bash
cd client
npm run build
```

### Deploy with PM2

**Install PM2 globally:**
```bash
npm install -g pm2
```

**Start the application:**
```bash
# From project root
pm2 start ecosystem.config.js --env production
```

**Useful PM2 commands:**
```bash
# View logs
pm2 logs jobevidz-api

# Monitor
pm2 monit

# Restart
pm2 restart jobevidz-api

# Stop
pm2 stop jobevidz-api

# View status
pm2 status

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

### Production Environment Variables

**Server (.env):**
```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Authentication
JWT_SECRET=<generate-a-strong-random-secret>
JWT_EXPIRES_IN=7d

# File Upload
MAX_FILE_SIZE=1073741824

# Directories
UPLOAD_DIR=../uploads
DATA_DIR=../data

# Logging
LOG_LEVEL=info
```

**Production Domains:**
- Frontend: `https://vidz.jobe.wtf`
- API: `https://vidzapi.jobe.wtf`

These domains are hardcoded in the CORS configuration for security.

### Health Check

The application includes a comprehensive health check endpoint:

```bash
curl https://vidzapi.jobe.wtf/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-03T12:00:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "ffmpeg": "available",
  "ytdlp": "available",
  "uploadsSize": "1.2G",
  "writePermissions": "ok"
}
```

### Nginx Configuration

Example Nginx configuration for reverse proxy:

```nginx
# API Server
server {
    listen 80;
    server_name vidzapi.jobe.wtf;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Increase timeouts for large uploads
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # Increase max body size for video uploads
    client_max_body_size 1G;
}

# Frontend
server {
    listen 80;
    server_name vidz.jobe.wtf;

    root /var/www/jobevidz/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 📡 API Documentation

See [API.md](./API.md) for complete API documentation including:
- Authentication endpoints
- Video upload (file and URL-based)
- Video management
- Health checks
- Rate limiting
- Error responses

---

## 🔒 Security Features

- **Password Hashing**: Bcrypt with 12 salt rounds
- **JWT Authentication**: Secure token-based authentication with configurable expiration
- **Protected Routes**: Middleware to protect sensitive endpoints
- **File Validation**: Type and size validation for uploads
- **Ownership Checks**: Users can only modify/delete their own videos
- **CORS Protection**: Environment-based CORS with hardcoded production domains
- **Rate Limiting**: 100 requests per 15 minutes per IP in production
- **Security Headers**: Helmet middleware for comprehensive HTTP security headers
- **Request Size Limits**: 10MB for JSON payloads, 1GB for video uploads (configurable)
- **Input Validation**: Comprehensive validation on all user inputs

---

## 📊 Monitoring & Logging

### Structured Logging

The application uses **Pino** for high-performance structured logging:

- **Development**: Pretty-printed colored logs for easy debugging
- **Production**: Structured JSON logs for log aggregation tools

**Log Levels:**
- `trace`: Very detailed debugging information
- `debug`: Debugging information
- `info`: General informational messages (default in production)
- `warn`: Warning messages
- `error`: Error messages
- `fatal`: Fatal errors that cause application shutdown

**Configure log level:**
```env
LOG_LEVEL=info
```

### Log Aggregation

Production logs can be integrated with:
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Datadog
- New Relic
- Splunk
- CloudWatch Logs (AWS)
- Google Cloud Logging

### Health Monitoring

Use the `/health` endpoint for:
- Load balancer health checks
- Kubernetes liveness/readiness probes
- Monitoring tools (Pingdom, UptimeRobot)
- APM tools (Datadog, New Relic)

---

## 🎯 Future Enhancements

- Video thumbnails generation
- Video transcoding for multiple quality options
- User profiles and avatars
- Video comments and likes
- Search functionality
- Video playlists
- Mobile apps (iOS/Android)
- Social sharing integrations
- Analytics dashboard
- Video privacy settings (public/private/unlisted)

---

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js 5
- **Language**: TypeScript
- **Authentication**: bcrypt (password hashing), jsonwebtoken (JWT)
- **File Upload**: multer (multipart/form-data)
- **Video Processing**: fluent-ffmpeg (metadata extraction)
- **URL Downloads**: yt-dlp-wrap (YouTube, Instagram, TikTok, etc.)
- **ID Generation**: nanoid (short URLs)
- **Logging**: Pino (structured logging)
- **Security**: Helmet (security headers), express-rate-limit (rate limiting)

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Video Player**: HTML5 Video with custom controls

### Infrastructure
- **Process Manager**: PM2 (cluster mode, auto-restart)
- **Reverse Proxy**: Nginx (SSL termination, static files)
- **Storage**: File-based (videos, metadata, user data)

---

## 📁 Project Structure

```
jobevidz/
├── server/                 # Backend API
│   ├── src/
│   │   ├── routes/        # API route handlers
│   │   │   ├── auth.ts    # Authentication endpoints
│   │   │   ├── videos.ts  # Video upload/management
│   │   │   └── shortUrl.ts # Short URL resolution
│   │   ├── middleware/    # Express middleware
│   │   │   ├── auth.ts    # JWT authentication
│   │   │   └── errorHandler.ts # Global error handler
│   │   ├── utils/         # Utility functions
│   │   │   ├── auth.ts    # Auth helpers
│   │   │   ├── fileStorage.ts # File operations
│   │   │   ├── idGenerator.ts # Short ID generation
│   │   │   ├── logger.ts  # Pino logger setup
│   │   │   ├── urlDownloader.ts # yt-dlp integration
│   │   │   └── videoMetadata.ts # FFmpeg metadata
│   │   ├── types/         # TypeScript type definitions
│   │   └── index.ts       # Server entry point
│   ├── dist/              # Compiled JavaScript
│   └── package.json
├── client/                # Frontend React app
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API client
│   │   ├── utils/         # Auth context, helpers
│   │   └── types/         # TypeScript types
│   ├── dist/              # Production build
│   └── package.json
├── uploads/               # Uploaded files
│   ├── videos/           # Video files
│   ├── metadata/         # Video metadata JSON
│   └── temp/             # Temporary downloads
├── data/                  # Application data
│   ├── users.json        # User accounts
│   └── shortids.json     # Short URL mappings
├── scripts/               # Utility scripts
│   ├── backup.sh         # Backup script
│   ├── disk-monitor.sh   # Disk usage monitoring
│   ├── health-check.sh   # Health check script
│   └── update.sh         # Update script
├── ecosystem.config.js    # PM2 configuration
├── nginx.conf            # Nginx configuration
├── README.md             # This file
└── API.md                # API documentation
```

---

## 🧪 Testing

### Manual Testing

**Test health endpoint:**
```bash
curl http://localhost:3000/health
```

**Test rate limiting:**
```bash
# Send 101 requests quickly
for i in {1..101}; do curl http://localhost:3000/api/videos/my-videos; done
```

**Test video upload:**
```bash
# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'

# Upload video
curl -X POST http://localhost:3000/api/videos/upload \
  -H "Authorization: Bearer <token>" \
  -F "video=@test-video.mp4" \
  -F "title=Test Video" \
  -F "description=Test Description"
```

---

## 🐛 Troubleshooting

### Common Issues

**FFmpeg not found:**
```bash
# Verify FFmpeg installation
ffmpeg -version

# Install if missing (macOS)
brew install ffmpeg
```

**yt-dlp not found:**
```bash
# Verify yt-dlp installation
yt-dlp --version

# Install if missing (macOS)
brew install yt-dlp
```

**Port already in use:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

**Permission denied on uploads directory:**
```bash
# Fix permissions
chmod -R 755 uploads/
```

**PM2 not starting:**
```bash
# Check PM2 logs
pm2 logs jobevidz-api

# Restart PM2
pm2 restart jobevidz-api

# Delete and restart
pm2 delete jobevidz-api
pm2 start ecosystem.config.js --env production
```

---

## 📝 License

ISC

## 👤 Author

Built with ❤️ for modern video sharing

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## ⭐ Show Your Support

Give a ⭐️ if this project helped you!

