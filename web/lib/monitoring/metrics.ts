/**
 * Application metrics and monitoring
 * Tracks performance, errors, and business metrics
 */

import { logger } from './logger'

export interface MetricValue {
  name: string
  value: number
  tags?: Record<string, string>
  timestamp?: number
}

export interface Counter extends MetricValue {
  type: 'counter'
}

export interface Gauge extends MetricValue {
  type: 'gauge'
}

export interface Histogram extends MetricValue {
  type: 'histogram'
  buckets?: number[]
}

export class MetricsCollector {
  private metrics: MetricValue[] = []
  private counters = new Map<string, number>()
  private gauges = new Map<string, number>()
  private histograms = new Map<string, { values: number[]; buckets?: number[] }>()

  /**
   * Increment a counter
   */
  increment(name: string, value: number = 1, tags?: Record<string, string>): void {
    const key = this.getMetricKey(name, tags)
    const current = this.counters.get(key) || 0
    this.counters.set(key, current + value)

    logger.debug(`Metric incremented: ${name}`, {
      operation: 'metric_increment',
      metadata: { name, value, tags },
    })
  }

  /**
   * Set a gauge value
   */
  gauge(name: string, value: number, tags?: Record<string, string>): void {
    const key = this.getMetricKey(name, tags)
    this.gauges.set(key, value)

    logger.debug(`Gauge set: ${name} = ${value}`, {
      operation: 'metric_gauge',
      metadata: { name, value, tags },
    })
  }

  /**
   * Record a histogram value
   */
  histogram(name: string, value: number, tags?: Record<string, string>, buckets?: number[]): void {
    const key = this.getMetricKey(name, tags)
    const existing = this.histograms.get(key) || { values: [], buckets }

    existing.values.push(value)
    this.histograms.set(key, existing)

    logger.debug(`Histogram recorded: ${name}`, {
      operation: 'metric_histogram',
      metadata: { name, value, tags },
    })
  }

  /**
   * Time a function execution
   */
  async time<T>(name: string, fn: () => Promise<T>, tags?: Record<string, string>): Promise<T> {
    const start = Date.now()

    try {
      const result = await fn()
      const duration = Date.now() - start

      this.histogram(`${name}.duration`, duration, tags)
      logger.performance(name, duration, { metadata: tags })

      return result
    } catch (error: unknown) {
      const duration = Date.now() - start
      this.histogram(`${name}.error_duration`, duration, tags)
      throw error
    }
  }

  /**
   * Time a synchronous function execution
   */
  timeSync<T>(name: string, fn: () => T, tags?: Record<string, string>): T {
    const start = Date.now()

    try {
      const result = fn()
      const duration = Date.now() - start

      this.histogram(`${name}.duration`, duration, tags)
      logger.performance(name, duration, { metadata: tags })

      return result
    } catch (error: unknown) {
      const duration = Date.now() - start
      this.histogram(`${name}.error_duration`, duration, tags)
      throw error
    }
  }

  /**
   * Get current metrics snapshot
   */
  getMetrics(): {
    counters: Record<string, number>
    gauges: Record<string, number>
    histograms: Record<
      string,
      { count: number; sum: number; avg: number; min: number; max: number }
    >
  } {
    const counters: Record<string, number> = {}
    const gauges: Record<string, number> = {}
    const histograms: Record<
      string,
      { count: number; sum: number; avg: number; min: number; max: number }
    > = {}

    // Process counters
    for (const [key, value] of this.counters) {
      counters[key] = value
    }

    // Process gauges
    for (const [key, value] of this.gauges) {
      gauges[key] = value
    }

    // Process histograms
    for (const [key, data] of this.histograms) {
      const { values } = data
      if (values.length === 0) continue

      const sum = values.reduce((a, b) => a + b, 0)
      const min = Math.min(...values)
      const max = Math.max(...values)
      const avg = sum / values.length

      histograms[key] = {
        count: values.length,
        sum,
        avg,
        min,
        max,
      }
    }

    return { counters, gauges, histograms }
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.counters.clear()
    this.gauges.clear()
    this.histograms.clear()
    this.metrics = []
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheus(): string {
    const metrics = this.getMetrics()
    let output = ''

    // Counters
    for (const [name, value] of Object.entries(metrics.counters)) {
      output += `# HELP ${name} Counter metric\n`
      output += `# TYPE ${name} counter\n`
      output += `${name} ${value}\n\n`
    }

    // Gauges
    for (const [name, value] of Object.entries(metrics.gauges)) {
      output += `# HELP ${name} Gauge metric\n`
      output += `# TYPE ${name} gauge\n`
      output += `${name} ${value}\n\n`
    }

    // Histograms (simplified)
    for (const [name, data] of Object.entries(metrics.histograms)) {
      output += `# HELP ${name} Histogram metric\n`
      output += `# TYPE ${name} histogram\n`
      output += `${name}_count ${data.count}\n`
      output += `${name}_sum ${data.sum}\n`
      output += `${name}_avg ${data.avg}\n\n`
    }

    return output
  }

  private getMetricKey(name: string, tags?: Record<string, string>): string {
    if (!tags || Object.keys(tags).length === 0) {
      return name
    }

    const tagString = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}="${value}"`)
      .join(',')

    return `${name}{${tagString}}`
  }
}

// Global metrics collector
export const metrics = new MetricsCollector()

// Business metrics helpers
export const businessMetrics = {
  userRegistered: (tenantId: string) => {
    metrics.increment('business.user_registered', 1, { tenant_id: tenantId })
  },

  appointmentBooked: (tenantId: string) => {
    metrics.increment('business.appointment_booked', 1, { tenant_id: tenantId })
  },

  paymentProcessed: (amount: number, currency: string, tenantId: string) => {
    metrics.increment('business.payment_processed', 1, { tenant_id: tenantId, currency })
    metrics.histogram('business.payment_amount', amount, { tenant_id: tenantId, currency })
  },

  errorOccurred: (type: string, tenantId?: string) => {
    metrics.increment('business.error_occurred', 1, {
      error_type: type,
      ...(tenantId && { tenant_id: tenantId }),
    })
  },
}

// Performance metrics helpers
export const performanceMetrics = {
  apiRequest: (method: string, path: string, statusCode: number, duration: number) => {
    metrics.histogram('performance.api_request_duration', duration, {
      method,
      path,
      status_code: statusCode.toString(),
    })
  },

  databaseQuery: (operation: string, table: string, duration: number, success: boolean) => {
    metrics.histogram('performance.database_query_duration', duration, {
      operation,
      table,
      success: success.toString(),
    })
  },

  pageLoad: (path: string, duration: number) => {
    metrics.histogram('performance.page_load_duration', duration, { path })
  },
}

// System metrics helpers
export const systemMetrics = {
  memoryUsage: (used: number, total: number) => {
    metrics.gauge('system.memory_used', used)
    metrics.gauge('system.memory_total', total)
  },

  activeConnections: (count: number) => {
    metrics.gauge('system.active_connections', count)
  },

  queueLength: (queueName: string, length: number) => {
    metrics.gauge(`system.queue_length`, length, { queue: queueName })
  },
}
