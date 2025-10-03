# JobeVidz API Documentation

Base URL: `http://localhost:3000`

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

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

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "Validation error message"
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication token required"
}
```

### 403 Forbidden
```json
{
  "error": "Invalid or expired token"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 409 Conflict
```json
{
  "error": "Resource already exists"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Detailed error message (development only)"
}
```

---

## Rate Limiting

Currently, there are no rate limits implemented. This should be added in production.

## CORS

CORS is enabled for all origins in development. Configure appropriately for production.

