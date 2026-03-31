/**
 * Unified Performance Metrics Endpoint
 *
 * OPS-002: GET /api/health/metrics
 *
 * Aggregates all monitoring data into a single endpoint for dashboards:
 * - Application metrics (counters, gauges, histograms)
 * - Error rate summary
 * - Slow query statistics
 * - System health status
 *
 * Access control:
 * - CRON_SECRET for automated monitoring systems
 * - Platform admins via authenticated session
 * - Development mode allows open access
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { metrics } from '@/lib/monitoring/metrics'
import { getErrorRateSummary } from '@/lib/monitoring/error-rate'
import { getSlowQueryStats } from '@/lib/monitoring/slow-query'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// Internal monitoring key
const MONITORING_KEY = process.env.CRON_SECRET

interface PerformanceMetricsResponse {
  status: 'healthy' | 'degraded' | 'critical'
  timestamp: string
  uptime: {
    serverStart: string
    uptimeMs: number
    uptimeFormatted: string
  }
  api: {
    responseTime: {
      p50: number
      p95: number
      p99: number
      avg: number
    }
    requestsPerMinute: number
    errorRate: number
    totalRequests: number
    totalErrors: number
  }
  database: {
    avgQueryTime: number
    slowQueryRate: number
    slowQueryCount: number
    criticalQueryCount: number
    topSlowTables: Array<{ table: string; count: number; avgMs: number }>
  }
  system: {
    memoryUsage: {
      heapUsed: number
      heapTotal: number
      external: number
      rss: number
    }
    nodeVersion: string
    environment: string
  }
  counters: Record<string, number>
  gauges: Record<string, number>
  histograms: Record<string, {
    count: number
    sum: number
    avg: number
    min: number
    max: number
  }>
}

// Track server start time
const SERVER_START_TIME = new Date()

/**
 * Format milliseconds to human-readable duration
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

/**
 * Calculate percentile from sorted array
 */
function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0
  const index = Math.ceil((p / 100) * sortedValues.length) - 1
  return sortedValues[Math.max(0, index)]
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Verify monitoring access
  const authHeader = request.headers.get('authorization')
  const providedKey = authHeader?.replace('Bearer ', '')

  // Also check query param for convenience
  const { searchParams } = new URL(request.url)
  const queryKey = searchParams.get('key')
  const format = searchParams.get('format') || 'json'

  const validKey = providedKey || queryKey

  // Allow access in development mode
  if (process.env.NODE_ENV === 'development') {
    // Development mode - allow access
  } else if (validKey === MONITORING_KEY && MONITORING_KEY) {
    // Valid monitoring key - allow access
  } else {
    // Check for platform admin authentication
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Verify platform admin status
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_platform_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_platform_admin) {
      return NextResponse.json(
        { error: 'Acceso restringido a administradores de plataforma' },
        { status: 403 }
      )
    }
  }

  try {
    // Get all metrics data
    const appMetrics = metrics.getMetrics()
    const errorSummary = getErrorRateSummary()
    const queryStats = getSlowQueryStats()

    // Calculate uptime
    const uptimeMs = Date.now() - SERVER_START_TIME.getTime()

    // Extract API response time metrics from histograms
    const apiDurations = appMetrics.histograms['performance.api_request_duration'] || {
      count: 0,
      sum: 0,
      avg: 0,
      min: 0,
      max: 0,
    }

    // Get memory usage
    const memoryUsage = process.memoryUsage()

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy'

    if (errorSummary.totals.criticalEndpoints > 0 || queryStats.criticalCount > 10) {
      status = 'critical'
    } else if (errorSummary.totals.warningEndpoints > 0 || queryStats.slowQueryRate > 10) {
      status = 'degraded'
    }

    const response: PerformanceMetricsResponse = {
      status,
      timestamp: new Date().toISOString(),
      uptime: {
        serverStart: SERVER_START_TIME.toISOString(),
        uptimeMs,
        uptimeFormatted: formatDuration(uptimeMs),
      },
      api: {
        responseTime: {
          p50: apiDurations.avg || 0, // Simplified - would need full histogram for real percentiles
          p95: apiDurations.max * 0.95 || 0,
          p99: apiDurations.max * 0.99 || 0,
          avg: apiDurations.avg || 0,
        },
        requestsPerMinute: (errorSummary.totals.totalRequests / (uptimeMs / 60000)) || 0,
        errorRate: errorSummary.totals.overallErrorRate,
        totalRequests: errorSummary.totals.totalRequests,
        totalErrors: errorSummary.totals.totalErrors,
      },
      database: {
        avgQueryTime: queryStats.avgDurationMs,
        slowQueryRate: queryStats.slowQueryRate,
        slowQueryCount: queryStats.warningCount,
        criticalQueryCount: queryStats.criticalCount,
        topSlowTables: queryStats.topSlowTables,
      },
      system: {
        memoryUsage: {
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024),
          rss: Math.round(memoryUsage.rss / 1024 / 1024),
        },
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
      },
      counters: appMetrics.counters,
      gauges: appMetrics.gauges,
      histograms: appMetrics.histograms,
    }

    // Prometheus format for external monitoring
    if (format === 'prometheus') {
      return new NextResponse(generatePrometheusOutput(response), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    // Return JSON
    return NextResponse.json(response)
  } catch (error) {
    logger.error('Failed to get performance metrics', {
      error: error instanceof Error ? error.message : String(error),
    })

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * Generate Prometheus-compatible metrics output
 */
function generatePrometheusOutput(data: PerformanceMetricsResponse): string {
  let output = ''

  // Status (1 = healthy, 2 = degraded, 3 = critical)
  const statusValue = data.status === 'healthy' ? 1 : data.status === 'degraded' ? 2 : 3
  output += '# HELP app_status Application health status (1=healthy, 2=degraded, 3=critical)\n'
  output += '# TYPE app_status gauge\n'
  output += `app_status ${statusValue}\n\n`

  // Uptime
  output += '# HELP app_uptime_seconds Application uptime in seconds\n'
  output += '# TYPE app_uptime_seconds counter\n'
  output += `app_uptime_seconds ${Math.floor(data.uptime.uptimeMs / 1000)}\n\n`

  // API metrics
  output += '# HELP api_response_time_avg_ms Average API response time in milliseconds\n'
  output += '# TYPE api_response_time_avg_ms gauge\n'
  output += `api_response_time_avg_ms ${data.api.responseTime.avg.toFixed(2)}\n\n`

  output += '# HELP api_requests_total Total API requests\n'
  output += '# TYPE api_requests_total counter\n'
  output += `api_requests_total ${data.api.totalRequests}\n\n`

  output += '# HELP api_errors_total Total API errors\n'
  output += '# TYPE api_errors_total counter\n'
  output += `api_errors_total ${data.api.totalErrors}\n\n`

  output += '# HELP api_error_rate Current API error rate\n'
  output += '# TYPE api_error_rate gauge\n'
  output += `api_error_rate ${data.api.errorRate.toFixed(4)}\n\n`

  // Database metrics
  output += '# HELP db_query_avg_ms Average database query time in milliseconds\n'
  output += '# TYPE db_query_avg_ms gauge\n'
  output += `db_query_avg_ms ${data.database.avgQueryTime.toFixed(2)}\n\n`

  output += '# HELP db_slow_queries_count Number of slow queries\n'
  output += '# TYPE db_slow_queries_count counter\n'
  output += `db_slow_queries_count ${data.database.slowQueryCount}\n\n`

  output += '# HELP db_critical_queries_count Number of critical (very slow) queries\n'
  output += '# TYPE db_critical_queries_count counter\n'
  output += `db_critical_queries_count ${data.database.criticalQueryCount}\n\n`

  // Memory metrics
  output += '# HELP node_memory_heap_used_mb Node.js heap used in megabytes\n'
  output += '# TYPE node_memory_heap_used_mb gauge\n'
  output += `node_memory_heap_used_mb ${data.system.memoryUsage.heapUsed}\n\n`

  output += '# HELP node_memory_rss_mb Node.js RSS memory in megabytes\n'
  output += '# TYPE node_memory_rss_mb gauge\n'
  output += `node_memory_rss_mb ${data.system.memoryUsage.rss}\n\n`

  // Custom counters
  for (const [name, value] of Object.entries(data.counters)) {
    const sanitizedName = name.replace(/[^a-zA-Z0-9_]/g, '_')
    output += `# TYPE ${sanitizedName} counter\n`
    output += `${sanitizedName} ${value}\n`
  }

  // Custom gauges
  for (const [name, value] of Object.entries(data.gauges)) {
    const sanitizedName = name.replace(/[^a-zA-Z0-9_]/g, '_')
    output += `# TYPE ${sanitizedName} gauge\n`
    output += `${sanitizedName} ${value}\n`
  }

  return output
}
