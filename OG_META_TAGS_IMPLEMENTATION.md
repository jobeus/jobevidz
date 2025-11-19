# Open Graph Meta Tags Implementation

## Overview
This document describes the implementation of proper Open Graph (OG) meta tags and video embed metadata for rich link previews on social media platforms including Discord, WhatsApp, iMessage, Twitter, Facebook, and others.

## Changes Made

### 1. Thumbnail Generation Enhancement (`server/src/utils/videoMetadata.ts`)

**Problem:** Thumbnails were generated at 1280x720, which doesn't match the recommended Open Graph image size of 1200x630.

**Solution:** 
- Updated thumbnail generation to use 1200x630 dimensions (recommended OG image size)
- Implemented aspect ratio preservation with black padding (letterbox/pillarbox)
- Uses FFmpeg's `scale` and `pad` filters to ensure exact dimensions while maintaining video aspect ratio

**Code Changes:**
```typescript
// Before: size: '1280x720'
// After: size: '1200x630' with aspect ratio preservation
.outputOptions([
  '-vf',
  'scale=1200:630:force_original_aspect_ratio=decrease,pad=1200:630:(ow-iw)/2:(oh-ih)/2:black'
])
```

### 2. Removed Crawler Detection - Serve Meta Tags to Everyone (`server/src/routes/shortUrl.ts`)

**Problem:** Limiting meta tags to only detected crawlers made testing impossible and could miss some platforms.

**Solution:**
- **Removed user agent detection entirely**
- `/v/:shortId` now returns HTML with meta tags by default for ALL requests
- JSON API available via query parameter: `/v/:shortId?format=json`
- Also accepts `Accept: application/json` header for JSON response

**Benefits:**
- Works with all meta tag validators and testing tools
- No risk of missing crawler user agents
- Easy to test in regular browsers
- More reliable and predictable behavior

### 3. Enhanced Open Graph Meta Tags (`server/src/routes/shortUrl.ts`)

**Problem:** Missing critical meta tags for video playback and platform-specific features.

**Solution:** Added comprehensive meta tags including:

#### Image Meta Tags (Updated Dimensions)
```html
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="${title}" />
```

#### Video Meta Tags (Enhanced for Direct Playback)
```html
<meta property="og:video" content="${videoUrl}" />
<meta property="og:video:url" content="${videoUrl}" />
<meta property="og:video:secure_url" content="${videoUrl}" />
<meta property="og:video:type" content="video/mp4" />
<meta property="og:video:width" content="${video.width}" />
<meta property="og:video:height" content="${video.height}" />
<meta property="video:duration" content="${Math.floor(video.duration)}" />
<meta property="video:release_date" content="${video.uploadedAt}" />
```

#### Apple/iMessage Specific Tags
```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black" />
<meta name="apple-mobile-web-app-title" content="${siteName}" />
<link rel="apple-touch-icon" href="${thumbnailUrl}" />
```

#### Twitter Card Enhancements
```html
<meta name="twitter:image:alt" content="${title}" />
```

#### SEO Improvements
```html
<link rel="canonical" href="${shareUrl}" />
```

### 4. Client-Side Meta Tags Update (`client/src/pages/VideoPlayer.tsx`)

**Problem:** Client-side meta tags didn't match server-side implementation.

**Solution:** Updated React Helmet meta tags to match server-side implementation for consistency.

### 5. API Client Update (`client/src/services/api.ts`)

**Problem:** Client needs JSON data, but server now returns HTML by default.

**Solution:** Updated `getVideoByShortId` to request JSON format explicitly:
```typescript
// Before: const response = await api.get(`/v/${shortId}`);
// After: const response = await api.get(`/v/${shortId}?format=json`);
```

## Platform-Specific Support

### Discord
- ✅ Thumbnail preview via `og:image` (1200x630)
- ✅ Direct video playback via `og:video` tags
- ✅ Video dimensions and duration metadata

### WhatsApp
- ✅ Link preview with thumbnail
- ✅ Title and description display
- ✅ Enhanced crawler detection

### iMessage
- ✅ Rich link preview
- ✅ Apple-specific meta tags
- ✅ Touch icon support
- ✅ Video metadata

### Twitter
- ✅ Player card with embed support
- ✅ Video streaming metadata
- ✅ Image alt text for accessibility

### Facebook
- ✅ Full Open Graph support
- ✅ Video metadata
- ✅ Secure URL variants

## Testing

### Online Meta Tag Validators
Test your implementation with these tools:

1. **OpenGraph.xyz** - https://www.opengraph.xyz/
2. **Meta Tags** - https://metatags.io/
3. **Facebook Sharing Debugger** - https://developers.facebook.com/tools/debug/
4. **Twitter Card Validator** - https://cards-dev.twitter.com/validator
5. **LinkedIn Post Inspector** - https://www.linkedin.com/post-inspector/

### Manual Testing
1. Share a video link in Discord - should show thumbnail and play video inline
2. Share a video link in WhatsApp - should show rich preview with thumbnail
3. Share a video link in iMessage - should show preview card
4. Share on Twitter - should show player card
5. Share on Facebook - should show video preview

## Deployment

### Build and Deploy
```bash
# Build server
cd server
npm run build

# Restart server (if using PM2)
pm2 restart jobevidz-server

# Or restart with ecosystem file
pm2 restart ecosystem.config.js
```

### Regenerate Existing Thumbnails (Optional)
If you want to regenerate existing thumbnails with the new 1200x630 dimensions:

```bash
# This would require a migration script (not included)
# Existing thumbnails will continue to work but won't have optimal dimensions
```

## Technical Notes

### Why 1200x630?
- Recommended by Facebook/Open Graph specification
- Aspect ratio of ~1.91:1 works well across platforms
- Large enough for high-quality previews
- Widely supported by social media platforms

### Aspect Ratio Preservation
The FFmpeg filter chain ensures:
1. Video is scaled down to fit within 1200x630
2. Original aspect ratio is maintained
3. Black padding is added to reach exact 1200x630 dimensions
4. Padding is centered (letterbox for wide videos, pillarbox for tall videos)

### Server-Side vs Client-Side Rendering
- **Default behavior**: `/v/:shortId` returns HTML with meta tags for everyone
- **JSON API**: Add `?format=json` query parameter or set `Accept: application/json` header to get JSON
- **Benefits**:
  - Meta tags work for all crawlers, validators, and testing tools
  - No user agent detection needed (more reliable)
  - Easy to test with browsers and online validators
  - Client-side app requests JSON explicitly via query parameter

## Troubleshooting

### Meta tags not detected by validators
1. Ensure server is running and accessible from the internet
2. Check that `/v/:shortId` route is properly proxied in nginx
3. Test with curl: `curl https://yourdomain.com/v/abc123` (should return HTML with meta tags)
4. Test JSON API: `curl https://yourdomain.com/v/abc123?format=json` (should return JSON)

### Videos not playing in Discord
1. Verify `og:video` and `og:video:url` tags are present
2. Ensure video URL is publicly accessible
3. Check video format is MP4 (Discord requires MP4)
4. Verify CORS headers allow video streaming

### Thumbnails not showing
1. Check thumbnail was generated during upload
2. Verify thumbnail URL is publicly accessible
3. Ensure thumbnail dimensions are correct (1200x630)
4. Check image format is JPEG

## Future Enhancements

- [ ] Add support for multiple thumbnail sizes
- [ ] Implement video preview clips for platforms that support them
- [ ] Add structured data (JSON-LD) for better SEO
- [ ] Support for animated GIF previews
- [ ] Platform-specific optimizations based on user agent

