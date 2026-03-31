# AUDIT-002: Cron Job Failure Alerting

## Priority: P2 (Medium)
## Category: Audit / Monitoring
## Status: COMPLETED

## Description
Failed cron jobs only log errors locally. There's no alerting system to notify developers when critical background jobs fail.

## Current State
### Current Error Handling
**`app/api/cron/process-subscriptions/route.ts`**
```typescript
if (!dueSubscriptions || dueSubscriptions.length === 0) {
  logger.info('No subscriptions to process')
  return NextResponse.json({ message: 'No subscriptions to process' })
}

// On error
logger.error('Failed to process subscription', error)
results.errors.push(`Subscription ${subscription.id}: ${error.message}`)

// Returns 200 with error details - NO ALERT!
return NextResponse.json(results)
```

### Problems
1. Errors logged but not alerted
2. Returns 200 status even with errors
3. No retry mechanism
4. No alerting for stuck jobs
5. No monitoring dashboard

### Impact
- Subscription processing fails silently for days
- Stock reservations not released
- Billing reminders not sent
- Manual checking required

## Proposed Solution

**Decision: Email Only** - Alerts will be sent via email to admin addresses (no Slack integration for now).

### 1. Alerting Service
```typescript
// lib/monitoring/alerts.ts
interface AlertPayload {
  type: 'cron_failure' | 'high_error_rate' | 'stuck_job' | 'system_error'
  job: string
  message: string
  details?: Record<string, unknown>
  severity: 'warning' | 'error' | 'critical'
}

export async function sendAlert(payload: AlertPayload) {
  // Email alerts to admin addresses
  if (process.env.ALERT_EMAIL) {
    await sendEmailAlert(payload)
  }

  // Log for Vercel monitoring
  console.error(`[ALERT:${payload.severity}] ${payload.job}: ${payload.message}`, payload.details)
}

async function sendEmailAlert(payload: AlertPayload) {
  const severityColors = {
    warning: '#FFA500',
    error: '#FF0000',
    critical: '#8B0000',
  }

  await sendEmail({
    to: process.env.ALERT_EMAIL!.split(','),
    subject: `[${payload.severity.toUpperCase()}] ${payload.job}: ${payload.type}`,
    template: 'cron-alert',
    data: {
      job: payload.job,
      type: payload.type,
      message: payload.message,
      severity: payload.severity,
      details: payload.details,
      timestamp: new Date().toISOString(),
    },
  })
}
```

### 2. Cron Wrapper with Alerting
```typescript
// lib/api/with-cron-monitoring.ts
interface CronResult {
  success: boolean
  processed: number
  errors: string[]
  duration: number
}

export function withCronMonitoring(
  jobName: string,
  handler: (request: NextRequest) => Promise<CronResult>
) {
  return async (request: NextRequest) => {
    const startTime = Date.now()

    try {
      const result = await handler(request)
      const duration = Date.now() - startTime

      // Log success
      logger.info(`Cron ${jobName} completed`, {
        ...result,
        duration,
      })

      // Alert if high error rate
      if (result.errors.length > 0) {
        const errorRate = result.errors.length / (result.processed + result.errors.length)
        if (errorRate > 0.1) { // >10% error rate
          await sendAlert({
            type: 'high_error_rate',
            job: jobName,
            message: `${result.errors.length} errors out of ${result.processed + result.errors.length} items`,
            details: {
              error_rate: `${(errorRate * 100).toFixed(1)}%`,
              sample_errors: result.errors.slice(0, 3),
            },
            severity: errorRate > 0.5 ? 'critical' : 'warning',
          })
        }
      }

      // Alert if job took too long
      if (duration > 120000) { // >2 minutes
        await sendAlert({
          type: 'stuck_job',
          job: jobName,
          message: `Job took ${duration / 1000}s to complete`,
          severity: 'warning',
        })
      }

      return NextResponse.json(result)
    } catch (error) {
      const duration = Date.now() - startTime

      // Alert on failure
      await sendAlert({
        type: 'cron_failure',
        job: jobName,
        message: error instanceof Error ? error.message : 'Unknown error',
        details: {
          duration_ms: duration,
          stack: error instanceof Error ? error.stack : undefined,
        },
        severity: 'critical',
      })

      // Return 500 so Vercel shows failure in dashboard
      return NextResponse.json({
        success: false,
        error: 'Cron job failed',
      }, { status: 500 })
    }
  }
}
```

### 3. Updated Cron Jobs
```typescript
// app/api/cron/process-subscriptions/route.ts
import { withCronMonitoring } from '@/lib/api/with-cron-monitoring'

async function processSubscriptions(request: NextRequest): Promise<CronResult> {
  // ... auth

  const results = { success: true, processed: 0, errors: [] }

  // ... processing logic

  return results
}

export const GET = withCronMonitoring('process-subscriptions', processSubscriptions)
```

### 4. Health Check Endpoint
```typescript
// app/api/health/cron/route.ts
export async function GET() {
  const { data: lastRuns } = await supabase
    .from('cron_job_runs')
    .select('*')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  const health = {
    'process-subscriptions': checkJobHealth(lastRuns, 'process-subscriptions', 60),
    'release-reservations': checkJobHealth(lastRuns, 'release-reservations', 5),
    'send-reminders': checkJobHealth(lastRuns, 'send-reminders', 60),
    // ... other jobs
  }

  const hasFailures = Object.values(health).some(h => !h.healthy)

  return NextResponse.json({
    status: hasFailures ? 'unhealthy' : 'healthy',
    jobs: health,
  }, { status: hasFailures ? 500 : 200 })
}
```

## Implementation Steps
1. Create alerting service with email support
2. Create email template for cron alerts
3. Create cron monitoring wrapper
4. Update all cron jobs to use wrapper
5. Return 500 on failures (for Vercel monitoring)
6. Create cron health check endpoint
7. Add cron_job_runs table for history

## Acceptance Criteria
- [x] Email alert sent to ALERT_EMAIL on cron failures
- [x] Alert on high error rates (>10%)
- [x] Alert on slow jobs (>2 min)
- [x] 500 status returned on failure
- [x] Health check endpoint available
- [x] Vercel shows failures in dashboard

## Implementation Summary

### Files Created
1. **`lib/monitoring/alerts.ts`** - Alerting service with email support via Resend
   - `sendAlert()` - Generic alert function
   - `sendCronFailureAlert()` - Critical failure alerts
   - `sendHighErrorRateAlert()` - Warning for >10% error rate
   - `sendSlowJobAlert()` - Warning for jobs >2 minutes
   - HTML email template with severity colors and details formatting

2. **`lib/api/with-cron-monitoring.ts`** - Cron wrapper with full monitoring
   - Automatic auth check via `checkCronAuth()`
   - Duration tracking and slow job detection
   - Error rate calculation and alerting
   - Returns 500 on failure for Vercel dashboard visibility
   - Structured logging with `createRequestLogger`

3. **`app/api/health/route.ts`** - Basic health check endpoint
   - Returns `{ status: 'healthy', timestamp, version }`

4. **`app/api/health/cron/route.ts`** - Cron health check endpoint
   - Defines 5 cron jobs with expected intervals and grace periods
   - `checkJobHealth()` function for status evaluation
   - Returns job-by-job health with summary statistics
   - Returns 500 for unhealthy status (external monitoring)

### Files Modified
- **`lib/monitoring/index.ts`** - Added exports for alerting functions

### Environment Variables Required
- `ALERT_EMAIL` - Comma-separated list of admin email addresses
- `RESEND_API_KEY` - Already configured for email sending

### Usage Example
```typescript
import { withCronMonitoring, CronResult } from '@/lib/api/with-cron-monitoring'

async function myJob(request: NextRequest, log: Logger): Promise<CronResult> {
  const results = { success: true, processed: 0, errors: [] as string[] }
  // ... processing logic
  return results
}

export const POST = withCronMonitoring('my-job', myJob)
```

### Note
Cron jobs can be incrementally migrated to use `withCronMonitoring`. The wrapper handles auth, logging, and alerting automatically.

## Related Files
- `web/lib/monitoring/alerts.ts` (new)
- `web/lib/api/with-cron-monitoring.ts` (new)
- `web/app/api/cron/*/route.ts` (all cron files)
- `web/app/api/health/cron/route.ts` (new)

## Estimated Effort
- Alerting service: 1.5 hours
- Email template: 0.5 hours
- Monitoring wrapper: 2 hours
- Update cron jobs: 2 hours
- Health check: 1 hour
- Testing: 1 hour
- **Total: 8 hours**

---
*Ticket created: January 2026*
*Based on security/performance audit*
