/**
 * Error Rate Health Check Endpoint
 *
 * OPS-004: GET /api/health/errors
 *
 * Returns current error rates for all tracked API endpoints.
 * Used for dashboards and external monitoring integration.
 */

import { NextResponse } from 'next/server'
import { getErrorRateSummary, errorRateTracker } from '@/lib/monitoring/error-rate'
import { checkCronAuth } from '@/lib/api/cron-auth'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// =============================================================================
// API Handler
// =============================================================================

/**
 * GET /api/health/errors
 *
 * Returns error rate summary for all tracked endpoints
 *
 * Query params:
 * - format: 'json' | 'prometheus' (default: json)
 * - threshold: number (filter endpoints above threshold, default: 0)
 *
 * Response (JSON):
 * ```json
 * {
 *   "status": "healthy" | "degraded" | "critical",
 *   "timestamp": "2024-01-15T12:00:00Z",
 *   "config": { "errorRateThreshold": 0.1, ... },
 *   "endpoints": [...],
 *   "totals": { ... }
 * }
 * ```
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const url = new URL(request.url)
    const format = url.searchParams.get('format') || 'json'
    const thresholdParam = url.searchParams.get('threshold')
    const threshold = thresholdParam ? parseFloat(thresholdParam) : 0

    // Get summary
    const summary = getErrorRateSummary()
    const config = errorRateTracker.getConfig()

    // Filter by threshold if specified
    let endpoints = summary.endpoints
    if (threshold > 0) {
      endpoints = endpoints.filter((e) => e.errorRate >= threshold)
    }

    // Prometheus format
    if (format === 'prometheus') {
      return new NextResponse(generatePrometheusMetrics(summary, config), {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      })
    }

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy'
    if (summary.totals.criticalEndpoints > 0) {
      status = 'critical'
    } else if (summary.totals.warningEndpoints > 0) {
      status = 'degraded'
    }

    const response = {
      status,
      timestamp: summary.timestamp,
      config: {
        errorRateThreshold: config.errorRateThreshold,
        minRequestsForAlert: config.minRequestsForAlert,
        windowMinutes: Math.round(config.windowMs / 60000),
      },
      endpoints,
      totals: {
        ...summary.totals,
        overallErrorRate: `${(summary.totals.overallErrorRate * 100).toFixed(2)}%`,
      },
    }

    // Return 503 for critical status (for load balancer health checks)
    const httpStatus = status === 'critical' ? 503 : 200

    return NextResponse.json(response, { status: httpStatus })
  } catch (error) {
    logger.error('Error fetching error rate summary', {
      operation: 'error_rate_api',
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })

    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/health/errors/reset
 *
 * Reset error rate metrics (requires cron auth)
 * Use with caution - primarily for testing/debugging
 */
export async function POST(request: Request): Promise<NextResponse> {
  // Verify auth (using cron auth for admin operations)
  const { authorized, errorResponse } = checkCronAuth(request as unknown as import('next/server').NextRequest)
  if (!authorized && errorResponse) {
    return errorResponse
  }
  if (!authorized) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    errorRateTracker.reset()

    logger.info('Error rate metrics reset via API', {
      operation: 'error_rate_reset',
    })

    return NextResponse.json({
      success: true,
      message: 'Error rate metrics reset',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error resetting error rate metrics', {
      operation: 'error_rate_reset',
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function generatePrometheusMetrics(
  summary: ReturnType<typeof getErrorRateSummary>,
  config: ReturnType<typeof errorRateTracker.getConfig>
): string {
  let output = ''

  // Config metrics
  output += '# HELP api_error_rate_threshold Configured error rate threshold\n'
  output += '# TYPE api_error_rate_threshold gauge\n'
  output += `api_error_rate_threshold ${config.errorRateThreshold}\n\n`

  // Summary metrics
  output += '# HELP api_error_rate_total_requests Total API requests in current window\n'
  output += '# TYPE api_error_rate_total_requests gauge\n'
  output += `api_error_rate_total_requests ${summary.totals.totalRequests}\n\n`

  output += '# HELP api_error_rate_total_errors Total API errors in current window\n'
  output += '# TYPE api_error_rate_total_errors gauge\n'
  output += `api_error_rate_total_errors ${summary.totals.totalErrors}\n\n`

  output += '# HELP api_error_rate_overall Overall API error rate\n'
  output += '# TYPE api_error_rate_overall gauge\n'
  output += `api_error_rate_overall ${summary.totals.overallErrorRate.toFixed(4)}\n\n`

  output += '# HELP api_error_rate_endpoints_healthy Number of healthy endpoints\n'
  output += '# TYPE api_error_rate_endpoints_healthy gauge\n'
  output += `api_error_rate_endpoints_healthy ${summary.totals.healthyEndpoints}\n\n`

  output += '# HELP api_error_rate_endpoints_warning Number of warning endpoints\n'
  output += '# TYPE api_error_rate_endpoints_warning gauge\n'
  output += `api_error_rate_endpoints_warning ${summary.totals.warningEndpoints}\n\n`

  output += '# HELP api_error_rate_endpoints_critical Number of critical endpoints\n'
  output += '# TYPE api_error_rate_endpoints_critical gauge\n'
  output += `api_error_rate_endpoints_critical ${summary.totals.criticalEndpoints}\n\n`

  // Per-endpoint metrics
  if (summary.endpoints.length > 0) {
    output += '# HELP api_error_rate_per_endpoint Error rate per API endpoint\n'
    output += '# TYPE api_error_rate_per_endpoint gauge\n'
    for (const endpoint of summary.endpoints) {
      const labels = `method="${endpoint.method}",endpoint="${endpoint.endpoint.replace(/"/g, '\\"')}"`
      output += `api_error_rate_per_endpoint{${labels}} ${endpoint.errorRate.toFixed(4)}\n`
    }
    output += '\n'

    output += '# HELP api_requests_per_endpoint Requests per API endpoint\n'
    output += '# TYPE api_requests_per_endpoint gauge\n'
    for (const endpoint of summary.endpoints) {
      const labels = `method="${endpoint.method}",endpoint="${endpoint.endpoint.replace(/"/g, '\\"')}"`
      output += `api_requests_per_endpoint{${labels}} ${endpoint.totalRequests}\n`
    }
    output += '\n'

    output += '# HELP api_errors_per_endpoint Errors per API endpoint\n'
    output += '# TYPE api_errors_per_endpoint gauge\n'
    for (const endpoint of summary.endpoints) {
      const labels = `method="${endpoint.method}",endpoint="${endpoint.endpoint.replace(/"/g, '\\"')}"`
      output += `api_errors_per_endpoint{${labels}} ${endpoint.errorCount}\n`
    }
  }

  return output
}
