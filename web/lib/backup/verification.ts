/**
 * Backup Verification
 *
 * DATA-001: Main backup verification orchestration
 */

import type { BackupVerificationResult, BackupStrategy, BackupStatus } from './types'
import {
  checkRowCounts,
  checkForeignKeyIntegrity,
  checkCriticalData,
  runSampleQueries,
  CRITICAL_TABLES,
} from './integrity'

/**
 * Default backup strategy configuration
 */
export const DEFAULT_BACKUP_STRATEGY: BackupStrategy = {
  primary: {
    provider: 'supabase',
    frequency: 'daily',
    retention: { days: 30 },
    enabled: true,
  },
  secondary: {
    provider: 's3',
    frequency: 'weekly',
    retention: { days: 90 },
    enabled: false, // Requires S3 configuration
  },
  pointInTimeRecovery: {
    enabled: true,
    retentionDays: 7,
  },
  storage: {
    provider: 'supabase',
    frequency: 'daily',
    retention: { days: 30 },
    enabled: true,
  },
  rto: {
    target: 4, // 4 hours
  },
  rpo: {
    target: 1, // 1 hour
  },
}

/**
 * Run full backup verification
 *
 * This function runs all integrity checks to verify that a backup
 * would contain valid, consistent data.
 */
export async function verifyBackup(): Promise<BackupVerificationResult> {
  const startTime = Date.now()
  const allChecks = []

  // Run all integrity checks in parallel
  const [rowCountResults, fkResults, dataResults, queryResults] = await Promise.all([
    checkRowCounts(),
    checkForeignKeyIntegrity(),
    checkCriticalData(CRITICAL_TABLES as unknown as string[]),
    runSampleQueries(),
  ])

  allChecks.push(...rowCountResults, ...fkResults, ...dataResults, ...queryResults)

  // Calculate summary
  const passed = allChecks.filter((c) => c.status === 'passed').length
  const failed = allChecks.filter((c) => c.status === 'failed').length
  const warnings = allChecks.filter((c) => c.status === 'warning').length

  // Determine overall status
  let status: 'success' | 'partial' | 'failed' = 'success'
  if (failed > 0) {
    status = 'failed'
  } else if (warnings > 0) {
    status = 'partial'
  }

  return {
    timestamp: new Date(),
    status,
    checks: allChecks,
    summary: {
      totalChecks: allChecks.length,
      passed,
      failed,
      warnings,
    },
    duration: Date.now() - startTime,
  }
}

/**
 * Get current backup status
 */
export function getBackupStatus(
  lastVerification: BackupVerificationResult | null
): BackupStatus {
  const now = new Date()

  // Determine status based on last verification
  let status: 'healthy' | 'degraded' | 'critical' = 'healthy'
  const alerts: BackupStatus['alerts'] = []

  if (!lastVerification) {
    status = 'degraded'
    alerts.push({
      id: 'no-verification',
      severity: 'warning',
      message: 'No backup verification has been performed',
      timestamp: now,
      acknowledged: false,
    })
  } else {
    // Check verification age
    const verificationAge = now.getTime() - lastVerification.timestamp.getTime()
    const hoursOld = verificationAge / (1000 * 60 * 60)

    if (hoursOld > 24) {
      alerts.push({
        id: 'stale-verification',
        severity: hoursOld > 72 ? 'critical' : 'warning',
        message: `Last verification was ${Math.round(hoursOld)} hours ago`,
        timestamp: now,
        acknowledged: false,
      })
    }

    // Check verification result
    if (lastVerification.status === 'failed') {
      status = 'critical'
      alerts.push({
        id: 'verification-failed',
        severity: 'critical',
        message: `Backup verification failed: ${lastVerification.summary.failed} checks failed`,
        timestamp: now,
        acknowledged: false,
      })
    } else if (lastVerification.status === 'partial') {
      status = 'degraded'
      alerts.push({
        id: 'verification-warnings',
        severity: 'warning',
        message: `Backup verification has warnings: ${lastVerification.summary.warnings} warnings`,
        timestamp: now,
        acknowledged: false,
      })
    }
  }

  return {
    lastBackup: new Date(), // Supabase handles daily backups automatically
    nextScheduled: getNextBackupTime(),
    status,
    lastVerification,
    alerts,
  }
}

/**
 * Calculate next backup time (assuming daily at 00:00 UTC)
 */
function getNextBackupTime(): Date {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  tomorrow.setUTCHours(0, 0, 0, 0)
  return tomorrow
}

/**
 * Format verification result for display
 */
export function formatVerificationReport(result: BackupVerificationResult): string {
  const lines: string[] = []

  lines.push('# Backup Verification Report')
  lines.push('')
  lines.push(`**Date**: ${result.timestamp.toISOString()}`)
  lines.push(`**Status**: ${result.status.toUpperCase()}`)
  lines.push(`**Duration**: ${result.duration}ms`)
  lines.push('')
  lines.push('## Summary')
  lines.push(`- Total Checks: ${result.summary.totalChecks}`)
  lines.push(`- Passed: ${result.summary.passed}`)
  lines.push(`- Failed: ${result.summary.failed}`)
  lines.push(`- Warnings: ${result.summary.warnings}`)
  lines.push('')
  lines.push('## Detailed Results')
  lines.push('')

  // Group by category
  const byCategory = result.checks.reduce(
    (acc, check) => {
      if (!acc[check.category]) {
        acc[check.category] = []
      }
      acc[check.category].push(check)
      return acc
    },
    {} as Record<string, typeof result.checks>
  )

  for (const [category, checks] of Object.entries(byCategory)) {
    lines.push(`### ${category.replace('_', ' ').toUpperCase()}`)
    for (const check of checks) {
      const icon = check.status === 'passed' ? '✅' : check.status === 'warning' ? '⚠️' : '❌'
      lines.push(`- ${icon} ${check.name}: ${check.message}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Format backup strategy for documentation
 */
export function formatBackupStrategy(strategy: BackupStrategy): string {
  const lines: string[] = []

  lines.push('# Backup Strategy')
  lines.push('')
  lines.push('## Primary Backup (Supabase)')
  lines.push(`- Provider: ${strategy.primary.provider}`)
  lines.push(`- Frequency: ${strategy.primary.frequency}`)
  lines.push(`- Retention: ${strategy.primary.retention.days} days`)
  lines.push(`- Status: ${strategy.primary.enabled ? 'Enabled' : 'Disabled'}`)
  lines.push('')

  if (strategy.secondary) {
    lines.push('## Secondary Backup')
    lines.push(`- Provider: ${strategy.secondary.provider}`)
    lines.push(`- Frequency: ${strategy.secondary.frequency}`)
    lines.push(`- Retention: ${strategy.secondary.retention.days} days`)
    lines.push(`- Status: ${strategy.secondary.enabled ? 'Enabled' : 'Disabled'}`)
    lines.push('')
  }

  lines.push('## Point-in-Time Recovery')
  lines.push(`- Enabled: ${strategy.pointInTimeRecovery.enabled}`)
  lines.push(`- Retention: ${strategy.pointInTimeRecovery.retentionDays} days`)
  lines.push('')

  lines.push('## Recovery Objectives')
  lines.push(`- RTO Target: ${strategy.rto.target} hours`)
  lines.push(`- RPO Target: ${strategy.rpo.target} hour(s)`)
  lines.push('')

  return lines.join('\n')
}
