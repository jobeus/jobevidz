# Social Media Sharing & Open Graph Implementation

This document describes the Open Graph meta tags and oEmbed support implementation for JobeVidz, enabling rich previews and in-app playback when sharing video links on social platforms.

## 🎯 Features Implemented

### 1. **Automatic Thumbnail Generation**
- Thumbnails are automatically generated when videos are uploaded
- Generated at 1 second or 10% of video duration (whichever is smaller)
- Stored in `uploads/thumbnails/` directory
- 1280x720 resolution (720p) for optimal quality
- JPEG format for broad compatibility

### 2. **Open Graph Meta Tags**
- Complete Open Graph implementation for video pages
- Includes video-specific meta tags (og:video, og:video:type, etc.)
- Thumbnail images for rich previews
- Server-side rendering for social media crawlers
- Client-side meta tag updates for SEO

### 3. **Twitter Card Support**
- Twitter Player Card implementation
- Embedded video player support
- Thumbnail previews
- Direct video streaming metadata

### 4. **oEmbed Endpoints**
- JSON format: `/oembed?url=<video_url>&format=json`
- XML format: `/oembed?url=<video_url>&format=xml`
- Supports maxwidth and maxheight parameters
- Auto-discovery via link tags in video pages

### 5. **Embeddable Video Player**
- Dedicated embed endpoint: `/embed/:shortId`
- Minimal, iframe-friendly HTML page
- No navigation or extra UI elements
- Configurable X-Frame-Options for embedding
- Responsive design

## 📋 API Endpoints

### Video Short URL (with Meta Tags)
```
GET /v/:shortId
```
- Returns JSON for API clients
- Returns HTML with meta tags for social media crawlers
- Detects user agent to determine response type

### oEmbed Endpoint
```
GET /oembed?url=<video_url>&format=<json|xml>&maxwidth=<width>&maxheight=<height>
```

**Parameters:**
- `url` (required): The video URL to get embed information for
- `format` (optional): Response format - 'json' or 'xml' (default: 'json')
- `maxwidth` (optional): Maximum width of the embed
- `maxheight` (optional): Maximum height of the embed

**Example JSON Response:**
```json
{
  "version": "1.0",
  "type": "video",
  "provider_name": "JobeVidz",
  "provider_url": "https://yourdomain.com",
  "title": "My Video Title",
  "author_name": "username",
  "author_url": "https://yourdomain.com/user/username",
  "width": 1920,
  "height": 1080,
  "html": "<iframe width=\"1920\" height=\"1080\" src=\"https://yourdomain.com/embed/abc123\" frameborder=\"0\" allowfullscreen></iframe>",
  "thumbnail_url": "https://yourdomain.com/uploads/thumbnails/abc123.jpg",
  "thumbnail_width": 1280,
  "thumbnail_height": 720
}
```

### Embed Player
```
GET /embed/:shortId
```
Returns a minimal HTML page with just the video player, suitable for iframe embedding.

## 🔧 Technical Implementation

### Server-Side Changes

1. **Thumbnail Generation** (`server/src/utils/videoMetadata.ts`)
   - Added `generateThumbnail()` function using FFmpeg
   - Integrated into video upload flow

2. **Meta Tag Injection** (`server/src/routes/shortUrl.ts`)
   - User agent detection for social media crawlers
   - Dynamic HTML generation with Open Graph tags
   - Separate responses for crawlers vs. API clients

3. **oEmbed Route** (`server/src/routes/oembed.ts`)
   - JSON and XML format support
   - Dimension calculation with max constraints
   - Auto-discovery link generation

4. **Embed Route** (`server/src/routes/embed.ts`)
   - Minimal HTML player page
   - X-Frame-Options configured for embedding
   - Responsive video player

5. **Updated Types** (`server/src/types/index.ts`)
   - Added `thumbnailFilename` to VideoMetadata interface

### Client-Side Changes

1. **React Helmet Integration** (`client/src/App.tsx`)
   - Added HelmetProvider wrapper
   - Enables dynamic meta tag updates

2. **VideoPlayer Meta Tags** (`client/src/pages/VideoPlayer.tsx`)
   - Dynamic Open Graph tags
   - Twitter Card tags
   - oEmbed discovery links
   - SEO-friendly meta information

3. **API Helper** (`client/src/services/api.ts`)
   - Added `getThumbnailUrl()` function

### Nginx Configuration

Updated both `nginx.conf` and `docker-nginx.conf` to:
- Proxy `/v/` routes to backend for meta tag injection
- Proxy `/embed/` routes with relaxed X-Frame-Options
- Proxy `/oembed` route to backend
- Proxy `/uploads/` for video and thumbnail serving
- Maintain security headers for other routes

## 🧪 Testing

### Testing Tools

Use these official debugging tools to test social media previews:

1. **Discord**
   - Share a video link in a Discord channel
   - Discord will automatically fetch and display the preview

2. **Twitter/X Card Validator**
   - URL: https://cards-dev.twitter.com/validator
   - Enter your video URL
   - View the preview card

3. **Facebook Sharing Debugger**
   - URL: https://developers.facebook.com/tools/debug/
   - Enter your video URL
   - Click "Debug" to see how Facebook will display it

4. **LinkedIn Post Inspector**
   - URL: https://www.linkedin.com/post-inspector/
   - Enter your video URL
   - View the preview

5. **Slack**
   - Share a video link in a Slack channel
   - Slack will automatically unfurl the link

6. **iMessage**
   - Send a video link via iMessage
   - iOS will fetch and display the preview

### Manual Testing

1. **Test Thumbnail Generation**
   ```bash
   # Upload a video and check if thumbnail is created
   ls uploads/thumbnails/
   ```

2. **Test Meta Tags (Crawler)**
   ```bash
   # Simulate a crawler request
   curl -H "User-Agent: facebookexternalhit/1.1" http://localhost:3000/v/YOUR_SHORT_ID
   ```

3. **Test oEmbed JSON**
   ```bash
   curl "http://localhost:3000/oembed?url=http://localhost:3000/v/YOUR_SHORT_ID&format=json"
   ```

4. **Test oEmbed XML**
   ```bash
   curl "http://localhost:3000/oembed?url=http://localhost:3000/v/YOUR_SHORT_ID&format=xml"
   ```

5. **Test Embed Player**
   - Open `http://localhost:3000/embed/YOUR_SHORT_ID` in a browser
   - Verify the minimal player interface
   - Test in an iframe:
     ```html
     <iframe src="http://localhost:3000/embed/YOUR_SHORT_ID" width="800" height="450" frameborder="0" allowfullscreen></iframe>
     ```

## 🚀 Deployment Notes

1. **Environment Variables**
   - Ensure `VITE_API_URL` is set correctly in client environment
   - Update domain names in nginx configuration files

2. **FFmpeg Requirement**
   - FFmpeg must be installed on the server for thumbnail generation
   - Verify with: `ffmpeg -version`

3. **Directory Permissions**
   - Ensure `uploads/thumbnails/` directory is writable
   - Automatically created on server startup

4. **Nginx Configuration**
   - Update domain names in nginx.conf and docker-nginx.conf
   - Reload nginx after configuration changes: `sudo nginx -s reload`

5. **HTTPS Considerations**
   - Social media platforms prefer HTTPS URLs
   - Ensure SSL certificates are properly configured
   - Update protocol in meta tags if using HTTPS

## 📱 Platform-Specific Behavior

### Discord
- Displays thumbnail preview
- Shows title and description
- Embeds video player for direct playback
- Supports MP4 format

### Twitter/X
- Shows Twitter Card with thumbnail
- Displays title and description
- Provides "Watch" button
- May embed player depending on account settings

### Facebook
- Shows thumbnail preview
- Displays title, description, and site name
- May show video player preview
- Requires public URL for testing

### LinkedIn
- Shows thumbnail and title
- Displays description
- Professional formatting

### Slack
- Unfurls link with thumbnail
- Shows title and description
- May embed video player

### iMessage
- Shows rich preview with thumbnail
- Displays title
- Tappable to open in browser

## 🔒 Security Considerations

1. **X-Frame-Options**
   - Embed pages allow all origins for iframe embedding
   - Other pages use SAMEORIGIN for security

2. **Content Security Policy**
   - Relaxed for embed pages to allow embedding
   - Maintained for other routes

3. **CORS**
   - Videos and thumbnails allow cross-origin access
   - API routes maintain CORS restrictions

## 📝 Future Enhancements

- [ ] Video preview clips (first 5-10 seconds)
- [ ] Multiple thumbnail options (let users choose)
- [ ] Animated GIF previews
- [ ] Custom thumbnail upload
- [ ] Analytics for social shares
- [ ] A/B testing for thumbnail effectiveness
- [ ] Video transcoding for optimal social media formats
- [ ] Closed captions/subtitles support
- [ ] Video chapters for longer content

## 🐛 Troubleshooting

### Thumbnails Not Generating
- Check FFmpeg installation: `ffmpeg -version`
- Check server logs for errors
- Verify `uploads/thumbnails/` directory permissions
- Ensure video file is valid and accessible

### Meta Tags Not Showing
- Clear social media cache (use debugging tools)
- Verify crawler user agent detection
- Check nginx proxy configuration
- Ensure server is publicly accessible

### Embed Player Not Working
- Check X-Frame-Options headers
- Verify embed route is accessible
- Test in different browsers
- Check browser console for errors

### oEmbed Not Working
- Verify URL encoding in oEmbed request
- Check that video exists and is accessible
- Test with curl to see raw response
- Verify oEmbed discovery links in HTML

