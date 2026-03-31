# Cloudflare Tunnels Guide

> Self-hosted deployment with Cloudflare Tunnels for secure, zero-trust access.

## Table of Contents

- [Overview](#overview)
- [When to Use Tunnels](#when-to-use-tunnels)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Tunnel Setup](#tunnel-setup)
- [Configuration](#configuration)
- [DNS Setup](#dns-setup)
- [Docker Integration](#docker-integration)
- [Multiple Domains](#multiple-domains)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Overview

Cloudflare Tunnels provide a secure way to expose your self-hosted Vete installation to the internet without:

- Opening firewall ports
- Configuring port forwarding
- Exposing your server's IP address
- Managing SSL certificates manually

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                         Your Network                            │
│  ┌─────────────────┐     ┌─────────────────┐                   │
│  │   Vete App      │◄────│   cloudflared   │──────┐            │
│  │   localhost:3000│     │   (daemon)      │      │            │
│  └─────────────────┘     └─────────────────┘      │            │
│                                                    │            │
└────────────────────────────────────────────────────│────────────┘
                                                     │
                         Outbound Connection Only    │
                                                     ▼
                                          ┌─────────────────────┐
                                          │  Cloudflare Edge    │
                                          │  - SSL Termination  │
                                          │  - DDoS Protection  │
                                          │  - WAF              │
                                          └─────────┬───────────┘
                                                    │
                                                    ▼
                                          ┌─────────────────────┐
                                          │  terrapet.com.py    │
                                          │  (your domain)      │
                                          └─────────────────────┘
```

---

## When to Use Tunnels

### Recommended For

- **Home lab deployments** - No public IP or dynamic IP
- **Behind NAT/CGNAT** - ISP doesn't provide public IP
- **Corporate networks** - Firewall restrictions
- **Security-conscious setups** - Zero-trust architecture
- **Multi-location deployments** - Centralized edge access

### Not Recommended For

- **High-traffic production** - Vercel is more scalable
- **Latency-sensitive apps** - Adds slight overhead
- **Simple setups** - If you have a public IP and can use Vercel

---

## Prerequisites

1. **Cloudflare Account** - Free tier is sufficient
2. **Domain on Cloudflare** - DNS managed by Cloudflare
3. **Docker** - For containerized deployment
4. **cloudflared CLI** - Tunnel daemon

### Install cloudflared

```bash
# macOS
brew install cloudflared

# Linux (Debian/Ubuntu)
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb

# Docker (no installation needed)
docker pull cloudflare/cloudflared:latest
```

---

## Quick Start

```bash
# 1. Authenticate with Cloudflare
cloudflared tunnel login

# 2. Create a tunnel
cloudflared tunnel create vete-tunnel

# 3. Note the tunnel ID (UUID) displayed

# 4. Generate config using our CLI
node scripts/domains.mjs generate-cloudflare --tunnel vete-tunnel

# 5. Configure DNS
cloudflared tunnel route dns vete-tunnel terrapet.com.py

# 6. Run the tunnel
cloudflared tunnel run vete-tunnel
```

---

## Tunnel Setup

### Step 1: Authenticate

```bash
cloudflared tunnel login
```

This opens a browser window to authenticate with your Cloudflare account. After authentication, a certificate is saved to `~/.cloudflared/cert.pem`.

### Step 2: Create Tunnel

```bash
cloudflared tunnel create vete-tunnel
```

Output:
```
Tunnel credentials written to /home/user/.cloudflared/<TUNNEL_UUID>.json
Created tunnel vete-tunnel with id <TUNNEL_UUID>
```

**Save the tunnel UUID** - you'll need it for configuration.

### Step 3: Register in domains.json

Add the tunnel to your domain registry:

```bash
# Edit web/.content_data/domains.json
```

Add tunnel entry:
```json
{
  "cloudflare": {
    "tunnels": [
      {
        "id": "<TUNNEL_UUID>",
        "name": "vete-tunnel",
        "status": "active",
        "createdAt": "2026-02-01T00:00:00Z"
      }
    ]
  }
}
```

Add domain entry:
```json
{
  "domain": "terrapet.com.py",
  "tenant": "adris",
  "type": "tunnel",
  "provider": "cloudflare",
  "status": "pending",
  "cloudflare": {
    "tunnelId": "<TUNNEL_UUID>"
  }
}
```

### Step 4: Generate Config

```bash
node scripts/domains.mjs generate-cloudflare --tunnel vete-tunnel
```

This creates `cloudflared/config.yml`:

```yaml
tunnel: <TUNNEL_UUID>
credentials-file: /etc/cloudflared/<TUNNEL_UUID>.json

ingress:
  - hostname: terrapet.com.py
    service: http://localhost:3000
  - hostname: petlife.com.py
    service: http://localhost:3000
  - service: http_status:404
```

---

## Configuration

### Config File Structure

```yaml
# cloudflared/config.yml
tunnel: <uuid>
credentials-file: /path/to/credentials.json

# Ingress rules (processed in order)
ingress:
  # Route specific hostname to service
  - hostname: terrapet.com.py
    service: http://localhost:3000
    originRequest:
      noTLSVerify: true  # If using self-signed cert

  # Route subdomain
  - hostname: api.terrapet.com.py
    service: http://localhost:3000
    path: /api/*

  # Catch-all (REQUIRED - must be last)
  - service: http_status:404
```

### Credentials File

The credentials file (`<TUNNEL_UUID>.json`) is created automatically when you create a tunnel. It contains:

```json
{
  "AccountTag": "your-account-id",
  "TunnelSecret": "base64-encoded-secret",
  "TunnelID": "tunnel-uuid"
}
```

**Keep this file secure!** It authenticates your tunnel.

### Advanced Options

```yaml
ingress:
  - hostname: terrapet.com.py
    service: http://localhost:3000
    originRequest:
      # Connection settings
      connectTimeout: 30s
      noTLSVerify: false

      # Load balancing
      httpHostHeader: terrapet.com.py

      # Security
      originServerName: terrapet.com.py
      caPool: /path/to/ca-cert.pem
```

---

## DNS Setup

### Automatic (Recommended)

```bash
cloudflared tunnel route dns vete-tunnel terrapet.com.py
```

This creates a CNAME record automatically.

### Manual

In Cloudflare DNS dashboard:

| Type | Name | Target |
|------|------|--------|
| CNAME | @ | `<TUNNEL_UUID>.cfargotunnel.com` |
| CNAME | www | `<TUNNEL_UUID>.cfargotunnel.com` |

**Important:** Set proxy status to "Proxied" (orange cloud).

---

## Docker Integration

### docker-compose.yml

```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - ./web/.env.local
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - vete-network

  cloudflared:
    image: cloudflare/cloudflared:latest
    profiles: ["tunnel"]
    command: tunnel --config /etc/cloudflared/config.yml run
    volumes:
      - ./cloudflared:/etc/cloudflared:ro
    depends_on:
      web:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - vete-network

networks:
  vete-network:
    driver: bridge
```

### Required Files

```
cloudflared/
├── config.yml              # Generated by domains.mjs
└── <TUNNEL_UUID>.json      # Credentials (copy from ~/.cloudflared/)
```

### Start with Tunnel

```bash
# Copy credentials
cp ~/.cloudflared/<TUNNEL_UUID>.json ./cloudflared/

# Start all services including tunnel
docker-compose --profile tunnel up -d
```

### Without Docker (Systemd)

```bash
# Install as service
sudo cloudflared service install

# Start service
sudo systemctl start cloudflared

# Enable on boot
sudo systemctl enable cloudflared
```

---

## Multiple Domains

### Single Tunnel, Multiple Domains

```yaml
# config.yml
ingress:
  - hostname: terrapet.com.py
    service: http://localhost:3000
  - hostname: www.terrapet.com.py
    service: http://localhost:3000
  - hostname: petlife.com.py
    service: http://localhost:3000
  - hostname: clinic.example.com
    service: http://localhost:3000
  - service: http_status:404
```

All domains route to the same Next.js application. The middleware handles tenant resolution based on the Host header.

### Multiple Tunnels (Advanced)

For geographic distribution or load balancing:

```bash
# Create regional tunnels
cloudflared tunnel create vete-us
cloudflared tunnel create vete-eu

# Route domains to specific tunnels
cloudflared tunnel route dns vete-us us.terrapet.com.py
cloudflared tunnel route dns vete-eu eu.terrapet.com.py
```

---

## Monitoring

### Tunnel Status

```bash
# List tunnels
cloudflared tunnel list

# Get tunnel info
cloudflared tunnel info vete-tunnel

# Real-time metrics
cloudflared tunnel run vete-tunnel --metrics localhost:9090
```

### Cloudflare Dashboard

1. Go to Cloudflare Dashboard > Zero Trust > Access > Tunnels
2. View connection status, traffic, and errors

### Docker Logs

```bash
# Follow tunnel logs
docker-compose logs -f cloudflared

# Check connection status
docker exec vete-tunnel cloudflared tunnel info
```

### Health Checks

```yaml
# Add health check to cloudflared service
services:
  cloudflared:
    healthcheck:
      test: ["CMD", "cloudflared", "tunnel", "info", "vete-tunnel"]
      interval: 60s
      timeout: 10s
      retries: 3
```

---

## Troubleshooting

### Tunnel Won't Connect

```bash
# Check credentials file exists
ls -la cloudflared/*.json

# Verify config syntax
cloudflared tunnel --config cloudflared/config.yml validate

# Test connection
cloudflared tunnel --config cloudflared/config.yml run --force
```

### 502 Bad Gateway

The web application isn't responding:

```bash
# Check if web app is running
curl http://localhost:3000/api/health

# Check Docker health
docker-compose ps

# View web app logs
docker-compose logs web
```

### DNS Not Resolving

```bash
# Check DNS records
dig terrapet.com.py

# Verify CNAME target
dig +short CNAME terrapet.com.py
# Should return: <TUNNEL_UUID>.cfargotunnel.com

# Re-add DNS route
cloudflared tunnel route dns vete-tunnel terrapet.com.py
```

### SSL Certificate Errors

1. Ensure Cloudflare SSL/TLS mode is "Full" or "Full (strict)"
2. Check that the tunnel is proxied (orange cloud in DNS)
3. Wait for certificate provisioning (can take minutes)

### Slow Performance

```yaml
# Optimize config
ingress:
  - hostname: terrapet.com.py
    service: http://localhost:3000
    originRequest:
      connectTimeout: 10s
      keepAliveTimeout: 90s
      keepAliveConnections: 100
```

### Connection Drops

```bash
# Enable auto-reconnect
cloudflared tunnel run vete-tunnel --retries 10

# Or in config
tunnel: <uuid>
retries: 10
grace-period: 30s
```

---

## Security Best Practices

1. **Protect credentials** - Never commit `*.json` credentials files
2. **Use Access policies** - Add Cloudflare Access for admin routes
3. **Enable WAF** - Use Cloudflare's Web Application Firewall
4. **Rate limiting** - Configure rate limits in Cloudflare dashboard
5. **Audit logs** - Enable and monitor Cloudflare audit logs

### Cloudflare Access (Optional)

Protect dashboard routes:

```bash
# In Cloudflare Zero Trust dashboard:
# 1. Create an Access application
# 2. Set policy: Require email ending in @yourcompany.com
# 3. Protect paths: /*/dashboard/*
```

---

## Related Documentation

- [Domain Management](./DOMAIN_MANAGEMENT.md) - Domain configuration
- [Docker Deployment](./DOCKER_DEPLOYMENT.md) - Docker setup
- [Architecture](./ARCHITECTURE.md) - System architecture

---

*Last updated: February 2026*
