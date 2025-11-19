# Example HTML Output

## What You Should See

When you visit `/v/abc123` in your browser or with a validator, you should see HTML like this:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <!-- Primary Meta Tags -->
    <title>My Awesome Video</title>
    <meta name="title" content="My Awesome Video" />
    <meta name="description" content="This is a great video about coding" />

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="video.other" />
    <meta property="og:url" content="https://yourdomain.com/v/abc123" />
    <meta property="og:title" content="My Awesome Video" />
    <meta property="og:description" content="This is a great video about coding" />
    <meta property="og:site_name" content="JobeVidz" />
    <meta property="og:image" content="https://yourdomain.com/uploads/thumbnails/abc123.jpg" />
    <meta property="og:image:secure_url" content="https://yourdomain.com/uploads/thumbnails/abc123.jpg" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="My Awesome Video" />

    <!-- Video Meta Tags for Direct Playback (Discord, iMessage, etc.) -->
    <meta property="og:video" content="https://yourdomain.com/uploads/videos/abc123.mp4" />
    <meta property="og:video:url" content="https://yourdomain.com/uploads/videos/abc123.mp4" />
    <meta property="og:video:secure_url" content="https://yourdomain.com/uploads/videos/abc123.mp4" />
    <meta property="og:video:type" content="video/mp4" />
    <meta property="og:video:width" content="1920" />
    <meta property="og:video:height" content="1080" />
    
    <!-- Additional video metadata -->
    <meta property="video:duration" content="120" />
    <meta property="video:release_date" content="2024-01-15T10:30:00.000Z" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="player" />
    <meta name="twitter:url" content="https://yourdomain.com/v/abc123" />
    <meta name="twitter:title" content="My Awesome Video" />
    <meta name="twitter:description" content="This is a great video about coding" />
    <meta name="twitter:image" content="https://yourdomain.com/uploads/thumbnails/abc123.jpg" />
    <meta name="twitter:image:alt" content="My Awesome Video" />
    <meta name="twitter:player" content="https://yourdomain.com/embed/abc123" />
    <meta name="twitter:player:width" content="1920" />
    <meta name="twitter:player:height" content="1080" />
    <meta name="twitter:player:stream" content="https://yourdomain.com/uploads/videos/abc123.mp4" />
    <meta name="twitter:player:stream:content_type" content="video/mp4" />

    <!-- Apple/iMessage specific meta tags -->
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black" />
    <meta name="apple-mobile-web-app-title" content="JobeVidz" />
    <link rel="apple-touch-icon" href="https://yourdomain.com/uploads/thumbnails/abc123.jpg" />

    <!-- oEmbed Discovery -->
    <link rel="alternate" type="application/json+oembed"
          href="https://yourdomain.com/oembed?url=https%3A%2F%2Fyourdomain.com%2Fv%2Fabc123&format=json"
          title="My Awesome Video" />
    <link rel="alternate" type="text/xml+oembed"
          href="https://yourdomain.com/oembed?url=https%3A%2F%2Fyourdomain.com%2Fv%2Fabc123&format=xml"
          title="My Awesome Video" />

    <!-- Additional Meta -->
    <meta name="author" content="johndoe" />
    <meta name="duration" content="120" />
    
    <!-- Canonical URL -->
    <link rel="canonical" href="https://yourdomain.com/v/abc123" />

    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        margin: 0;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      .container {
        text-align: center;
        padding: 2rem;
      }
      h1 {
        font-size: 2rem;
        margin-bottom: 1rem;
      }
      p {
        font-size: 1.2rem;
        opacity: 0.9;
      }
      .loading {
        margin-top: 2rem;
        font-size: 3rem;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="loading">🎬</div>
      <h1>My Awesome Video</h1>
      <p>Video preview for social media</p>
    </div>
  </body>
</html>
```

## JSON Response

When you request `/v/abc123?format=json`, you should get:

```json
{
  "video": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "shortId": "abc123",
    "userId": "user-id-here",
    "username": "johndoe",
    "filename": "abc123.mp4",
    "originalFilename": "my-video.mp4",
    "title": "My Awesome Video",
    "description": "This is a great video about coding",
    "fileSize": 10485760,
    "duration": 120.5,
    "width": 1920,
    "height": 1080,
    "format": "mov,mp4,m4a,3gp,3g2,mj2",
    "codec": "h264",
    "thumbnailFilename": "abc123.jpg",
    "uploadedAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

## How to Verify

### 1. Check HTML in Browser
```bash
# Visit in browser
http://localhost:3000/v/abc123

# Right-click → View Page Source
# Look for <meta property="og:image" content="..." />
```

### 2. Check with cURL
```bash
# Get HTML
curl http://localhost:3000/v/abc123 | grep "og:image"

# Should output:
# <meta property="og:image" content="http://localhost:3000/uploads/thumbnails/abc123.jpg" />
```

### 3. Check JSON API
```bash
# Get JSON
curl http://localhost:3000/v/abc123?format=json

# Should output JSON with video metadata
```

### 4. Validate with Online Tool
1. Go to https://www.opengraph.xyz/
2. Enter your URL
3. Should show:
   - ✅ Title: "My Awesome Video"
   - ✅ Description: "This is a great video about coding"
   - ✅ Image: 1200x630 thumbnail
   - ✅ Type: video.other
   - ✅ Video URL present

## Common Validation Results

### ✅ Success - OpenGraph.xyz
```
Title: My Awesome Video
Description: This is a great video about coding
Image: https://yourdomain.com/uploads/thumbnails/abc123.jpg (1200x630)
Type: video.other
URL: https://yourdomain.com/v/abc123
```

### ✅ Success - Discord
- Shows thumbnail image
- Shows title and description
- Click to play video inline
- Video player appears in chat

### ✅ Success - WhatsApp
- Shows link preview card
- Displays thumbnail
- Shows title
- Tap to open in browser

### ❌ Failure - Missing Tags
If validator shows "No Open Graph tags found":
- Check server is running
- Verify URL is accessible
- Check HTML source has meta tags
- Clear validator cache and retry

