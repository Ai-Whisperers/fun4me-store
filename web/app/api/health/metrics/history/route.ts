/**
 * Historical Performance Metrics API
 *
 * OPS-002: GET /api/health/metrics/history
 *
 * Retrieves historical performance metrics for trend analysis.
 *
 * Query params:
 * - range: Time range (1h, 6h, 24h, 7d, 30d) - default 24h
 * - interval: Aggregation interval (5m, 15m, 1h, 6h, 1d) - default auto
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

interface MetricPoint {
  timestamp: string
  status: string
  api_response_avg_ms: number
  api_error_rate: number
  api_requests_per_minute: number
  db_query_avg_ms: number
  db_slow_query_count: number
  memory_heap_used_mb: number
}

interface AggregatedMetrics {
  period: {
    start: string
    end: string
    range: string
  }
  summary: {
    avgResponseTime: number
    avgErrorRate: number
    totalRequests: number
    avgMemoryUsage: number
    healthyPct: number
    degradedPct: number
    criticalPct: number
  }
  dataPoints: MetricPoint[]
}

const RANGE_TO_MS: Record<string, number> = {
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Verify platform admin access
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

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

  try {
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '24h'

    // Validate range
    if (!RANGE_TO_MS[range]) {
      return NextResponse.json(
        { error: `Rango inválido. Valores válidos: ${Object.keys(RANGE_TO_MS).join(', ')}` },
        { status: 400 }
      )
    }

    const rangeMs = RANGE_TO_MS[range]
    const startTime = new Date(Date.now() - rangeMs).toISOString()

    // Fetch historical data
    const { data: metricsData, error } = await supabase
      .from('performance_metrics_history')
      .select(`
        timestamp,
        status,
        api_response_avg_ms,
        api_error_rate,
        api_requests_per_minute,
        api_requests_total,
        db_query_avg_ms,
        db_slow_query_count,
        memory_heap_used_mb
      `)
      .gte('timestamp', startTime)
      .order('timestamp', { ascending: true })
      .limit(500) // Limit data points to prevent huge responses

    if (error) {
      logger.error('Failed to fetch historical metrics', { error: error.message })
      return NextResponse.json(
        { error: 'Error al obtener métricas históricas' },
        { status: 500 }
      )
    }

    // Calculate summary statistics
    const dataPoints = metricsData || []
    const totalPoints = dataPoints.length

    if (totalPoints === 0) {
      return NextResponse.json({
        period: {
          start: startTime,
          end: new Date().toISOString(),
          range,
        },
        summary: {
          avgResponseTime: 0,
          avgErrorRate: 0,
          totalRequests: 0,
          avgMemoryUsage: 0,
          healthyPct: 0,
          degradedPct: 0,
          criticalPct: 0,
        },
        dataPoints: [],
      } as AggregatedMetrics)
    }

    // Calculate averages and percentages
    const sum = dataPoints.reduce(
      (acc, point) => {
        acc.responseTime += point.api_response_avg_ms || 0
        acc.errorRate += point.api_error_rate || 0
        acc.requests += point.api_requests_total || 0
        acc.memory += point.memory_heap_used_mb || 0
        acc.statusCounts[point.status] = (acc.statusCounts[point.status] || 0) + 1
        return acc
      },
      {
        responseTime: 0,
        errorRate: 0,
        requests: 0,
        memory: 0,
        statusCounts: {} as Record<string, number>,
      }
    )

    const summary = {
      avgResponseTime: Math.round((sum.responseTime / totalPoints) * 100) / 100,
      avgErrorRate: Math.round((sum.errorRate / totalPoints) * 10000) / 10000,
      totalRequests: sum.requests,
      avgMemoryUsage: Math.round(sum.memory / totalPoints),
      healthyPct: Math.round(((sum.statusCounts['healthy'] || 0) / totalPoints) * 100),
      degradedPct: Math.round(((sum.statusCounts['degraded'] || 0) / totalPoints) * 100),
      criticalPct: Math.round(((sum.statusCounts['critical'] || 0) / totalPoints) * 100),
    }

    const response: AggregatedMetrics = {
      period: {
        start: startTime,
        end: new Date().toISOString(),
        range,
      },
      summary,
      dataPoints: dataPoints as MetricPoint[],
    }

    return NextResponse.json(response)
  } catch (error) {
    logger.error('Error in metrics history endpoint', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
