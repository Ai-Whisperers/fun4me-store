/**
 * Centralized Logger for Vete
 *
 * Features:
 * - Structured JSON logging in production
 * - Pretty console output in development
 * - Request context (request ID, tenant, user, role)
 * - Sentry integration for error tracking
 * - Audit logging for security compliance
 * - Performance tracking with checkpoints
 * - Debug mode via LOG_LEVEL env var
 * - Automatic error serialization
 *
 * Usage:
 *   import { logger, createRequestLogger, auditLogger } from '@/lib/logger'
 *
 *   // Simple logging
 *   logger.info('Server started', { port: 3000 })
 *   logger.error('Failed to fetch', { error })
 *
 *   // Request-scoped logging (in API routes)
 *   const log = createRequestLogger(request, { tenant: 'terrapet' })
 *   log.info('Processing request')
 *   log.debug('Query params', { params })
 *
 *   // Audit logging for security
 *   auditLogger.auth('login', { userId, tenant, success: true })
 *   auditLogger.access('pet', petId, 'write', { userId, tenant })
 *
 * Environment:
 *   LOG_LEVEL=debug|info|warn|error (default: info in prod, debug in dev)
 *   LOG_FORMAT=json|pretty (default: json in prod, pretty in dev)
 *   SLOW_REQUEST_THRESHOLD_MS=1000 (default: 1000ms)
 */

// Import Sentry conditionally to avoid errors if not configured
let Sentry: typeof import('@sentry/nextjs') | null = null
try {
  // Dynamic import at module level - will be available after first await
  import('@sentry/nextjs').then((m) => {
    Sentry = m
  }).catch(() => {
    // Sentry not configured - that's ok
  })
} catch (_error: unknown) {
  // Sentry not available
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type UserRole = 'owner' | 'vet' | 'admin'

export interface LogContext {
  // Request tracking
  requestId?: string
  method?: string
  path?: string
  duration?: number
  statusCode?: number

  // Multi-tenant context
  tenant?: string
  userId?: string
  userRole?: UserRole

  // Resource tracking
  action?: string // e.g., 'pet.create', 'appointment.book'
  resourceType?: string // e.g., 'pet', 'appointment', 'invoice'
  resourceId?: string // ID of the affected resource

  // Security context
  ip?: string
  userAgent?: string

  // Extensible
  [key: string]: unknown
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
  error?: {
    name: string
    message: string
    stack?: string
  }
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m', // Green
  warn: '\x1b[33m', // Yellow
  error: '\x1b[31m', // Red
}

const RESET = '\x1b[0m'
const DIM = '\x1b[2m'
const BOLD = '\x1b[1m'

function getLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel
  if (envLevel && LOG_LEVELS[envLevel] !== undefined) {
    return envLevel
  }
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug'
}

function isJsonFormat(): boolean {
  if (process.env.LOG_FORMAT === 'json') return true
  if (process.env.LOG_FORMAT === 'pretty') return false
  return process.env.NODE_ENV === 'production'
}

function serializeError(error: unknown): LogEntry['error'] | undefined {
  if (!error) return undefined

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }
  }

  if (typeof error === 'string') {
    return { name: 'Error', message: error }
  }

  return { name: 'Error', message: String(error) }
}

function formatPretty(entry: LogEntry): string {
  const { timestamp, level, message, context, error } = entry
  const color = LEVEL_COLORS[level]
  const time = new Date(timestamp).toLocaleTimeString()

  let output = `${DIM}${time}${RESET} ${color}${BOLD}${level.toUpperCase().padEnd(5)}${RESET} ${message}`

  // Add context inline if present
  if (context) {
    const { requestId, tenant, userId, userRole, method, path, duration, action, statusCode, ...rest } =
      context
    const parts: string[] = []

    if (requestId) parts.push(`req=${requestId.slice(0, 8)}`)
    if (tenant) parts.push(`tenant=${tenant}`)
    if (userId) parts.push(`user=${userId.slice(0, 8)}`)
    if (userRole) parts.push(`role=${userRole}`)
    if (method && path) parts.push(`${method} ${path}`)
    if (statusCode) parts.push(`status=${statusCode}`)
    if (duration !== undefined) parts.push(`${duration}ms`)
    if (action) parts.push(`action=${action}`)

    if (parts.length > 0) {
      output += ` ${DIM}[${parts.join(' | ')}]${RESET}`
    }

    // Additional context as JSON
    if (Object.keys(rest).length > 0) {
      output += `\n  ${DIM}${JSON.stringify(rest)}${RESET}`
    }
  }

  // Error details
  if (error) {
    output += `\n  ${color}${error.name}: ${error.message}${RESET}`
    if (error.stack) {
      const stackLines = error.stack.split('\n').slice(1, 4)
      output += `\n${DIM}${stackLines.join('\n')}${RESET}`
    }
  }

  return output
}

function formatJson(entry: LogEntry): string {
  return JSON.stringify(entry)
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[getLogLevel()]
}

/**
 * Send error to Sentry with context
 */
function sendToSentry(
  message: string,
  context?: LogContext,
  error?: LogEntry['error']
): void {
  if (!Sentry || process.env.NODE_ENV === 'development') return

  try {
    Sentry.withScope((scope) => {
      // Set tags for filtering in Sentry
      if (context?.tenant) scope.setTag('tenant', context.tenant)
      if (context?.path) scope.setTag('path', context.path)
      if (context?.action) scope.setTag('action', context.action)
      if (context?.statusCode) scope.setTag('statusCode', String(context.statusCode))

      // Set user context
      if (context?.userId) {
        scope.setUser({
          id: context.userId,
        })
        if (context.userRole) {
          scope.setTag('userRole', context.userRole)
        }
      }

      // Set extra data
      if (context) {
        scope.setExtras(context as Record<string, unknown>)
      }

      // Capture the error or message
      if (error?.message) {
        const err = new Error(error.message)
        err.name = error.name
        if (error.stack) err.stack = error.stack
        Sentry?.captureException(err)
      } else {
        Sentry?.captureMessage(message, 'error')
      }
    })
  } catch (_error: unknown) {
    // Sentry send failed - don't let it break the app
  }
}

/**
 * Send logs to external monitoring services (DataDog, LogRocket, etc.)
 */
function sendToExternalServices(entry: LogEntry): void {
  // Skip external services in development
  if (process.env.NODE_ENV === 'development') return

  try {
    // Send to DataDog if configured
    if (process.env.DATADOG_API_KEY && process.env.DATADOG_SITE) {
      sendToDataDog(entry)
    }

    // Send to LogRocket if configured
    if (process.env.LOGROCKET_APP_ID) {
      sendToLogRocket(entry)
    }

    // Send to custom monitoring API if configured
    if (process.env.MONITORING_API_URL && process.env.MONITORING_API_KEY) {
      sendToCustomAPI(entry)
    }

    // Send performance metrics to specialized services
    if (entry.level === 'info' && entry.context?.duration) {
      sendPerformanceMetrics(entry)
    }
  } catch (_error: unknown) {
    // External service failures shouldn't break logging
  }
}

/**
 * Send logs to DataDog
 */
function sendToDataDog(entry: LogEntry): void {
  if (!process.env.DATADOG_API_KEY || !process.env.DATADOG_SITE) return

  const ddData: Record<string, unknown> = {
    timestamp: new Date(entry.timestamp).getTime(),
    level: entry.level,
    message: entry.message,
    service: 'vete-web',
    hostname: process.env.HOSTNAME || 'vete-server',
    ddtags: [
      `env:${process.env.NODE_ENV || 'production'}`,
      `version:${process.env.APP_VERSION || 'unknown'}`,
      ...(entry.context?.tenant ? [`tenant:${entry.context.tenant}`] : []),
      ...(entry.context?.userRole ? [`role:${entry.context.userRole}`] : []),
      ...(entry.context?.action ? [`action:${entry.context.action}`] : []),
    ].join(','),
    ...entry.context,
  }

  if (entry.error) {
    ddData.error = entry.error
  }

  // Send to DataDog Logs API
  fetch(`https://http-intake.logs.${process.env.DATADOG_SITE}/v1/input/${process.env.DATADOG_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'DD-API-KEY': process.env.DATADOG_API_KEY,
    },
    body: JSON.stringify(ddData),
  }).catch(() => {
    // Ignore DataDog send errors
  })
}

/**
 * Send session recordings and performance data to LogRocket
 */
function sendToLogRocket(entry: LogEntry): void {
  if (!process.env.LOGROCKET_APP_ID) return

  // LogRocket is typically client-side, but we can send server events
  // via their REST API for correlation with client sessions
  const lrData: Record<string, unknown> = {
    timestamp: entry.timestamp,
    level: entry.level,
    message: entry.message,
    tags: {
      server: true,
      tenant: entry.context?.tenant,
      action: entry.context?.action,
      path: entry.context?.path,
    },
    sessionId: entry.context?.requestId, // Use request ID as session correlation
    metadata: entry.context,
  }

  if (entry.error) {
    lrData.error = {
      name: entry.error.name,
      message: entry.error.message,
      stack: entry.error.stack,
    }
  }

  // Send to LogRocket Events API (requires LogRocket backend plan)
  fetch(`https://api.logrocket.com/v1/orgs/${process.env.LOGROCKET_ORG_ID}/apps/${process.env.LOGROCKET_APP_ID}/events`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.LOGROCKET_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(lrData),
  }).catch(() => {
    // Ignore LogRocket send errors
  })
}

/**
 * Send logs to custom monitoring API
 */
function sendToCustomAPI(entry: LogEntry): void {
  if (!process.env.MONITORING_API_URL || !process.env.MONITORING_API_KEY) return

  fetch(process.env.MONITORING_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.MONITORING_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...entry,
      service: 'vete',
      environment: process.env.NODE_ENV,
      version: process.env.APP_VERSION,
    }),
  }).catch(() => {
    // Ignore custom API send errors
  })
}

/**
 * Send performance metrics to specialized monitoring services
 */
function sendPerformanceMetrics(entry: LogEntry): void {
  if (!entry.context?.duration || !entry.context?.path) return

  const metrics = {
    timestamp: entry.timestamp,
    metric: 'request.duration',
    value: entry.context.duration,
    tags: {
      method: entry.context.method,
      path: entry.context.path,
      status: entry.context.statusCode,
      tenant: entry.context.tenant,
    },
    environment: process.env.NODE_ENV,
    service: 'vete-web',
  }

  // Send to DataDog Metrics API
  if (process.env.DATADOG_API_KEY && process.env.DATADOG_SITE) {
    fetch(`https://api.${process.env.DATADOG_SITE}/api/v2/series`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'DD-API-KEY': process.env.DATADOG_API_KEY,
        'DD-APPLICATION-KEY': process.env.DATADOG_APP_KEY || '',
      },
      body: JSON.stringify({
        series: [{
          metric: 'vete.request.duration',
          type: 'gauge',
          points: [{
            timestamp: Math.floor(new Date(entry.timestamp).getTime() / 1000),
            value: entry.context.duration,
          }],
          tags: Object.entries(metrics.tags).map(([k, v]) => `${k}:${v}`).filter(t => !t.endsWith(':undefined')),
        }],
      }),
    }).catch(() => {
      // Ignore DataDog metrics send errors
    })
  }

  // Send custom metrics API
  if (process.env.METRICS_API_URL && process.env.METRICS_API_KEY) {
    fetch(process.env.METRICS_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.METRICS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metrics),
    }).catch(() => {
      // Ignore custom metrics API send errors
    })
  }
}

function log(
  level: LogLevel,
  message: string,
  contextOrError?: LogContext | Error | unknown
): void {
  if (!shouldLog(level)) return

  let context: LogContext | undefined
  let error: LogEntry['error'] | undefined

  if (contextOrError instanceof Error) {
    error = serializeError(contextOrError)
  } else if (contextOrError && typeof contextOrError === 'object') {
    const { error: ctxError, ...rest } = contextOrError as LogContext & { error?: unknown }
    context = Object.keys(rest).length > 0 ? rest : undefined
    error = serializeError(ctxError)
  }

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
    error,
  }

  const output = isJsonFormat() ? formatJson(entry) : formatPretty(entry)

  switch (level) {
    case 'error':
      console.error(output)
      // Send errors to Sentry
      sendToSentry(message, context, error)
      break
    case 'warn':
      console.warn(output)
      break
    default:
      // eslint-disable-next-line no-console
      console.log(output)
  }

  // Send all logs to external monitoring services
  sendToExternalServices(entry)
}

/**
 * Global logger instance
 */
export const logger = {
  debug: (message: string, context?: LogContext) => log('debug', message, context),
  info: (message: string, context?: LogContext) => log('info', message, context),
  warn: (message: string, context?: LogContext) => log('warn', message, context),
  error: (message: string, contextOrError?: LogContext | Error) =>
    log('error', message, contextOrError),
}

/**
 * Create a request-scoped logger with automatic context
 */
export function createRequestLogger(
  request: Request,
  additionalContext?: Partial<LogContext>
): typeof logger & { requestId: string } {
  const url = new URL(request.url)
  const requestId = crypto.randomUUID()

  // Extract client info
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    undefined
  const userAgent = request.headers.get('user-agent')?.slice(0, 200) || undefined

  const baseContext: LogContext = {
    requestId,
    method: request.method,
    path: url.pathname,
    ip,
    userAgent,
    ...additionalContext,
  }

  const scopedLogger = {
    debug: (message: string, context?: LogContext) =>
      log('debug', message, { ...baseContext, ...context }),
    info: (message: string, context?: LogContext) =>
      log('info', message, { ...baseContext, ...context }),
    warn: (message: string, context?: LogContext) =>
      log('warn', message, { ...baseContext, ...context }),
    error: (message: string, contextOrError?: LogContext | Error) => {
      if (contextOrError instanceof Error) {
        log('error', message, { ...baseContext, error: contextOrError })
      } else {
        log('error', message, { ...baseContext, ...contextOrError })
      }
    },
    requestId,
  }

  return scopedLogger
}

// ============================================================================
// AUDIT LOGGING
// For security compliance and sensitive operation tracking
// ============================================================================

export type AuthEvent =
  | 'login'
  | 'logout'
  | 'signup'
  | 'password_change'
  | 'password_reset'
  | 'role_change'
  | 'session_refresh'
  | 'mfa_enabled'
  | 'mfa_disabled'

export type AccessAction = 'read' | 'write' | 'delete' | 'export'

export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical'

/**
 * Audit logger for security-sensitive operations
 *
 * Use for:
 * - Authentication events (login, logout, password changes)
 * - Data access tracking (HIPAA/GDPR compliance)
 * - Security events (failed auth, role violations)
 */
export const auditLogger = {
  /**
   * Log authentication events
   */
  auth(
    event: AuthEvent,
    context: {
      userId?: string
      email?: string
      tenant?: string
      ip?: string
      userAgent?: string
      success: boolean
      reason?: string
    }
  ): void {
    const level = context.success ? 'info' : 'warn'
    log(level, `AUTH: ${event}`, {
      action: `auth.${event}`,
      ...context,
    })
  },

  /**
   * Log data access for compliance
   */
  access(
    resourceType: string,
    resourceId: string,
    action: AccessAction,
    context: LogContext
  ): void {
    log('info', `ACCESS: ${action} ${resourceType}`, {
      action: `${resourceType}.${action}`,
      resourceType,
      resourceId,
      ...context,
    })
  },

  /**
   * Log security events
   */
  security(
    event: string,
    context: LogContext & { severity: SecuritySeverity; details?: string }
  ): void {
    const level: LogLevel =
      context.severity === 'critical' || context.severity === 'high' ? 'error' : 'warn'
    log(level, `SECURITY: ${event}`, {
      action: `security.${event}`,
      ...context,
    })

    // Critical security events always go to Sentry
    if (context.severity === 'critical' && Sentry) {
      Sentry.captureMessage(`SECURITY: ${event}`, 'error')
    }
  },
}

// ============================================================================
// PERFORMANCE TRACKING
// For request timing and slow operation detection
// ============================================================================

export interface PerformanceCheckpoint {
  name: string
  time: number
}

/**
 * Create a performance tracker for request timing
 *
 * Usage:
 *   const perf = createPerformanceTracker(requestId)
 *   perf.checkpoint('auth_complete')
 *   perf.checkpoint('db_query_complete')
 *   const duration = perf.finish({ path: '/api/pets' })
 */
export function createPerformanceTracker(requestId: string): {
  checkpoint: (name: string) => void
  finish: (context?: LogContext) => number
  checkpoints: PerformanceCheckpoint[]
} {
  const startTime = performance.now()
  const checkpoints: PerformanceCheckpoint[] = []
  const slowThreshold = parseInt(process.env.SLOW_REQUEST_THRESHOLD_MS || '1000', 10)

  return {
    checkpoint(name: string): void {
      checkpoints.push({
        name,
        time: Math.round(performance.now() - startTime),
      })
    },

    finish(context: LogContext = {}): number {
      const totalDuration = Math.round(performance.now() - startTime)

      const logContext: LogContext = {
        requestId,
        duration: totalDuration,
        ...context,
      }

      // Include checkpoints if there were multiple
      if (checkpoints.length > 1) {
        logContext.checkpoints = checkpoints
      }

      if (totalDuration > slowThreshold) {
        logger.warn('Slow request detected', logContext)
      } else {
        logger.debug('Request completed', logContext)
      }

      return totalDuration
    },

    checkpoints,
  }
}

/**
 * Measure and log execution time
 */
export function withTiming<T>(
  operation: string,
  fn: () => Promise<T>,
  log: typeof logger = logger
): Promise<T> {
  const start = performance.now()
  return fn().finally(() => {
    const duration = Math.round(performance.now() - start)
    log.debug(`${operation} completed`, { duration })
  })
}

/**
 * Log database query (for debugging slow queries)
 */
export function logQuery(
  table: string,
  operation: string,
  duration: number,
  rowCount?: number
): void {
  const level: LogLevel = duration > 1000 ? 'warn' : duration > 200 ? 'info' : 'debug'
  logger[level](`DB ${operation} ${table}`, {
    duration,
    rows: rowCount,
    slow: duration > 1000,
  })
}
