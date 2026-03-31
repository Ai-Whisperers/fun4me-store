/**
 * Backup Verification Cron Job
 *
 * POST /api/cron/verify-backup
 *
 * DATA-001: Automated backup verification and integrity checking.
 * Recommended schedule: Weekly (every Sunday at 02:00 UTC)
 *
 * Verifies:
 * - Critical table row counts
 * - Foreign key integrity
 * - Data presence in critical tables
 * - Sample query performance
 */

import { NextRequest } from 'next/server'
import { withCronMonitoring, type CronResult } from '@/lib/api/with-cron-monitoring'
import { createServiceClient } from '@/lib/supabase/service'
import {
  verifyBackup,
  getBackupStatus,
  formatVerificationReport,
  DEFAULT_BACKUP_STRATEGY,
} from '@/lib/backup'

export const dynamic = 'force-dynamic'
export const maxDuration = 120 // 2 minutes max for verification

async function handleVerifyBackup(
  _request: NextRequest,
  log: Parameters<Parameters<typeof withCronMonitoring>[1]>[1]
): Promise<CronResult> {
  log.info('Starting backup verification')

  const supabase = createServiceClient()

  try {
    // Run full backup verification
    const verificationResult = await verifyBackup()

    log.info('Verification completed', {
      status: verificationResult.status,
      duration: verificationResult.duration,
      passed: verificationResult.summary.passed,
      failed: verificationResult.summary.failed,
      warnings: verificationResult.summary.warnings,
    })

    // Get backup status
    const backupStatus = getBackupStatus(verificationResult)

    // Store verification result
    const { error: insertError } = await supabase
      .from('backup_verification_results')
      .insert({
        timestamp: verificationResult.timestamp.toISOString(),
        status: verificationResult.status,
        checks: verificationResult.checks,
        summary: verificationResult.summary,
        duration_ms: verificationResult.duration,
        strategy: DEFAULT_BACKUP_STRATEGY,
      })

    // If table doesn't exist, just log - it's not critical
    if (insertError && !insertError.message.includes('does not exist')) {
      log.warn('Could not store verification result', { error: insertError.message })
    }

    // Generate report for logging
    const report = formatVerificationReport(verificationResult)
    log.info('Verification report generated', {
      reportLength: report.length,
      alertCount: backupStatus.alerts.length,
    })

    // Create platform notification if verification failed
    if (verificationResult.status === 'failed') {
      const { error: notifyError } = await supabase
        .from('platform_announcements')
        .insert({
          title: '⚠️ Backup Verification Failed',
          content: `Backup verification failed with ${verificationResult.summary.failed} failed checks. Please review immediately.`,
          is_active: true,
          type: 'alert',
        })

      if (notifyError && !notifyError.message.includes('does not exist')) {
        log.warn('Could not create alert notification', { error: notifyError.message })
      }

      return {
        success: false,
        processed: verificationResult.summary.totalChecks,
        skipped: 0,
        failed: verificationResult.summary.failed,
        errors: verificationResult.checks
          .filter((c) => c.status === 'failed')
          .map((c) => c.message),
        data: {
          status: verificationResult.status,
          backupStatus: backupStatus.status,
          summary: verificationResult.summary,
        },
      }
    }

    return {
      success: true,
      processed: verificationResult.summary.totalChecks,
      skipped: 0,
      failed: 0,
      errors: [],
      data: {
        status: verificationResult.status,
        backupStatus: backupStatus.status,
        duration: verificationResult.duration,
        summary: verificationResult.summary,
        nextBackup: backupStatus.nextScheduled?.toISOString(),
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    log.error('Backup verification failed', { error: message })

    return {
      success: false,
      processed: 0,
      skipped: 0,
      failed: 1,
      errors: [message],
    }
  }
}

export const POST = withCronMonitoring('verify-backup', handleVerifyBackup, {
  slowJobThresholdMs: 60_000, // 1 minute is slow for verification
})

// Support GET for manual triggering
export const GET = withCronMonitoring('verify-backup', handleVerifyBackup, {
  slowJobThresholdMs: 60_000,
})
