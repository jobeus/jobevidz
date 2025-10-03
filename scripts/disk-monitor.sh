#!/bin/bash

# JobeVidz Disk Usage Monitor
# Monitors disk usage and sends alerts

THRESHOLD=${THRESHOLD:-80}
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Check overall disk usage
DISK_USAGE=$(df -h "$PROJECT_DIR" | tail -1 | awk '{print $5}' | sed 's/%//')

echo "📊 Disk Usage Monitor"
echo "===================="
echo ""
echo "Overall disk usage: ${DISK_USAGE}%"

if [ "$DISK_USAGE" -gt "$THRESHOLD" ]; then
    echo "⚠️  WARNING: Disk usage is above ${THRESHOLD}%"
fi

echo ""
echo "Directory sizes:"
echo "----------------"

# Check uploads directory
if [ -d "$PROJECT_DIR/uploads" ]; then
    echo "Uploads:"
    du -sh "$PROJECT_DIR/uploads"
    du -sh "$PROJECT_DIR/uploads/videos" 2>/dev/null || echo "  videos: N/A"
    du -sh "$PROJECT_DIR/uploads/temp" 2>/dev/null || echo "  temp: N/A"
    du -sh "$PROJECT_DIR/uploads/metadata" 2>/dev/null || echo "  metadata: N/A"
fi

echo ""

# Check data directory
if [ -d "$PROJECT_DIR/data" ]; then
    echo "Data:"
    du -sh "$PROJECT_DIR/data"
fi

echo ""

# List largest video files
echo "Largest video files:"
echo "-------------------"
if [ -d "$PROJECT_DIR/uploads/videos" ]; then
    find "$PROJECT_DIR/uploads/videos" -type f -exec du -h {} + | sort -rh | head -10
else
    echo "No videos directory found"
fi

echo ""

# Check temp directory for old files
echo "Temp directory status:"
echo "---------------------"
if [ -d "$PROJECT_DIR/uploads/temp" ]; then
    TEMP_COUNT=$(find "$PROJECT_DIR/uploads/temp" -type f | wc -l)
    echo "Files in temp: $TEMP_COUNT"
    
    # Find files older than 1 hour
    OLD_TEMP=$(find "$PROJECT_DIR/uploads/temp" -type f -mmin +60 | wc -l)
    if [ "$OLD_TEMP" -gt 0 ]; then
        echo "⚠️  Files older than 1 hour: $OLD_TEMP (should be cleaned up)"
    fi
else
    echo "No temp directory found"
fi

