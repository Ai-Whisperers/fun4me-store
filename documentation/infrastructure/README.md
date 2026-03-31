# Infrastructure Documentation

Guides for hosting and deploying the Vete platform.

## Hosting Options

| Guide | Description |
|-------|-------------|
| [GCP Hosting](./GCP_HOSTING.md) | Self-hosted on Google Cloud Platform VMs |
| [Vercel](../.github/workflows/deploy.yml) | Serverless deployment (default) |

## Current Production Setup

### Servers

| Server | IP | Purpose |
|--------|-----|---------|
| **vete-prod** | 34.151.201.27 | Production Next.js app |
| **nyx-server** | 34.39.173.214 | OpenClaw/Dev tools |

### Stack

- **OS:** Debian 12 / Ubuntu
- **Runtime:** Node.js 22 LTS
- **Process Manager:** PM2
- **Reverse Proxy:** nginx
- **SSL:** Let's Encrypt (Certbot)
- **Database:** Supabase (managed PostgreSQL)

## Quick Commands

```bash
# SSH into production
gcloud compute ssh vete-prod --zone=southamerica-east1-b

# Deploy update
cd ~/Vete && git pull && cd web && npm ci && npm run build && pm2 restart vete

# View logs
pm2 logs vete

# Check status
pm2 status
```

## Cost Summary

| Phase | Monthly Cost |
|-------|--------------|
| First 90 days | $0 (credits) |
| After (e2-micro) | ~$0 |
| After (e2-medium) | ~$25-35 |

---

*See individual guides for detailed setup instructions.*
