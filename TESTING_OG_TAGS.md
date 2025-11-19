# Testing Open Graph Meta Tags

## Quick Testing Guide

### 1. Test in Your Browser

Simply visit a video URL in your browser:
```
http://localhost:3000/v/abc123
```

You should see an HTML page with the video title and meta tags in the `<head>`. View the page source to see all the Open Graph tags.

### 2. Test with cURL

**Get HTML with meta tags (default):**
```bash
curl http://localhost:3000/v/abc123
```

**Get JSON data:**
```bash
curl http://localhost:3000/v/abc123?format=json
```

Or with Accept header:
```bash
curl -H "Accept: application/json" http://localhost:3000/v/abc123
```

### 3. Online Meta Tag Validators

Once your server is publicly accessible, test with these validators:

#### OpenGraph.xyz
1. Go to https://www.opengraph.xyz/
2. Enter your video URL: `https://yourdomain.com/v/abc123`
3. Click "Preview"
4. Should show thumbnail, title, description, and video metadata

#### Meta Tags
1. Go to https://metatags.io/
2. Enter your video URL
3. See previews for Google, Facebook, Twitter, LinkedIn

#### Facebook Sharing Debugger
1. Go to https://developers.facebook.com/tools/debug/
2. Enter your video URL
3. Click "Debug"
4. Should show all Open Graph tags and preview

#### Twitter Card Validator
1. Go to https://cards-dev.twitter.com/validator
2. Enter your video URL
3. Should show player card preview

#### LinkedIn Post Inspector
1. Go to https://www.linkedin.com/post-inspector/
2. Enter your video URL
3. Should show link preview

### 4. Test in Messaging Apps

#### Discord
1. Paste video URL in any Discord channel
2. Should show:
   - Thumbnail image (1200x630)
   - Video title and description
   - Inline video player (click to play)

#### WhatsApp
1. Paste video URL in a chat
2. Should show:
   - Link preview with thumbnail
   - Title and description
   - Tap to open in browser

#### iMessage
1. Paste video URL in iMessage
2. Should show:
   - Rich link preview
   - Thumbnail image
   - Title

#### Telegram
1. Paste video URL in Telegram
2. Should show:
   - Link preview with thumbnail
   - Title and description

### 5. Verify Meta Tags

View the HTML source and verify these tags are present:

**Essential Open Graph Tags:**
```html
<meta property="og:type" content="video.other" />
<meta property="og:url" content="..." />
<meta property="og:title" content="..." />
<meta property="og:description" content="..." />
<meta property="og:image" content="..." />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
```

**Video Tags:**
```html
<meta property="og:video" content="..." />
<meta property="og:video:url" content="..." />
<meta property="og:video:secure_url" content="..." />
<meta property="og:video:type" content="video/mp4" />
<meta property="og:video:width" content="..." />
<meta property="og:video:height" content="..." />
```

**Twitter Card Tags:**
```html
<meta name="twitter:card" content="player" />
<meta name="twitter:player" content="..." />
<meta name="twitter:image" content="..." />
```

**Apple Tags:**
```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<link rel="apple-touch-icon" href="..." />
```

## Common Issues and Solutions

### Issue: Validators show old cached data
**Solution:** Most validators have a "Scrape Again" or "Refresh" button. Use it to clear cache.

### Issue: Thumbnail not showing
**Check:**
- Thumbnail file exists in `/uploads/thumbnails/`
- Thumbnail URL is publicly accessible
- Thumbnail dimensions are 1200x630
- Image format is JPEG

### Issue: Video not playing in Discord
**Check:**
- Video file is MP4 format
- Video URL is publicly accessible (not localhost)
- CORS headers allow video streaming
- `og:video` tags are present

### Issue: No preview in WhatsApp
**Check:**
- URL is publicly accessible (WhatsApp can't access localhost)
- HTTPS is enabled (WhatsApp prefers HTTPS)
- Meta tags are in the HTML (not added by JavaScript)

### Issue: Client app not loading video data
**Check:**
- API call includes `?format=json` parameter
- Server is returning JSON for that request
- Check browser console for errors

## Deployment Checklist

Before deploying to production:

- [ ] Server builds successfully (`npm run build` in server/)
- [ ] Client builds successfully (`npm run build` in client/)
- [ ] Test `/v/:shortId` returns HTML with meta tags
- [ ] Test `/v/:shortId?format=json` returns JSON
- [ ] Thumbnails are generated at 1200x630
- [ ] All video URLs are publicly accessible
- [ ] HTTPS is configured (required for most platforms)
- [ ] CORS headers allow video streaming
- [ ] Test with at least 2 online validators
- [ ] Test in at least 1 messaging app (Discord recommended)

## Next Steps

After deployment:
1. Upload a test video
2. Get the short URL (e.g., `/v/abc123`)
3. Test with online validators
4. Share in Discord/WhatsApp to verify
5. Monitor server logs for any errors

