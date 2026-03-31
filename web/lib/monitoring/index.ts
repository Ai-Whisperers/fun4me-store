/**
 * Comprehensive monitoring system
 * Logging, metrics, and observability for the application
 */

// Structured logging
export {
  logger,
  createRequestLogger,
  logApiRequest,
  logDatabaseOperation,
  type LogLevel,
  type LogContext,
  type LogEntry,
} from './logger'

// Metrics collection
export {
  metrics,
  businessMetrics,
  performanceMetrics,
  systemMetrics,
  MetricsCollector,
  type MetricValue,
  type Counter,
  type Gauge,
  type Histogram,
} from './metrics'

// AUDIT-002: Alerting system
export {
  sendAlert,
  sendCronFailureAlert,
  sendHighErrorRateAlert,
  sendSlowJobAlert,
  type AlertPayload,
  type AlertType,
  type AlertSeverity,
} from './alerts'

// OPS-004: Error rate tracking
export {
  errorRateTracker,
  recordApiError,
  getErrorRateSummary,
  isEndpointHealthy,
  ErrorRateTracker,
  type ErrorMetrics,
  type ErrorRateConfig,
  type ErrorRateSummary,
  type EndpointSummary,
} from './error-rate'

// OPS-003: Slow query detection
export {
  trackQuery,
  getSlowQueryStats,
  getTableQueryStats,
  getAllTableStats,
  resetSlowQueryTracking,
  configureSlowQueryDetection,
  withQueryTracking,
  type SlowQueryConfig,
  type TrackedQuery,
  type SlowQueryStats,
  type TableQueryStats,
} from './slow-query'
