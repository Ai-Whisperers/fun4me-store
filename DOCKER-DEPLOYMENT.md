# Vete Platform - Docker Self-Deployment Guide

Deploy Vete Platform using Docker with Cloudflare Tunnel for secure HTTPS access.

## Architecture

```
                    Internet
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│                  Cloudflare Tunnel                           │
│              vete.ai-whisperers.org                          │
└─────────────────────────┬────────────────────────────────────┘
                          │
    ┌─────────────────────▼─────────────────────────────────┐
    │                 Docker Host                            │
    │  ┌─────────────────────────────────────────────────┐  │
    │  │              vete-network                        │  │
    │  │                                                  │  │
    │  │  ┌──────────────┐      ┌──────────────┐         │  │
    │  │  │   vete-web   │      │    redis     │         │  │
    │  │  │  (Next.js)   │◄────►│   (Cache)    │         │  │
    │  │  │  Port 3000   │      │  Port 6379   │         │  │
    │  │  └──────┬───────┘      └──────────────┘         │  │
    │  │         │                                        │  │
    │  └─────────┼────────────────────────────────────────┘  │
    └────────────┼───────────────────────────────────────────┘
                 │
                 ▼
    ┌────────────────────────────────────────────────────────┐
    │                 Supabase Cloud                          │
    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
    │  │     Auth     │  │   Database   │  │   Storage    │  │
    │  │  (JWT/RLS)   │  │ (PostgreSQL) │  │   (Files)    │  │
    │  └──────────────┘  └──────────────┘  └──────────────┘  │
    └────────────────────────────────────────────────────────┘
```

## Prerequisites

- **Docker** and **Docker Compose** installed
- **Supabase Cloud** project ([create one here](https://supabase.com/dashboard))
- **Cloudflare** account with domain configured
- **cloudflared** CLI installed

## Important: Supabase is Required

This application **requires Supabase Cloud** for:
- **Authentication** - JWT sessions, user management
- **Database** - PostgreSQL with Row-Level Security (RLS)
- **Storage** - File uploads (pets, documents, etc.)

The codebase uses `auth.uid()` in 68+ RLS policies which is a Supabase-specific function. Self-hosted PostgreSQL will not work without significant code modifications.

## Quick Start

### 1. Clone and Setup

```bash
git clone https://github.com/Ai-Whisperers/Vete.git
cd vete
make setup
```

### 2. Configure Environment

Edit `.env` with your Supabase credentials:

```bash
# From Supabase Dashboard > Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# From Supabase Dashboard > Settings > Database > Connection string
DATABASE_URL=postgresql://postgres.xxxxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres

# Your deployment URL
NEXT_PUBLIC_APP_URL=https://vete.ai-whisperers.org
```

### 3. Build and Start

```bash
# Build images (NEXT_PUBLIC_* vars are inlined at build time)
make build

# Start services
make up

# Check health
make health
```

### 4. Setup Database

Run migrations in Supabase SQL Editor or via connection:

```bash
# Connect to Supabase and run migrations
# Option 1: Use Supabase Dashboard > SQL Editor
# Option 2: Use psql with DATABASE_URL
```

## Cloudflare Tunnel Setup

### Create Tunnel

```bash
# Install cloudflared
curl -L --output cloudflared.deb \
  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb

# Authenticate
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create vete

# Get token
cloudflared tunnel token vete
# Copy this token to CLOUDFLARE_TUNNEL_TOKEN in .env
```

### Configure DNS

In Cloudflare Dashboard:

1. Go to your domain → DNS
2. Add CNAME record:
   - Name: `vete`
   - Target: `<tunnel-id>.cfargotunnel.com`
   - Proxy: ON (orange cloud)

### Start with Tunnel

```bash
make tunnel-up
```

Your app is now live at `https://vete.ai-whisperers.org`

## Commands Reference

| Command | Description |
|---------|-------------|
| `make setup` | Create .env from template |
| `make build` | Build Docker images |
| `make up` | Start services |
| `make down` | Stop services |
| `make logs` | View all logs |
| `make logs-web` | View app logs |
| `make health` | Check health endpoint |
| `make shell` | Shell into container |
| `make tunnel-up` | Start with Cloudflare |
| `make tunnel-down` | Stop all |
| `make deploy` | Full production deploy |
| `make update` | Update deployment |
| `make clean` | Remove containers/volumes |

## Environment Variables

### Required (App won't start without these)

| Variable | Description | Source |
|----------|-------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Dashboard > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anonymous key (client-safe) | Dashboard > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-only) | Dashboard > Settings > API |
| `DATABASE_URL` | PostgreSQL connection string | Dashboard > Settings > Database |

### Required for Production

| Variable | Description |
|----------|-------------|
| `CLOUDFLARE_TUNNEL_TOKEN` | Tunnel authentication |
| `CRON_SECRET` | Cron endpoint auth (generate: `openssl rand -base64 32`) |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `EMAIL_PROVIDER` | `resend` | Email service |
| `RESEND_API_KEY` | - | Resend API key |
| `STRIPE_SECRET_KEY` | - | Stripe (if billing enabled) |
| `ENABLE_STORE` | `true` | E-commerce module |
| `ENABLE_WHATSAPP` | `false` | WhatsApp integration |

## Cron Jobs

Without Inngest, trigger cron jobs manually or via external scheduler:

```bash
# Health check
curl -X POST http://localhost:3000/api/cron/check-health \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Reminders
curl -X POST http://localhost:3000/api/cron/reminders \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Stock alerts
curl -X POST http://localhost:3000/api/cron/stock-alerts \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Use cron or systemd timers to schedule these.

## Troubleshooting

### App not starting

```bash
# Check logs
make logs-web

# Verify environment
docker compose exec vete-web env | grep SUPABASE
```

### Health check failing

```bash
# Check Supabase connectivity
curl -s https://YOUR_PROJECT.supabase.co/rest/v1/ \
  -H "apikey: YOUR_ANON_KEY"
```

### Tunnel not working

```bash
# Check tunnel logs
make tunnel-logs

# Verify token
cloudflared tunnel info vete
```

## File Structure

```
vete/
├── docker-compose.yml           # Main compose (app + redis)
├── docker-compose.cloudflare.yml # Tunnel overlay
├── .env.docker.example          # Environment template
├── Makefile                     # Deployment commands
├── DOCKER-DEPLOYMENT.md         # This file
└── web/
    ├── Dockerfile               # Multi-stage production build
    ├── docker-entrypoint.sh     # Startup validation
    └── .dockerignore            # Build exclusions
```

## Security Notes

1. **Never commit `.env`** - It's in .gitignore
2. **Service role key** - Keep server-side only, never expose to client
3. **CRON_SECRET** - Use strong random value
4. **Tunnel** - Cloudflare provides automatic HTTPS and DDoS protection
