#!/bin/bash

# JobeVidz Update Script
# Safely updates the application

set -e

echo "🔄 Starting application update..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Backup before update
echo "📦 Creating backup before update..."
./scripts/backup.sh

# Pull latest changes
echo "📥 Pulling latest changes from git..."
git pull

# Install dependencies
echo "📦 Installing dependencies..."
npm run install:all

# Build application
echo "🔨 Building application..."
npm run build:all

# Restart server
echo "🔄 Restarting server..."
npm run restart:prod

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 5

# Health check
echo "🏥 Running health check..."
./scripts/health-check.sh

echo ""
echo -e "${GREEN}✅ Update completed successfully!${NC}"
echo ""
echo "📝 View logs with: npm run logs:prod"

