/**
 * Data Retention Cron Job
 *
 * POST /api/cron/retention
 *
 * DATA-005: Execute data retention policies to clean up old data.
 * Recommended schedule: Weekly (Sunday 3 AM)
 *
 * Query params:
 * - dryRun: If 'true', only report what would be deleted
 * - tables: Comma-separated list of specific tables to process
 */

import { NextRequest } from 'next/server'
import { withCronMonitoring, type CronResult } from '@/lib/api/with-cron-monitoring'
import { runRetentionJob } from '@/lib/data/retention-job'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes max

async function handleRetention(
  request: NextRequest,
  log: Parameters<Parameters<typeof withCronMonitoring>[1]>[1]
): Promise<CronResult> {
  const { searchParams } = new URL(request.url)
  const dryRun = searchParams.get('dryRun') === 'true'
  const tablesParam = searchParams.get('tables')
  const tables = tablesParam ? tablesParam.split(',').map((t) => t.trim()) : undefined

  log.info('Starting data retention job', { dryRun, tables })

  const summary = await runRetentionJob({
    dryRun,
    tables,
  })

  return {
    success: summary.errors.length === 0,
    processed: summary.totalRecordsProcessed,
    skipped: 0,
    failed: summary.errors.length,
    errors: summary.errors,
    data: {
      runId: summary.runId,
      dryRun: summary.dryRun,
      tablesProcessed: summary.tablesProcessed,
      results: summary.results,
    },
  }
}

export const POST = withCronMonitoring('data-retention', handleRetention, {
  slowJobThresholdMs: 300_000, // 5 minutes for retention job
})

// Also support GET for manual triggering
export const GET = withCronMonitoring('data-retention', handleRetention, {
  slowJobThresholdMs: 300_000,
})
