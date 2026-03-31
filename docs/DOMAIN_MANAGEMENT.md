# Domain Management Guide

> Centralized domain/CNAME configuration for the multi-tenant Vete platform.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Domain Registry](#domain-registry)
- [CLI Commands](#cli-commands)
- [Adding Custom Domains](#adding-custom-domains)
- [DNS Configuration](#dns-configuration)
- [Vercel Integration](#vercel-integration)
- [Middleware Resolution](#middleware-resolution)
- [Troubleshooting](#troubleshooting)

---

## Overview

The domain management system provides:

- **Centralized registry** - All domain mappings in one JSON file
- **CLI management** - Add, remove, validate domains via command line
- **Multi-provider support** - Vercel, Cloudflare, self-hosted
- **Automatic resolution** - Middleware rewrites custom domains to tenant paths
- **DNS verification** - Verify DNS configuration before going live

### Architecture

```
Custom Domain Request Flow:
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ terrapet.com.py │ ──▶ │   Middleware    │ ──▶ │ /adris/...      │
│   (browser)     │     │ (domain lookup) │     │ (rewritten URL) │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## Quick Start

```bash
# List all configured domains
node scripts/domains.mjs list

# Add a new domain
node scripts/domains.mjs add terrapet.com.py adris --type primary

# Validate configuration
node scripts/domains.mjs validate

# Verify DNS records
node scripts/domains.mjs verify terrapet.com.py
```

---

## Domain Registry

All domains are stored in `web/.content_data/domains.json`:

```json
{
  "$schema": "./schemas/domains.schema.json",
  "version": "1.0.0",
  "defaultDomain": "vetic.vercel.app",
  "domains": [
    {
      "domain": "terrapet.com.py",
      "tenant": "adris",
      "type": "primary",
      "provider": "vercel",
      "ssl": { "enabled": true, "autoRenew": true },
      "status": "active",
      "dnsRecords": {
        "type": "A",
        "name": "@",
        "value": "76.76.21.21"
      }
    }
  ],
  "cloudflare": { "tunnels": [] }
}
```

### Domain Entry Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `domain` | string | Yes | Full domain name (e.g., `terrapet.com.py`) |
| `tenant` | string | Yes | Clinic slug from `.content_data/` |
| `type` | enum | Yes | `primary`, `subdomain`, `redirect`, `tunnel` |
| `provider` | enum | No | `vercel`, `cloudflare`, `selfhosted` |
| `status` | enum | Yes | `pending`, `active`, `verifying`, `failed` |
| `ssl` | object | No | SSL configuration |
| `dnsRecords` | object | No | Required DNS records |
| `redirectTo` | string | No | Target for redirect domains |

### Domain Types

| Type | Use Case |
|------|----------|
| `primary` | Main custom domain for a tenant |
| `subdomain` | Platform subdomain (e.g., `adris.vetic.vercel.app`) |
| `redirect` | Redirect to another domain (e.g., `www` → apex) |
| `tunnel` | Cloudflare tunnel domain for self-hosting |

---

## CLI Commands

### List Domains

```bash
# List all domains
node scripts/domains.mjs list

# Filter by tenant
node scripts/domains.mjs list --tenant adris

# Filter by status
node scripts/domains.mjs list --status pending

# Output as JSON
node scripts/domains.mjs list --json
```

### Add Domain

```bash
# Add primary domain
node scripts/domains.mjs add terrapet.com.py adris --type primary

# Add www redirect
node scripts/domains.mjs add www.terrapet.com.py adris --type redirect --redirect terrapet.com.py

# Add with specific provider
node scripts/domains.mjs add clinic.example.com petlife --provider cloudflare --type tunnel

# Skip confirmation
node scripts/domains.mjs add domain.com tenant --force
```

### Remove Domain

```bash
# Remove with confirmation
node scripts/domains.mjs remove terrapet.com.py

# Force remove
node scripts/domains.mjs remove terrapet.com.py --force
```

### Validate Configuration

```bash
node scripts/domains.mjs validate
```

Checks:
- Required fields present
- Tenant exists in `.content_data/`
- No duplicate domains
- Valid type and status values
- Redirect targets exist

### Verify DNS

```bash
node scripts/domains.mjs verify terrapet.com.py
```

Performs live DNS lookups to verify:
- A records (IPv4)
- CNAME records
- TXT records (verification)

Updates domain status to `active` if verification passes.

### Sync with Vercel

```bash
# Dry run (preview changes)
node scripts/domains.mjs sync-vercel --dry-run

# Actual sync
VERCEL_TOKEN=xxx VERCEL_PROJECT_ID=yyy node scripts/domains.mjs sync-vercel
```

Requires environment variables:
- `VERCEL_TOKEN` - API token from [vercel.com/account/tokens](https://vercel.com/account/tokens)
- `VERCEL_PROJECT_ID` - Found in Vercel Dashboard > Project > Settings

### Generate Cloudflare Config

```bash
node scripts/domains.mjs generate-cloudflare --tunnel vete-tunnel
```

Generates `cloudflared/config.yml` for tunnel-based deployments.

---

## Adding Custom Domains

### Step 1: Add to Registry

```bash
node scripts/domains.mjs add example.com tenant-slug --type primary
```

### Step 2: Configure DNS

For Vercel hosting, add these DNS records at your domain registrar:

**Apex domain (example.com):**
| Type | Name | Value |
|------|------|-------|
| A | @ | 76.76.21.21 |

**Subdomain (www.example.com):**
| Type | Name | Value |
|------|------|-------|
| CNAME | www | cname.vercel-dns.com |

### Step 3: Verify DNS

```bash
node scripts/domains.mjs verify example.com
```

Wait for DNS propagation (can take up to 48 hours, usually minutes).

### Step 4: Sync with Vercel

```bash
node scripts/domains.mjs sync-vercel
```

### Step 5: Test

Visit `https://example.com` - should show your tenant's site.

---

## DNS Configuration

### Vercel DNS Records

| Domain Type | Record | Name | Value |
|-------------|--------|------|-------|
| Apex | A | @ | 76.76.21.21 |
| Subdomain | CNAME | www | cname.vercel-dns.com |
| Wildcard | CNAME | * | cname.vercel-dns.com |

### Cloudflare DNS (with tunnel)

| Record | Name | Value |
|--------|------|-------|
| CNAME | @ | `<tunnel-id>.cfargotunnel.com` |
| CNAME | www | `<tunnel-id>.cfargotunnel.com` |

---

## Vercel Integration

### Automatic Domain Addition

The `sync-vercel` command automatically:
1. Reads all Vercel-provider domains from registry
2. Adds them to your Vercel project
3. Updates status to `verifying`
4. Vercel handles SSL certificate provisioning

### Manual Configuration

You can also add domains manually in Vercel Dashboard:
1. Go to Project > Settings > Domains
2. Add domain
3. Follow DNS configuration instructions
4. Update `domains.json` status to `active`

---

## Middleware Resolution

Custom domains are resolved in `web/middleware.ts`:

```typescript
import { getDomainMapping, isCustomDomain } from '@/lib/domains'

// In middleware:
const host = request.headers.get('host')
if (host && isCustomDomain(host)) {
  const domainMapping = getDomainMapping(host)
  if (domainMapping) {
    // Rewrite /path to /tenant/path
    const url = request.nextUrl.clone()
    url.pathname = `/${domainMapping.tenant}${path}`
    return NextResponse.rewrite(url)
  }
}
```

### Domain Resolution Functions

```typescript
import {
  getDomainMapping,      // Get full domain entry
  getTenantByDomain,     // Get just tenant slug
  isCustomDomain,        // Check if should be resolved
  getDomainsByTenant,    // Get all domains for a tenant
  getPrimaryDomain,      // Get primary domain for tenant
} from '@/lib/domains'
```

---

## Troubleshooting

### Domain Not Resolving

1. Check DNS propagation: `dig example.com`
2. Verify domain in registry: `node scripts/domains.mjs list --tenant slug`
3. Check status is `active`
4. Verify in Vercel Dashboard

### SSL Certificate Issues

1. Ensure DNS is correctly configured
2. Wait for Vercel to provision certificate (can take minutes)
3. Check Vercel Dashboard for certificate status

### Redirect Loop

1. Check for conflicting redirect entries
2. Ensure `www` redirect points to apex (not vice versa)
3. Check Cloudflare SSL settings (use "Full" not "Flexible")

### Validation Errors

```bash
# See detailed validation errors
node scripts/domains.mjs validate
```

Common issues:
- Tenant slug doesn't exist in `.content_data/`
- Duplicate domain entries
- Missing required fields

---

## NPM Scripts

Available in `web/package.json`:

```bash
npm run domains              # Show help
npm run domains:list         # List all domains
npm run domains:validate     # Validate configuration
npm run domains:verify       # Verify DNS (requires domain arg)
npm run domains:sync         # Sync with Vercel
npm run domains:sync:dry     # Dry run sync
npm run domains:cloudflare   # Generate Cloudflare config
```

---

## Related Documentation

- [Docker Deployment](./DOCKER_DEPLOYMENT.md) - Self-hosted deployment with Docker
- [Cloudflare Tunnels](./CLOUDFLARE_TUNNELS.md) - Tunnel configuration for self-hosting
- [Architecture Overview](./ARCHITECTURE.md) - System architecture
- [Environment Variables](./ENV_COMPLETE_REFERENCE.md) - All environment variables

---

*Last updated: February 2026*
