#!/bin/bash

# JobeVidz Backup Script
# Backs up uploads and data directories

set -e

BACKUP_DIR="${BACKUP_DIR:-/backups/jobevidz}"
DATE=$(date +%Y%m%d_%H%M%S)
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🔄 Starting backup..."
echo "Project directory: $PROJECT_DIR"
echo "Backup directory: $BACKUP_DIR"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Backup uploads directory
if [ -d "$PROJECT_DIR/uploads" ]; then
    echo "📦 Backing up uploads directory..."
    tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" -C "$PROJECT_DIR" uploads
    echo "✅ Uploads backed up to: $BACKUP_DIR/uploads_$DATE.tar.gz"
else
    echo "⚠️  Uploads directory not found"
fi

# Backup data directory
if [ -d "$PROJECT_DIR/data" ]; then
    echo "📦 Backing up data directory..."
    tar -czf "$BACKUP_DIR/data_$DATE.tar.gz" -C "$PROJECT_DIR" data
    echo "✅ Data backed up to: $BACKUP_DIR/data_$DATE.tar.gz"
else
    echo "⚠️  Data directory not found"
fi

# Keep only last 7 days of backups
echo "🧹 Cleaning old backups (keeping last 7 days)..."
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete

echo "✅ Backup completed successfully!"
echo ""
echo "Backup files:"
ls -lh "$BACKUP_DIR" | tail -n 10

