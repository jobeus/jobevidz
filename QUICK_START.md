# Quick Start - Open Graph Meta Tags

## 🚀 Deploy Changes

```bash
# Build server
cd server && npm run build

# Build client  
cd ../client && npm run build

# Restart server (choose one)
pm2 restart jobevidz-server
# or
pm2 restart ecosystem.config.js
```

## ✅ Quick Test

### 1. Test in Browser
```
http://localhost:3000/v/abc123
```
Should show HTML page with meta tags (view source to see them).

### 2. Test JSON API
```bash
curl http://localhost:3000/v/abc123?format=json
```
Should return JSON with video metadata.

### 3. Test with Online Validator
1. Go to https://www.opengraph.xyz/
2. Enter your video URL
3. Should show thumbnail, title, description

### 4. Test in Discord
1. Paste video URL in Discord
2. Should show thumbnail and inline video player

## 📋 What Changed

### Server (`server/src/routes/shortUrl.ts`)
- ✅ Removed crawler detection
- ✅ Everyone gets HTML with meta tags by default
- ✅ Add `?format=json` for JSON response
- ✅ Enhanced OG tags for Discord, WhatsApp, iMessage

### Thumbnails (`server/src/utils/videoMetadata.ts`)
- ✅ Changed from 1280x720 to 1200x630 (OG standard)
- ✅ Preserves aspect ratio with black padding

### Client (`client/src/services/api.ts`)
- ✅ Updated to request JSON: `/v/:shortId?format=json`

## 🎯 Key Features

### Meta Tags Included
- ✅ Open Graph (Facebook, LinkedIn, etc.)
- ✅ Twitter Card
- ✅ Video metadata (og:video, dimensions, duration)
- ✅ Apple/iMessage tags
- ✅ Thumbnail (1200x630)

### Platform Support
- ✅ Discord - Thumbnail + inline video
- ✅ WhatsApp - Rich preview
- ✅ iMessage - Rich preview
- ✅ Twitter - Player card
- ✅ Facebook - Video preview
- ✅ Telegram - Link preview
- ✅ Slack - Rich unfurling

## 🔧 API Changes

### Before
```javascript
GET /v/abc123
→ Returns JSON (for everyone)
```

### After
```javascript
GET /v/abc123
→ Returns HTML with meta tags (default)

GET /v/abc123?format=json
→ Returns JSON (for API calls)
```

## 📝 Testing Checklist

- [ ] Build server: `cd server && npm run build`
- [ ] Build client: `cd client && npm run build`
- [ ] Restart server
- [ ] Test HTML: Visit `/v/:shortId` in browser
- [ ] Test JSON: `curl http://localhost:3000/v/:shortId?format=json`
- [ ] Upload new video, verify thumbnail is 1200x630
- [ ] Test with https://www.opengraph.xyz/
- [ ] Share in Discord

## 🐛 Troubleshooting

### Meta tags not showing in validator
```bash
# Check if HTML is returned
curl https://yourdomain.com/v/abc123

# Should see <meta property="og:image" content="..." />
```

### Client app not loading videos
```bash
# Check if JSON API works
curl https://yourdomain.com/v/abc123?format=json

# Should return {"video": {...}}
```

### Thumbnail not showing
```bash
# Check if thumbnail exists
ls uploads/thumbnails/

# Check if thumbnail is accessible
curl https://yourdomain.com/uploads/thumbnails/abc123.jpg
```

### Video not playing in Discord
- Ensure video is MP4 format
- Ensure video URL is publicly accessible (not localhost)
- Check CORS headers allow video streaming
- Verify `og:video` tags are present in HTML

## 📚 Documentation

- **Full Implementation Details:** `OG_META_TAGS_IMPLEMENTATION.md`
- **Testing Guide:** `TESTING_OG_TAGS.md`
- **Changes Summary:** `CHANGES_SUMMARY.md`

## 🎉 Success Criteria

Your implementation is working when:
1. ✅ Online validators show thumbnail and metadata
2. ✅ Discord shows thumbnail and plays video inline
3. ✅ WhatsApp shows rich link preview
4. ✅ Client app loads videos correctly
5. ✅ No errors in server logs

## 🔗 Useful Links

- **OpenGraph Validator:** https://www.opengraph.xyz/
- **Meta Tags Validator:** https://metatags.io/
- **Facebook Debugger:** https://developers.facebook.com/tools/debug/
- **Twitter Validator:** https://cards-dev.twitter.com/validator

## 💡 Pro Tips

1. **Test locally first** - Use ngrok or similar to expose localhost for testing
2. **Clear cache** - Most validators have a "Refresh" button to clear cache
3. **Check logs** - Server logs show which format is being served
4. **Use curl** - Quick way to verify HTML vs JSON responses
5. **Test in Discord** - Best platform for testing video embeds

