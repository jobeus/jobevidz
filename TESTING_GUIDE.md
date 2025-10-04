# Quick Testing Guide for Social Media Sharing

## 🚀 Quick Start

### 1. Start the Application

```bash
# Terminal 1 - Start the server
cd server
npm run dev

# Terminal 2 - Start the client (if testing locally)
cd client
npm run dev
```

### 2. Upload a Test Video

1. Navigate to http://localhost:5173 (or your domain)
2. Register/Login
3. Upload a video (or use URL upload)
4. Note the short ID from the URL (e.g., `/v/abc123`)

### 3. Verify Thumbnail Generation

```bash
# Check if thumbnail was created
ls uploads/thumbnails/

# You should see a .jpg file with the video ID
```

## 🧪 Testing Methods

### Method 1: Using curl (Quick Test)

```bash
# Test meta tags for crawlers
curl -H "User-Agent: facebookexternalhit/1.1" http://localhost:3000/v/YOUR_SHORT_ID | grep -i "og:"

# Test oEmbed JSON
curl "http://localhost:3000/oembed?url=http://localhost:3000/v/YOUR_SHORT_ID&format=json" | jq

# Test oEmbed XML
curl "http://localhost:3000/oembed?url=http://localhost:3000/v/YOUR_SHORT_ID&format=xml"

# Test embed player
curl http://localhost:3000/embed/YOUR_SHORT_ID
```

### Method 2: Browser Testing

1. **Test Embed Player**
   - Open: `http://localhost:3000/embed/YOUR_SHORT_ID`
   - Should see minimal video player
   - Video should play

2. **Test Meta Tags**
   - Open: `http://localhost:5173/v/YOUR_SHORT_ID`
   - Right-click → View Page Source
   - Search for `og:` tags
   - Should see Open Graph meta tags

3. **Test in iframe**
   Create a test HTML file:
   ```html
   <!DOCTYPE html>
   <html>
   <head>
       <title>Embed Test</title>
   </head>
   <body>
       <h1>Video Embed Test</h1>
       <iframe 
           src="http://localhost:3000/embed/YOUR_SHORT_ID" 
           width="800" 
           height="450" 
           frameborder="0" 
           allowfullscreen>
       </iframe>
   </body>
   </html>
   ```

### Method 3: Social Media Platform Testing

**Important:** For social media testing, your site must be publicly accessible (not localhost).

#### Discord Testing
1. Share your video URL in a Discord channel
2. Discord will automatically fetch the preview
3. Should show thumbnail, title, and description
4. May show embedded player

#### Twitter/X Testing
1. Go to: https://cards-dev.twitter.com/validator
2. Enter your video URL: `https://yourdomain.com/v/YOUR_SHORT_ID`
3. Click "Preview card"
4. Should show Twitter Player Card

#### Facebook Testing
1. Go to: https://developers.facebook.com/tools/debug/
2. Enter your video URL
3. Click "Debug"
4. Click "Scrape Again" if needed
5. Should show video preview with thumbnail

#### LinkedIn Testing
1. Go to: https://www.linkedin.com/post-inspector/
2. Enter your video URL
3. Should show rich preview

#### Slack Testing
1. Share your video URL in a Slack channel
2. Slack will unfurl the link
3. Should show thumbnail and title

## 🔍 What to Look For

### ✅ Successful Implementation Checklist

- [ ] Thumbnail image is generated and accessible
- [ ] Meta tags include `og:video`, `og:image`, `og:title`, `og:description`
- [ ] Twitter Card meta tags are present
- [ ] oEmbed JSON endpoint returns valid response
- [ ] oEmbed XML endpoint returns valid response
- [ ] Embed player loads and plays video
- [ ] Embed player works in iframe
- [ ] Social media platforms show rich preview
- [ ] Video dimensions are correct in meta tags
- [ ] Thumbnail URL is absolute (includes domain)

### ❌ Common Issues

1. **Thumbnail not showing**
   - Check FFmpeg is installed: `ffmpeg -version`
   - Check file permissions on `uploads/thumbnails/`
   - Check server logs for errors

2. **Meta tags not detected by social media**
   - Ensure site is publicly accessible (not localhost)
   - Use absolute URLs (include https://domain.com)
   - Clear social media cache using debug tools
   - Check User-Agent detection is working

3. **Embed player not loading**
   - Check X-Frame-Options headers
   - Verify CORS settings
   - Check browser console for errors

4. **oEmbed not working**
   - Verify URL encoding
   - Check that video exists
   - Test with curl first

## 🌐 Testing with ngrok (for localhost)

If you need to test with social media platforms but are running locally:

```bash
# Install ngrok (if not already installed)
# https://ngrok.com/download

# Start ngrok tunnel
ngrok http 3000

# Use the ngrok URL for testing
# Example: https://abc123.ngrok.io/v/YOUR_SHORT_ID
```

**Note:** Update `VITE_API_URL` in client to use the ngrok URL for proper API calls.

## 📊 Expected Responses

### oEmbed JSON Response
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

### Meta Tags in HTML
```html
<!-- Open Graph -->
<meta property="og:type" content="video.other" />
<meta property="og:url" content="https://yourdomain.com/v/abc123" />
<meta property="og:title" content="My Video Title" />
<meta property="og:description" content="Video description" />
<meta property="og:image" content="https://yourdomain.com/uploads/thumbnails/abc123.jpg" />
<meta property="og:video" content="https://yourdomain.com/uploads/videos/video.mp4" />
<meta property="og:video:type" content="video/mp4" />

<!-- Twitter Card -->
<meta name="twitter:card" content="player" />
<meta name="twitter:player" content="https://yourdomain.com/embed/abc123" />
<meta name="twitter:image" content="https://yourdomain.com/uploads/thumbnails/abc123.jpg" />
```

## 🐛 Debugging Tips

### Check Server Logs
```bash
# Watch server logs for errors
cd server
npm run dev

# Look for:
# - Thumbnail generation errors
# - FFmpeg errors
# - Route handling issues
```

### Check Network Requests
1. Open browser DevTools (F12)
2. Go to Network tab
3. Load video page
4. Check:
   - Thumbnail image loads (200 status)
   - Video file loads (200 or 206 for streaming)
   - API calls succeed

### Verify File Permissions
```bash
# Check uploads directory
ls -la uploads/

# Should see:
# drwxr-xr-x  videos/
# drwxr-xr-x  thumbnails/
# drwxr-xr-x  metadata/
```

### Test User Agent Detection
```bash
# Test with different user agents
curl -H "User-Agent: Mozilla/5.0" http://localhost:3000/v/abc123
# Should return JSON

curl -H "User-Agent: facebookexternalhit/1.1" http://localhost:3000/v/abc123
# Should return HTML with meta tags
```

## 📝 Testing Checklist

Before deploying to production:

- [ ] Test video upload and thumbnail generation
- [ ] Verify all meta tags are present and correct
- [ ] Test oEmbed JSON endpoint
- [ ] Test oEmbed XML endpoint
- [ ] Test embed player in isolation
- [ ] Test embed player in iframe
- [ ] Test with at least 3 social media platforms
- [ ] Verify HTTPS works correctly
- [ ] Check mobile responsiveness
- [ ] Test with different video formats
- [ ] Test with different video dimensions
- [ ] Verify error handling (404, invalid URLs)
- [ ] Check performance (thumbnail generation time)
- [ ] Test with large video files
- [ ] Verify security headers are correct

## 🎉 Success Criteria

Your implementation is successful when:

1. ✅ Thumbnails are automatically generated for all uploaded videos
2. ✅ Social media platforms show rich previews with thumbnails
3. ✅ Video titles and descriptions appear correctly
4. ✅ Embed player works in iframes
5. ✅ oEmbed endpoints return valid responses
6. ✅ No console errors in browser
7. ✅ No server errors in logs
8. ✅ Videos play correctly in all contexts

## 🆘 Getting Help

If you encounter issues:

1. Check the main `SOCIAL_SHARING.md` documentation
2. Review server logs for errors
3. Test with curl to isolate issues
4. Use social media debug tools to see what they're receiving
5. Check nginx configuration if using reverse proxy
6. Verify FFmpeg is installed and working

## 📚 Additional Resources

- [Open Graph Protocol](https://ogp.me/)
- [Twitter Cards Documentation](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
- [oEmbed Specification](https://oembed.com/)
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)

