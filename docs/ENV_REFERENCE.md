# Environment Variables Reference

> Complete list of environment variables for Vetic

---

## Required Variables

These must be set for the application to function:

### Supabase (Database & Auth)

| Variable                        | Example                                                      | Description                                |
| ------------------------------- | ------------------------------------------------------------ | ------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | `https://xxx.supabase.co`                                    | Supabase project URL                       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGc...`                                                 | Public anon key (safe for client)          |
| `DATABASE_URL`                  | `postgresql://postgres:xxx@db.xxx.supabase.co:5432/postgres` | Direct database connection                 |
| `SUPABASE_SERVICE_ROLE_KEY`     | `eyJhbGc...`                                                 | Service role key (server-only, bypass RLS) |

**Where to find these**:

1. Go to Supabase Dashboard → Settings → API
2. Copy "URL" for `NEXT_PUBLIC_SUPABASE_URL`
3. Copy "anon public" for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Copy "service_role" for `SUPABASE_SERVICE_ROLE_KEY`
5. Go to Settings → Database → Connection string for `DATABASE_URL`

---

## Optional Variables

### Email (Resend)

| Variable             | Example             | Description                       |
| -------------------- | ------------------- | --------------------------------- |
| `RESEND_API_KEY`     | `re_xxx...`         | Resend API key for sending emails |
| `EMAIL_FROM_ADDRESS` | `noreply@Vetic.com` | Default sender email              |
| `EMAIL_FROM_NAME`    | `Vetic`             | Default sender name               |

**Features affected if missing**: Email confirmations, invoice sending, reminders

---

### SMS & WhatsApp (Twilio)

| Variable                 | Example        | Description                        |
| ------------------------ | -------------- | ---------------------------------- |
| `TWILIO_ACCOUNT_SID`     | `ACxxx...`     | Twilio account SID                 |
| `TWILIO_AUTH_TOKEN`      | `xxx...`       | Twilio auth token                  |
| `TWILIO_PHONE_NUMBER`    | `+15551234567` | Twilio phone number                |
| `TWILIO_WHATSAPP_NUMBER` | `+14155238886` | WhatsApp sandbox/production number |

**Features affected if missing**: SMS reminders, WhatsApp messaging

---

### Background Jobs (Inngest)

| Variable              | Example  | Description              |
| --------------------- | -------- | ------------------------ |
| `INNGEST_API_KEY`     | `xxx...` | Inngest API key          |
| `INNGEST_EVENT_KEY`   | `xxx...` | Inngest event key        |
| `INNGEST_SIGNING_KEY` | `xxx...` | For webhook verification |

**Features affected if missing**: Scheduled reminders, background clinic seeding

---

### Storage (Cloudinary/S3)

| Variable                | Example  | Description           |
| ----------------------- | -------- | --------------------- |
| `CLOUDINARY_CLOUD_NAME` | `Vetic`  | Cloudinary cloud name |
| `CLOUDINARY_API_KEY`    | `xxx...` | Cloudinary API key    |
| `CLOUDINARY_API_SECRET` | `xxx...` | Cloudinary API secret |

**Note**: By default, Supabase Storage is used. Cloudinary is optional for image optimization.

---

### Analytics

| Variable                 | Example        | Description          |
| ------------------------ | -------------- | -------------------- |
| `NEXT_PUBLIC_GA_ID`      | `G-XXXXXXXXXX` | Google Analytics ID  |
| `NEXT_PUBLIC_CLARITY_ID` | `xxx...`       | Microsoft Clarity ID |

---

### Application

| Variable               | Example                      | Description         |
| ---------------------- | ---------------------------- | ------------------- |
| `NEXT_PUBLIC_SITE_URL` | `https://Vetic.com`          | Production site URL |
| `NODE_ENV`             | `development` / `production` | Environment mode    |

---

## Development vs Production

### Development (.env.local)

```env
# Supabase - Development project
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
DATABASE_URL=postgresql://postgres:xxx@db.xxx.supabase.co:5432/postgres
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Optional - can be skipped in dev
# RESEND_API_KEY=
# TWILIO_ACCOUNT_SID=
# TWILIO_AUTH_TOKEN=

# Development mode
NODE_ENV=development
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Production

All variables should be set in your hosting provider's environment settings (Vercel, Railway, etc.)

**Never commit production secrets to git!**

---

## Setting Up

### Local Development

1. Copy the example file:

```bash
cd web
cp .env.example .env.local
```

2. Edit `.env.local` with your values

3. Restart dev server:

```bash
npm run dev
```

### Vercel

1. Go to Project Settings → Environment Variables
2. Add each variable
3. Select appropriate environments (Production, Preview, Development)
4. Redeploy

### Checking Configuration

Run the environment check:

```bash
npm run env:check
```

---

## Security Notes

| ⚠️ Warning                  | Action                                   |
| --------------------------- | ---------------------------------------- |
| `SUPABASE_SERVICE_ROLE_KEY` | **Never expose on client** - server only |
| `DATABASE_URL`              | **Never expose on client** - server only |
| `*_SECRET` variables        | **Never expose on client**               |
| `NEXT_PUBLIC_*`             | Safe for client (public data only)       |

### .gitignore

Ensure these are in `.gitignore`:

```
.env
.env.local
.env.production
*.pem
*.key
```

---

## Variable Prefixes

| Prefix         | Meaning                     |
| -------------- | --------------------------- |
| `NEXT_PUBLIC_` | Exposed to browser (public) |
| No prefix      | Server-only (secret)        |

Example:

- `NEXT_PUBLIC_SUPABASE_URL` → Safe for client
- `SUPABASE_SERVICE_ROLE_KEY` → Server only

---

## Troubleshooting

### "Environment variable not found"

```bash
# Check if variable is set
echo $NEXT_PUBLIC_SUPABASE_URL

# Or in Node
node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"
```

### Variables not updating

1. Restart dev server completely (Ctrl+C, npm run dev)
2. Clear Next.js cache: `rm -rf .next`
3. Rebuild: `npm run build`

### Production variables not working

1. Verify in hosting dashboard
2. Redeploy after adding variables
3. Check for typos in variable names

---

_Last updated: January 2026_
