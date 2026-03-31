/* eslint-disable no-console */
/**
 * Application logging utility
 * Only logs to console in development environment
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  data?: unknown
  timestamp: string
}

class Logger {
  private isDevelopment: boolean

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development'
  }

  private log(level: LogLevel, message: string, data?: unknown) {
    // Only log in development environment
    if (!this.isDevelopment) {
      return
    }

    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
    }

    switch (level) {
      case 'debug':
        console.debug(`[${entry.timestamp}] DEBUG: ${message}`, data)
        break
      case 'info':
        console.info(`[${entry.timestamp}] INFO: ${message}`, data)
        break
      case 'warn':
        console.warn(`[${entry.timestamp}] WARN: ${message}`, data)
        break
      case 'error':
        console.error(`[${entry.timestamp}] ERROR: ${message}`, data)
        break
    }
  }

  debug(message: string, data?: unknown) {
    this.log('debug', message, data)
  }

  info(message: string, data?: unknown) {
    this.log('info', message, data)
  }

  warn(message: string, data?: unknown) {
    this.log('warn', message, data)
  }

  error(message: string, data?: unknown) {
    this.log('error', message, data)
  }
}

export const logger = new Logger()

// For production error tracking (placeholder for future implementation)
export function trackError(error: Error, context?: Record<string, unknown>) {
  // In production, this could send to error tracking service like Sentry
  // For now, just log in development
  logger.error('Tracked error', { error: error.message, stack: error.stack, context })
}