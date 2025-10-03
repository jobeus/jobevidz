# Deployment Guide

This guide covers deploying JobeVidz to production.

## Prerequisites

- Node.js 18+ installed on the server
- FFmpeg installed on the server
- Domain name (optional but recommended)
- SSL certificate (recommended for production)

## Environment Configuration

### Server Environment Variables

Create a `.env` file in the `server` directory:

```env
PORT=3000
NODE_ENV=production
JWT_SECRET=<generate-a-strong-random-secret>
JWT_EXPIRES_IN=7d
MAX_FILE_SIZE=1073741824
```

**Important:** Generate a strong JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Client Environment Variables

Create a `.env.production` file in the `client` directory:

```env
VITE_API_URL=https://api.yourdomain.com
```

## Building for Production

### Build the Server

```bash
cd server
npm install
npm run build
```

This creates a `dist` directory with compiled JavaScript.

### Build the Client

```bash
cd client
npm install
npm run build
```

This creates a `dist` directory with optimized static files.

## Deployment Options

### Option 1: Traditional VPS (Ubuntu/Debian)

#### 1. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install FFmpeg
sudo apt install -y ffmpeg

# Install PM2 for process management
sudo npm install -g pm2
```

#### 2. Upload Files

Upload your project to the server (e.g., `/var/www/jobevidz`):

```bash
rsync -avz --exclude 'node_modules' ./ user@server:/var/www/jobevidz/
```

#### 3. Install Dependencies

```bash
cd /var/www/jobevidz
npm run install:all
```

#### 4. Build Projects

```bash
npm run build:server
npm run build:client
```

#### 5. Start Server with PM2

```bash
cd /var/www/jobevidz/server
pm2 start dist/index.js --name jobevidz-api
pm2 save
pm2 startup
```

#### 6. Serve Client with Nginx

Install Nginx:
```bash
sudo apt install -y nginx
```

Create Nginx configuration (`/etc/nginx/sites-available/jobevidz`):

```nginx
# API Server
server {
    listen 80;
    server_name api.yourdomain.com;

    client_max_body_size 1G;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Client
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    root /var/www/jobevidz/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/jobevidz /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 7. Setup SSL with Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com
```

### Option 2: Docker Deployment

Create `Dockerfile` for server:

```dockerfile
FROM node:18-alpine

RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY server/package*.json ./
RUN npm ci --only=production

COPY server/dist ./dist
COPY server/.env .env

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./uploads:/app/uploads
      - ./data:/app/data
    environment:
      - NODE_ENV=production
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./client/dist:/usr/share/nginx/html
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - api
    restart: unless-stopped
```

Deploy:
```bash
docker-compose up -d
```

### Option 3: Cloud Platforms

#### Heroku

1. Create `Procfile` in server directory:
```
web: node dist/index.js
```

2. Deploy:
```bash
heroku create jobevidz-api
heroku buildpacks:add --index 1 https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest.git
git subtree push --prefix server heroku main
```

#### Vercel (Client only)

```bash
cd client
vercel --prod
```

#### Railway

1. Connect your GitHub repository
2. Configure build command: `cd server && npm install && npm run build`
3. Configure start command: `cd server && npm start`

## Post-Deployment

### 1. Verify Installation

```bash
# Check server health
curl https://api.yourdomain.com/health

# Check client
curl https://yourdomain.com
```

### 2. Monitor Logs

```bash
# PM2 logs
pm2 logs jobevidz-api

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 3. Setup Backups

Backup the following directories regularly:
- `/var/www/jobevidz/uploads` - Video files
- `/var/www/jobevidz/data` - User data and mappings

Example backup script:
```bash
#!/bin/bash
BACKUP_DIR="/backups/jobevidz"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup uploads and data
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/jobevidz/uploads
tar -czf $BACKUP_DIR/data_$DATE.tar.gz /var/www/jobevidz/data

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

### 4. Security Checklist

- [ ] Change default JWT secret
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall (UFW)
- [ ] Set up fail2ban
- [ ] Regular security updates
- [ ] Implement rate limiting
- [ ] Add CORS restrictions
- [ ] Regular backups
- [ ] Monitor disk space (uploads can grow large)

## Scaling Considerations

### Storage

For large-scale deployments, consider:
- AWS S3 or similar object storage for video files
- CDN for video delivery
- Database (PostgreSQL/MongoDB) instead of JSON files

### Performance

- Add Redis for caching
- Implement video transcoding queue
- Load balancer for multiple server instances
- Separate video processing workers

## Troubleshooting

### Server won't start

Check logs:
```bash
pm2 logs jobevidz-api
```

Common issues:
- FFmpeg not installed
- Port already in use
- Missing environment variables

### Upload fails

- Check disk space: `df -h`
- Verify FFmpeg: `ffmpeg -version`
- Check Nginx client_max_body_size
- Review server logs

### Videos won't play

- Verify video file exists in uploads directory
- Check file permissions
- Ensure Nginx is serving static files correctly
- Check browser console for CORS errors

## Maintenance

### Update Application

```bash
cd /var/www/jobevidz
git pull
npm run install:all
npm run build:server
npm run build:client
pm2 restart jobevidz-api
```

### Monitor Disk Usage

```bash
du -sh /var/www/jobevidz/uploads
```

### Clean Old Videos (if needed)

Implement a cleanup script or manual process to remove old/unused videos.

