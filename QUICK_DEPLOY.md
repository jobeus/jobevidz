# ⚡ Quick Deployment Guide

## 🚀 Option 1: Traditional VPS (Recommended)

### On Your Server:
```bash
# 1. Install dependencies
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs ffmpeg yt-dlp nginx
sudo npm install -g pm2

# 2. Clone and setup
sudo mkdir -p /var/www/jobevidz
sudo chown $USER:$USER /var/www/jobevidz
cd /var/www/jobevidz
git clone <your-repo> .

# 3. Configure
cd server
cp .env.production .env
nano .env  # Set JWT_SECRET with: openssl rand -hex 64

cd ../client
nano .env.production  # Set VITE_API_URL=https://api.yourdomain.com

# 4. Deploy
cd ..
./deploy.sh

# 5. Setup Nginx
sudo cp nginx.conf /etc/nginx/sites-available/jobevidz
sudo nano /etc/nginx/sites-available/jobevidz  # Update domains
sudo ln -s /etc/nginx/sites-available/jobevidz /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx

# 6. Setup SSL
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com
```

**Done!** Visit https://yourdomain.com

---

## 🐳 Option 2: Docker

### On Your Server:
```bash
# 1. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo apt install docker-compose-plugin

# 2. Clone and setup
git clone <your-repo> jobevidz
cd jobevidz

# 3. Configure
cp .env.docker.example .env
nano .env  # Set JWT_SECRET and ALLOWED_ORIGINS

# 4. Build client
cd client
npm install
npm run build

# 5. Deploy
cd ..
docker compose up -d

# 6. Check status
docker compose ps
docker compose logs -f
```

**Done!** Visit http://your-server-ip

---

## 📝 Essential Commands

### PM2 Deployment
```bash
npm run start:prod      # Start
npm run restart:prod    # Restart
npm run stop:prod       # Stop
npm run logs:prod       # View logs
```

### Docker Deployment
```bash
docker compose up -d           # Start
docker compose restart         # Restart
docker compose down            # Stop
docker compose logs -f api     # View logs
```

### Maintenance
```bash
./scripts/health-check.sh      # Check system health
./scripts/backup.sh            # Backup data
./scripts/disk-monitor.sh      # Check disk usage
./scripts/update.sh            # Update application
```

---

## ⚙️ Configuration Files

| File | Purpose |
|------|---------|
| `server/.env` | Server configuration (JWT secret, etc.) |
| `client/.env.production` | Client API URL |
| `nginx.conf` | Nginx reverse proxy config |
| `ecosystem.config.js` | PM2 process config |
| `docker-compose.yml` | Docker orchestration |

---

## 🔒 Security Checklist

Before going live:
- [ ] Set strong JWT_SECRET in `server/.env`
- [ ] Update domains in `nginx.conf`
- [ ] Update VITE_API_URL in `client/.env.production`
- [ ] Enable SSL with certbot
- [ ] Configure firewall: `sudo ufw enable`
- [ ] Setup automated backups (cron)
- [ ] Test video upload and playback

---

## 🆘 Troubleshooting

**Server won't start?**
```bash
npm run logs:prod
# Check: FFmpeg installed? yt-dlp installed? .env file exists?
```

**Upload fails?**
```bash
df -h  # Check disk space
sudo nginx -t  # Check Nginx config
```

**Need help?**
- Full guide: See `PRODUCTION_SETUP.md`
- Health check: `./scripts/health-check.sh`
- Logs: `npm run logs:prod` or `docker compose logs -f`

