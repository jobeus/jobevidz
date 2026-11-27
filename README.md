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
- **🖼️ Automatic Thumbnails**: FFmpeg-powered thumbnail generation (720p) for all uploaded videos
- **🎬 HTML5 Player**: Cross-browser compatible video player with controls
- **📱 API Ready**: RESTful API designed for future mobile app integration
- **🎨 Modern UI**: Clean, responsive interface built with React

### Social Media Integration
- **📱 Open Graph Meta Tags**: Rich previews on Facebook, LinkedIn, Discord, Slack, and more
- **🐦 Twitter Card Support**: Twitter Player Card with embedded video player
- **🔗 oEmbed Support**: JSON and XML endpoints for automatic embed generation
- **🎥 Embeddable Player**: Dedicated `/embed/:shortId` route for iframe embedding
- **🤖 Crawler Detection**: Server-side meta tag injection for social media bots
- **🖼️ Rich Previews**: Thumbnails, titles, and descriptions in all shared links

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
│   ├── thumbnails/  # Auto-generated video thumbnails
│   ├── metadata/    # JSON metadata files
│   └── temp/        # Temporary downloads for URL uploads
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
cp ../.env.example ../.env   # the server reads .env from the checkout root
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

### Live (grizzly, auto-deploy on push)

Push to `main`: CI builds both halves, then POSTs an HMAC-signed request to
`https://deploy.jobe.wtf/jobevidz` (Actions secrets `DEPLOY_WEBHOOK_URL`,
`DEPLOY_WEBHOOK_SECRET`). That is deployd, grizzly's deploy agent (jobeus/jobepanel,
`servers/grizzly/deployd`): it checks the commit out into a new folder, runs
[`scripts/release-build.sh`](scripts/release-build.sh) there while the old version keeps serving, switches to it, restarts the app
and checks that `/health` answers. A failed build never touches the running version, and a
release that doesn't answer is switched back automatically.

On grizzly everything is under `/srv/apps/jobevidz`: `current` is the live release, and
`shared/` holds what outlives releases, linked into each one: `.env` (600), `client/.env`
(the client's build settings), `uploads/` (videos, thumbnails, metadata) and `data/`. The
unit is `app@jobevidz` (a template in jobepanel); it sets
`APP_SOCKET=/run/apps/jobevidz/app.sock` and the API listens there. Apache serves
`/srv/apps/jobevidz/current/client/dist` for vidz.jobe.wtf and proxies the API to the socket
(vhosts in jobepanel, `servers/grizzly/apache/sites-available/jobe.wtf.conf`).

```
deploy status               # what is live, on grizzly
deploy jobevidz               # deploy main by hand (or: deploy jobevidz <commit>)
deploy rollback jobevidz      # back to the release before
journalctl -u app@jobevidz -f       # app log;  journalctl -u deployd -f  for deploys
```

Thumbnails (1200×630 JPEG, padded to keep the aspect ratio) are made on upload. To create any that are missing, run `node server/dist/backfillThumbnails.js` (add `--dry-run` to preview) as jobe in the checkout; it is safe to re-run.

## 📡 Documentation

### API Documentation
See [API.md](./API.md) for complete API documentation including:
- Authentication endpoints
- Video upload (file and URL-based)
- Video management
- Health checks
- Rate limiting
- Error responses

### Social Media Sharing
See [SOCIAL_SHARING.md](./SOCIAL_SHARING.md) for comprehensive documentation on:
- Open Graph meta tags implementation
- oEmbed endpoints (JSON/XML)
- Embeddable video player
- Platform-specific behavior (Discord, Twitter, Facebook, etc.)
- Security considerations
- Troubleshooting guide

### Testing Guide
See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for step-by-step testing instructions:
- Quick start testing
- Social media platform testing
- Debug tools and validators
- Common issues and solutions
- Success criteria checklist

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

- ✅ ~~Video thumbnails generation~~ (Implemented!)
- ✅ ~~Social sharing integrations~~ (Implemented!)
- Video transcoding for multiple quality options
- User profiles and avatars
- Video comments and likes
- Search functionality
- Video playlists
- Mobile apps (iOS/Android)
- Analytics dashboard
- Video privacy settings (public/private/unlisted)
- Video preview clips (first 5-10 seconds)
- Custom thumbnail upload
- Animated GIF previews
- Closed captions/subtitles support

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
- **Process Manager**: systemd (`app@jobevidz`, a template unit in jobepanel → `start.sh`)
- **Reverse Proxy**: Apache on grizzly (TLS, static client, API on a unix socket)
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
├── scripts/
│   └── release-build.sh  # Install + build both halves (deployd runs it for each release)
├── deploy/jobevidz.service  # systemd unit on grizzly
├── start.sh              # Loads .env, builds, runs the API, relaunches on exit 42
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

**Service not starting (grizzly):**
```bash
journalctl -u jobevidz -n 100
sudo systemctl restart jobevidz
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

