# GCP Hosting Guide - Vete Platform

> Self-hosted deployment on Google Cloud Platform VMs (Free Tier eligible)

## Overview

This guide covers deploying Vete on GCP Compute Engine VMs as an alternative to Vercel. Ideal for:
- Cost control (free tier + credits)
- Regional data compliance (LatAm)
- Full infrastructure control

## Current Infrastructure

| Server | IP | Purpose | Specs |
|--------|-----|---------|-------|
| **vete-prod** | 34.151.201.27 | Production Next.js app | e2-medium (4GB) |
| **nyx-server** | 34.39.173.214 | OpenClaw/Dev tools | e2-micro (1GB) |

### Tech Stack
- **OS:** Debian/Ubuntu
- **Runtime:** Node.js 22 LTS
- **Process Manager:** PM2
- **Reverse Proxy:** nginx
- **SSL:** Let's Encrypt (Certbot)

---

## GCP Free Tier & Credits

### New Account Benefits
- **$300 USD free credits** for 90 days
- Use for any GCP service

### Always-Free Resources (Post-90 days)
| Resource | Free Tier |
|----------|-----------|
| e2-micro VM | 1 instance/month (us-west1, us-central1, us-east1) |
| Storage | 30GB HDD |
| Network | 1GB egress to most regions |

### Estimated Costs (Post-Free Tier)
| Instance Type | RAM | Cost/Month |
|---------------|-----|------------|
| e2-micro | 1GB | ~$0 (free tier) |
| e2-small | 2GB | ~$13-15 |
| e2-medium | 4GB | ~$25-35 |

---

## Setup Guide

### Step 1: Create GCP Account

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Sign in with Google account
3. Accept terms and activate free trial
4. Enable billing (required even for free tier)

### Step 2: Create VM Instance

```bash
# Via gcloud CLI (or use Console UI)
gcloud compute instances create vete-prod \
  --zone=southamerica-east1-b \
  --machine-type=e2-medium \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --boot-disk-size=30GB \
  --tags=http-server,https-server
```

**Console UI Path:**
1. Compute Engine > VM instances > Create
2. Select region (southamerica-east1 for LatAm)
3. Choose machine type
4. Select Debian 12 or Ubuntu 22.04
5. Enable HTTP/HTTPS firewall rules

### Step 3: Configure Firewall

```bash
# Allow HTTP/HTTPS traffic
gcloud compute firewall-rules create allow-http \
  --allow tcp:80 --target-tags=http-server

gcloud compute firewall-rules create allow-https \
  --allow tcp:443 --target-tags=https-server
```

### Step 4: SSH into VM

```bash
gcloud compute ssh vete-prod --zone=southamerica-east1-b
# Or use Console SSH button
```

---

## Server Setup

### Install Node.js 22

```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -

# Install Node.js
sudo apt-get install -y nodejs

# Verify
node --version  # v22.x.x
npm --version
```

### Install PM2

```bash
# Install PM2 globally
sudo npm install -g pm2

# Enable startup on boot
pm2 startup systemd
# Run the command it outputs (with sudo)
```

### Install nginx

```bash
sudo apt-get update
sudo apt-get install -y nginx

# Enable and start
sudo systemctl enable nginx
sudo systemctl start nginx
```

### Install Certbot (SSL)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
```

---

## Deploy Application

### Clone Repository

```bash
cd /home/$USER
git clone https://github.com/ai-whisperers/Vete.git
cd Vete/web
```

### Install Dependencies

```bash
npm ci --production=false  # Need devDeps for build
```

### Configure Environment

```bash
cp .env.example .env.local
nano .env.local
```

Required variables:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://...

# Optional
STRIPE_SECRET_KEY=sk_live_...
RESEND_API_KEY=re_...
```

### Build Application

```bash
npm run build
```

### Start with PM2

```bash
# Start Next.js production server
pm2 start npm --name "vete" -- start

# Save PM2 process list
pm2 save

# Monitor
pm2 logs vete
pm2 monit
```

---

## nginx Configuration

### Create Site Config

```bash
sudo nano /etc/nginx/sites-available/vete
```

```nginx
server {
    listen 80;
    server_name your-domain.com 34.151.201.27;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static file caching
    location /_next/static {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

### Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/vete /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Remove default
sudo nginx -t  # Test config
sudo systemctl reload nginx
```

---

## SSL Setup (HTTPS)

### With Domain

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### Auto-Renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot auto-installs a systemd timer
systemctl status certbot.timer
```

---

## Deployment Updates

### Manual Update

```bash
cd ~/Vete
git pull origin main
cd web
npm ci
npm run build
pm2 restart vete
```

### Automated Deployment Script

Create `~/deploy.sh`:
```bash
#!/bin/bash
set -e

cd ~/Vete
git pull origin main
cd web
npm ci
npm run build
pm2 restart vete

echo "✅ Deployment complete!"
```

```bash
chmod +x ~/deploy.sh
```

---

## Monitoring

### PM2 Commands

```bash
pm2 status          # Process status
pm2 logs vete       # View logs
pm2 monit           # Real-time monitor
pm2 restart vete    # Restart app
pm2 reload vete     # Zero-downtime reload
```

### nginx Logs

```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log
```

### System Health

```bash
# CPU/Memory
htop

# Disk usage
df -h

# Memory
free -h
```

---

## Troubleshooting

### App Not Starting

```bash
# Check PM2 logs
pm2 logs vete --lines 100

# Check if port 3000 is in use
sudo lsof -i :3000

# Restart from scratch
pm2 delete vete
pm2 start npm --name "vete" -- start
```

### nginx 502 Bad Gateway

```bash
# Check if app is running
curl localhost:3000

# Check nginx error log
sudo tail -f /var/log/nginx/error.log

# Restart services
pm2 restart vete
sudo systemctl restart nginx
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal

# Check nginx SSL config
sudo nginx -t
```

### Out of Memory

```bash
# Check memory usage
free -h
pm2 monit

# Add swap (if needed)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## Security Checklist

- [ ] SSH key authentication only (disable password)
- [ ] Firewall configured (only 80, 443, 22)
- [ ] fail2ban installed for brute-force protection
- [ ] Regular system updates (`sudo apt update && sudo apt upgrade`)
- [ ] SSL/TLS configured with auto-renewal
- [ ] Environment variables secured (not in git)

### Basic Hardening

```bash
# Install fail2ban
sudo apt-get install -y fail2ban
sudo systemctl enable fail2ban

# Disable root login & password auth
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
# Set: PasswordAuthentication no
sudo systemctl restart sshd
```

---

## Comparison: GCP vs Vercel

| Aspect | GCP VM | Vercel |
|--------|--------|--------|
| **Cost** | ~$0-35/mo | Free-$20/mo |
| **Control** | Full | Limited |
| **Scaling** | Manual | Automatic |
| **SSL** | DIY (Certbot) | Automatic |
| **Deploy** | Manual/Script | Git push |
| **Region** | Any | Limited |
| **Best For** | Full control, LatAm compliance | Quick deploys, less ops |

---

## Related Documentation

- [Quick Start Guide](../getting-started/quick-start.md)
- [Environment Variables](../development/environment.md)
- [Database Setup](../database/overview.md)

---

*Last updated: February 2026*
