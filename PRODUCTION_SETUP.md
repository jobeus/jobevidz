# 🚀 Production Deployment Guide

Complete guide for deploying JobeVidz to a production Linux server.

## 📋 Prerequisites

- Fresh Ubuntu 20.04+ or Debian 11+ server
- Root or sudo access
- Domain name pointed to your server IP
- At least 2GB RAM, 20GB disk space

## 🔧 Step 1: Server Setup

### Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### Install Node.js 20 (LTS)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Should be v20.x
```

### Install FFmpeg
```bash
sudo apt install -y ffmpeg
ffmpeg -version
```

### Install yt-dlp
```bash
sudo apt install -y yt-dlp
# Or if not available in repos:
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
yt-dlp --version
```

### Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

### Install Nginx
```bash
sudo apt install -y nginx
```

### Setup Firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

## 📦 Step 2: Deploy Application

### Create Application Directory
```bash
sudo mkdir -p /var/www/jobevidz
sudo chown -R $USER:$USER /var/www/jobevidz
cd /var/www/jobevidz
```

### Clone Repository
```bash
git clone <your-repo-url> .
# Or upload files via rsync:
# rsync -avz --exclude 'node_modules' ./ user@server:/var/www/jobevidz/
```

### Configure Environment Variables

#### Server Environment
```bash
cd /var/www/jobevidz/server
cp .env.production .env
nano .env
```

Update these values:
```env
PORT=3000
NODE_ENV=production
JWT_SECRET=<generate-with-command-below>
JWT_EXPIRES_IN=7d
MAX_FILE_SIZE=1073741824
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

Generate JWT secret:
```bash
openssl rand -hex 64
```

#### Client Environment
```bash
cd /var/www/jobevidz/client
nano .env.production
```

Update:
```env
VITE_API_URL=https://api.yourdomain.com
```

### Install Dependencies and Build
```bash
cd /var/www/jobevidz
chmod +x deploy.sh
./deploy.sh
```

Or manually:
```bash
npm run install:all
npm run build:all
```

### Start Server with PM2
```bash
npm run start:prod
pm2 save
pm2 startup  # Follow the instructions it gives
```

Verify it's running:
```bash
pm2 list
pm2 logs jobevidz-api
curl http://localhost:3000/health
```

## 🌐 Step 3: Configure Nginx

### Copy Nginx Configuration
```bash
sudo cp /var/www/jobevidz/nginx.conf /etc/nginx/sites-available/jobevidz
```

### Edit Configuration
```bash
sudo nano /etc/nginx/sites-available/jobevidz
```

Replace `yourdomain.com` and `api.yourdomain.com` with your actual domains.

### Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/jobevidz /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
```

### Test HTTP Access
```bash
curl http://yourdomain.com
curl http://api.yourdomain.com/health
```

## 🔒 Step 4: Setup SSL with Let's Encrypt

### Install Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Obtain SSL Certificates
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com
```

Follow the prompts. Certbot will automatically configure Nginx for HTTPS.

### Test Auto-Renewal
```bash
sudo certbot renew --dry-run
```

### Verify HTTPS
```bash
curl https://yourdomain.com
curl https://api.yourdomain.com/health
```

## 📊 Step 5: Setup Monitoring & Backups

### Make Scripts Executable
```bash
cd /var/www/jobevidz
chmod +x scripts/*.sh
```

### Test Health Check
```bash
./scripts/health-check.sh
```

### Setup Automated Backups
```bash
# Create backup directory
sudo mkdir -p /backups/jobevidz
sudo chown $USER:$USER /backups/jobevidz

# Test backup
./scripts/backup.sh

# Add to crontab for daily backups at 2 AM
crontab -e
```

Add this line:
```cron
0 2 * * * /var/www/jobevidz/scripts/backup.sh >> /var/log/jobevidz-backup.log 2>&1
```

### Setup Disk Monitoring
Add to crontab for daily monitoring:
```cron
0 8 * * * /var/www/jobevidz/scripts/disk-monitor.sh >> /var/log/jobevidz-disk.log 2>&1
```

## 🔍 Step 6: Verify Deployment

### Run Complete Health Check
```bash
cd /var/www/jobevidz
./scripts/health-check.sh
```

### Test Video Upload
1. Visit https://yourdomain.com
2. Register a new account
3. Upload a test video
4. Verify playback works
5. Test URL download feature

### Check Logs
```bash
# PM2 logs
npm run logs:prod

# Nginx logs
sudo tail -f /var/log/nginx/jobevidz-api-access.log
sudo tail -f /var/log/nginx/jobevidz-api-error.log
```

## 🛠️ Maintenance Commands

### Update Application
```bash
cd /var/www/jobevidz
./scripts/update.sh
```

### Restart Server
```bash
npm run restart:prod
```

### View Logs
```bash
npm run logs:prod
```

### Check Disk Usage
```bash
./scripts/disk-monitor.sh
```

### Manual Backup
```bash
./scripts/backup.sh
```

## 🚨 Troubleshooting

### Server Won't Start
```bash
# Check logs
pm2 logs jobevidz-api

# Common issues:
# - FFmpeg not installed: sudo apt install ffmpeg
# - yt-dlp not installed: sudo apt install yt-dlp
# - Port in use: sudo lsof -i :3000
# - Missing .env file: cp server/.env.production server/.env
```

### Upload Fails
```bash
# Check disk space
df -h

# Check permissions
ls -la /var/www/jobevidz/uploads

# Check Nginx config
sudo nginx -t
```

### Videos Won't Play
```bash
# Check if video file exists
ls -la /var/www/jobevidz/uploads/videos/

# Check Nginx is serving static files
curl -I https://api.yourdomain.com/uploads/videos/test.mp4

# Check CORS headers
curl -I https://api.yourdomain.com/health
```

## 📈 Performance Optimization

### Enable Nginx Caching
Add to Nginx config:
```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=1g inactive=60m;
```

### Increase PM2 Instances
Edit `ecosystem.config.js`:
```javascript
instances: 2,  // Or 'max' for all CPU cores
```

### Setup Log Rotation
```bash
sudo nano /etc/logrotate.d/jobevidz
```

Add:
```
/var/www/jobevidz/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
}
```

## 🔐 Security Checklist

- [x] Strong JWT_SECRET set
- [x] HTTPS/SSL enabled
- [x] Firewall configured
- [x] CORS restricted to production domains
- [x] Rate limiting enabled
- [x] Security headers (helmet) enabled
- [x] Regular backups scheduled
- [x] Log rotation configured
- [ ] fail2ban installed (optional)
- [ ] Monitoring/alerting setup (optional)

## 📞 Support

For issues, check:
1. PM2 logs: `npm run logs:prod`
2. Nginx logs: `/var/log/nginx/`
3. Health endpoint: `https://api.yourdomain.com/health`
4. Disk space: `./scripts/disk-monitor.sh`

