/**
 * Request logging middleware
 * Logs incoming requests for monitoring and debugging
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export interface LoggingOptions {
  logLevel?: 'debug' | 'info' | 'warn' | 'error'
  includeHeaders?: boolean
  includeBody?: boolean
  excludePaths?: string[]
  maskSensitiveHeaders?: string[]
}

const SENSITIVE_HEADERS = ['authorization', 'cookie', 'x-api-key', 'x-auth-token']
const SENSITIVE_BODY_KEYS = ['password', 'token', 'secret', 'key']

export function withLogging(options: LoggingOptions = {}) {
  const {
    logLevel = 'info',
    includeHeaders = false,
    includeBody = false,
    excludePaths = ['/_next/', '/favicon.ico', '/public/'],
    maskSensitiveHeaders = SENSITIVE_HEADERS,
  } = options

  return async function middleware(request: NextRequest) {
    const { pathname, searchParams } = request.nextUrl
    const method = request.method
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'
    const timestamp = new Date().toISOString()

    // Skip logging for excluded paths
    if (excludePaths.some((path) => pathname.startsWith(path))) {
      return NextResponse.next()
    }

    // Prepare log data
    interface LogData {
      timestamp: string
      method: string
      path: string
      query: Record<string, string>
      ip: string
      userAgent: string
      requestId: string
      headers?: Record<string, string>
      body?: unknown
      [key: string]: unknown
    }

    const logData: LogData = {
      timestamp,
      method,
      path: pathname,
      query: Object.fromEntries(searchParams),
      ip,
      userAgent: userAgent.substring(0, 200), // Truncate long user agents
      requestId: request.headers.get('x-request-id') || 'unknown',
    }

    // Add headers if enabled
    if (includeHeaders) {
      const headers: Record<string, string> = {}
      request.headers.forEach((value, key) => {
        if (maskSensitiveHeaders.includes(key.toLowerCase())) {
          headers[key] = '[REDACTED]'
        } else {
          headers[key] = value
        }
      })
      logData.headers = headers
    }

    // Add body for POST/PUT/PATCH if enabled (be careful with large payloads)
    if (includeBody && ['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        const body = await request.clone().json()
        if (body && typeof body === 'object') {
          const sanitizedBody = { ...body }
          SENSITIVE_BODY_KEYS.forEach((key) => {
            if (sanitizedBody[key]) {
              sanitizedBody[key] = '[REDACTED]'
            }
          })
          logData.body = sanitizedBody
        }
      } catch (_error: unknown) {
        // Ignore body parsing errors
      }
    }

    // Log based on level
    switch (logLevel) {
      case 'debug':
        logger.debug('[Request] Debug', logData)
        break
      case 'info':
        logger.info('[Request]', {
          method: logData.method,
          path: logData.path,
          ip: logData.ip,
          timestamp: logData.timestamp,
        })
        break
      case 'warn':
        if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
          logger.warn('[Request] Write operation', logData)
        }
        break
      case 'error':
        // Only log errors
        break
    }

    // Add request ID to response for tracing
    const response = NextResponse.next()
    response.headers.set('x-request-id', logData.requestId)

    return response
  }
}

// Pre-configured logging middleware
export const requestLogger = withLogging({
  logLevel: 'info',
  includeHeaders: false,
  includeBody: false,
})

export const debugLogger = withLogging({
  logLevel: 'debug',
  includeHeaders: true,
  includeBody: true,
  excludePaths: ['/_next/', '/favicon.ico', '/public/', '/api/health'],
})
