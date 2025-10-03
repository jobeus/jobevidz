#!/bin/bash

# JobeVidz Deployment Script
# This script automates the deployment process

set -e  # Exit on any error

echo "🚀 Starting JobeVidz deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Are you in the project root?${NC}"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}Warning: PM2 is not installed. Installing globally...${NC}"
    npm install -g pm2
fi

# Check if FFmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo -e "${RED}Error: FFmpeg is not installed. Please install it first.${NC}"
    echo "Ubuntu/Debian: sudo apt install ffmpeg"
    echo "macOS: brew install ffmpeg"
    exit 1
fi

# Check if yt-dlp is installed
if ! command -v yt-dlp &> /dev/null; then
    echo -e "${YELLOW}Warning: yt-dlp is not installed. Installing...${NC}"
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt install -y yt-dlp || sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && sudo chmod a+rx /usr/local/bin/yt-dlp
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install yt-dlp
    fi
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Create logs directory
mkdir -p logs

# Install dependencies
echo "📦 Installing dependencies..."
npm run install:all

# Check if .env files exist
if [ ! -f "server/.env" ]; then
    echo -e "${YELLOW}⚠️  server/.env not found. Copying from .env.production...${NC}"
    if [ -f "server/.env.production" ]; then
        cp server/.env.production server/.env
        echo -e "${RED}⚠️  IMPORTANT: Edit server/.env and set your JWT_SECRET!${NC}"
    else
        echo -e "${RED}Error: server/.env.production not found${NC}"
        exit 1
    fi
fi

if [ ! -f "client/.env.production" ]; then
    echo -e "${RED}Error: client/.env.production not found${NC}"
    exit 1
fi

# Build the application
echo "🔨 Building application..."
npm run build:all

if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build completed successfully${NC}"

# Start or restart the server with PM2
echo "🚀 Starting server with PM2..."
if pm2 list | grep -q "jobevidz-api"; then
    echo "Restarting existing process..."
    npm run restart:prod
else
    echo "Starting new process..."
    npm run start:prod
fi

# Save PM2 process list
pm2 save

echo ""
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo "📊 Server Status:"
pm2 list
echo ""
echo "📝 View logs with: npm run logs:prod"
echo "🔄 Restart with: npm run restart:prod"
echo "🛑 Stop with: npm run stop:prod"
echo ""
echo -e "${YELLOW}⚠️  Next steps:${NC}"
echo "1. Configure Nginx (see nginx.conf)"
echo "2. Set up SSL with certbot"
echo "3. Update client/.env.production with your domain"
echo "4. Update server/.env with a strong JWT_SECRET"
echo ""

