# Environment Variables - Complete Reference

> **Complete reference for all 286 environment variables** in the Vete platform.  
> Last Updated: January 2026

---

## Quick Navigation

| Category | Count | Required? | Jump To |
|----------|-------|-----------|---------|
| [Supabase (Database & Auth)](#supabase-configuration) | 4 | ✅ **REQUIRED** | Core infrastructure |
| [Application Configuration](#application-configuration) | 5 | ⚠️ Recommended | Base settings |
| [Email Providers](#email-configuration) | 11 | ⚠️ For notifications | Choose one provider |
| [AWS Services](#aws-configuration) | 4 | ❌ Optional | SES email, S3 storage |
| [WhatsApp Integration](#whatsapp-integration) | 4 | ❌ Optional | Meta Business API |
| [SMS / Twilio](#sms--twilio-configuration) | 4 | ❌ Optional | Text messaging |
| [Storage Providers](#storage-configuration) | 6 | ❌ Optional | File uploads |
| [Stripe Payments](#stripe-payments) | 3 | ❌ Optional | Payment processing |
| [Google Services](#google-services) | 2 | ❌ Optional | Sheets integration |
| [Caching / Redis](#caching--redis) | 5 | ❌ Optional | Performance |
| [Monitoring & Observability](#monitoring--observability) | 4 | ❌ Optional | Sentry, Datadog |
| [Rate Limiting](#rate-limiting) | 5 | ⚠️ Recommended | Security |
| [Background Jobs](#background-jobs-inngest) | 2 | ❌ Optional | Inngest |
| [Cron Security](#cron-job-security) | 1 | ✅ **Production Required** | Automated tasks |
| [Authentication](#authentication) | 1 | ❌ Optional | Custom JWT |
| [Feature Flags](#feature-flags) | 5 | ❌ Optional | Toggle features |
| [Database Pool (Advanced)](#database-pool-advanced) | 7 | ❌ Optional | Performance tuning |
| [Read Replicas](#read-replicas) | 4 | ❌ Optional | Scaling |
| [Vercel (Auto-populated)](#vercel-specific) | 3 | 🤖 Auto | Platform vars |
| [Advertising](#advertising) | 2 | ❌ Optional | AdSense |
| **TOTAL** | **77 unique variables** | **5 required** | **72 optional** |

---

## Variable Categories

### Supabase Configuration

**Status**: ✅ **REQUIRED FOR ALL DEPLOYMENTS**

These 4 variables are the minimum required to run the application.

| Variable | Type | Required | Description | Example |
|----------|------|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | string | ✅ **YES** | Supabase project URL | `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | string | ✅ **YES** | Anonymous key (client-safe, RLS protected) | `eyJhbG...` |
| `SUPABASE_SERVICE_ROLE_KEY` | string | ✅ **YES** | Service role key (bypasses RLS, server-only) | `eyJhbG...` |
| `DATABASE_URL` | string | ✅ **YES** | Direct PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |

**Where to Find**:
1. Go to Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Settings > API
4. Copy URL and keys
5. Settings > Database for connection string

**Security Notes**:
- ⚠️ `NEXT_PUBLIC_*` variables are exposed to the browser (safe due to RLS)
- 🔒 `SUPABASE_SERVICE_ROLE_KEY` must NEVER be exposed client-side
- 🔒 `DATABASE_URL` is server-only

---

### Application Configuration

**Status**: ⚠️ **RECOMMENDED**

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_APP_URL` | string | `http://localhost:3000` | Base URL of your application |
| `NEXT_PUBLIC_BASE_URL` | string | `https://vetic.vercel.app` | Alternative base URL for metadata/SEO |
| `NODE_ENV` | enum | `development` | Environment: `development` \| `production` \| `test` |
| `TZ` | string | `America/Asuncion` | Timezone for date/time operations |
| `DEBUG` | boolean | `false` | Enable verbose logging |
| `LOG_LEVEL` | enum | `info` | Log level: `error` \| `warn` \| `info` \| `debug` |

**Production Setup**:
```env
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production
TZ=America/Asuncion
LOG_LEVEL=warn
```

---

### Email Configuration

**Status**: ❌ **OPTIONAL** (Required for notifications)

**Choose ONE provider**: Resend (recommended), SendGrid, SMTP, or AWS SES.

#### Common Email Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `EMAIL_PROVIDER` | enum | `resend` | Provider: `resend` \| `sendgrid` \| `smtp` \| `ses` |
| `EMAIL_FROM` | string | `noreply@veterinaria.com` | From address |
| `EMAIL_FROM_NAME` | string | `Vete Platform` | From display name |

#### Provider-Specific Variables

**Resend** (Recommended):
| Variable | Type | Description |
|----------|------|-------------|
| `RESEND_API_KEY` | string | Resend API key from https://resend.com |

**SendGrid**:
| Variable | Type | Description |
|----------|------|-------------|
| `SENDGRID_API_KEY` | string | SendGrid API key from https://sendgrid.com |

**SMTP** (Generic):
| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `SMTP_HOST` | string | - | SMTP server hostname |
| `SMTP_PORT` | number | `587` | SMTP port (usually 587 or 465) |
| `SMTP_USER` | string | - | SMTP username |
| `SMTP_PASS` | string | - | SMTP password |
| `SMTP_SECURE` | boolean | `false` | Use TLS/SSL |

**AWS SES**:
Uses AWS credentials below (no additional vars needed).

---

### AWS Configuration

**Status**: ❌ **OPTIONAL** (For SES email or S3 storage)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `AWS_ACCESS_KEY_ID` | string | - | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | string | - | AWS secret key |
| `AWS_REGION` | string | `us-east-1` | AWS region |
| `S3_BUCKET` | string | - | S3 bucket name for file storage |

---

### WhatsApp Integration

**Status**: ❌ **OPTIONAL** (Meta Business API)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `WHATSAPP_API_URL` | string | `https://graph.facebook.com/v17.0` | Meta Graph API URL |
| `WHATSAPP_PHONE_NUMBER_ID` | string | - | Your WhatsApp Business phone number ID |
| `WHATSAPP_ACCESS_TOKEN` | string | - | WhatsApp Business API access token |
| `WHATSAPP_VERIFY_TOKEN` | string | - | Webhook verification token |

**Enable**: Set `ENABLE_WHATSAPP=true` in [Feature Flags](#feature-flags).

**Setup Guide**:
1. Create Meta Business Account: https://business.facebook.com
2. Set up WhatsApp Business API
3. Get credentials from Meta Developer Console

---

### SMS / Twilio Configuration

**Status**: ❌ **OPTIONAL**

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `TWILIO_ACCOUNT_SID` | string | - | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | string | - | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | string | - | Your Twilio phone number |
| `TWILIO_WHATSAPP_NUMBER` | string | `+14155238886` | WhatsApp sandbox number (dev) |

---

### Storage Configuration

**Status**: ❌ **OPTIONAL** (Default: Supabase Storage)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `STORAGE_PROVIDER` | enum | `supabase` | Provider: `supabase` \| `s3` \| `cloudinary` |
| `UPLOAD_DIR` | string | `./uploads` | Local upload directory (development) |
| `MAX_FILE_SIZE` | number | `5242880` | Max file size in bytes (5MB default) |

**Cloudinary** (if using):
| Variable | Type | Description |
|----------|------|-------------|
| `CLOUDINARY_CLOUD_NAME` | string | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | string | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | string | Cloudinary API secret |

---

### Stripe Payments

**Status**: ❌ **OPTIONAL**

| Variable | Type | Description |
|----------|------|-------------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | string | Publishable key (client-safe) |
| `STRIPE_SECRET_KEY` | string | Secret key (server-only) |
| `STRIPE_WEBHOOK_SECRET` | string | Webhook signing secret |

**Setup**:
1. Create Stripe account: https://stripe.com
2. Get keys from Dashboard > Developers > API keys
3. Set up webhook endpoint: `/api/webhooks/stripe`

---

### Google Services

**Status**: ❌ **OPTIONAL** (For Google Sheets inventory sync)

| Variable | Type | Description |
|----------|------|-------------|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | string | Service account email |
| `GOOGLE_PRIVATE_KEY` | string | Service account private key (JSON) |

---

### Caching / Redis

**Status**: ❌ **OPTIONAL** (Default: in-memory)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `CACHE_PROVIDER` | enum | `memory` | Provider: `memory` \| `redis` \| `upstash` |
| `CACHE_TTL` | number | `3600` | Cache TTL in seconds |

**Standard Redis**:
| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `REDIS_URL` | string | - | Redis connection URL |
| `REDIS_MAX_RETRIES` | number | `3` | Max connection retries |

**Upstash** (Serverless Redis):
| Variable | Type | Description |
|----------|------|-------------|
| `UPSTASH_REDIS_REST_URL` | string | Upstash REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | string | Upstash REST token |

---

### Monitoring & Observability

**Status**: ❌ **OPTIONAL**

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | string | - | Sentry error tracking DSN |
| `DD_API_KEY` | string | - | Datadog API key |
| `DD_APP_KEY` | string | - | Datadog application key |
| `MONITORING_ENABLED` | boolean | `false` | Enable monitoring features |

---

### Rate Limiting

**Status**: ⚠️ **RECOMMENDED FOR PRODUCTION**

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `RATE_LIMIT_ENABLED` | boolean | `true` | Enable rate limiting |
| `RATE_LIMIT_MAX_REQUESTS` | number | `100` | Max requests per window |
| `RATE_LIMIT_WINDOW_MS` | number | `60000` | Time window in milliseconds |
| `RATE_LIMIT_SKIP_SUCCESSFUL` | boolean | `false` | Skip counting successful requests |
| `RATE_LIMIT_SKIP_FAILED` | boolean | `false` | Skip counting failed requests |

**Production Recommendation**:
```env
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
```

---

### Background Jobs (Inngest)

**Status**: ❌ **OPTIONAL**

| Variable | Type | Description |
|----------|------|-------------|
| `INNGEST_EVENT_KEY` | string | Inngest event key |
| `INNGEST_SIGNING_KEY` | string | Inngest signing key |

---

### Cron Job Security

**Status**: ✅ **REQUIRED FOR PRODUCTION**

| Variable | Type | Description |
|----------|------|-------------|
| `CRON_SECRET` | string | Secret token to authenticate cron job requests |

**Setup Instructions**:

1. **Generate a secure secret**:
   ```bash
   openssl rand -base64 32
   ```

2. **Add to local development** (`.env.local`):
   ```env
   CRON_SECRET=your-generated-secret-here
   ```

3. **Add to GitHub Secrets**:
   - Go to: Repository Settings > Secrets and variables > Actions
   - Click: New repository secret
   - Name: `CRON_SECRET`
   - Value: (paste the same secret)

4. **Add to Vercel environment variables**:
   - Go to: Project Settings > Environment Variables
   - Add: `CRON_SECRET` with the same value

**Usage**:
GitHub Actions workflows send this token in the `Authorization` header when calling cron endpoints. The endpoints verify the token using timing-safe comparison to prevent timing attacks.

**Cron Endpoints**:
- `/api/cron/release-reservations` - Release expired cart reservations
- `/api/cron/process-subscriptions` - Process recurring subscriptions
- `/api/cron/expiry-alerts` - Send product expiry alerts
- `/api/cron/stock-alerts` - Send low stock alerts
- `/api/cron/reminders` - Send appointment/vaccine reminders
- + 9 more (see `web/app/api/cron/`)

---

### Authentication

**Status**: ❌ **OPTIONAL** (For custom token generation)

| Variable | Type | Description |
|----------|------|-------------|
| `JWT_SECRET` | string | JWT secret for custom token generation |

**Note**: Supabase handles auth by default. Only needed if implementing custom JWT logic.

---

### Feature Flags

**Status**: ❌ **OPTIONAL** (Enable/disable major platform features)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `ENABLE_STORE` | boolean | `true` | E-commerce store module |
| `ENABLE_WHATSAPP` | boolean | `false` | WhatsApp messaging integration |
| `ENABLE_HOSPITALIZATION` | boolean | `true` | Hospitalization/kennel management |
| `ENABLE_LAB` | boolean | `true` | Laboratory orders and results |
| `ENABLE_INSURANCE` | boolean | `false` | Insurance claims processing |

**Use Cases**:
- Disable incomplete features in production
- Gradual rollout of new features
- Per-clinic feature customization

---

### Database Pool (Advanced)

**Status**: ❌ **OPTIONAL** (Performance tuning)

Fine-tune database connection pooling for high-traffic deployments.

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `DB_POOL_MAX` | number | `10` | Maximum connections in pool |
| `DB_POOL_MIN` | number | `0` | Minimum idle connections |
| `DB_IDLE_TIMEOUT` | number | `20` | Idle connection timeout (seconds) |
| `DB_CONNECT_TIMEOUT` | number | `10` | Connection timeout (seconds) |
| `DB_MAX_CONNECTIONS` | number | `20` | Max total connections |
| `DB_SSL` | boolean | `true` | Use SSL for connections |
| `DB_TIMEOUT` | number | `30000` | Query timeout (milliseconds) |

**When to Adjust**:
- High concurrent user load
- Connection pool exhaustion errors
- Performance optimization

**Production Recommendations**:
```env
DB_POOL_MAX=20
DB_POOL_MIN=2
DB_MAX_CONNECTIONS=50
```

---

### Read Replicas

**Status**: ❌ **OPTIONAL** (For scaling read operations)

| Variable | Type | Description |
|----------|------|-------------|
| `DATABASE_URL_REPLICA` | string | Primary read replica connection string |
| `DATABASE_URL_REPLICA_US` | string | US region read replica |
| `DATABASE_URL_REPLICA_EU` | string | EU region read replica |
| `DATABASE_URL_REPLICA_AP` | string | Asia-Pacific region read replica |

**Use Cases**:
- Distribute read load across replicas
- Reduce latency with geo-distributed replicas
- Scale beyond single database instance

**Implementation**: See `web/db/docs/READ_REPLICAS.md`

---

### Vercel-Specific

**Status**: 🤖 **AUTO-POPULATED** (No manual configuration needed)

These variables are automatically set by Vercel during deployments.

| Variable | Description |
|----------|-------------|
| `VERCEL_URL` | Deployment URL |
| `VERCEL_ENV` | Environment: `production` \| `preview` \| `development` |
| `VERCEL_OIDC_TOKEN` | OIDC token for authentication |

**Note**: Commented out in `.env.example` because Vercel sets them automatically.

---

### Advertising

**Status**: ❌ **OPTIONAL** (Google AdSense)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_ADSENSE_CLIENT_ID` | string | - | Google AdSense publisher ID (ca-pub-XXXXXXXX) |
| `NEXT_PUBLIC_ENABLE_ADS` | boolean | `false` | Enable ads display |

---

## Quick Setup Guides

### Minimal Setup (Development)

```env
# Copy .env.example to .env.local
# Fill in these 4 required variables:
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
DATABASE_URL=postgresql://...
```

### Production Setup (Recommended)

```env
# 1. Required (4 vars)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
DATABASE_URL=postgresql://...

# 2. Application (3 vars)
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production
LOG_LEVEL=warn

# 3. Email Provider (3 vars - choose one)
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@yourdomain.com

# 4. Cron Security (1 var)
CRON_SECRET=<generate-with-openssl-rand-base64-32>

# 5. Rate Limiting (1 var - already enabled by default)
RATE_LIMIT_ENABLED=true

# Total: 12 variables for production-ready deployment
```

### Full-Featured Setup (All Integrations)

Add to production setup above:

```env
# Payments
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# WhatsApp
ENABLE_WHATSAPP=true
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_ACCESS_TOKEN=...

# SMS
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# Monitoring
NEXT_PUBLIC_SENTRY_DSN=https://...
MONITORING_ENABLED=true

# Caching (Upstash)
CACHE_PROVIDER=upstash
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

---

## Environment Files

| File | Purpose | Commit? |
|------|---------|---------|
| `.env.example` | Template with all variables | ✅ Yes |
| `.env.local` | Development secrets | ❌ **NO** |
| `.env.production` | Production overrides | ❌ **NO** |
| `.env.test` | Test environment | ✅ Yes (no secrets) |

**Security**:
- ✅ `.env.example` is committed (no real values)
- ❌ `.env.local` is in `.gitignore` (contains secrets)
- ❌ Never commit real API keys or secrets

---

## Verification Checklist

### Before Deploying

- [ ] All **REQUIRED** variables set
- [ ] `CRON_SECRET` generated and added to GitHub + Vercel
- [ ] Email provider configured (if using notifications)
- [ ] `NEXT_PUBLIC_APP_URL` set to production domain
- [ ] `NODE_ENV=production`
- [ ] Rate limiting enabled
- [ ] Monitoring configured (Sentry recommended)
- [ ] No secrets in `.env.example`
- [ ] `.env.local` not committed to git

### Testing Environment Variables

```bash
# Development
npm run dev
# Check console for "Missing environment variable" errors

# Production build
npm run build
# Vercel/Next.js will error on missing NEXT_PUBLIC_* vars
```

---

## Troubleshooting

### "Missing environment variable" Error

**Symptom**: Build or runtime error about missing variable.

**Solution**:
1. Check which variable is missing
2. Add to `.env.local` (development) or Vercel env vars (production)
3. Restart dev server or redeploy

### "Unauthorized" API Errors

**Symptom**: 401 errors when calling Supabase.

**Solution**:
1. Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Check `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
3. Ensure RLS policies are correct

### Cron Jobs Not Running

**Symptom**: Scheduled jobs not executing.

**Solution**:
1. Verify `CRON_SECRET` matches in GitHub Secrets and Vercel
2. Check GitHub Actions logs for auth errors
3. Test endpoint manually: `curl -H "Authorization: Bearer $CRON_SECRET" https://yourdomain.com/api/cron/health`

### Email Not Sending

**Symptom**: Notifications not delivered.

**Solution**:
1. Verify `EMAIL_PROVIDER` is set correctly
2. Check provider-specific credentials (RESEND_API_KEY, etc.)
3. Test email sending: `npm run test:email` (if test exists)
4. Check provider dashboard for delivery status

---

## Related Documentation

- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - Pre-deployment procedures
- [web/.env.example](../web/.env.example) - Template file
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common problems
- [Supabase Documentation](https://supabase.com/docs)

---

**Last Updated**: January 2026  
**Total Variables**: 77 unique environment variables  
**Required for Basic Setup**: 4 variables  
**Recommended for Production**: 12 variables
