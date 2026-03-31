# Docker Deployment Guide

> Self-hosted deployment of the Vete platform using Docker.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Dockerfile Explained](#dockerfile-explained)
- [Docker Compose](#docker-compose)
- [Environment Configuration](#environment-configuration)
- [Building Images](#building-images)
- [Running Containers](#running-containers)
- [Production Deployment](#production-deployment)
- [Health Checks](#health-checks)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Vete platform supports self-hosted deployment via Docker, enabling:

- **Vercel-free hosting** - Run on any Docker-compatible infrastructure
- **Cloudflare Tunnel integration** - Expose without public IP
- **Consistent environments** - Same image for dev, staging, production
- **Easy scaling** - Multiple instances behind load balancer

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Docker Host                          │
│  ┌─────────────────┐     ┌─────────────────┐               │
│  │   vete-web      │     │   cloudflared   │               │
│  │   (Next.js)     │◄────│   (optional)    │               │
│  │   Port 3000     │     │   Tunnel        │               │
│  └─────────────────┘     └─────────────────┘               │
│           │                       │                         │
└───────────│───────────────────────│─────────────────────────┘
            │                       │
            ▼                       ▼
     Load Balancer          Cloudflare Edge
     (optional)             (tunnel mode)
```

---

## Prerequisites

- Docker 20.10+ and Docker Compose 2.0+
- Node.js 20+ (for local development)
- Access to Supabase project (hosted or self-hosted)
- (Optional) Cloudflare account for tunnel deployment

### Required Files

```
/
├── Dockerfile              # Multi-stage build
├── docker-compose.yml      # Orchestration
├── .dockerignore           # Build context exclusions
└── web/
    ├── .env.local          # Environment variables
    └── next.config.mjs     # Must have output: 'standalone'
```

---

## Quick Start

```bash
# 1. Ensure next.config.mjs has standalone output
# (Already configured in this repo)

# 2. Create environment file
cp web/.env.example web/.env.local
# Edit web/.env.local with your Supabase credentials

# 3. Build and run
docker-compose up --build

# 4. Access the application
open http://localhost:3000/adris
```

---

## Dockerfile Explained

The Dockerfile uses a multi-stage build for optimal image size:

```dockerfile
# Stage 1: Base - Alpine with Node.js
FROM node:20-alpine AS base

# Stage 2: Dependencies - Install npm packages
FROM base AS deps
COPY web/package*.json ./
RUN npm ci --legacy-peer-deps

# Stage 3: Builder - Build the Next.js application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY web/ ./
RUN npm run build

# Stage 4: Runner - Production image (~150MB)
FROM base AS runner
ENV NODE_ENV=production
# Copy only the standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
CMD ["node", "server.js"]
```

### Image Size

| Stage | Purpose | Size |
|-------|---------|------|
| deps | Install dependencies | ~800MB |
| builder | Build application | ~1.2GB |
| runner | Production image | **~150MB** |

---

## Docker Compose

### Basic Configuration

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
```

### With Cloudflare Tunnel

```yaml
services:
  web:
    # ... same as above

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
```

Start with tunnel:
```bash
docker-compose --profile tunnel up -d
```

---

## Environment Configuration

### Required Variables

```env
# Supabase (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
DATABASE_URL=postgresql://...

# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Production Recommendations

```env
# Disable telemetry
NEXT_TELEMETRY_DISABLED=1

# Enable caching
REDIS_URL=redis://redis:6379

# Error tracking
SENTRY_DSN=https://xxx@sentry.io/xxx

# Rate limiting
RATE_LIMIT_ENABLED=true
```

### Passing Environment Variables

**Option 1: env_file (Recommended)**
```yaml
services:
  web:
    env_file:
      - ./web/.env.local
```

**Option 2: Environment block**
```yaml
services:
  web:
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
```

**Option 3: Docker run**
```bash
docker run --env-file ./web/.env.local -p 3000:3000 vete
```

---

## Building Images

### Local Build

```bash
# Build image
docker build -t vete .

# Build with specific tag
docker build -t vete:v1.0.0 .

# Build with no cache (fresh build)
docker build --no-cache -t vete .
```

### Build Arguments

```bash
# Pass build-time variables
docker build \
  --build-arg NODE_ENV=production \
  -t vete .
```

### Multi-Platform Build

```bash
# Build for multiple architectures
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t vete:latest \
  --push .
```

---

## Running Containers

### Development

```bash
# Start with docker-compose
docker-compose up

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f web

# Stop
docker-compose down
```

### Production

```bash
# Pull latest image
docker pull your-registry/vete:latest

# Run with production settings
docker run -d \
  --name vete-web \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file ./web/.env.local \
  --health-cmd="wget --spider http://localhost:3000/api/health" \
  --health-interval=30s \
  vete:latest
```

### Resource Limits

```yaml
services:
  web:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
```

---

## Production Deployment

### Recommended Setup

```
                    ┌──────────────┐
                    │   Cloudflare │
                    │   (CDN/WAF)  │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ Load Balancer│
                    │  (Traefik)   │
                    └──────┬───────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
   ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
   │  vete-web-1 │  │  vete-web-2 │  │  vete-web-3 │
   │  (replica)  │  │  (replica)  │  │  (replica)  │
   └─────────────┘  └─────────────┘  └─────────────┘
```

### With Traefik

```yaml
version: '3.8'

services:
  traefik:
    image: traefik:v2.10
    command:
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro

  web:
    build: .
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.vete.rule=Host(`your-domain.com`)"
      - "traefik.http.routers.vete.entrypoints=websecure"
      - "traefik.http.routers.vete.tls.certresolver=letsencrypt"
    deploy:
      replicas: 3
```

### Zero-Downtime Deployment

```bash
# Build new image
docker build -t vete:new .

# Update service (rolling update)
docker-compose up -d --no-deps --build web

# Or with Docker Swarm
docker service update --image vete:new vete_web
```

---

## Health Checks

### Built-in Health Check

The Dockerfile includes a health check:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1
```

### Custom Health Endpoint

Create `web/app/api/health/route.ts`:

```typescript
export async function GET() {
  // Check database connection
  const dbHealthy = await checkDatabase()

  // Check Redis connection
  const redisHealthy = await checkRedis()

  if (dbHealthy && redisHealthy) {
    return Response.json({ status: 'healthy' })
  }

  return Response.json({ status: 'unhealthy' }, { status: 503 })
}
```

### Monitoring Health

```bash
# Check container health status
docker inspect --format='{{.State.Health.Status}}' vete-web

# View health check logs
docker inspect --format='{{json .State.Health}}' vete-web | jq
```

---

## Troubleshooting

### Common Issues

#### Build Fails: "Cannot find module"

```bash
# Ensure dependencies are installed
docker build --no-cache -t vete .

# Or clear Docker build cache
docker builder prune
```

#### Container Won't Start

```bash
# Check logs
docker logs vete-web

# Common causes:
# - Missing environment variables
# - Database connection failed
# - Port already in use
```

#### Health Check Failing

```bash
# Test health endpoint manually
docker exec vete-web wget -qO- http://localhost:3000/api/health

# Check if port is listening
docker exec vete-web netstat -tlnp
```

#### Out of Memory

```yaml
# Increase memory limit
services:
  web:
    deploy:
      resources:
        limits:
          memory: 4G
```

### Debug Mode

```bash
# Run with shell access
docker run -it --rm vete sh

# Run with verbose output
docker-compose up --build 2>&1 | tee build.log
```

### Logs

```bash
# View all logs
docker-compose logs

# Follow specific service
docker-compose logs -f web

# Last 100 lines
docker logs --tail 100 vete-web
```

---

## Related Documentation

- [Domain Management](./DOMAIN_MANAGEMENT.md) - Custom domain configuration
- [Cloudflare Tunnels](./CLOUDFLARE_TUNNELS.md) - Tunnel setup for self-hosting
- [Environment Variables](./ENV_COMPLETE_REFERENCE.md) - All configuration options
- [Architecture](./ARCHITECTURE.md) - System architecture overview

---

*Last updated: February 2026*
