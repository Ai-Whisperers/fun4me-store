/**
 * Slow Query Health Dashboard Endpoint
 *
 * GET /api/health/queries
 *
 * OPS-003: Returns slow query statistics and trends.
 * Protected by API key for internal monitoring access.
 *
 * Query params:
 * - table: Filter by specific table name
 * - format: 'summary' (default) or 'detailed'
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getSlowQueryStats,
  getTableQueryStats,
  getAllTableStats,
  type SlowQueryStats,
  type TableQueryStats,
} from '@/lib/monitoring'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// Internal monitoring key (same as cron auth)
const MONITORING_KEY = process.env.CRON_SECRET

interface QueryHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  summary: SlowQueryStats
  tables?: TableQueryStats[]
  tableDetail?: TableQueryStats | null
  thresholds: {
    warning_ms: number
    critical_ms: number
    unhealthy_rate_percent: number
  }
  recommendations: string[]
  timestamp: string
}

export async function GET(request: NextRequest): Promise<NextResponse<QueryHealthResponse | { error: string }>> {
  // Verify monitoring access
  const authHeader = request.headers.get('authorization')
  const providedKey = authHeader?.replace('Bearer ', '')

  if (!MONITORING_KEY) {
    logger.warn('Query health endpoint called but CRON_SECRET not configured')
    return NextResponse.json(
      { error: 'Monitoring not configured' },
      { status: 503 }
    )
  }

  if (providedKey !== MONITORING_KEY) {
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const table = searchParams.get('table')
  const format = searchParams.get('format') || 'summary'

  try {
    const summary = getSlowQueryStats()
    const recommendations: string[] = []

    // Determine health status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'

    // Unhealthy if >5% of queries are critical
    const criticalRate = summary.totalQueries > 0
      ? (summary.criticalCount / summary.totalQueries) * 100
      : 0

    if (criticalRate > 5) {
      status = 'unhealthy'
      recommendations.push(
        `Critical: ${criticalRate.toFixed(1)}% of queries exceed 500ms threshold`
      )
    } else if (summary.slowQueryRate > 10) {
      status = 'degraded'
      recommendations.push(
        `Warning: ${summary.slowQueryRate.toFixed(1)}% of queries are slow (>100ms)`
      )
    }

    // Add recommendations based on stats
    if (summary.p95DurationMs > 500) {
      recommendations.push(
        `P95 latency is ${summary.p95DurationMs}ms - consider adding indexes or optimizing queries`
      )
    }

    if (summary.topSlowTables.length > 0) {
      const worstTable = summary.topSlowTables[0]
      recommendations.push(
        `Table "${worstTable.table}" has ${worstTable.count} slow queries (avg ${worstTable.avgMs}ms)`
      )
    }

    // Build response
    const response: QueryHealthResponse = {
      status,
      summary,
      thresholds: {
        warning_ms: 100,
        critical_ms: 500,
        unhealthy_rate_percent: 5,
      },
      recommendations,
      timestamp: new Date().toISOString(),
    }

    // Add table detail if requested
    if (table) {
      response.tableDetail = getTableQueryStats(table)
    }

    // Add all tables if detailed format
    if (format === 'detailed') {
      response.tables = getAllTableStats()
    }

    logger.debug('Query health check', {
      status,
      totalQueries: summary.totalQueries,
      criticalCount: summary.criticalCount,
    })

    return NextResponse.json(response)
  } catch (error) {
    logger.error('Failed to get query health stats', {
      error: error instanceof Error ? error.message : String(error),
    })

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
