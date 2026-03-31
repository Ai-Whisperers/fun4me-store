/**
 * Metrics Capture Cron Job
 *
 * POST /api/cron/capture-metrics
 *
 * OPS-002: Captures periodic performance metrics snapshots for historical analysis.
 * Recommended schedule: Every 5 minutes
 *
 * Captures:
 * - API response times and error rates
 * - Database query performance
 * - Memory usage
 * - System health status
 */

import { NextRequest } from 'next/server'
import { withCronMonitoring, type CronResult } from '@/lib/api/with-cron-monitoring'
import { createServiceClient } from '@/lib/supabase/service'
import { metrics } from '@/lib/monitoring/metrics'
import { getErrorRateSummary } from '@/lib/monitoring/error-rate'
import { getSlowQueryStats } from '@/lib/monitoring/slow-query'

export const dynamic = 'force-dynamic'
export const maxDuration = 30 // 30 seconds max

// Track server start time (same as metrics endpoint)
const SERVER_START_TIME = new Date()

async function handleCaptureMetrics(
  _request: NextRequest,
  log: Parameters<Parameters<typeof withCronMonitoring>[1]>[1]
): Promise<CronResult> {
  log.info('Starting metrics capture')

  const supabase = createServiceClient()

  // Gather all metrics
  const appMetrics = metrics.getMetrics()
  const errorSummary = getErrorRateSummary()
  const queryStats = getSlowQueryStats()
  const memoryUsage = process.memoryUsage()
  const uptimeMs = Date.now() - SERVER_START_TIME.getTime()

  // Extract API duration metrics
  const apiDurations = appMetrics.histograms['performance.api_request_duration'] || {
    count: 0,
    sum: 0,
    avg: 0,
    min: 0,
    max: 0,
  }

  // Determine overall status
  let status: 'healthy' | 'degraded' | 'critical' = 'healthy'
  if (errorSummary.totals.criticalEndpoints > 0 || queryStats.criticalCount > 10) {
    status = 'critical'
  } else if (errorSummary.totals.warningEndpoints > 0 || queryStats.slowQueryRate > 10) {
    status = 'degraded'
  }

  // Build metrics snapshot
  const metricsSnapshot = {
    timestamp: new Date().toISOString(),
    status,

    // API metrics
    api_response_avg_ms: apiDurations.avg || 0,
    api_response_p50_ms: apiDurations.avg || 0, // Simplified
    api_response_p95_ms: (apiDurations.max || 0) * 0.95,
    api_response_p99_ms: (apiDurations.max || 0) * 0.99,
    api_requests_total: errorSummary.totals.totalRequests,
    api_errors_total: errorSummary.totals.totalErrors,
    api_error_rate: errorSummary.totals.overallErrorRate,
    api_requests_per_minute: (errorSummary.totals.totalRequests / (uptimeMs / 60000)) || 0,

    // Database metrics
    db_query_avg_ms: queryStats.avgDurationMs,
    db_slow_query_count: queryStats.warningCount,
    db_critical_query_count: queryStats.criticalCount,
    db_slow_query_rate: queryStats.slowQueryRate,

    // System metrics
    memory_heap_used_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    memory_heap_total_mb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
    memory_rss_mb: Math.round(memoryUsage.rss / 1024 / 1024),
    memory_external_mb: Math.round(memoryUsage.external / 1024 / 1024),

    // Uptime
    uptime_ms: uptimeMs,

    // Raw metrics
    counters: appMetrics.counters,
    gauges: appMetrics.gauges,
    histograms: appMetrics.histograms,

    // Metadata
    environment: process.env.NODE_ENV || 'production',
    node_version: process.version,
  }

  // Insert into database
  const { error } = await supabase
    .from('performance_metrics_history')
    .insert(metricsSnapshot)

  if (error) {
    log.error('Failed to insert metrics snapshot', { error: error.message })
    return {
      success: false,
      processed: 0,
      skipped: 0,
      failed: 1,
      errors: [error.message],
    }
  }

  log.info('Metrics snapshot captured successfully', {
    status,
    apiRequests: metricsSnapshot.api_requests_total,
    errorRate: metricsSnapshot.api_error_rate,
    slowQueries: metricsSnapshot.db_slow_query_count,
    memoryMb: metricsSnapshot.memory_heap_used_mb,
  })

  return {
    success: true,
    processed: 1,
    skipped: 0,
    failed: 0,
    errors: [],
    data: {
      status,
      timestamp: metricsSnapshot.timestamp,
    },
  }
}

export const POST = withCronMonitoring('capture-metrics', handleCaptureMetrics, {
  slowJobThresholdMs: 10_000, // 10 seconds is slow for this job
})

// Support GET for manual triggering
export const GET = withCronMonitoring('capture-metrics', handleCaptureMetrics, {
  slowJobThresholdMs: 10_000,
})
