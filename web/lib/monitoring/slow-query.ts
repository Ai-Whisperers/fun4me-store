/**
 * Slow Query Detection & Alerting
 *
 * OPS-003: Automatic detection of slow database queries with alerting.
 *
 * Features:
 * - Tracks query execution times
 * - Configurable warning/critical thresholds
 * - Automatic alerting for critical queries
 * - Dashboard endpoint for slow query trends
 * - In-memory rolling window for recent queries
 *
 * Usage:
 *   import { trackQuery, getSlowQueryStats } from '@/lib/monitoring/slow-query'
 *
 *   // Track a query
 *   const start = performance.now()
 *   const result = await supabase.from('pets').select('*')
 *   trackQuery('pets', 'select', performance.now() - start, 15)
 *
 *   // Get statistics
 *   const stats = getSlowQueryStats()
 */

import { logger } from '@/lib/logger'
import { sendAlert, type AlertSeverity } from './alerts'
import { metrics, performanceMetrics } from './metrics'

// =============================================================================
// Configuration
// =============================================================================

export interface SlowQueryConfig {
  /** Threshold in ms for warning level (default: 100ms) */
  warningThresholdMs: number
  /** Threshold in ms for critical level (default: 500ms) */
  criticalThresholdMs: number
  /** Maximum queries to keep in rolling window (default: 1000) */
  maxStoredQueries: number
  /** Window duration in ms for rate calculation (default: 5 minutes) */
  windowDurationMs: number
  /** Minimum queries before alerting (prevent false positives on low traffic) */
  minQueriesForAlert: number
  /** Send alerts for critical queries (default: true in production) */
  alertOnCritical: boolean
}

const DEFAULT_CONFIG: SlowQueryConfig = {
  warningThresholdMs: 100,
  criticalThresholdMs: 500,
  maxStoredQueries: 1000,
  windowDurationMs: 5 * 60 * 1000, // 5 minutes
  minQueriesForAlert: 10,
  alertOnCritical: process.env.NODE_ENV === 'production',
}

let config: SlowQueryConfig = { ...DEFAULT_CONFIG }

/**
 * Update slow query configuration
 */
export function configureSlowQueryDetection(newConfig: Partial<SlowQueryConfig>): void {
  config = { ...config, ...newConfig }
}

// =============================================================================
// Types
// =============================================================================

export interface TrackedQuery {
  table: string
  operation: string
  durationMs: number
  rowCount?: number
  timestamp: number
  severity: 'normal' | 'warning' | 'critical'
}

export interface SlowQueryStats {
  /** Total queries in current window */
  totalQueries: number
  /** Queries exceeding warning threshold */
  warningCount: number
  /** Queries exceeding critical threshold */
  criticalCount: number
  /** Percentage of slow queries */
  slowQueryRate: number
  /** Average duration in ms */
  avgDurationMs: number
  /** P95 duration in ms */
  p95DurationMs: number
  /** P99 duration in ms */
  p99DurationMs: number
  /** Maximum duration in ms */
  maxDurationMs: number
  /** Top slow tables */
  topSlowTables: Array<{
    table: string
    count: number
    avgMs: number
    maxMs: number
  }>
  /** Recent critical queries */
  recentCritical: TrackedQuery[]
  /** Window start time */
  windowStart: number
  /** Window end time */
  windowEnd: number
}

export interface TableQueryStats {
  table: string
  totalQueries: number
  avgDurationMs: number
  minDurationMs: number
  maxDurationMs: number
  p50DurationMs: number
  p95DurationMs: number
  warningCount: number
  criticalCount: number
  operations: Record<string, number>
}

// =============================================================================
// Storage
// =============================================================================

// Rolling window of recent queries
let recentQueries: TrackedQuery[] = []

// Aggregated stats per table for dashboard
const tableStats = new Map<
  string,
  {
    durations: number[]
    operations: Map<string, number>
    warningCount: number
    criticalCount: number
  }
>()

// Track last alert time to avoid spam
const lastAlertTime = new Map<string, number>()
const ALERT_COOLDOWN_MS = 5 * 60 * 1000 // 5 minutes between alerts per table

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Track a database query execution
 *
 * @param table - Table name being queried
 * @param operation - Operation type (select, insert, update, delete)
 * @param durationMs - Query duration in milliseconds
 * @param rowCount - Optional number of rows affected/returned
 */
export function trackQuery(
  table: string,
  operation: string,
  durationMs: number,
  rowCount?: number
): void {
  const now = Date.now()
  const severity = getSeverity(durationMs)

  const query: TrackedQuery = {
    table,
    operation: operation.toLowerCase(),
    durationMs: Math.round(durationMs),
    rowCount,
    timestamp: now,
    severity,
  }

  // Add to rolling window
  recentQueries.push(query)

  // Trim old queries
  const cutoff = now - config.windowDurationMs
  recentQueries = recentQueries.filter((q) => q.timestamp > cutoff)

  // Enforce max size
  if (recentQueries.length > config.maxStoredQueries) {
    recentQueries = recentQueries.slice(-config.maxStoredQueries)
  }

  // Update table stats
  updateTableStats(table, operation, durationMs, severity)

  // Record in metrics system
  performanceMetrics.databaseQuery(operation, table, durationMs, true)

  // Log slow queries
  if (severity === 'warning') {
    logger.warn(`Slow query on ${table}`, {
      table,
      operation,
      duration: durationMs,
      rows: rowCount,
    })
    metrics.increment('slow_query.warning', 1, { table })
  } else if (severity === 'critical') {
    logger.error(`Critical slow query on ${table}`, {
      table,
      operation,
      duration: durationMs,
      rows: rowCount,
    })
    metrics.increment('slow_query.critical', 1, { table })

    // Send alert for critical queries (with cooldown)
    if (config.alertOnCritical) {
      maybeAlert(table, operation, durationMs, rowCount)
    }
  }
}

/**
 * Get slow query statistics for the current window
 */
export function getSlowQueryStats(): SlowQueryStats {
  const now = Date.now()
  const windowStart = now - config.windowDurationMs

  // Filter to current window
  const windowQueries = recentQueries.filter((q) => q.timestamp > windowStart)

  if (windowQueries.length === 0) {
    return {
      totalQueries: 0,
      warningCount: 0,
      criticalCount: 0,
      slowQueryRate: 0,
      avgDurationMs: 0,
      p95DurationMs: 0,
      p99DurationMs: 0,
      maxDurationMs: 0,
      topSlowTables: [],
      recentCritical: [],
      windowStart,
      windowEnd: now,
    }
  }

  const durations = windowQueries.map((q) => q.durationMs).sort((a, b) => a - b)
  const warningCount = windowQueries.filter((q) => q.severity === 'warning').length
  const criticalCount = windowQueries.filter((q) => q.severity === 'critical').length
  const slowCount = warningCount + criticalCount

  // Calculate percentiles
  const p95Index = Math.floor(durations.length * 0.95)
  const p99Index = Math.floor(durations.length * 0.99)

  // Aggregate by table for top slow tables
  const tableAgg = new Map<
    string,
    { count: number; totalMs: number; maxMs: number }
  >()

  for (const query of windowQueries) {
    if (query.severity !== 'normal') {
      const existing = tableAgg.get(query.table) || { count: 0, totalMs: 0, maxMs: 0 }
      existing.count++
      existing.totalMs += query.durationMs
      existing.maxMs = Math.max(existing.maxMs, query.durationMs)
      tableAgg.set(query.table, existing)
    }
  }

  const topSlowTables = Array.from(tableAgg.entries())
    .map(([table, stats]) => ({
      table,
      count: stats.count,
      avgMs: Math.round(stats.totalMs / stats.count),
      maxMs: stats.maxMs,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Recent critical queries (last 10)
  const recentCritical = windowQueries
    .filter((q) => q.severity === 'critical')
    .slice(-10)
    .reverse()

  return {
    totalQueries: windowQueries.length,
    warningCount,
    criticalCount,
    slowQueryRate: windowQueries.length > 0 ? (slowCount / windowQueries.length) * 100 : 0,
    avgDurationMs: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
    p95DurationMs: durations[p95Index] || 0,
    p99DurationMs: durations[p99Index] || 0,
    maxDurationMs: durations[durations.length - 1] || 0,
    topSlowTables,
    recentCritical,
    windowStart,
    windowEnd: now,
  }
}

/**
 * Get detailed statistics for a specific table
 */
export function getTableQueryStats(table: string): TableQueryStats | null {
  const stats = tableStats.get(table)
  if (!stats || stats.durations.length === 0) {
    return null
  }

  const sorted = [...stats.durations].sort((a, b) => a - b)
  const p50Index = Math.floor(sorted.length * 0.5)
  const p95Index = Math.floor(sorted.length * 0.95)

  return {
    table,
    totalQueries: stats.durations.length,
    avgDurationMs: Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length),
    minDurationMs: sorted[0],
    maxDurationMs: sorted[sorted.length - 1],
    p50DurationMs: sorted[p50Index],
    p95DurationMs: sorted[p95Index],
    warningCount: stats.warningCount,
    criticalCount: stats.criticalCount,
    operations: Object.fromEntries(stats.operations),
  }
}

/**
 * Get statistics for all tracked tables
 */
export function getAllTableStats(): TableQueryStats[] {
  const results: TableQueryStats[] = []

  for (const table of tableStats.keys()) {
    const stats = getTableQueryStats(table)
    if (stats) {
      results.push(stats)
    }
  }

  // Sort by total queries descending
  return results.sort((a, b) => b.totalQueries - a.totalQueries)
}

/**
 * Reset all tracking data
 */
export function resetSlowQueryTracking(): void {
  recentQueries = []
  tableStats.clear()
  lastAlertTime.clear()
}

// =============================================================================
// Helper Functions
// =============================================================================

function getSeverity(durationMs: number): TrackedQuery['severity'] {
  if (durationMs >= config.criticalThresholdMs) {
    return 'critical'
  }
  if (durationMs >= config.warningThresholdMs) {
    return 'warning'
  }
  return 'normal'
}

function updateTableStats(
  table: string,
  operation: string,
  durationMs: number,
  severity: TrackedQuery['severity']
): void {
  let stats = tableStats.get(table)

  if (!stats) {
    stats = {
      durations: [],
      operations: new Map(),
      warningCount: 0,
      criticalCount: 0,
    }
    tableStats.set(table, stats)
  }

  // Add duration (keep last 100 per table for memory efficiency)
  stats.durations.push(durationMs)
  if (stats.durations.length > 100) {
    stats.durations.shift()
  }

  // Track operations
  stats.operations.set(operation, (stats.operations.get(operation) || 0) + 1)

  // Track severity counts
  if (severity === 'warning') {
    stats.warningCount++
  } else if (severity === 'critical') {
    stats.criticalCount++
  }
}

async function maybeAlert(
  table: string,
  operation: string,
  durationMs: number,
  rowCount?: number
): Promise<void> {
  const now = Date.now()
  const lastAlert = lastAlertTime.get(table) || 0

  // Check cooldown
  if (now - lastAlert < ALERT_COOLDOWN_MS) {
    return
  }

  // Check minimum query threshold
  const stats = getSlowQueryStats()
  if (stats.totalQueries < config.minQueriesForAlert) {
    return
  }

  lastAlertTime.set(table, now)

  const severity: AlertSeverity = durationMs > 2000 ? 'critical' : 'error'

  try {
    await sendAlert({
      type: 'system_error',
      job: 'slow_query_detector',
      message: `Critical slow query detected: ${operation.toUpperCase()} on ${table} took ${durationMs}ms`,
      details: {
        table,
        operation,
        duration_ms: durationMs,
        rows_affected: rowCount,
        threshold_ms: config.criticalThresholdMs,
        window_stats: {
          total_queries: stats.totalQueries,
          critical_count: stats.criticalCount,
          slow_rate_percent: stats.slowQueryRate.toFixed(1),
          p95_ms: stats.p95DurationMs,
        },
      },
      severity,
    })
  } catch (error: unknown) {
    // Don't let alert failures break query tracking
    logger.error('Failed to send slow query alert', {
      error: error instanceof Error ? error.message : String(error),
      table,
    })
  }
}

// =============================================================================
// Query Wrapper Utility
// =============================================================================

/**
 * Wrap a Supabase query to automatically track timing
 *
 * Usage:
 *   const result = await withQueryTracking(
 *     'pets',
 *     'select',
 *     () => supabase.from('pets').select('*').eq('tenant_id', tenantId)
 *   )
 */
export async function withQueryTracking<T>(
  table: string,
  operation: string,
  queryFn: () => Promise<{ data: T | null; error: unknown; count?: number | null }>
): Promise<{ data: T | null; error: unknown; count?: number | null }> {
  const start = performance.now()

  try {
    const result = await queryFn()
    const duration = performance.now() - start

    // Track the query
    const rowCount = result.count ?? (Array.isArray(result.data) ? result.data.length : undefined)
    trackQuery(table, operation, duration, rowCount)

    return result
  } catch (error: unknown) {
    const duration = performance.now() - start
    trackQuery(table, operation, duration)
    throw error
  }
}
