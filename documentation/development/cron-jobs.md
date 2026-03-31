# Cron Jobs / Background Tasks

Scheduled background tasks for the Vete platform, deployed as Vercel Cron endpoints.

> **Location**: `web/app/api/cron/`
> **Last Updated**: January 2026

---

## Overview

The platform uses Vercel Cron for scheduled background tasks. Each cron job is a standard Next.js API route that gets triggered on a schedule defined in `vercel.json`.

---

## Available Cron Jobs

| Endpoint | Schedule | Purpose |
|----------|----------|---------|
| `/api/cron/release-reservations` | Every 5 min | Release expired cart stock reservations |
| `/api/cron/process-subscriptions` | Daily 6am | Process recurring subscription renewals |
| `/api/cron/expiry-alerts` | Daily 9am | Send product expiry notifications |
| `/api/cron/stock-alerts` | Daily 8am | Send low stock email alerts |
| `/api/cron/reminders` | Every hour | Process scheduled appointment/vaccine reminders |

---

## Security

All cron endpoints verify the `CRON_SECRET` environment variable:

```typescript
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ... job logic
}
```

Set in Vercel environment variables:
- Key: `CRON_SECRET`
- Value: A secure random string (32+ characters)

---

## Vercel Configuration

Configure cron schedules in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/release-reservations",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/process-subscriptions",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/cron/expiry-alerts",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/stock-alerts",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/cron/reminders",
      "schedule": "0 * * * *"
    }
  ]
}
```

---

## Cron Job Details

### release-reservations

Releases stock reservations from abandoned carts.

**Schedule**: Every 5 minutes
**Max Duration**: 60 seconds

**How it works**:
1. Calls `release_expired_reservations()` RPC function
2. Finds cart items with reservations older than the timeout (e.g., 30 minutes)
3. Returns reserved stock to available inventory
4. Logs released count

**Response**:
```json
{
  "success": true,
  "released_count": 5,
  "duration_ms": 150,
  "timestamp": "2026-01-04T10:00:00.000Z"
}
```

---

### process-subscriptions

Processes recurring subscription renewals.

**Schedule**: Daily at 6:00 AM
**Max Duration**: 300 seconds

**How it works**:
1. Finds subscriptions due for renewal
2. Creates new orders for each subscription
3. Attempts payment capture
4. Updates next renewal date
5. Sends confirmation emails

---

### expiry-alerts

Sends notifications about products expiring soon.

**Schedule**: Daily at 9:00 AM
**Max Duration**: 120 seconds

**How it works**:
1. Queries products with `expiry_date` within 30 days
2. Groups by tenant
3. Sends email digest to each clinic's admin
4. Logs notification count

---

### stock-alerts

Sends low stock email notifications.

**Schedule**: Daily at 8:00 AM
**Max Duration**: 120 seconds

**How it works**:
1. Queries `stock_alerts` table for pending notifications
2. Checks if products are now in stock
3. Sends "back in stock" emails to interested users
4. Marks alerts as notified

---

### reminders

Processes scheduled appointment and vaccine reminders.

**Schedule**: Every hour
**Max Duration**: 300 seconds

**How it works**:
1. Queries `reminders` table for due reminders
2. Sends reminders via configured channel (email, WhatsApp)
3. Updates reminder status
4. Handles retry logic for failed sends

---

## Creating a New Cron Job

1. **Create the route**:

```typescript
// web/app/api/cron/my-job/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // seconds

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('Unauthorized cron attempt for my-job')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const startTime = Date.now()

  try {
    // Your job logic here
    const result = await doWork(supabase)

    logger.info('My job completed', {
      processedCount: result.count,
      durationMs: Date.now() - startTime,
    })

    return NextResponse.json({
      success: true,
      processed_count: result.count,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    logger.error('Exception in my-job cron', { error: error.message })

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
```

2. **Add to vercel.json**:

```json
{
  "crons": [
    {
      "path": "/api/cron/my-job",
      "schedule": "0 * * * *"
    }
  ]
}
```

3. **Test locally**:

```bash
# Manual trigger
curl -H "Authorization: Bearer your-secret" http://localhost:3000/api/cron/my-job
```

---

## Best Practices

### 1. Idempotency

Jobs should be safe to run multiple times:

```typescript
// Good: Uses upsert/on conflict
await supabase.from('processed_items')
  .upsert({ id: item.id, processed_at: new Date() }, { onConflict: 'id' })

// Bad: Could create duplicates
await supabase.from('processed_items')
  .insert({ id: item.id })
```

### 2. Batching

Process large datasets in batches:

```typescript
const BATCH_SIZE = 100
let offset = 0

while (true) {
  const { data: items } = await supabase
    .from('items')
    .select('*')
    .range(offset, offset + BATCH_SIZE - 1)

  if (!items?.length) break

  await processBatch(items)
  offset += BATCH_SIZE
}
```

### 3. Timeouts

Set appropriate `maxDuration` and handle long-running tasks:

```typescript
export const maxDuration = 300 // 5 minutes for Pro plans

// For very long jobs, consider chunking work
// and tracking progress in the database
```

### 4. Logging

Always log job execution for debugging:

```typescript
logger.info('Job started', { jobName: 'my-job' })
// ... do work
logger.info('Job completed', {
  jobName: 'my-job',
  processedCount: count,
  durationMs: elapsed,
})
```

### 5. Error Handling

Return proper status codes and log errors:

```typescript
catch (err) {
  logger.error('Job failed', { error: err.message, stack: err.stack })
  return NextResponse.json({ success: false, error: err.message }, { status: 500 })
}
```

---

## Monitoring

### Vercel Dashboard

View cron execution history in Vercel Dashboard → Functions → Cron Jobs.

### Logging

All cron jobs use the `logger` utility which outputs to Vercel's log stream:

```typescript
import { logger } from '@/lib/logger'

logger.info('Cron job message', { extra: 'data' })
logger.warn('Warning message')
logger.error('Error message', { error })
```

### Alerting

Consider setting up alerts for:
- Cron job failures (via Vercel integrations)
- Jobs taking longer than expected
- Jobs processing zero items unexpectedly

---

## Cron Schedule Reference

| Expression | Meaning |
|------------|---------|
| `* * * * *` | Every minute |
| `*/5 * * * *` | Every 5 minutes |
| `0 * * * *` | Every hour (top of hour) |
| `0 6 * * *` | Daily at 6:00 AM |
| `0 9 * * 1` | Every Monday at 9:00 AM |
| `0 0 1 * *` | First day of month at midnight |

Format: `minute hour day-of-month month day-of-week`

---

## Related Documentation

- [API Reference](../api/overview.md#cron--background-jobs-5-endpoints)
- [Stock Reservation System](./stock-reservations.md)
- [Vercel Cron Documentation](https://vercel.com/docs/cron-jobs)
