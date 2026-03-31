/**
 * Cleanup Expired Exports Cron Job
 *
 * POST /api/cron/cleanup-exports
 *
 * DATA-002: Marks expired export jobs and optionally cleans up storage.
 * Recommended schedule: Daily (3 AM)
 */

import { NextRequest } from 'next/server'
import { withCronMonitoring, type CronResult } from '@/lib/api/with-cron-monitoring'
import { cleanupExpiredExports } from '@/lib/export'

export const dynamic = 'force-dynamic'

async function handleCleanupExports(
  request: NextRequest,
  log: Parameters<Parameters<typeof withCronMonitoring>[1]>[1]
): Promise<CronResult> {
  log.info('Starting export cleanup job')

  const expiredCount = await cleanupExpiredExports()

  return {
    success: true,
    processed: expiredCount,
    skipped: 0,
    failed: 0,
    errors: [],
    data: {
      expiredJobsMarked: expiredCount,
    },
  }
}

export const POST = withCronMonitoring('cleanup-exports', handleCleanupExports)

// Also support GET for manual triggering
export const GET = withCronMonitoring('cleanup-exports', handleCleanupExports)
