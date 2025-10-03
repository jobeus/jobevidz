# ✅ Production Deployment Checklist

Use this checklist to ensure a smooth deployment to production.

## 📋 Pre-Deployment

### Local Preparation
- [ ] All code committed and pushed to repository
- [ ] Tests passing (if you have tests)
- [ ] Build succeeds locally: `npm run build:all`
- [ ] Review and update `ALLOWED_ORIGINS` list

### Server Preparation
- [ ] Fresh Ubuntu 20.04+ or Debian 11+ server
- [ ] Root or sudo access confirmed
- [ ] Domain DNS pointed to server IP (A records)
- [ ] At least 2GB RAM, 20GB disk space
- [ ] SSH access configured

### Configuration Files Ready
- [ ] `server/.env` - JWT_SECRET generated (use `openssl rand -hex 64`)
- [ ] `client/.env.production` - VITE_API_URL set to production API domain
- [ ] `nginx.conf` - Domains updated (yourdomain.com, api.yourdomain.com)
- [ ] `.env` (for Docker) - If using Docker deployment

---

## 🔧 Server Setup

### System Dependencies
- [ ] Node.js 20+ installed
- [ ] FFmpeg installed and verified: `ffmpeg -version`
- [ ] yt-dlp installed and verified: `yt-dlp --version`
- [ ] PM2 installed globally: `npm install -g pm2`
- [ ] Nginx installed: `nginx -v`
- [ ] Firewall configured: `sudo ufw status`

### Application Deployment
- [ ] Application cloned to `/var/www/jobevidz`
- [ ] Correct ownership: `sudo chown -R $USER:$USER /var/www/jobevidz`
- [ ] Dependencies installed: `npm run install:all`
- [ ] Application built: `npm run build:all`
- [ ] Server started: `npm run start:prod`
- [ ] PM2 saved: `pm2 save`
- [ ] PM2 startup configured: `pm2 startup`

### Nginx Configuration
- [ ] Nginx config copied to `/etc/nginx/sites-available/jobevidz`
- [ ] Domains updated in config file
- [ ] Symlink created: `/etc/nginx/sites-enabled/jobevidz`
- [ ] Nginx config tested: `sudo nginx -t`
- [ ] Nginx restarted: `sudo systemctl restart nginx`

### SSL/HTTPS
- [ ] Certbot installed
- [ ] SSL certificates obtained: `sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com`
- [ ] Auto-renewal tested: `sudo certbot renew --dry-run`
- [ ] HTTPS working for both domains

---

## 🧪 Testing

### Basic Functionality
- [ ] Health endpoint responds: `curl https://api.yourdomain.com/health`
- [ ] Frontend loads: Visit `https://yourdomain.com`
- [ ] User registration works
- [ ] User login works
- [ ] Video upload works (test with small file)
- [ ] Video playback works
- [ ] Short URL redirect works: `/v/xxxxx`
- [ ] URL download feature works (YouTube, etc.)

### Performance & Security
- [ ] HTTPS redirects working (HTTP → HTTPS)
- [ ] CORS headers correct (check browser console)
- [ ] Rate limiting active (test with many requests)
- [ ] Large file upload works (test with 500MB+ file)
- [ ] Video streaming works (no buffering issues)
- [ ] Mobile responsive (test on phone)

### Monitoring
- [ ] Health check script works: `./scripts/health-check.sh`
- [ ] PM2 logs accessible: `npm run logs:prod`
- [ ] Nginx logs accessible: `sudo tail -f /var/log/nginx/jobevidz-api-access.log`
- [ ] Disk monitoring works: `./scripts/disk-monitor.sh`

---

## 🔒 Security

### Configuration
- [ ] Strong JWT_SECRET set (64+ character random string)
- [ ] ALLOWED_ORIGINS restricted to production domains only
- [ ] NODE_ENV=production set
- [ ] Default passwords changed (if any)
- [ ] .env files not committed to git

### Server Hardening
- [ ] Firewall enabled: `sudo ufw enable`
- [ ] Only necessary ports open (22, 80, 443)
- [ ] SSH key authentication (password auth disabled)
- [ ] fail2ban installed (optional but recommended)
- [ ] Regular security updates enabled

### Application Security
- [ ] Rate limiting enabled and tested
- [ ] CORS restricted to production domains
- [ ] Security headers enabled (helmet)
- [ ] File upload size limits configured
- [ ] No sensitive data in logs

---

## 📊 Monitoring & Backups

### Automated Backups
- [ ] Backup directory created: `/backups/jobevidz`
- [ ] Backup script tested: `./scripts/backup.sh`
- [ ] Cron job configured for daily backups
- [ ] Backup retention policy set (7 days default)
- [ ] Backup restoration tested

### Monitoring Setup
- [ ] Disk monitoring cron job configured
- [ ] Log rotation configured
- [ ] PM2 monitoring: `pm2 monit`
- [ ] Uptime monitoring (optional: UptimeRobot, Pingdom)
- [ ] Error alerting configured (optional)

---

## 📝 Documentation

### Team Documentation
- [ ] Production server details documented (IP, domain, SSH key location)
- [ ] Deployment process documented
- [ ] Emergency contacts listed
- [ ] Backup restoration procedure documented
- [ ] Rollback procedure documented

### Access & Credentials
- [ ] Server SSH access documented
- [ ] Domain registrar access documented
- [ ] SSL certificate renewal process documented
- [ ] Admin user credentials stored securely
- [ ] JWT_SECRET backed up securely

---

## 🚀 Post-Deployment

### Immediate Actions
- [ ] Announce deployment to team
- [ ] Monitor logs for first 24 hours
- [ ] Test all critical features
- [ ] Verify backups are running
- [ ] Check disk space: `df -h`

### First Week
- [ ] Monitor error rates
- [ ] Check disk usage growth
- [ ] Verify SSL auto-renewal
- [ ] Review access logs for issues
- [ ] Gather user feedback

### Ongoing Maintenance
- [ ] Weekly: Check disk space and logs
- [ ] Monthly: Review and clean old videos (if needed)
- [ ] Monthly: Test backup restoration
- [ ] Quarterly: Security updates
- [ ] Quarterly: Review and optimize performance

---

## 🆘 Emergency Contacts

| Role | Name | Contact |
|------|------|---------|
| Server Admin | | |
| Domain Admin | | |
| Developer | | |
| On-Call | | |

---

## 📞 Support Resources

- **Full Deployment Guide**: `PRODUCTION_SETUP.md`
- **Quick Reference**: `QUICK_DEPLOY.md`
- **Health Check**: `./scripts/health-check.sh`
- **Logs**: `npm run logs:prod`
- **Restart**: `npm run restart:prod`

---

## ✅ Sign-Off

- [ ] Deployment completed by: _________________ Date: _________
- [ ] Tested by: _________________ Date: _________
- [ ] Approved by: _________________ Date: _________

**Notes:**
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________

