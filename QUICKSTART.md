# Quick Start Guide

Get JobeVidz up and running in 5 minutes!

## Prerequisites

Make sure you have these installed:
- **Node.js 18+** - [Download here](https://nodejs.org/)
- **FFmpeg** - Required for video metadata extraction

### Install FFmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt install ffmpeg
```

**Windows:**
Download from [ffmpeg.org](https://ffmpeg.org/download.html) and add to PATH

## Installation

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd jobevidz

# Install all dependencies (root, server, and client)
npm run install:all
```

### 2. Configure Environment

The `.env` files are already created with default values. You can use them as-is for development.

**Optional:** Change the JWT secret in `server/.env` for better security:
```env
JWT_SECRET=your-custom-secret-here
```

### 3. Start the Application

**Option A: Run both server and client (recommended)**

Open two terminal windows:

Terminal 1 - Start the backend:
```bash
npm run dev:server
```

Terminal 2 - Start the frontend:
```bash
npm run dev:client
```

**Option B: Manual start**

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend (in a new terminal)
cd client
npm run dev
```

### 4. Open the Application

Once both are running, open your browser to:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000

## First Steps

### 1. Register an Account

1. Click "Register" in the navigation
2. Fill in:
   - Username (e.g., "johndoe")
   - Email (e.g., "john@example.com")
   - Password (minimum 8 characters)
3. Click "Register"

You'll be automatically logged in and redirected to your dashboard.

### 2. Upload Your First Video

1. Click "Upload" in the navigation
2. Drag and drop a video file (or click to browse)
   - Supported formats: MP4, MOV, MKV, WebM
   - Maximum size: 1GB
3. Add a title and description (optional)
4. Click "Upload Video"
5. Watch the progress bar as your video uploads
6. You'll be redirected to the video player page

### 3. View Your Videos

1. Click "My Videos" to see all your uploaded videos
2. From here you can:
   - View videos
   - Edit titles and descriptions
   - Delete videos
   - Copy share URLs

### 4. Share a Video

1. Open any video
2. Copy the short URL (e.g., `http://localhost:5173/v/aB3Xy`)
3. Share it with anyone - no login required to watch!

## Testing the API

You can test the API directly using curl or Postman:

### Register a User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

### Upload a Video
```bash
# Save the token from login response
TOKEN="your-jwt-token-here"

curl -X POST http://localhost:3000/api/videos/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "video=@/path/to/your/video.mp4" \
  -F "title=My Test Video" \
  -F "description=This is a test"
```

## Project Structure

```
jobevidz/
├── server/              # Backend API
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   ├── middleware/  # Auth & error handling
│   │   ├── utils/       # Helper functions
│   │   └── types/       # TypeScript types
│   └── .env             # Server configuration
├── client/              # Frontend app
│   ├── src/
│   │   ├── pages/       # Page components
│   │   ├── components/  # Reusable components
│   │   ├── services/    # API client
│   │   └── utils/       # Auth context
│   └── .env             # Client configuration
├── uploads/             # Uploaded videos
│   ├── videos/          # Video files
│   └── metadata/        # Video metadata JSON
└── data/                # User data and mappings
```

## Common Issues

### Port Already in Use

If port 3000 or 5173 is already in use:

**Change server port:**
Edit `server/.env`:
```env
PORT=3001
```

**Change client port:**
Edit `client/vite.config.ts` and add:
```typescript
export default defineConfig({
  server: {
    port: 5174
  }
})
```

### FFmpeg Not Found

Make sure FFmpeg is installed and in your PATH:
```bash
ffmpeg -version
```

If not found, install it using the instructions at the top of this guide.

### Upload Fails

Check:
1. File size is under 1GB
2. File format is supported (MP4, MOV, MKV, WebM)
3. Server has write permissions to `uploads/` directory
4. Enough disk space available

### Videos Won't Play

Make sure:
1. The video file exists in `uploads/videos/`
2. The backend server is running
3. Your browser supports the video format
4. Check browser console for errors

## Next Steps

- Read the full [README.md](README.md) for detailed information
- Check [API.md](API.md) for complete API documentation
- See [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment

## Development Tips

### Hot Reload

Both the server and client support hot reload:
- **Server:** Changes to TypeScript files automatically restart the server
- **Client:** Changes to React components instantly update in the browser

### Debugging

**Server logs:**
The server logs all requests and errors to the console.

**Client debugging:**
Use React DevTools browser extension for component inspection.

### Database

Currently using JSON files for simplicity. For production, consider:
- PostgreSQL or MongoDB for user data
- S3 or similar for video storage

## Support

If you encounter issues:
1. Check the console logs (both server and client)
2. Verify all prerequisites are installed
3. Make sure both server and client are running
4. Check the Common Issues section above

Happy video sharing! 🎥✨

