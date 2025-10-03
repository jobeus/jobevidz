# 🎥 JobeVidz - Video Upload & Sharing Platform

A modern, full-stack video upload and sharing platform built with Node.js, TypeScript, React, and Vite.

## ✨ Features

- **🔐 Secure Authentication**: User registration and login with bcrypt password hashing and JWT tokens
- **☁️ Video Upload**: Upload videos up to 1GB with real-time progress tracking
- **📹 Multiple Formats**: Support for MP4, MOV, MKV, and WebM video formats
- **🔗 Short URLs**: Automatically generated 5-character alphanumeric short URLs for easy sharing
- **📊 Metadata Extraction**: Automatic extraction of video metadata (resolution, duration, format, codec)
- **🎬 HTML5 Player**: Cross-browser compatible video player
- **📱 API Ready**: RESTful API designed for future mobile app integration
- **🎨 Modern UI**: Clean, responsive interface built with React

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

- Node.js 18+ and npm
- FFmpeg (for video metadata extraction)

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
PORT=3000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
MAX_FILE_SIZE=1073741824
```

**Client (.env):**
```env
VITE_API_URL=http://localhost:3000
```

### Running the Application

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

## 📡 API Documentation

### Authentication

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "string",
  "password": "string"
}
```

#### Verify Token
```http
GET /api/auth/verify
Authorization: Bearer <token>
```

### Videos

#### Upload Video
```http
POST /api/videos/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

video: <file>
title: string
description: string
```

#### Get My Videos
```http
GET /api/videos/my-videos
Authorization: Bearer <token>
```

#### Get User Videos (Public)
```http
GET /api/videos/user/:username
```

#### Get Video by ID
```http
GET /api/videos/:videoId
```

#### Update Video Metadata
```http
PATCH /api/videos/:videoId
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "string",
  "description": "string"
}
```

#### Delete Video
```http
DELETE /api/videos/:videoId
Authorization: Bearer <token>
```

### Short URLs

#### Get Video by Short ID
```http
GET /v/:shortId
```

## 🔒 Security Features

- **Password Hashing**: Bcrypt with 12 salt rounds
- **JWT Authentication**: Secure token-based authentication
- **Protected Routes**: Middleware to protect sensitive endpoints
- **File Validation**: Type and size validation for uploads
- **Ownership Checks**: Users can only modify/delete their own videos

## 🎯 Future Enhancements

- Video thumbnails generation
- Video transcoding for multiple quality options
- User profiles and avatars
- Video comments and likes
- Search functionality
- Mobile apps (iOS/Android)
- Social sharing integrations
- Analytics dashboard

## 🛠️ Technology Stack

**Backend:**
- Node.js
- Express.js
- TypeScript
- bcrypt (password hashing)
- jsonwebtoken (JWT auth)
- multer (file uploads)
- fluent-ffmpeg (video metadata)
- nanoid (short ID generation)

**Frontend:**
- React 18
- TypeScript
- Vite
- React Router
- Axios
- HTML5 Video

## 📝 License

ISC

## 👤 Author

Built with ❤️ for modern video sharing

