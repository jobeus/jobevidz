# JobeVidz API Documentation

## Base URLs

- **Development**: `http://localhost:3000`
- **Production API**: `https://vidzapi.jobe.wtf`
- **Production Frontend**: `https://vidz.jobe.wtf`

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

Tokens are obtained through the `/api/auth/register` or `/api/auth/login` endpoints and are valid for 7 days by default (configurable via `JWT_EXPIRES_IN` environment variable).

### Register User

Create a new user account.

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:** `201 Created`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "abc123",
    "username": "johndoe",
    "email": "john@example.com",
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**Validation:**
- Username, email, and password are required
- Password must be at least 8 characters
- Username and email must be unique

---

### Login

Authenticate an existing user.

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "username": "johndoe",
  "password": "securepassword123"
}
```

**Response:** `200 OK`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "abc123",
    "username": "johndoe",
    "email": "john@example.com",
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
}
```

---

### Verify Token

Verify if a token is still valid and get user information.

**Endpoint:** `GET /api/auth/verify`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": "abc123",
    "username": "johndoe",
    "email": "john@example.com",
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
}
```

---

## Videos

### Upload Video

Upload a new video file with metadata.

**Endpoint:** `POST /api/videos/upload`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `video` (file, required): Video file (max 1GB)
- `title` (string, required): Video title
- `description` (string, optional): Video description

**Supported Formats:**
- MP4 (video/mp4)
- MOV (video/quicktime)
- MKV (video/x-matroska)
- AVI (video/x-msvideo)
- WebM (video/webm)

**Response:** `201 Created`
```json
{
  "message": "Video uploaded successfully",
  "video": {
    "id": "video123",
    "shortId": "aB3Xy",
    "userId": "abc123",
    "username": "johndoe",
    "filename": "xyz789.mp4",
    "originalFilename": "my-video.mp4",
    "title": "My Awesome Video",
    "description": "This is a great video",
    "fileSize": 52428800,
    "duration": 120.5,
    "width": 1920,
    "height": 1080,
    "format": "mov,mp4,m4a,3gp,3g2,mj2",
    "codec": "h264",
    "uploadedAt": "2025-01-15T10:35:00.000Z",
    "updatedAt": "2025-01-15T10:35:00.000Z"
  },
  "url": "/v/aB3Xy"
}
```

---

### Preview Video from URL

Preview a video from a URL (YouTube, Instagram, TikTok, etc.) before uploading.

**Endpoint:** `POST /api/videos/url-preview`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

**Response:** `200 OK`
```json
{
  "previewId": "abc123xyz",
  "metadata": {
    "title": "Video Title",
    "description": "Video description from source",
    "uploader": "Channel Name",
    "duration": 212,
    "width": 1920,
    "height": 1080,
    "format": "mp4",
    "originalUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "thumbnailUrl": "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    "uploadDate": "20091025"
  },
  "streamUrl": "/api/videos/temp/abc123xyz"
}
```

**Supported Platforms:**
- YouTube
- Instagram
- TikTok
- Twitter/X
- Facebook
- Vimeo
- And many more (powered by yt-dlp)

**Notes:**
- The video is downloaded to a temporary location
- Preview data expires after 1 hour
- Use the `previewId` to finalize the upload

---

### Upload Video from URL (Finalize)

Finalize the upload of a previewed video.

**Endpoint:** `POST /api/videos/url-upload`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "previewId": "abc123xyz",
  "title": "My Video Title",
  "description": "Optional description"
}
```

**Response:** `201 Created`
```json
{
  "message": "Video uploaded successfully from URL",
  "video": {
    "id": "video123",
    "shortId": "aB3Xy",
    "userId": "abc123",
    "username": "johndoe",
    "filename": "xyz789.mp4",
    "originalFilename": "Video Title.mp4",
    "title": "My Video Title",
    "description": "Optional description",
    "fileSize": 52428800,
    "duration": 212,
    "width": 1920,
    "height": 1080,
    "format": "mov,mp4,m4a,3gp,3g2,mj2",
    "codec": "h264",
    "uploadedAt": "2025-01-15T10:35:00.000Z",
    "updatedAt": "2025-01-15T10:35:00.000Z"
  },
  "url": "/v/aB3Xy"
}
```

**Validation:**
- `previewId` must be valid and not expired
- `title` is required
- `description` is optional

---

### Stream Temporary Video

Stream a temporary video file during preview.

**Endpoint:** `GET /api/videos/temp/:previewId`

**Parameters:**
- `previewId` (string): Preview ID from url-preview endpoint

**Response:** Video file stream

**Notes:**
- Only accessible during preview phase
- Automatically cleaned up after 1 hour
- Used by the frontend video player for preview

---

### Get My Videos

Get all videos uploaded by the authenticated user.

**Endpoint:** `GET /api/videos/my-videos`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "videos": [
    {
      "id": "video123",
      "shortId": "aB3Xy",
      "userId": "abc123",
      "username": "johndoe",
      "filename": "xyz789.mp4",
      "originalFilename": "my-video.mp4",
      "title": "My Awesome Video",
      "description": "This is a great video",
      "fileSize": 52428800,
      "duration": 120.5,
      "width": 1920,
      "height": 1080,
      "format": "mov,mp4,m4a,3gp,3g2,mj2",
      "codec": "h264",
      "uploadedAt": "2025-01-15T10:35:00.000Z",
      "updatedAt": "2025-01-15T10:35:00.000Z"
    }
  ]
}
```

---

### Get User Videos (Public)

Get all videos uploaded by a specific user (public endpoint).

**Endpoint:** `GET /api/videos/user/:username`

**Parameters:**
- `username` (string): Username of the user

**Response:** `200 OK`
```json
{
  "videos": [...]
}
```

---

### Get Video by ID

Get video metadata by video ID.

**Endpoint:** `GET /api/videos/:videoId`

**Parameters:**
- `videoId` (string): Video ID

**Response:** `200 OK`
```json
{
  "video": {
    "id": "video123",
    "shortId": "aB3Xy",
    ...
  }
}
```

---

### Update Video Metadata

Update title and/or description of a video.

**Endpoint:** `PATCH /api/videos/:videoId`

**Headers:**
```
Authorization: Bearer <token>
```

**Parameters:**
- `videoId` (string): Video ID

**Request Body:**
```json
{
  "title": "Updated Title",
  "description": "Updated description"
}
```

**Response:** `200 OK`
```json
{
  "video": {
    "id": "video123",
    "title": "Updated Title",
    "description": "Updated description",
    "updatedAt": "2025-01-15T11:00:00.000Z",
    ...
  }
}
```

**Authorization:**
- Only the video owner can update the video

---

### Delete Video

Delete a video and its metadata.

**Endpoint:** `DELETE /api/videos/:videoId`

**Headers:**
```
Authorization: Bearer <token>
```

**Parameters:**
- `videoId` (string): Video ID

**Response:** `200 OK`
```json
{
  "message": "Video deleted successfully"
}
```

**Authorization:**
- Only the video owner can delete the video

---

## Short URLs

### Get Video by Short ID

Get video metadata using the short URL ID.

**Endpoint:** `GET /v/:shortId`

**Parameters:**
- `shortId` (string): 5-character short ID

**Response:** `200 OK`
```json
{
  "video": {
    "id": "video123",
    "shortId": "aB3Xy",
    ...
  }
}
```

---

## Video Streaming

### Stream Video File

Access the video file directly for streaming.

**Endpoint:** `GET /uploads/videos/:filename`

**Parameters:**
- `filename` (string): Video filename

**Response:** Video file stream

**Note:** This is a static file endpoint that serves the video files directly.

---

## Health Check

### Get System Health

Check the health and status of the API server.

**Endpoint:** `GET /health`

**Response:** `200 OK`
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

**Status Values:**
- `ok`: All systems operational
- `degraded`: Some non-critical systems unavailable (e.g., yt-dlp missing)
- `error`: Critical error occurred

**Health Checks:**
1. **FFmpeg Availability**: Checks if FFmpeg is installed and accessible
2. **yt-dlp Availability**: Checks if yt-dlp is installed and accessible
3. **Disk Space**: Reports current size of uploads directory
4. **Write Permissions**: Verifies write access to uploads directory
5. **Uptime**: Server uptime in seconds
6. **Environment**: Current environment (development/production)

**Use Cases:**
- Load balancer health checks
- Monitoring tools integration
- Kubernetes liveness/readiness probes
- Manual system verification

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "Validation error message"
}
```

**Common Causes:**
- Missing required fields
- Invalid data format
- File type not supported
- File size exceeds limit

### 401 Unauthorized
```json
{
  "error": "Authentication token required"
}
```

**Common Causes:**
- No Authorization header provided
- Token not in "Bearer <token>" format

### 403 Forbidden
```json
{
  "error": "Invalid or expired token"
}
```

**Common Causes:**
- Token has expired (default: 7 days)
- Token signature is invalid
- Token was issued by different server

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

**Common Causes:**
- Video ID doesn't exist
- Short ID doesn't exist
- User doesn't exist
- Preview ID expired or invalid

### 409 Conflict
```json
{
  "error": "Resource already exists"
}
```

**Common Causes:**
- Username already taken
- Email already registered

### 413 Payload Too Large
```json
{
  "error": "File too large"
}
```

**Common Causes:**
- Video file exceeds MAX_FILE_SIZE (default: 1GB)
- JSON payload exceeds 10MB limit

### 429 Too Many Requests
```json
{
  "error": "Too many requests from this IP, please try again later."
}
```

**Common Causes:**
- Rate limit exceeded (100 requests per 15 minutes in production)

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Detailed error message (development only)"
}
```

**Common Causes:**
- Server configuration error
- Database/file system error
- FFmpeg/yt-dlp error
- Unexpected exception

---

## Rate Limiting

**Configuration:**
- **Window**: 15 minutes
- **Production Limit**: 100 requests per IP
- **Development Limit**: 1000 requests per IP
- **Scope**: All `/api/*` endpoints

**Headers:**
```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1633024800
```

**When Rate Limited:**
- Status Code: `429 Too Many Requests`
- Response: `{"error": "Too many requests from this IP, please try again later."}`
- Retry After: Wait until the window resets (15 minutes)

**Best Practices:**
- Implement exponential backoff in clients
- Cache responses when possible
- Use pagination for list endpoints
- Monitor rate limit headers

---

## CORS

**Development:**
- Allowed Origins: `http://localhost:5173`, `http://localhost:5174`
- Credentials: Enabled

**Production:**
- Allowed Origins: `https://vidz.jobe.wtf`, `https://vidzapi.jobe.wtf`
- Credentials: Enabled
- Hardcoded for security (not configurable via environment variables)

**CORS Headers:**
```
Access-Control-Allow-Origin: <origin>
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

---

## Security Headers

The API includes comprehensive security headers via Helmet middleware:

**Headers Applied:**
- `X-DNS-Prefetch-Control: off`
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security: max-age=15552000; includeSubDomains`
- `X-Download-Options: noopen`
- `X-Permitted-Cross-Domain-Policies: none`
- `Referrer-Policy: no-referrer`
- `Cross-Origin-Resource-Policy: cross-origin` (for video streaming)

---

## Request Size Limits

**JSON Payloads:**
- Maximum: 10MB
- Applies to: All JSON request bodies

**URL-Encoded Data:**
- Maximum: 10MB
- Applies to: Form submissions

**File Uploads:**
- Maximum: 1GB (configurable via `MAX_FILE_SIZE` environment variable)
- Applies to: Video file uploads via multipart/form-data

**Exceeding Limits:**
- Status Code: `413 Payload Too Large`
- Response: `{"error": "File too large"}` or similar

---

## Logging

The API uses structured JSON logging (Pino) in production:

**Log Levels:**
- `trace`: Very detailed debugging
- `debug`: Debugging information
- `info`: General informational messages (default)
- `warn`: Warning messages
- `error`: Error messages
- `fatal`: Fatal errors

**Logged Events:**
- HTTP requests (method, path, user ID)
- Authentication events (login, register, success/failure)
- Video operations (upload, delete, with metadata)
- Errors (with stack traces and context)
- System events (startup, shutdown)

**Log Format (Production):**
```json
{
  "level": "info",
  "time": "2025-10-03T12:00:00.000Z",
  "msg": "Video uploaded",
  "videoId": "abc123",
  "userId": "user456",
  "fileSize": 52428800
}
```

**Log Format (Development):**
```
[12:00:00] INFO: Video uploaded
    videoId: "abc123"
    userId: "user456"
    fileSize: 52428800
```

---

## Pagination

Currently, list endpoints return all results. Pagination will be added in a future version.

**Planned Format:**
```json
{
  "videos": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

---

## Versioning

The API is currently unversioned. Future versions will use URL-based versioning:

- Current: `/api/videos`
- Future: `/api/v1/videos`, `/api/v2/videos`

---

## Support

For issues or questions:
1. Check the health endpoint: `GET /health`
2. Review error messages and status codes
3. Check server logs (structured JSON in production)
4. Verify FFmpeg and yt-dlp are installed
5. Ensure environment variables are configured correctly

**Common Issues:**
- **FFmpeg not found**: Install FFmpeg and ensure it's in PATH
- **yt-dlp not found**: Install yt-dlp and ensure it's in PATH
- **Rate limited**: Wait 15 minutes or reduce request frequency
- **CORS error**: Verify origin is in allowed list
- **Token expired**: Re-authenticate to get a new token

