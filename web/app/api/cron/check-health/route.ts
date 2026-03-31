/**
 * Cron Health Check Alerter
 *
 * AUDIT-002: GET /api/cron/check-health
 *
 * Periodically checks the health of all cron jobs and sends
 * alerts for any that are unhealthy or critical.
 *
 * Recommended schedule: Every 5 minutes
 */

import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { trackCronExecution } from '@/lib/services/cron-tracker'
import { checkAndAlertUnhealthyJobs } from '@/lib/services/cron-alerting'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// =============================================================================
// Authorization
// =============================================================================

async function verifyCronAuth(): Promise<boolean> {
  const headersList = await headers()
  const authHeader = headersList.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    logger.warn('CRON_SECRET not configured')
    return false
  }

  return authHeader === `Bearer ${cronSecret}`
}

// =============================================================================
// Handler
// =============================================================================

export async function GET() {
  // Verify authorization
  const isAuthorized = await verifyCronAuth()
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await trackCronExecution('check-health', async () => {
    const alertResult = await checkAndAlertUnhealthyJobs()

    logger.info('Cron health check completed', {
      checked: alertResult.checked,
      alertsSent: alertResult.alerts,
    })

    return {
      processed: alertResult.checked,
      metadata: {
        alertsSent: alertResult.alerts,
      },
    }
  })

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error,
        durationMs: result.durationMs,
      },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    checked: result.data?.processed || 0,
    alertsSent: result.data?.metadata?.alertsSent || 0,
    durationMs: result.durationMs,
  })
}
