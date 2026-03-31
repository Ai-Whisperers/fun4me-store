'use client'

/**
 * Monitoring Dashboard Client Component
 *
 * OPS-002: Real-time performance monitoring UI
 *
 * Features:
 * - System health indicator
 * - API performance metrics with percentiles
 * - Database query statistics
 * - Memory usage visualization
 * - Error rate tracking
 * - Auto-refresh capability
 * - Historical trend charts
 */

import { useState, useEffect, useCallback } from 'react'
import { logger } from '@/lib/logger'
import {
  Activity,
  Database,
  AlertTriangle,
  RefreshCw,
  Zap,
  HardDrive,
  AlertCircle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Timer,
  History,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface HistoricalMetrics {
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
  dataPoints: Array<{
    timestamp: string
    status: string
    api_response_avg_ms: number
    api_error_rate: number
    api_requests_per_minute: number
    db_query_avg_ms: number
    db_slow_query_count: number
    memory_heap_used_mb: number
  }>
}

interface PerformanceMetrics {
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

export function MonitoringDashboardClient() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [historical, setHistorical] = useState<HistoricalMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [historyRange, setHistoryRange] = useState<string>('24h')

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch('/api/health/metrics')
      if (!res.ok) {
        throw new Error('Error al cargar métricas')
      }
      const data = await res.json()
      setMetrics(data)
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchHistorical = useCallback(async (range: string) => {
    try {
      const res = await fetch(`/api/health/metrics/history?range=${range}`)
      if (!res.ok) {
        // Historical data might not be available yet
        logger.warn('No historical data available', { range })
        return
      }
      const data = await res.json()
      setHistorical(data)
    } catch (err) {
      logger.warn('Failed to load historical data', { 
        error: err instanceof Error ? err.message : 'Unknown error',
        range 
      })
    }
  }, [])

  useEffect(() => {
    fetchMetrics()
    fetchHistorical(historyRange)
  }, [fetchMetrics, fetchHistorical, historyRange])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchMetrics, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [autoRefresh, fetchMetrics])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-6 w-6 text-[var(--status-success,#16a34a)]" />
      case 'degraded':
        return <AlertTriangle className="h-6 w-6 text-[var(--status-warning,#ca8a04)]" />
      case 'critical':
        return <XCircle className="h-6 w-6 text-[var(--status-error,#dc2626)]" />
      default:
        return <AlertCircle className="h-6 w-6 text-[var(--text-muted)]" />
    }
  }

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-[var(--status-success-bg,#dcfce7)]'
      case 'degraded':
        return 'bg-[var(--status-warning-bg,#fef3c7)]'
      case 'critical':
        return 'bg-[var(--status-error-bg,#fef2f2)]'
      default:
        return 'bg-[var(--bg-secondary,#f3f4f6)]'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'Saludable'
      case 'degraded':
        return 'Degradado'
      case 'critical':
        return 'Crítico'
      default:
        return 'Desconocido'
    }
  }

  const formatNumber = (num: number, decimals = 2) => {
    return num.toFixed(decimals)
  }

  const formatPercentage = (rate: number) => {
    return `${(rate * 100).toFixed(2)}%`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[var(--status-error,#dc2626)] bg-[var(--status-error-bg,#fef2f2)] p-4 text-[var(--status-error,#dc2626)]">
        <AlertCircle className="mr-2 inline h-5 w-5" />
        {error}
        <button
          onClick={() => {
            setLoading(true)
            fetchMetrics()
          }}
          className="ml-4 underline hover:no-underline"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Monitoreo de Rendimiento</h1>
          <p className="text-[var(--text-muted)]">
            Métricas en tiempo real de la plataforma
          </p>
        </div>
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <span className="text-sm text-[var(--text-muted)]">
              Actualizado: {lastUpdated.toLocaleTimeString('es-PY')}
            </span>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-[var(--border-default)] text-[var(--primary)]"
            />
            Auto-refresh
          </label>
          <button
            onClick={() => {
              setLoading(true)
              fetchMetrics()
            }}
            className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
        </div>
      </div>

      {/* System Status Banner */}
      <div
        className={`flex items-center justify-between rounded-xl p-4 ${getStatusBg(metrics?.status || 'unknown')}`}
      >
        <div className="flex items-center gap-3">
          {getStatusIcon(metrics?.status || 'unknown')}
          <div>
            <p className="font-semibold text-[var(--text-primary)]">
              Estado del Sistema: {getStatusText(metrics?.status || 'unknown')}
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              Tiempo activo: {metrics?.uptime.uptimeFormatted}
            </p>
          </div>
        </div>
        <div className="text-right text-sm text-[var(--text-muted)]">
          <p>Entorno: {metrics?.system.environment}</p>
          <p>Node: {metrics?.system.nodeVersion}</p>
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
        {/* API Response Time */}
        <div className="rounded-xl border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-lg bg-blue-100 p-2">
              <Zap className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-xs text-[var(--text-muted)]">API</span>
          </div>
          <p className="text-3xl font-bold text-[var(--text-primary)]">
            {formatNumber(metrics?.api.responseTime.avg || 0, 0)} ms
          </p>
          <p className="text-sm text-[var(--text-muted)]">Tiempo de respuesta promedio</p>
          <div className="mt-3 flex gap-3 text-xs text-[var(--text-muted)]">
            <span>p50: {formatNumber(metrics?.api.responseTime.p50 || 0, 0)}ms</span>
            <span>p95: {formatNumber(metrics?.api.responseTime.p95 || 0, 0)}ms</span>
            <span>p99: {formatNumber(metrics?.api.responseTime.p99 || 0, 0)}ms</span>
          </div>
        </div>

        {/* Requests Per Minute */}
        <div className="rounded-xl border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-lg bg-green-100 p-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-xs text-[var(--text-muted)]">Tráfico</span>
          </div>
          <p className="text-3xl font-bold text-[var(--text-primary)]">
            {formatNumber(metrics?.api.requestsPerMinute || 0, 1)}
          </p>
          <p className="text-sm text-[var(--text-muted)]">Solicitudes por minuto</p>
          <div className="mt-3 text-xs text-[var(--text-muted)]">
            Total: {metrics?.api.totalRequests.toLocaleString('es-PY')} solicitudes
          </div>
        </div>

        {/* Error Rate */}
        <div className="rounded-xl border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className={`rounded-lg p-2 ${(metrics?.api.errorRate || 0) > 0.05 ? 'bg-red-100' : 'bg-green-100'}`}>
              <AlertTriangle className={`h-5 w-5 ${(metrics?.api.errorRate || 0) > 0.05 ? 'text-red-600' : 'text-green-600'}`} />
            </div>
            <span className="text-xs text-[var(--text-muted)]">Errores</span>
          </div>
          <p className="text-3xl font-bold text-[var(--text-primary)]">
            {formatPercentage(metrics?.api.errorRate || 0)}
          </p>
          <p className="text-sm text-[var(--text-muted)]">Tasa de errores</p>
          <div className="mt-3 text-xs text-[var(--text-muted)]">
            Total: {metrics?.api.totalErrors.toLocaleString('es-PY')} errores
          </div>
        </div>

        {/* Memory Usage */}
        <div className="rounded-xl border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-lg bg-purple-100 p-2">
              <HardDrive className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-xs text-[var(--text-muted)]">Memoria</span>
          </div>
          <p className="text-3xl font-bold text-[var(--text-primary)]">
            {metrics?.system.memoryUsage.heapUsed} MB
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            de {metrics?.system.memoryUsage.heapTotal} MB heap
          </p>
          <div className="mt-3">
            <div className="h-2 w-full rounded-full bg-[var(--bg-secondary,#f3f4f6)]">
              <div
                className="h-2 rounded-full bg-purple-500"
                style={{
                  width: `${Math.min(
                    ((metrics?.system.memoryUsage.heapUsed || 0) /
                      (metrics?.system.memoryUsage.heapTotal || 1)) *
                      100,
                    100
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Database & Details Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Database Performance */}
        <div className="rounded-xl border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] p-6">
          <div className="mb-4 flex items-center gap-3">
            <Database className="h-5 w-5 text-[var(--primary)]" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Rendimiento de Base de Datos
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-[var(--bg-secondary,#f3f4f6)] p-4">
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {formatNumber(metrics?.database.avgQueryTime || 0, 1)} ms
              </p>
              <p className="text-sm text-[var(--text-muted)]">Tiempo promedio de query</p>
            </div>
            <div className="rounded-lg bg-[var(--bg-secondary,#f3f4f6)] p-4">
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {formatPercentage(metrics?.database.slowQueryRate || 0)}
              </p>
              <p className="text-sm text-[var(--text-muted)]">Tasa de queries lentos</p>
            </div>
            <div className="rounded-lg bg-[var(--bg-secondary,#f3f4f6)] p-4">
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {metrics?.database.slowQueryCount || 0}
              </p>
              <p className="text-sm text-[var(--text-muted)]">Queries lentos (&gt;100ms)</p>
            </div>
            <div className="rounded-lg bg-[var(--bg-secondary,#f3f4f6)] p-4">
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {metrics?.database.criticalQueryCount || 0}
              </p>
              <p className="text-sm text-[var(--text-muted)]">Queries críticos (&gt;1s)</p>
            </div>
          </div>

          {/* Top Slow Tables */}
          {(metrics?.database.topSlowTables?.length ?? 0) > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 text-sm font-medium text-[var(--text-secondary)]">
                Tablas más lentas
              </h3>
              <div className="space-y-2">
                {metrics?.database.topSlowTables.map((table) => (
                  <div
                    key={table.table}
                    className="flex items-center justify-between rounded bg-[var(--bg-secondary,#f3f4f6)] px-3 py-2 text-sm"
                  >
                    <span className="font-mono text-[var(--text-primary)]">{table.table}</span>
                    <span className="text-[var(--text-muted)]">
                      {table.count} queries • {formatNumber(table.avgMs, 0)}ms avg
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Detailed Metrics */}
        <div className="rounded-xl border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] p-6">
          <div className="mb-4 flex items-center gap-3">
            <Activity className="h-5 w-5 text-[var(--primary)]" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Métricas Detalladas
            </h2>
          </div>

          {/* Counters */}
          {Object.keys(metrics?.counters || {}).length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-medium text-[var(--text-secondary)]">Contadores</h3>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {Object.entries(metrics?.counters || {}).map(([name, value]) => (
                  <div key={name} className="flex items-center justify-between text-sm">
                    <span className="truncate font-mono text-[var(--text-muted)]">{name}</span>
                    <span className="font-semibold text-[var(--text-primary)]">
                      {value.toLocaleString('es-PY')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Histograms */}
          {Object.keys(metrics?.histograms || {}).length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-[var(--text-secondary)]">Histogramas</h3>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {Object.entries(metrics?.histograms || {}).map(([name, data]) => (
                  <div key={name} className="rounded bg-[var(--bg-secondary,#f3f4f6)] p-2 text-xs">
                    <p className="mb-1 truncate font-mono text-[var(--text-primary)]">{name}</p>
                    <div className="flex gap-2 text-[var(--text-muted)]">
                      <span>n={data.count}</span>
                      <span>avg={formatNumber(data.avg, 1)}</span>
                      <span>min={formatNumber(data.min, 1)}</span>
                      <span>max={formatNumber(data.max, 1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* System Info */}
          <div className="mt-4 border-t border-[var(--border-light,#e5e7eb)] pt-4">
            <h3 className="mb-2 text-sm font-medium text-[var(--text-secondary)]">Sistema</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-[var(--text-muted)]">RSS: </span>
                <span className="font-medium text-[var(--text-primary)]">
                  {metrics?.system.memoryUsage.rss} MB
                </span>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">External: </span>
                <span className="font-medium text-[var(--text-primary)]">
                  {metrics?.system.memoryUsage.external} MB
                </span>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">Servidor desde: </span>
              </div>
              <div>
                <span className="font-medium text-[var(--text-primary)]">
                  {metrics?.uptime.serverStart
                    ? new Date(metrics.uptime.serverStart).toLocaleString('es-PY')
                    : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Uptime Bar */}
      <div className="rounded-xl border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Timer className="h-5 w-5 text-[var(--primary)]" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Tiempo Activo
            </h2>
          </div>
          <span className="text-2xl font-bold text-[var(--status-success,#16a34a)]">
            {metrics?.uptime.uptimeFormatted}
          </span>
        </div>
        <div className="h-4 w-full overflow-hidden rounded-full bg-[var(--bg-secondary,#f3f4f6)]">
          <div
            className="h-4 rounded-full bg-gradient-to-r from-[var(--status-success,#16a34a)] to-green-400"
            style={{ width: '100%' }}
          />
        </div>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Desde: {metrics?.uptime.serverStart
            ? new Date(metrics.uptime.serverStart).toLocaleString('es-PY')
            : '-'}
        </p>
      </div>

      {/* Historical Trends */}
      <div className="rounded-xl border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <History className="h-5 w-5 text-[var(--primary)]" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Tendencias Históricas
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {['1h', '6h', '24h', '7d', '30d'].map((range) => (
              <button
                key={range}
                onClick={() => setHistoryRange(range)}
                className={`rounded-lg px-3 py-1 text-sm font-medium transition ${
                  historyRange === range
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-[var(--bg-secondary,#f3f4f6)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary,#e5e7eb)]'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {historical && historical.dataPoints.length > 0 ? (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg bg-[var(--bg-secondary,#f3f4f6)] p-3">
                <p className="text-xs text-[var(--text-muted)]">Tiempo resp. prom.</p>
                <p className="text-lg font-semibold text-[var(--text-primary)]">
                  {historical.summary.avgResponseTime.toFixed(0)} ms
                </p>
              </div>
              <div className="rounded-lg bg-[var(--bg-secondary,#f3f4f6)] p-3">
                <p className="text-xs text-[var(--text-muted)]">Tasa error prom.</p>
                <p className="text-lg font-semibold text-[var(--text-primary)]">
                  {(historical.summary.avgErrorRate * 100).toFixed(2)}%
                </p>
              </div>
              <div className="rounded-lg bg-[var(--bg-secondary,#f3f4f6)] p-3">
                <p className="text-xs text-[var(--text-muted)]">Memoria prom.</p>
                <p className="text-lg font-semibold text-[var(--text-primary)]">
                  {historical.summary.avgMemoryUsage} MB
                </p>
              </div>
              <div className="rounded-lg bg-[var(--bg-secondary,#f3f4f6)] p-3">
                <p className="text-xs text-[var(--text-muted)]">Saludable</p>
                <p className="text-lg font-semibold text-[var(--status-success,#16a34a)]">
                  {historical.summary.healthyPct}%
                </p>
              </div>
            </div>

            {/* Response Time Chart */}
            <div>
              <h3 className="mb-2 text-sm font-medium text-[var(--text-secondary)]">
                Tiempo de Respuesta API (ms)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={historical.dataPoints.map((p) => ({
                      ...p,
                      time: new Date(p.timestamp).toLocaleTimeString('es-PY', {
                        hour: '2-digit',
                        minute: '2-digit',
                      }),
                    }))}
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light,#e5e7eb)" />
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                    />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--bg-primary,#fff)',
                        border: '1px solid var(--border-light,#e5e7eb)',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="api_response_avg_ms"
                      name="Respuesta API"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="db_query_avg_ms"
                      name="Query DB"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Memory & Error Chart */}
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-medium text-[var(--text-secondary)]">
                  Uso de Memoria (MB)
                </h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={historical.dataPoints.map((p) => ({
                        ...p,
                        time: new Date(p.timestamp).toLocaleTimeString('es-PY', {
                          hour: '2-digit',
                          minute: '2-digit',
                        }),
                      }))}
                      margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light,#e5e7eb)" />
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                      />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--bg-primary,#fff)',
                          border: '1px solid var(--border-light,#e5e7eb)',
                          borderRadius: '8px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="memory_heap_used_mb"
                        name="Heap"
                        stroke="#a855f7"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium text-[var(--text-secondary)]">
                  Tasa de Errores (%)
                </h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={historical.dataPoints.map((p) => ({
                        ...p,
                        time: new Date(p.timestamp).toLocaleTimeString('es-PY', {
                          hour: '2-digit',
                          minute: '2-digit',
                        }),
                        errorPct: (p.api_error_rate || 0) * 100,
                      }))}
                      margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light,#e5e7eb)" />
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                      />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--bg-primary,#fff)',
                          border: '1px solid var(--border-light,#e5e7eb)',
                          borderRadius: '8px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="errorPct"
                        name="Errores"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <History className="mb-4 h-12 w-12 text-[var(--text-muted)]" />
            <p className="text-[var(--text-secondary)]">
              No hay datos históricos disponibles
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              Los datos se capturan automáticamente cada 5 minutos
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
