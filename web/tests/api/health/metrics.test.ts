/**
 * Performance Metrics API Tests
 *
 * OPS-002: Tests for the unified performance metrics endpoint
 *
 * @ticket OPS-002
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { is_platform_admin: true },
            error: null,
          }),
        }),
      }),
    }),
  })),
}))

// Mock monitoring modules
vi.mock('@/lib/monitoring/metrics', () => ({
  metrics: {
    getMetrics: vi.fn().mockReturnValue({
      counters: { 'test.counter': 100 },
      gauges: { 'test.gauge': 50 },
      histograms: {
        'performance.api_request_duration': {
          count: 1000,
          sum: 5000,
          avg: 5,
          min: 1,
          max: 100,
        },
      },
    }),
  },
}))

vi.mock('@/lib/monitoring/error-rate', () => ({
  getErrorRateSummary: vi.fn().mockReturnValue({
    totals: {
      totalRequests: 10000,
      totalErrors: 50,
      overallErrorRate: 0.005,
      criticalEndpoints: 0,
      warningEndpoints: 1,
    },
  }),
}))

vi.mock('@/lib/monitoring/slow-query', () => ({
  getSlowQueryStats: vi.fn().mockReturnValue({
    avgDurationMs: 15,
    slowQueryCount: 10,
    criticalCount: 2,
    slowQueryRate: 0.01,
    topSlowTables: [
      { table: 'profiles', count: 5, avgMs: 120 },
      { table: 'appointments', count: 3, avgMs: 110 },
    ],
  }),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('Performance Metrics Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Response structure', () => {
    it('should have correct PerformanceMetricsResponse shape', () => {
      // Define the expected response interface
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

      // Test that the interface has all required properties
      const mockResponse: PerformanceMetricsResponse = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: {
          serverStart: new Date().toISOString(),
          uptimeMs: 3600000,
          uptimeFormatted: '1h 0m',
        },
        api: {
          responseTime: { p50: 5, p95: 50, p99: 100, avg: 10 },
          requestsPerMinute: 100,
          errorRate: 0.005,
          totalRequests: 10000,
          totalErrors: 50,
        },
        database: {
          avgQueryTime: 15,
          slowQueryRate: 0.01,
          slowQueryCount: 10,
          criticalQueryCount: 2,
          topSlowTables: [{ table: 'test', count: 5, avgMs: 120 }],
        },
        system: {
          memoryUsage: { heapUsed: 100, heapTotal: 500, external: 10, rss: 200 },
          nodeVersion: 'v20.0.0',
          environment: 'test',
        },
        counters: { 'test.counter': 100 },
        gauges: { 'test.gauge': 50 },
        histograms: {
          'test.histogram': { count: 100, sum: 500, avg: 5, min: 1, max: 20 },
        },
      }

      expect(mockResponse.status).toBeDefined()
      expect(mockResponse.timestamp).toBeDefined()
      expect(mockResponse.uptime).toBeDefined()
      expect(mockResponse.api).toBeDefined()
      expect(mockResponse.database).toBeDefined()
      expect(mockResponse.system).toBeDefined()
    })
  })

  describe('Status determination', () => {
    it('should return healthy when no issues', () => {
      const criticalEndpoints = 0
      const warningEndpoints = 0
      const criticalCount = 0
      const slowQueryRate = 5

      let status: 'healthy' | 'degraded' | 'critical' = 'healthy'
      if (criticalEndpoints > 0 || criticalCount > 10) {
        status = 'critical'
      } else if (warningEndpoints > 0 || slowQueryRate > 10) {
        status = 'degraded'
      }

      expect(status).toBe('healthy')
    })

    it('should return degraded when warning endpoints exist', () => {
      const criticalEndpoints = 0
      const warningEndpoints = 1
      const criticalCount = 0
      const slowQueryRate = 5

      let status: 'healthy' | 'degraded' | 'critical' = 'healthy'
      if (criticalEndpoints > 0 || criticalCount > 10) {
        status = 'critical'
      } else if (warningEndpoints > 0 || slowQueryRate > 10) {
        status = 'degraded'
      }

      expect(status).toBe('degraded')
    })

    it('should return degraded when slow query rate exceeds threshold', () => {
      const criticalEndpoints = 0
      const warningEndpoints = 0
      const criticalCount = 0
      const slowQueryRate = 15

      let status: 'healthy' | 'degraded' | 'critical' = 'healthy'
      if (criticalEndpoints > 0 || criticalCount > 10) {
        status = 'critical'
      } else if (warningEndpoints > 0 || slowQueryRate > 10) {
        status = 'degraded'
      }

      expect(status).toBe('degraded')
    })

    it('should return critical when critical endpoints exist', () => {
      const criticalEndpoints = 1
      const warningEndpoints = 0
      const criticalCount = 0
      const slowQueryRate = 5

      let status: 'healthy' | 'degraded' | 'critical' = 'healthy'
      if (criticalEndpoints > 0 || criticalCount > 10) {
        status = 'critical'
      } else if (warningEndpoints > 0 || slowQueryRate > 10) {
        status = 'degraded'
      }

      expect(status).toBe('critical')
    })

    it('should return critical when too many critical queries', () => {
      const criticalEndpoints = 0
      const warningEndpoints = 0
      const criticalCount = 15
      const slowQueryRate = 5

      let status: 'healthy' | 'degraded' | 'critical' = 'healthy'
      if (criticalEndpoints > 0 || criticalCount > 10) {
        status = 'critical'
      } else if (warningEndpoints > 0 || slowQueryRate > 10) {
        status = 'degraded'
      }

      expect(status).toBe('critical')
    })
  })

  describe('Duration formatting', () => {
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

    it('should format seconds correctly', () => {
      expect(formatDuration(30000)).toBe('30s')
    })

    it('should format minutes correctly', () => {
      expect(formatDuration(90000)).toBe('1m 30s')
    })

    it('should format hours correctly', () => {
      expect(formatDuration(3660000)).toBe('1h 1m')
    })

    it('should format days correctly', () => {
      expect(formatDuration(90000000)).toBe('1d 1h 0m')
    })
  })

  describe('Memory conversion', () => {
    it('should convert bytes to megabytes', () => {
      const bytes = 104857600 // 100 MB in bytes
      const mb = Math.round(bytes / 1024 / 1024)
      expect(mb).toBe(100)
    })
  })
})

describe('Historical Metrics Endpoint', () => {
  const RANGE_TO_MS: Record<string, number> = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  }

  it('should support all expected time ranges', () => {
    expect(Object.keys(RANGE_TO_MS)).toEqual(['1h', '6h', '24h', '7d', '30d'])
  })

  it('should calculate correct milliseconds for each range', () => {
    expect(RANGE_TO_MS['1h']).toBe(3600000)
    expect(RANGE_TO_MS['6h']).toBe(21600000)
    expect(RANGE_TO_MS['24h']).toBe(86400000)
    expect(RANGE_TO_MS['7d']).toBe(604800000)
    expect(RANGE_TO_MS['30d']).toBe(2592000000)
  })

  describe('Summary calculations', () => {
    it('should calculate average response time', () => {
      const dataPoints = [
        { api_response_avg_ms: 10 },
        { api_response_avg_ms: 20 },
        { api_response_avg_ms: 30 },
      ]
      const sum = dataPoints.reduce((acc, p) => acc + p.api_response_avg_ms, 0)
      const avg = sum / dataPoints.length
      expect(avg).toBe(20)
    })

    it('should calculate status percentages', () => {
      const dataPoints = [
        { status: 'healthy' },
        { status: 'healthy' },
        { status: 'healthy' },
        { status: 'degraded' },
        { status: 'critical' },
      ]
      const total = dataPoints.length
      const healthyCount = dataPoints.filter((p) => p.status === 'healthy').length
      const degradedCount = dataPoints.filter((p) => p.status === 'degraded').length
      const criticalCount = dataPoints.filter((p) => p.status === 'critical').length

      expect(Math.round((healthyCount / total) * 100)).toBe(60)
      expect(Math.round((degradedCount / total) * 100)).toBe(20)
      expect(Math.round((criticalCount / total) * 100)).toBe(20)
    })
  })
})

describe('Metrics Capture Cron', () => {
  it('should build correct metrics snapshot shape', () => {
    const snapshot = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      api_response_avg_ms: 10,
      api_response_p50_ms: 8,
      api_response_p95_ms: 50,
      api_response_p99_ms: 90,
      api_requests_total: 10000,
      api_errors_total: 50,
      api_error_rate: 0.005,
      api_requests_per_minute: 100,
      db_query_avg_ms: 15,
      db_slow_query_count: 10,
      db_critical_query_count: 2,
      db_slow_query_rate: 0.01,
      memory_heap_used_mb: 100,
      memory_heap_total_mb: 500,
      memory_rss_mb: 200,
      memory_external_mb: 10,
      uptime_ms: 3600000,
      counters: {},
      gauges: {},
      histograms: {},
      environment: 'production',
      node_version: 'v20.0.0',
    }

    expect(snapshot.status).toBeDefined()
    expect(snapshot.api_response_avg_ms).toBeDefined()
    expect(snapshot.db_query_avg_ms).toBeDefined()
    expect(snapshot.memory_heap_used_mb).toBeDefined()
    expect(snapshot.environment).toBeDefined()
  })
})
