#!/bin/bash

# JobeVidz Health Check Script
# Verifies all services are running correctly

set -e

API_URL="${API_URL:-http://localhost:3000}"

echo "🏥 Running health checks..."
echo ""

# Check if server is running
echo "1. Checking API server..."
if curl -s -f "$API_URL/health" > /dev/null; then
    echo "   ✅ API server is responding"
    
    # Get detailed health info
    HEALTH=$(curl -s "$API_URL/health")
    echo "   📊 Health details:"
    echo "$HEALTH" | jq '.' 2>/dev/null || echo "$HEALTH"
else
    echo "   ❌ API server is not responding"
    exit 1
fi

echo ""

# Check PM2 process
echo "2. Checking PM2 process..."
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "jobevidz-api"; then
        echo "   ✅ PM2 process is running"
        pm2 list | grep "jobevidz-api"
    else
        echo "   ❌ PM2 process not found"
        exit 1
    fi
else
    echo "   ⚠️  PM2 not installed"
fi

echo ""

# Check FFmpeg
echo "3. Checking FFmpeg..."
if command -v ffmpeg &> /dev/null; then
    echo "   ✅ FFmpeg is installed"
    ffmpeg -version | head -n 1
else
    echo "   ❌ FFmpeg is not installed"
    exit 1
fi

echo ""

# Check yt-dlp
echo "4. Checking yt-dlp..."
if command -v yt-dlp &> /dev/null; then
    echo "   ✅ yt-dlp is installed"
    yt-dlp --version
else
    echo "   ❌ yt-dlp is not installed"
    exit 1
fi

echo ""

# Check disk space
echo "5. Checking disk space..."
DISK_USAGE=$(df -h . | tail -1 | awk '{print $5}' | sed 's/%//')
echo "   Disk usage: ${DISK_USAGE}%"
if [ "$DISK_USAGE" -gt 90 ]; then
    echo "   ⚠️  WARNING: Disk usage is above 90%"
elif [ "$DISK_USAGE" -gt 80 ]; then
    echo "   ⚠️  Disk usage is above 80%"
else
    echo "   ✅ Disk space is healthy"
fi

echo ""

# Check uploads directory size
echo "6. Checking uploads directory..."
if [ -d "uploads" ]; then
    UPLOADS_SIZE=$(du -sh uploads | cut -f1)
    echo "   📁 Uploads directory size: $UPLOADS_SIZE"
else
    echo "   ⚠️  Uploads directory not found"
fi

echo ""
echo "✅ Health check completed!"

