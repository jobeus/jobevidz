# Deploy Proxy Fix + Video MIME Type Fix

## What Was Fixed

### 1. Proxy Environment Variable Loading
The `YTDLP_PROXY` environment variable wasn't being read because it was loaded at module import time, before `dotenv.config()` ran.

**Changed:** Moved the `process.env.YTDLP_PROXY` read from module-level to inside the `getCommonYtDlpArgs()` function so it reads the value at runtime after dotenv has loaded the `.env` file.

### 2. Video MIME Type for Firefox
Firefox was showing "No video with supported format and MIME type found" because Express.static wasn't always setting the correct `Content-Type` header.

**Changed:** Added middleware to explicitly set proper MIME types for video files before serving them statically.

## Deploy to Remote Server

Run these commands on your **remote server** (`koala`):

```bash
# 1. Navigate to project directory
cd /var/www/jobevidz

# 2. Pull the latest code (if using git)
git pull

# 3. Build the server
cd server
npm run build

# 4. Go back to project root
cd ..

# 5. Restart PM2
pm2 restart jobevidz-api

# 6. Watch the logs
pm2 logs jobevidz-api --lines 0
```

## Verify It's Working

After restarting, try uploading an Instagram URL. You should see in the logs:

```
"Using proxy for yt-dlp" {"proxy":"http://sphgz6h0i8:..."}
```

And the yt-dlp command should include:
```
yt-dlp --proxy http://sphgz6h0i8:... --dump-json --no-playlist https://...
```

## Quick Test

```bash
# Test with an Instagram URL
curl -X POST https://vidzapi.jobe.wtf/api/videos/url-preview \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"url":"https://www.instagram.com/reels/DRKdnciD90x/"}'
```

## If It Still Doesn't Work

1. **Check .env file exists:**
   ```bash
   cat /var/www/jobevidz/server/.env | grep YTDLP_PROXY
   ```

2. **Check the compiled code:**
   ```bash
   cat /var/www/jobevidz/server/dist/utils/urlDownloader.js | grep -A 5 "YTDLP_PROXY"
   ```

3. **Check PM2 logs for the proxy message:**
   ```bash
   pm2 logs jobevidz-api | grep -i proxy
   ```

## What Changed in Code

**Before:**
```typescript
// Top of file - runs at module import time
const YTDLP_PROXY = process.env.YTDLP_PROXY;

function getCommonYtDlpArgs(): string[] {
  if (YTDLP_PROXY) {
    args.push('--proxy', YTDLP_PROXY);
  }
}
```

**After:**
```typescript
// No top-level constant

function getCommonYtDlpArgs(): string[] {
  // Read at runtime, after dotenv.config() has run
  const YTDLP_PROXY = process.env.YTDLP_PROXY;
  
  if (YTDLP_PROXY) {
    args.push('--proxy', YTDLP_PROXY);
  }
}
```

## Files Modified

- `server/src/utils/urlDownloader.ts` - Moved YTDLP_PROXY read to runtime
- `server/src/index.ts` - Added MIME type middleware for video files
- `server/dist/` - Compiled output (auto-generated)

