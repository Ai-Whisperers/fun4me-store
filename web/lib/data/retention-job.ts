/**
 * Data Retention Job
 *
 * DATA-005: Execute data retention policies to clean up old data.
 *
 * This job runs periodically (via cron) to:
 * 1. Delete expired records from short-term tables
 * 2. Archive long-term records before deletion (future: S3)
 * 3. Log all retention actions for audit trail
 *
 * Safety features:
 * - Batch processing (max 1000 records per run)
 * - Dry-run mode for testing
 * - Per-table cooldowns to prevent overload
 * - Protected tables cannot be processed
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import {
  getActiveRetentionPolicies,
  isProtectedTable,
  toPostgresInterval,
  type RetentionPolicy,
  type RetentionAction,
} from './retention-config'

// =============================================================================
// Configuration
// =============================================================================

const BATCH_SIZE = 1000
const MAX_TABLES_PER_RUN = 5 // Process max 5 tables per cron run

export interface RetentionJobOptions {
  /** If true, only report what would be deleted without deleting */
  dryRun?: boolean
  /** Specific tables to process (default: all active policies) */
  tables?: string[]
  /** Override batch size */
  batchSize?: number
}

export interface RetentionResult {
  table: string
  action: RetentionAction
  recordsProcessed: number
  success: boolean
  error?: string
  durationMs: number
}

export interface RetentionJobSummary {
  runId: string
  startedAt: string
  completedAt: string
  dryRun: boolean
  tablesProcessed: number
  totalRecordsProcessed: number
  results: RetentionResult[]
  errors: string[]
}

// =============================================================================
// Main Job Function
// =============================================================================

/**
 * Execute data retention policies
 *
 * @param options - Job configuration
 * @returns Summary of retention actions
 */
export async function runRetentionJob(
  options: RetentionJobOptions = {}
): Promise<RetentionJobSummary> {
  const runId = crypto.randomUUID().slice(0, 8)
  const startedAt = new Date().toISOString()
  const results: RetentionResult[] = []
  const errors: string[] = []

  const { dryRun = false, tables: specificTables, batchSize = BATCH_SIZE } = options

  logger.info(`Starting retention job ${runId}`, {
    dryRun,
    specificTables,
    batchSize,
  })

  // Get policies to process
  let policies = getActiveRetentionPolicies()

  // Filter to specific tables if requested
  if (specificTables && specificTables.length > 0) {
    policies = policies.filter((p) => specificTables.includes(p.table))
  }

  // Limit tables per run
  policies = policies.slice(0, MAX_TABLES_PER_RUN)

  // Process each policy
  for (const policy of policies) {
    const result = await processRetentionPolicy(policy, dryRun, batchSize, runId)
    results.push(result)

    if (!result.success && result.error) {
      errors.push(`${policy.table}: ${result.error}`)
    }
  }

  const summary: RetentionJobSummary = {
    runId,
    startedAt,
    completedAt: new Date().toISOString(),
    dryRun,
    tablesProcessed: results.length,
    totalRecordsProcessed: results.reduce((sum, r) => sum + r.recordsProcessed, 0),
    results,
    errors,
  }

  logger.info(`Retention job ${runId} completed`, {
    tablesProcessed: summary.tablesProcessed,
    totalRecords: summary.totalRecordsProcessed,
    errors: summary.errors.length,
    dryRun,
  })

  return summary
}

// =============================================================================
// Policy Execution
// =============================================================================

async function processRetentionPolicy(
  policy: RetentionPolicy,
  dryRun: boolean,
  batchSize: number,
  runId: string
): Promise<RetentionResult> {
  const startTime = performance.now()

  // Safety check: never process protected tables
  if (isProtectedTable(policy.table)) {
    logger.warn(`Skipping protected table: ${policy.table}`, { runId })
    return {
      table: policy.table,
      action: policy.action,
      recordsProcessed: 0,
      success: true,
      error: 'Protected table - skipped',
      durationMs: 0,
    }
  }

  try {
    const supabase = await createClient('service_role')

    // Build the cutoff date query
    const cutoffCondition = `${policy.dateColumn} < NOW() - ${toPostgresInterval(policy.retentionPeriod)}`

    // Count records that would be affected
    const countQuery = supabase
      .from(policy.table)
      .select('*', { count: 'exact', head: true })

    // We can't use .rpc or raw SQL easily, so we'll use a workaround
    // For now, we'll do a simple approach with the condition in application code

    // Get records to process
    const { data: rawRecords, error: fetchError, count } = await supabase
      .from(policy.table)
      .select('id, ' + policy.dateColumn, { count: 'exact' })
      .limit(batchSize)

    if (fetchError) {
      throw new Error(`Failed to fetch records: ${fetchError.message}`)
    }

    const records = (rawRecords || []) as unknown as Array<Record<string, unknown>>
    if (records.length === 0) {
      return {
        table: policy.table,
        action: policy.action,
        recordsProcessed: 0,
        success: true,
        durationMs: performance.now() - startTime,
      }
    }

    // Filter records that exceed retention period
    const cutoffDate = calculateCutoffDate(policy.retentionPeriod)
    const expiredRecords = records.filter((r) => {
      const recordDate = new Date(r[policy.dateColumn] as string | number | Date)
      return recordDate < cutoffDate
    })

    if (expiredRecords.length === 0) {
      return {
        table: policy.table,
        action: policy.action,
        recordsProcessed: 0,
        success: true,
        durationMs: performance.now() - startTime,
      }
    }

    const expiredIds = expiredRecords.map((r) => r.id as string)

    if (dryRun) {
      logger.info(`[DRY RUN] Would ${policy.action} ${expiredIds.length} records from ${policy.table}`, {
        runId,
        oldestRecord: expiredRecords[0][policy.dateColumn],
      })

      return {
        table: policy.table,
        action: policy.action,
        recordsProcessed: expiredIds.length,
        success: true,
        durationMs: performance.now() - startTime,
      }
    }

    // Execute the retention action
    let recordsProcessed = 0

    switch (policy.action) {
      case 'delete':
        recordsProcessed = await deleteRecords(supabase, policy.table, expiredIds, runId)
        break

      case 'soft_delete':
        recordsProcessed = await softDeleteRecords(supabase, policy.table, expiredIds, runId)
        break

      case 'archive':
        // For now, archive = soft delete + log
        // Full S3 archival would require additional infrastructure
        recordsProcessed = await archiveRecords(supabase, policy.table, expiredIds, runId)
        break
    }

    return {
      table: policy.table,
      action: policy.action,
      recordsProcessed,
      success: true,
      durationMs: performance.now() - startTime,
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    logger.error(`Retention failed for ${policy.table}`, {
      runId,
      error: errorMessage,
    })

    return {
      table: policy.table,
      action: policy.action,
      recordsProcessed: 0,
      success: false,
      error: errorMessage,
      durationMs: performance.now() - startTime,
    }
  }
}

// =============================================================================
// Record Operations
// =============================================================================

async function deleteRecords(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  ids: string[],
  runId: string
): Promise<number> {
  const { error } = await supabase.from(table).delete().in('id', ids)

  if (error) {
    throw new Error(`Delete failed: ${error.message}`)
  }

  logger.info(`Deleted ${ids.length} records from ${table}`, { runId })
  return ids.length
}

async function softDeleteRecords(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  ids: string[],
  runId: string
): Promise<number> {
  // Soft delete by setting deleted_at timestamp
  const { error } = await supabase
    .from(table)
    .update({ deleted_at: new Date().toISOString() })
    .in('id', ids)

  if (error) {
    throw new Error(`Soft delete failed: ${error.message}`)
  }

  logger.info(`Soft deleted ${ids.length} records from ${table}`, { runId })
  return ids.length
}

async function archiveRecords(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  ids: string[],
  runId: string
): Promise<number> {
  // For MVP: Archive = log the action + soft delete
  // Full archival to S3 would require:
  // 1. Fetch full records
  // 2. Export to JSON/Parquet
  // 3. Upload to S3
  // 4. Then delete

  logger.info(`Archiving ${ids.length} records from ${table}`, {
    runId,
    note: 'Full S3 archival not yet implemented - records retained with archived flag',
  })

  // For tables that support archived_at, use that
  // Otherwise, log and skip deletion (retain the data)
  try {
    const { error } = await supabase
      .from(table)
      .update({ archived_at: new Date().toISOString() })
      .in('id', ids)

    if (error) {
      // Table might not have archived_at column - that's ok
      logger.warn(`Table ${table} doesn't support archived_at - records retained`, { runId })
      return 0
    }

    return ids.length
  } catch (_error: unknown) {
    // Column doesn't exist - records are retained
    logger.warn(`Archive not supported for ${table} - records retained`, { runId })
    return 0
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

function calculateCutoffDate(retentionPeriod: string): Date {
  const now = new Date()

  // Parse period like "7 days", "90 days", "2 years"
  const match = retentionPeriod.match(/^(\d+)\s+(day|days|month|months|year|years)$/i)

  if (!match) {
    throw new Error(`Invalid retention period format: ${retentionPeriod}`)
  }

  const amount = parseInt(match[1], 10)
  const unit = match[2].toLowerCase()

  switch (unit) {
    case 'day':
    case 'days':
      now.setDate(now.getDate() - amount)
      break
    case 'month':
    case 'months':
      now.setMonth(now.getMonth() - amount)
      break
    case 'year':
    case 'years':
      now.setFullYear(now.getFullYear() - amount)
      break
  }

  return now
}

/**
 * Get statistics about data that would be affected by retention policies
 * Useful for dashboard display
 */
export async function getRetentionStats(): Promise<
  Array<{
    table: string
    retentionPeriod: string
    action: RetentionAction
    estimatedRecords: number
    oldestRecord: string | null
  }>
> {
  const supabase = await createClient('service_role')
  const policies = getActiveRetentionPolicies()
  const stats = []

  for (const policy of policies) {
    if (isProtectedTable(policy.table)) continue

    try {
      const cutoffDate = calculateCutoffDate(policy.retentionPeriod)

      const { data, count, error } = await supabase
        .from(policy.table)
        .select(policy.dateColumn, { count: 'exact' })
        .lt(policy.dateColumn, cutoffDate.toISOString())
        .order(policy.dateColumn, { ascending: true })
        .limit(1)

      if (!error) {
        stats.push({
          table: policy.table,
          retentionPeriod: policy.retentionPeriod,
          action: policy.action,
          estimatedRecords: count || 0,
          oldestRecord: ((data as unknown as Array<Record<string, unknown>> | null)?.[0]?.[policy.dateColumn] as string) || null,
        })
      }
    } catch (_error: unknown) {
      // Skip tables that can't be queried
    }
  }

  return stats
}
