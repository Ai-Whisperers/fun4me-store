# Cron Jobs Development Guide

**Last Updated**: January 2026  
**Status**: Production  
**Security Level**: Critical

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [Required Pattern](#required-pattern)
5. [Common Pitfalls](#common-pitfalls)
6. [Security Guidelines](#security-guidelines)
7. [Testing](#testing)
8. [Monitoring](#monitoring)
9. [Troubleshooting](#troubleshooting)
10. [Reference](#reference)

---

## Overview

### What Are Cron Jobs?

Cron jobs are **scheduled background tasks** that run automatically at specified intervals. In Vete, they handle critical operations like:

- 📧 **Notifications**: Stock alerts, reminders, expiry warnings
- 🔄 **Automation**: Recurring appointments, reservation releases
- 💰 **Billing**: Subscription processing, invoice generation
- 🧹 **Maintenance**: Data cleanup, backup verification

### Location

All cron endpoints are in:
```
web/app/api/cron/
├── stock-alerts/
│   ├── route.ts          # Customer alerts
│   └── staff/route.ts    # Staff alerts
├── reminders/
│   ├── route.ts          # Send reminders
│   └── generate/route.ts # Generate queue
├── billing/
│   ├── auto-charge/route.ts
│   ├── evaluate-grace/route.ts
│   └── send-reminders/route.ts
└── ... (18 total endpoints)
```

### Scheduling

Defined in `.github/workflows/cron.yml`:
```yaml
on:
  schedule:
    - cron: '0 * * * *'      # Hourly
    - cron: '*/5 * * * *'    # Every 5 minutes
    - cron: '0 4 * * *'      # Daily at 00:00 PYT
```

---

## Quick Start

### Creating a New Cron Job

**Step 1**: Create endpoint file
```bash
# Create file: web/app/api/cron/my-job/route.ts
```

**Step 2**: Use the required pattern (see below)

**Step 3**: Add to workflow
```yaml
# In .github/workflows/cron.yml
jobs:
  my-job:
    runs-on: ubuntu-latest
    if: github.event.schedule == '0 * * * *'
    steps:
      - name: Run My Job
        run: |
          curl -X GET https://vetic.ai-whisperers.org/api/cron/my-job \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -f
```

---

## Architecture

### Authentication Flow

```
GitHub Actions → Scheduled Trigger
    ↓
    Sends GET/POST to /api/cron/[endpoint]
    ↓
    Header: Authorization: Bearer {CRON_SECRET}
    ↓
    checkCronAuth() validates secret
    ↓
    Endpoint processes with service_role client
    ↓
    Returns JSON result (200 OK or 500 Error)
```

### Why service_role is Required

| Client Type | Auth Context | RLS Filtering | Use Case |
|-------------|--------------|---------------|----------|
| `anon` | User session | ✅ Filtered by `auth.uid()` | User-facing APIs |
| **`service_role`** | **System** | **❌ Bypasses RLS** | **Background jobs** |

**Critical**: Background jobs have **no user context**. RLS policies that check `auth.uid()` will deny access if using anonymous client.

**Example RLS Policy**:
```sql
CREATE POLICY "Users see own pets" ON pets
  FOR SELECT
  USING (owner_id = auth.uid());  -- Returns NULL for cron jobs!
```

**Result**:
- ❌ `createClient()` → `auth.uid()` is NULL → 0 rows returned
- ✅ `createClient('service_role')` → Bypasses RLS → All rows accessible

---

## Required Pattern

### Template (Copy This)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkCronAuth } from '@/lib/api/cron-auth'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes (adjust as needed)

/**
 * GET /api/cron/my-job
 * 
 * Description: [What this job does]
 * Schedule: [How often it runs]
 * 
 * @returns {success: boolean, [results]}
 */
export async function GET(request: NextRequest) {
  // ========================================
  // 1. AUTHENTICATION (MANDATORY)
  // ========================================
  const { authorized, errorResponse } = checkCronAuth(request)
  if (!authorized) {
    return errorResponse ?? NextResponse.json(
      { error: 'Unauthorized' }, 
      { status: 401 }
    )
  }

  // ========================================
  // 2. SUPABASE CLIENT (CRITICAL)
  // ========================================
  // ALWAYS use 'service_role' for background jobs
  const supabase = await createClient('service_role')

  // ========================================
  // 3. JOB LOGIC (WITH ERROR HANDLING)
  // ========================================
  try {
    logger.info('[MyJob] Starting cron job')
    
    // Your job logic here
    const { data, error } = await supabase
      .from('your_table')
      .select('*')
    
    if (error) {
      logger.error('[MyJob] Database error:', { error })
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    // Process data...
    const processed = data.length

    logger.info('[MyJob] Completed', { processed })

    // ========================================
    // 4. RETURN RESULT (MANDATORY)
    // ========================================
    return NextResponse.json({
      success: true,
      processed,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    // ========================================
    // 5. ERROR HANDLING (NEVER SKIP)
    // ========================================
    // NEVER silently swallow errors (project rule)
    const errorMessage = error instanceof Error 
      ? error.message 
      : String(error)
    
    logger.error('[MyJob] Failed:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

## Common Pitfalls

### ❌ PITFALL 1: Using Anonymous Client

```typescript
// ❌ WRONG - Will fail with "permission denied"
const supabase = await createClient()
```

**Why**: RLS policies block access when `auth.uid()` is NULL

**Fix**:
```typescript
// ✅ CORRECT - Bypasses RLS for system operations
const supabase = await createClient('service_role')
```

---

### ❌ PITFALL 2: Skipping Authentication

```typescript
// ❌ WRONG - Anyone can trigger your cron job
export async function GET(request: NextRequest) {
  const supabase = await createClient('service_role')
  // ... process ...
}
```

**Why**: Exposes internal operations to public

**Fix**:
```typescript
// ✅ CORRECT - Validates CRON_SECRET
const { authorized, errorResponse } = checkCronAuth(request)
if (!authorized) return errorResponse
```

---

### ❌ PITFALL 3: Silent Error Swallowing

```typescript
// ❌ FORBIDDEN - Violates project error handling rule
try {
  await someOperation()
} catch (error) {
  // Silently fail - not critical
}
```

**Why**: Hides failures, makes debugging impossible

**Fix**:
```typescript
// ✅ CORRECT - Log AND handle
try {
  await someOperation()
} catch (error) {
  logger.error('[JobName] Operation failed:', error)
  throw error // OR return structured error
}
```

See `CLAUDE.md` error handling rules for complete guidelines.

---

### ❌ PITFALL 4: No Timeout Protection

```typescript
// ❌ WRONG - Could run forever and OOM
export async function GET(request: NextRequest) {
  // Process unlimited data...
}
```

**Why**: Vercel functions have 5min max, exceeding crashes

**Fix**:
```typescript
// ✅ CORRECT - Set reasonable limits
export const maxDuration = 300 // 5 minutes

// AND add pagination/chunking
const { data } = await supabase
  .from('large_table')
  .select('*')
  .limit(100)  // Process in chunks
```

---

### ❌ PITFALL 5: Missing Result Logging

```typescript
// ❌ WRONG - No visibility into what happened
return NextResponse.json({ success: true })
```

**Why**: Can't debug or monitor job effectiveness

**Fix**:
```typescript
// ✅ CORRECT - Detailed results
return NextResponse.json({
  success: true,
  processed: emailsSent,
  failed: failedEmails,
  duration: Date.now() - startTime,
  timestamp: new Date().toISOString(),
})
```

---

## Security Guidelines

### 1. Secret Management

**Environment Variables Required**:
- `CRON_SECRET` - Bearer token for authentication (GitHub Secret + Vercel Env)
- `SUPABASE_SERVICE_ROLE_KEY` - Admin database access

**Never**:
- ❌ Hardcode secrets in code
- ❌ Commit `.env` files
- ❌ Log secret values
- ❌ Return secrets in responses

### 2. Input Validation

Even though cron jobs are internal, validate all external data:

```typescript
// ✅ Validate before processing
if (!isValidEmail(alert.email)) {
  logger.warn('[Job] Invalid email, skipping', { email: alert.email })
  continue
}
```

### 3. Rate Limiting

For jobs that call external APIs:

```typescript
// ✅ Add delays between API calls
for (const alert of alerts) {
  await sendEmail(alert)
  await sleep(100) // 100ms between calls
}
```

### 4. Tenant Isolation

Even with `service_role`, maintain tenant boundaries:

```typescript
// ✅ Process per tenant, don't mix data
for (const tenant of tenants) {
  const { data } = await supabase
    .from('pets')
    .select('*')
    .eq('tenant_id', tenant.id) // Explicit filter
}
```

---

## Testing

### Manual Testing

```bash
# Test locally (requires CRON_SECRET in .env.local)
curl -X GET http://localhost:3000/api/cron/my-job \
  -H "Authorization: Bearer your-test-secret" \
  -v
```

### Expected Response

```json
{
  "success": true,
  "processed": 42,
  "timestamp": "2026-01-20T17:00:00.000Z"
}
```

### Unit Testing

```typescript
// tests/unit/cron/my-job.test.ts
import { GET } from '@/app/api/cron/my-job/route'

describe('My Job Cron', () => {
  it('should process data correctly', async () => {
    const request = new Request('http://localhost/api/cron/my-job', {
      headers: { 'Authorization': 'Bearer test-secret' }
    })
    
    const response = await GET(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })
})
```

### Integration Testing

Test with actual database (use test tenant):

```typescript
// Seed test data
await supabase.from('notification_queue').insert({
  type: 'stock_restored',
  payload: { product_id: 'test-123', tenant_id: 'test-tenant' },
  status: 'pending',
})

// Run job
const response = await GET(mockRequest)

// Verify
const { data } = await supabase
  .from('notification_queue')
  .select('*')
  .eq('status', 'completed')
  
expect(data).toHaveLength(1)
```

---

## Monitoring

### GitHub Actions Dashboard

```bash
# View recent runs
gh run list --workflow=cron.yml --limit 20

# Check specific job
gh run view [RUN_ID] --log

# Watch in real-time
gh run watch
```

### Vercel Production Logs

```bash
# Filter cron logs
vercel logs --app=vetepy --since=24h --filter="cron"

# Specific endpoint
vercel logs --filter="/api/cron/stock-alerts"
```

### Key Metrics to Track

| Metric | How to Measure | Healthy Value |
|--------|----------------|---------------|
| Success Rate | GitHub Actions history | > 95% |
| Response Time | Vercel logs | < 30s |
| Error Rate | Log errors per hour | < 1% |
| Processing Count | Job response JSON | Consistent |

### Alerts to Set Up

1. **Job Failures**: If 3 consecutive failures → Alert team
2. **Timeouts**: If duration > 4 minutes → Investigate
3. **Zero Processing**: If `processed: 0` for 24h → Check data flow
4. **500 Errors**: Any HTTP 500 → Immediate notification

---

## Troubleshooting

### "Unauthorized" (401)

**Cause**: CRON_SECRET mismatch

**Check**:
```bash
# GitHub Secret
gh secret list --repo Ai-Whisperers/Vete

# Vercel Env
vercel env ls --environment production
```

**Fix**: Ensure both match exactly

---

### "Permission Denied" (500)

**Cause**: Using anonymous client with RLS tables

**Check**:
```typescript
// Look for this pattern in your endpoint
const supabase = await createClient() // ❌ WRONG
```

**Fix**:
```typescript
const supabase = await createClient('service_role') // ✅ CORRECT
```

---

### "Function Timeout" (504)

**Cause**: Job exceeded 5-minute limit

**Solutions**:
1. **Add pagination**:
```typescript
const BATCH_SIZE = 100
const { data } = await supabase
  .from('large_table')
  .select('*')
  .range(offset, offset + BATCH_SIZE)
```

2. **Increase timeout** (if needed):
```typescript
export const maxDuration = 300 // Maximum 5 minutes
```

3. **Split into multiple jobs**:
```yaml
# Instead of one large job, create multiple smaller ones
jobs:
  process-batch-1:
    # Process records 0-1000
  process-batch-2:
    # Process records 1000-2000
```

---

### Zero Results Processed

**Cause**: Data not in expected state

**Debug**:
```typescript
// Add detailed logging
logger.info('[Job] Query filters:', { tenant_id, status, created_after })

const { data, error, count } = await supabase
  .from('table')
  .select('*', { count: 'exact' })
  .eq('status', 'pending')

logger.info('[Job] Query result:', { 
  count, 
  hasError: !!error,
  resultLength: data?.length 
})
```

**Common Issues**:
- Wrong status filter (`pending` vs `queued`)
- Date comparison issues (timezone problems)
- Data already processed by previous run

---

## Reference

### All Cron Endpoints (18 Total)

| Endpoint | Schedule | Purpose | Critical |
|----------|----------|---------|----------|
| `billing/auto-charge` | Daily 10:00 | Charge subscriptions | 🔴 High |
| `billing/evaluate-grace` | Daily 10:00 | Grace period logic | 🟡 Medium |
| `billing/generate-platform-invoices` | Monthly 1st | Platform fees | 🔴 High |
| `billing/send-reminders` | Daily 10:00 | Payment reminders | 🟡 Medium |
| `capture-metrics` | Hourly | Performance tracking | 🟢 Low |
| `check-health` | Every 5 min | System health | 🟢 Low |
| `cleanup-exports` | Daily | File cleanup | 🟢 Low |
| `expiry-alerts` | Daily 08:00 | Product expiry | 🟡 Medium |
| `generate-commission-invoices` | Monthly 1st | Commission billing | 🔴 High |
| `generate-recurring` | Daily 00:00 | Recurring appointments | 🔴 High |
| `process-subscriptions` | Daily 06:00 | Subscription processing | 🔴 High |
| `release-reservations` | Every 5 min | Cart expiry | 🔴 High |
| `reminders` | Daily 07:00 | Send reminders | 🔴 High |
| `reminders/generate` | Daily 06:00 | Generate reminder queue | 🔴 High |
| `retention` | Daily | Data retention | 🟡 Medium |
| `stock-alerts` | Hourly | Customer alerts | 🔴 High |
| `stock-alerts/staff` | Daily 08:00 | Staff alerts | 🟡 Medium |
| `verify-backup` | Daily | Backup verification | 🟡 Medium |

### Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Log results, monitor metrics |
| 401 | Unauthorized | Check CRON_SECRET |
| 500 | Internal Error | Check logs, may need hotfix |
| 504 | Timeout | Optimize query or add pagination |

### Best Practices Checklist

Before deploying a new cron job:

- [ ] Uses `createClient('service_role')`
- [ ] Has `checkCronAuth()` validation
- [ ] Includes comprehensive error logging
- [ ] Has `maxDuration` set appropriately
- [ ] Returns structured JSON result
- [ ] Tested locally with curl
- [ ] Added to `.github/workflows/cron.yml`
- [ ] CRON_SECRET configured in GitHub + Vercel
- [ ] Monitoring/alerting set up
- [ ] Documentation updated

---

## Additional Resources

- **Project Rules**: `CLAUDE.md` (error handling, security)
- **Cron Workflow**: `.github/workflows/cron.yml`
- **Auth Helper**: `web/lib/api/cron-auth.ts`
- **Logger**: `web/lib/logger.ts`
- **Supabase Client**: `web/lib/supabase/server.ts`

---

**Questions?** Check existing cron endpoints for reference patterns or consult the team.

**Last Audit**: January 2026 - All 18 endpoints secured with service_role client.
