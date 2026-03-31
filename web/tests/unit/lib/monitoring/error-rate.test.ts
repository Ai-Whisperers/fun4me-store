/**
 * Unit tests for Error Rate Tracking Service
 *
 * Tests the ErrorRateTracker class and related utilities.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  ErrorRateTracker,
  recordApiError,
  getErrorRateSummary,
  isEndpointHealthy,
  errorRateTracker,
} from '@/lib/monitoring/error-rate'

// Mock the logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock the alerts module
vi.mock('@/lib/monitoring/alerts', () => ({
  sendAlert: vi.fn().mockResolvedValue(undefined),
}))

describe('ErrorRateTracker', () => {
  let tracker: ErrorRateTracker

  beforeEach(() => {
    // Create fresh tracker for each test with alerting disabled to avoid side effects
    tracker = new ErrorRateTracker({
      alertingEnabled: false,
      windowMs: 60_000, // 1 minute window
      errorRateThreshold: 0.10,
      minRequestsForAlert: 10,
    })
  })

  afterEach(() => {
    tracker.destroy()
    vi.clearAllMocks()
  })

  describe('recordRequest', () => {
    it('should record successful requests', () => {
      tracker.recordRequest('GET', '/api/users', 200)
      tracker.recordRequest('GET', '/api/users', 200)
      tracker.recordRequest('GET', '/api/users', 200)

      const metrics = tracker.getMetrics()
      expect(metrics).toHaveLength(1)
      expect(metrics[0].totalRequests).toBe(3)
      expect(metrics[0].errorCount).toBe(0)
      expect(metrics[0].errorRate).toBe(0)
    })

    it('should record error requests (4xx)', () => {
      tracker.recordRequest('GET', '/api/users', 200)
      tracker.recordRequest('GET', '/api/users', 400)
      tracker.recordRequest('GET', '/api/users', 404)

      const metrics = tracker.getMetrics()
      expect(metrics[0].totalRequests).toBe(3)
      expect(metrics[0].errorCount).toBe(2)
      expect(metrics[0].errorRate).toBeCloseTo(0.667, 2)
    })

    it('should record error requests (5xx)', () => {
      tracker.recordRequest('POST', '/api/orders', 200)
      tracker.recordRequest('POST', '/api/orders', 500)
      tracker.recordRequest('POST', '/api/orders', 503)
      tracker.recordRequest('POST', '/api/orders', 200)

      const metrics = tracker.getMetrics()
      expect(metrics[0].totalRequests).toBe(4)
      expect(metrics[0].errorCount).toBe(2)
      expect(metrics[0].errorRate).toBe(0.5)
    })

    it('should track different endpoints separately', () => {
      tracker.recordRequest('GET', '/api/users', 200)
      tracker.recordRequest('GET', '/api/pets', 200)
      tracker.recordRequest('POST', '/api/users', 201)

      const metrics = tracker.getMetrics()
      expect(metrics).toHaveLength(3)
    })

    it('should track recent error status codes', () => {
      tracker.recordRequest('GET', '/api/data', 400)
      tracker.recordRequest('GET', '/api/data', 500)
      tracker.recordRequest('GET', '/api/data', 404)

      const metrics = tracker.getEndpointMetrics('GET', '/api/data')
      expect(metrics?.recentErrors).toEqual([400, 500, 404])
    })

    it('should limit recent errors to 10', () => {
      for (let i = 0; i < 15; i++) {
        tracker.recordRequest('GET', '/api/data', 400 + (i % 100))
      }

      const metrics = tracker.getEndpointMetrics('GET', '/api/data')
      expect(metrics?.recentErrors).toHaveLength(10)
    })
  })

  describe('endpoint normalization', () => {
    it('should normalize UUIDs in paths', () => {
      tracker.recordRequest('GET', '/api/users/123e4567-e89b-12d3-a456-426614174000', 200)
      tracker.recordRequest('GET', '/api/users/987fcdeb-51a2-3456-7890-abcdef012345', 200)

      const metrics = tracker.getMetrics()
      expect(metrics).toHaveLength(1)
      expect(metrics[0].endpoint).toBe('/api/users/:id')
      expect(metrics[0].totalRequests).toBe(2)
    })

    it('should normalize numeric IDs in paths', () => {
      tracker.recordRequest('GET', '/api/orders/12345', 200)
      tracker.recordRequest('GET', '/api/orders/67890', 200)

      const metrics = tracker.getMetrics()
      expect(metrics).toHaveLength(1)
      expect(metrics[0].endpoint).toBe('/api/orders/:id')
    })

    it('should normalize short alphanumeric IDs', () => {
      tracker.recordRequest('GET', '/api/pets/abc12345xyz', 200)
      tracker.recordRequest('GET', '/api/pets/def67890uvw', 200)

      const metrics = tracker.getMetrics()
      expect(metrics).toHaveLength(1)
      expect(metrics[0].endpoint).toBe('/api/pets/:id')
    })

    it('should strip query parameters', () => {
      tracker.recordRequest('GET', '/api/search?q=test&page=1', 200)
      tracker.recordRequest('GET', '/api/search?q=other&page=2', 200)

      const metrics = tracker.getMetrics()
      expect(metrics).toHaveLength(1)
      expect(metrics[0].endpoint).toBe('/api/search')
    })
  })

  describe('getSummary', () => {
    it('should return empty summary with no requests', () => {
      const summary = tracker.getSummary()

      expect(summary.endpoints).toHaveLength(0)
      expect(summary.totals.totalEndpoints).toBe(0)
      expect(summary.totals.totalRequests).toBe(0)
      expect(summary.totals.overallErrorRate).toBe(0)
    })

    it('should calculate totals correctly', () => {
      tracker.recordRequest('GET', '/api/users', 200)
      tracker.recordRequest('GET', '/api/users', 500)
      tracker.recordRequest('GET', '/api/pets', 200)
      tracker.recordRequest('GET', '/api/pets', 200)

      const summary = tracker.getSummary()

      expect(summary.totals.totalEndpoints).toBe(2)
      expect(summary.totals.totalRequests).toBe(4)
      expect(summary.totals.totalErrors).toBe(1)
      expect(summary.totals.overallErrorRate).toBe(0.25)
    })

    it('should categorize endpoints by health status', () => {
      // Healthy endpoint (0% errors) - use path with specific name
      for (let i = 0; i < 20; i++) {
        tracker.recordRequest('GET', '/api/users/healthy', 200)
      }

      // Warning endpoint (7% errors, between 5% threshold * 0.5 = 5% and 10%)
      // With 10% threshold and 0.5 multiplier, warning is 5-10%
      for (let i = 0; i < 93; i++) {
        tracker.recordRequest('POST', '/api/orders/warning', 200)
      }
      for (let i = 0; i < 7; i++) {
        tracker.recordRequest('POST', '/api/orders/warning', 500)
      }

      // Critical endpoint (50% errors - above 10% threshold)
      for (let i = 0; i < 10; i++) {
        tracker.recordRequest('DELETE', '/api/items/critical', 200)
      }
      for (let i = 0; i < 10; i++) {
        tracker.recordRequest('DELETE', '/api/items/critical', 500)
      }

      const summary = tracker.getSummary()

      // Each endpoint should have unique method:path combination
      expect(summary.endpoints).toHaveLength(3)

      // Find by method to be more precise
      const healthy = summary.endpoints.find((e) => e.method === 'GET')
      const warning = summary.endpoints.find((e) => e.method === 'POST')
      const critical = summary.endpoints.find((e) => e.method === 'DELETE')

      expect(healthy?.status).toBe('healthy')
      expect(healthy?.errorRate).toBe(0)

      expect(warning?.status).toBe('warning')
      expect(warning?.errorRate).toBe(0.07)

      expect(critical?.status).toBe('critical')
      expect(critical?.errorRate).toBe(0.5)

      expect(summary.totals.healthyEndpoints).toBe(1)
      expect(summary.totals.warningEndpoints).toBe(1)
      expect(summary.totals.criticalEndpoints).toBe(1)
    })

    it('should sort endpoints by error rate descending', () => {
      // 50% errors
      tracker.recordRequest('GET', '/api/high', 200)
      tracker.recordRequest('GET', '/api/high', 500)

      // 0% errors
      tracker.recordRequest('GET', '/api/low', 200)
      tracker.recordRequest('GET', '/api/low', 200)

      // 25% errors
      tracker.recordRequest('GET', '/api/medium', 200)
      tracker.recordRequest('GET', '/api/medium', 200)
      tracker.recordRequest('GET', '/api/medium', 200)
      tracker.recordRequest('GET', '/api/medium', 500)

      const summary = tracker.getSummary()

      expect(summary.endpoints[0].endpoint).toBe('/api/high')
      expect(summary.endpoints[1].endpoint).toBe('/api/medium')
      expect(summary.endpoints[2].endpoint).toBe('/api/low')
    })
  })

  describe('getEndpointMetrics', () => {
    it('should return undefined for non-existent endpoint', () => {
      const metrics = tracker.getEndpointMetrics('GET', '/api/nonexistent')
      expect(metrics).toBeUndefined()
    })

    it('should return metrics for existing endpoint', () => {
      tracker.recordRequest('POST', '/api/users', 201)
      tracker.recordRequest('POST', '/api/users', 400)

      const metrics = tracker.getEndpointMetrics('POST', '/api/users')
      expect(metrics).toBeDefined()
      expect(metrics?.totalRequests).toBe(2)
      expect(metrics?.errorCount).toBe(1)
    })
  })

  describe('reset', () => {
    it('should clear all metrics', () => {
      tracker.recordRequest('GET', '/api/users', 200)
      tracker.recordRequest('GET', '/api/pets', 500)

      expect(tracker.getMetrics()).toHaveLength(2)

      tracker.reset()

      expect(tracker.getMetrics()).toHaveLength(0)
    })
  })

  describe('window expiration', () => {
    it('should start new window after expiration', () => {
      vi.useFakeTimers()

      tracker.recordRequest('GET', '/api/data', 500)
      expect(tracker.getMetrics()[0].errorCount).toBe(1)

      // Advance time past window
      vi.advanceTimersByTime(70_000)

      // New request starts fresh window
      tracker.recordRequest('GET', '/api/data', 200)

      const metrics = tracker.getMetrics()
      expect(metrics).toHaveLength(1)
      expect(metrics[0].errorCount).toBe(0)
      expect(metrics[0].totalRequests).toBe(1)

      vi.useRealTimers()
    })
  })

  describe('configuration', () => {
    it('should use custom configuration', () => {
      const customTracker = new ErrorRateTracker({
        errorRateThreshold: 0.05,
        minRequestsForAlert: 5,
        windowMs: 30_000,
        alertingEnabled: false,
      })

      const config = customTracker.getConfig()
      expect(config.errorRateThreshold).toBe(0.05)
      expect(config.minRequestsForAlert).toBe(5)
      expect(config.windowMs).toBe(30_000)

      customTracker.destroy()
    })

    it('should allow config updates', () => {
      tracker.updateConfig({ errorRateThreshold: 0.20 })

      const config = tracker.getConfig()
      expect(config.errorRateThreshold).toBe(0.20)
    })
  })
})

describe('alerting integration', () => {
  it('should trigger alert when threshold exceeded', async () => {
    const { sendAlert } = await import('@/lib/monitoring/alerts')
    const alertTracker = new ErrorRateTracker({
      alertingEnabled: true,
      errorRateThreshold: 0.10,
      minRequestsForAlert: 5,
      windowMs: 60_000,
    })

    // Generate enough requests to trigger alert
    for (let i = 0; i < 4; i++) {
      alertTracker.recordRequest('GET', '/api/failing', 200)
    }
    for (let i = 0; i < 6; i++) {
      alertTracker.recordRequest('GET', '/api/failing', 500)
    }

    // Wait for async alert
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(sendAlert).toHaveBeenCalled()

    alertTracker.destroy()
  })

  it('should not alert below minimum requests', async () => {
    const { sendAlert } = await import('@/lib/monitoring/alerts')
    vi.mocked(sendAlert).mockClear()

    const alertTracker = new ErrorRateTracker({
      alertingEnabled: true,
      errorRateThreshold: 0.10,
      minRequestsForAlert: 10,
      windowMs: 60_000,
    })

    // Generate requests below minimum
    for (let i = 0; i < 5; i++) {
      alertTracker.recordRequest('GET', '/api/failing', 500)
    }

    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(sendAlert).not.toHaveBeenCalled()

    alertTracker.destroy()
  })

  it('should not duplicate alerts in same window', async () => {
    const { sendAlert } = await import('@/lib/monitoring/alerts')
    vi.mocked(sendAlert).mockClear()

    const alertTracker = new ErrorRateTracker({
      alertingEnabled: true,
      errorRateThreshold: 0.10,
      minRequestsForAlert: 5,
      windowMs: 60_000,
    })

    // First batch triggers alert
    for (let i = 0; i < 10; i++) {
      alertTracker.recordRequest('GET', '/api/failing', 500)
    }

    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(sendAlert).toHaveBeenCalledTimes(1)

    // Second batch should not trigger duplicate
    for (let i = 0; i < 10; i++) {
      alertTracker.recordRequest('GET', '/api/failing', 500)
    }

    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(sendAlert).toHaveBeenCalledTimes(1)

    alertTracker.destroy()
  })
})

describe('convenience functions', () => {
  beforeEach(() => {
    errorRateTracker.reset()
  })

  describe('recordApiError', () => {
    it('should record to global tracker', () => {
      recordApiError('GET', '/api/test', 200)
      recordApiError('GET', '/api/test', 500)

      const summary = getErrorRateSummary()
      expect(summary.totals.totalRequests).toBe(2)
      expect(summary.totals.totalErrors).toBe(1)
    })
  })

  describe('isEndpointHealthy', () => {
    it('should return true for healthy endpoint', () => {
      for (let i = 0; i < 10; i++) {
        recordApiError('GET', '/api/healthy', 200)
      }

      expect(isEndpointHealthy('GET', '/api/healthy')).toBe(true)
    })

    it('should return false for unhealthy endpoint', () => {
      for (let i = 0; i < 10; i++) {
        recordApiError('GET', '/api/unhealthy', 500)
      }

      expect(isEndpointHealthy('GET', '/api/unhealthy')).toBe(false)
    })

    it('should return true for unknown endpoint', () => {
      expect(isEndpointHealthy('GET', '/api/unknown')).toBe(true)
    })
  })
})
