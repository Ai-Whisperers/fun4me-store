/**
 * Error Rate Tracking Service
 *
 * OPS-004: Tracks error rates per endpoint with time-windowed aggregation
 * and threshold-based alerting.
 *
 * Uses a sliding window approach to track error rates over configurable periods.
 * Supports automatic alerting when error rates exceed thresholds.
 */

import { logger } from '@/lib/logger'
import { sendAlert, type AlertSeverity } from './alerts'

// =============================================================================
// Types
// =============================================================================

export interface ErrorMetrics {
  /** Endpoint path (normalized) */
  endpoint: string
  /** HTTP method (GET, POST, etc.) */
  method: string
  /** Total requests in the window */
  totalRequests: number
  /** Error count (4xx and 5xx responses) */
  errorCount: number
  /** Calculated error rate (0-1) */
  errorRate: number
  /** Window start timestamp */
  windowStart: number
  /** Last updated timestamp */
  lastUpdated: number
  /** Recent error status codes */
  recentErrors: number[]
  /** Whether alert was sent for current window */
  alertSent: boolean
}

export interface ErrorRateConfig {
  /** Error rate threshold for alerting (default: 0.10 = 10%) */
  errorRateThreshold: number
  /** Minimum requests before alerting (default: 10) */
  minRequestsForAlert: number
  /** Time window in milliseconds (default: 5 minutes) */
  windowMs: number
  /** Enable alerting (default: true) */
  alertingEnabled: boolean
}

export interface ErrorRateSummary {
  timestamp: string
  endpoints: EndpointSummary[]
  totals: {
    totalEndpoints: number
    healthyEndpoints: number
    warningEndpoints: number
    criticalEndpoints: number
    totalRequests: number
    totalErrors: number
    overallErrorRate: number
  }
}

export interface EndpointSummary {
  endpoint: string
  method: string
  totalRequests: number
  errorCount: number
  errorRate: number
  status: 'healthy' | 'warning' | 'critical'
  lastError?: string
}

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_CONFIG: ErrorRateConfig = {
  errorRateThreshold: 0.10, // 10%
  minRequestsForAlert: 10,
  windowMs: 5 * 60 * 1000, // 5 minutes
  alertingEnabled: true,
}

// Warning threshold is half of error threshold
const WARNING_THRESHOLD_MULTIPLIER = 0.5

// =============================================================================
// Error Rate Tracker Class
// =============================================================================

export class ErrorRateTracker {
  private metrics: Map<string, ErrorMetrics> = new Map()
  private config: ErrorRateConfig
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(config: Partial<ErrorRateConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.startCleanup()
  }

  /**
   * Generate a unique key for an endpoint
   */
  private getKey(method: string, endpoint: string): string {
    return `${method.toUpperCase()}:${this.normalizeEndpoint(endpoint)}`
  }

  /**
   * Normalize endpoint path (remove query params, IDs)
   */
  private normalizeEndpoint(endpoint: string): string {
    // Remove query parameters
    let normalized = endpoint.split('?')[0]

    // Normalize common dynamic segments
    // UUIDs
    normalized = normalized.replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      ':id'
    )
    // Numeric IDs
    normalized = normalized.replace(/\/\d+($|\/)/g, '/:id$1')
    // Short alphanumeric IDs (8+ chars)
    normalized = normalized.replace(/\/[a-zA-Z0-9]{8,}(?=\/|$)/g, '/:id')

    return normalized
  }

  /**
   * Record a request result
   */
  recordRequest(
    method: string,
    endpoint: string,
    statusCode: number,
    durationMs?: number
  ): void {
    const key = this.getKey(method, endpoint)
    const now = Date.now()
    const isError = statusCode >= 400

    // Get or create metrics
    let metrics = this.metrics.get(key)

    if (!metrics || now - metrics.windowStart > this.config.windowMs) {
      // Start new window
      metrics = {
        endpoint: this.normalizeEndpoint(endpoint),
        method: method.toUpperCase(),
        totalRequests: 0,
        errorCount: 0,
        errorRate: 0,
        windowStart: now,
        lastUpdated: now,
        recentErrors: [],
        alertSent: false,
      }
    }

    // Update metrics
    metrics.totalRequests++
    if (isError) {
      metrics.errorCount++
      metrics.recentErrors.push(statusCode)
      // Keep only last 10 errors
      if (metrics.recentErrors.length > 10) {
        metrics.recentErrors.shift()
      }
    }
    metrics.errorRate = metrics.errorCount / metrics.totalRequests
    metrics.lastUpdated = now

    this.metrics.set(key, metrics)

    // Log for debugging
    logger.debug('Request recorded for error rate tracking', {
      operation: 'error_rate_record',
      metadata: {
        method,
        endpoint: metrics.endpoint,
        statusCode,
        durationMs,
        errorRate: `${(metrics.errorRate * 100).toFixed(1)}%`,
        totalRequests: metrics.totalRequests,
      },
    })

    // Check threshold and alert
    this.checkThresholdAndAlert(metrics)
  }

  /**
   * Check if error rate exceeds threshold and send alert
   */
  private async checkThresholdAndAlert(metrics: ErrorMetrics): Promise<void> {
    if (!this.config.alertingEnabled) return
    if (metrics.alertSent) return
    if (metrics.totalRequests < this.config.minRequestsForAlert) return
    if (metrics.errorRate <= this.config.errorRateThreshold) return

    // Mark alert as sent to avoid duplicates in same window
    metrics.alertSent = true

    // Determine severity
    const severity: AlertSeverity =
      metrics.errorRate > this.config.errorRateThreshold * 2 ? 'critical' : 'error'

    // Send alert
    await sendAlert({
      type: 'high_error_rate',
      job: `API ${metrics.method} ${metrics.endpoint}`,
      message: `Tasa de error alta: ${(metrics.errorRate * 100).toFixed(1)}% (${metrics.errorCount}/${metrics.totalRequests} requests)`,
      details: {
        endpoint: metrics.endpoint,
        method: metrics.method,
        error_rate: `${(metrics.errorRate * 100).toFixed(1)}%`,
        error_count: metrics.errorCount,
        total_requests: metrics.totalRequests,
        recent_status_codes: metrics.recentErrors.join(', '),
        window_minutes: Math.round(this.config.windowMs / 60000),
        threshold: `${(this.config.errorRateThreshold * 100).toFixed(0)}%`,
      },
      severity,
    })

    logger.warn('High error rate alert sent', {
      operation: 'error_rate_alert',
      metadata: {
        endpoint: metrics.endpoint,
        method: metrics.method,
        errorRate: metrics.errorRate,
        severity,
      },
    })
  }

  /**
   * Get current error metrics for all endpoints
   */
  getMetrics(): ErrorMetrics[] {
    const now = Date.now()
    const activeMetrics: ErrorMetrics[] = []

    for (const [key, metrics] of this.metrics) {
      // Only include metrics from current window
      if (now - metrics.windowStart <= this.config.windowMs) {
        activeMetrics.push({ ...metrics })
      }
    }

    // Sort by error rate descending
    return activeMetrics.sort((a, b) => b.errorRate - a.errorRate)
  }

  /**
   * Get summary suitable for dashboard display
   */
  getSummary(): ErrorRateSummary {
    const metrics = this.getMetrics()

    const endpoints: EndpointSummary[] = metrics.map((m) => {
      let status: 'healthy' | 'warning' | 'critical' = 'healthy'
      if (m.errorRate > this.config.errorRateThreshold) {
        status = 'critical'
      } else if (m.errorRate > this.config.errorRateThreshold * WARNING_THRESHOLD_MULTIPLIER) {
        status = 'warning'
      }

      return {
        endpoint: m.endpoint,
        method: m.method,
        totalRequests: m.totalRequests,
        errorCount: m.errorCount,
        errorRate: m.errorRate,
        status,
        lastError: m.recentErrors.length > 0
          ? m.recentErrors[m.recentErrors.length - 1].toString()
          : undefined,
      }
    })

    const totalRequests = endpoints.reduce((sum, e) => sum + e.totalRequests, 0)
    const totalErrors = endpoints.reduce((sum, e) => sum + e.errorCount, 0)

    return {
      timestamp: new Date().toISOString(),
      endpoints,
      totals: {
        totalEndpoints: endpoints.length,
        healthyEndpoints: endpoints.filter((e) => e.status === 'healthy').length,
        warningEndpoints: endpoints.filter((e) => e.status === 'warning').length,
        criticalEndpoints: endpoints.filter((e) => e.status === 'critical').length,
        totalRequests,
        totalErrors,
        overallErrorRate: totalRequests > 0 ? totalErrors / totalRequests : 0,
      },
    }
  }

  /**
   * Get metrics for a specific endpoint
   */
  getEndpointMetrics(method: string, endpoint: string): ErrorMetrics | undefined {
    const key = this.getKey(method, endpoint)
    const metrics = this.metrics.get(key)

    if (!metrics) return undefined

    const now = Date.now()
    if (now - metrics.windowStart > this.config.windowMs) {
      // Window expired
      return undefined
    }

    return { ...metrics }
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear()
    logger.info('Error rate metrics reset')
  }

  /**
   * Clean up old metrics periodically
   */
  private startCleanup(): void {
    // Clean every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60_000)

    // Don't block Node from exiting
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref()
    }
  }

  /**
   * Clean up expired windows
   */
  private cleanup(): void {
    const now = Date.now()
    let cleaned = 0

    for (const [key, metrics] of this.metrics) {
      if (now - metrics.windowStart > this.config.windowMs * 2) {
        // Keep windows for 2x the window size, then delete
        this.metrics.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      logger.debug('Error rate metrics cleanup', {
        operation: 'error_rate_cleanup',
        metadata: { cleaned, remaining: this.metrics.size },
      })
    }
  }

  /**
   * Stop cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): ErrorRateConfig {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ErrorRateConfig>): void {
    this.config = { ...this.config, ...config }
  }
}

// =============================================================================
// Global Instance
// =============================================================================

/**
 * Global error rate tracker instance
 * Use this for application-wide error rate monitoring
 */
export const errorRateTracker = new ErrorRateTracker()

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Record a request to the global error rate tracker
 */
export function recordApiError(
  method: string,
  endpoint: string,
  statusCode: number,
  durationMs?: number
): void {
  errorRateTracker.recordRequest(method, endpoint, statusCode, durationMs)
}

/**
 * Get error rate summary for dashboard
 */
export function getErrorRateSummary(): ErrorRateSummary {
  return errorRateTracker.getSummary()
}

/**
 * Check if an endpoint is healthy
 */
export function isEndpointHealthy(method: string, endpoint: string): boolean {
  const metrics = errorRateTracker.getEndpointMetrics(method, endpoint)
  if (!metrics) return true // No data = assume healthy

  return metrics.errorRate <= DEFAULT_CONFIG.errorRateThreshold
}
