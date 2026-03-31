/**
 * Cron Job Authentication Utilities
 *
 * SEC-006: Provides timing-safe secret comparison and proper logging
 * to prevent timing attacks on cron job endpoints.
 */

import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { logger } from '@/lib/logger'

/**
 * Timing-safe comparison of cron secret
 *
 * Uses crypto.timingSafeEqual to prevent timing attacks where an attacker
 * could measure response times to guess the secret character by character.
 */
export function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET

  // Fail closed if CRON_SECRET not configured
  if (!cronSecret) {
    logger.error('CRON_SECRET not configured - blocking request')
    return false
  }

  // Check for x-cron-secret header first (Vercel Cron style)
  const cronHeader = request.headers.get('x-cron-secret')
  if (cronHeader) {
    return timingSafeCompare(cronSecret, cronHeader)
  }

  // Fallback to Authorization: Bearer <secret> style
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7) // Remove "Bearer " prefix
    return timingSafeCompare(cronSecret, token)
  }

  return false
}

/**
 * Timing-safe string comparison
 *
 * Compares two strings in constant time to prevent timing attacks.
 * Returns false if lengths differ (but still takes constant time).
 */
function timingSafeCompare(expected: string, provided: string): boolean {
  // Convert to buffers for comparison
  const expectedBuffer = Buffer.from(expected, 'utf-8')
  const providedBuffer = Buffer.from(provided, 'utf-8')

  // If lengths differ, create a dummy comparison of same length
  // This ensures constant-time even when lengths mismatch
  if (expectedBuffer.length !== providedBuffer.length) {
    // Compare expected with itself to maintain timing consistency
    timingSafeEqual(expectedBuffer, expectedBuffer)
    return false
  }

  return timingSafeEqual(expectedBuffer, providedBuffer)
}

/**
 * Log unauthorized cron attempt with security context
 */
function logUnauthorizedAttempt(request: NextRequest, reason: string): void {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
             request.headers.get('x-real-ip') ||
             'unknown'

  logger.error('Unauthorized cron attempt', {
    ip,
    endpoint: request.nextUrl.pathname,
    reason,
    userAgent: request.headers.get('user-agent') ?? undefined,
    timestamp: new Date().toISOString(),
  })
}

type CronHandler = (request: NextRequest) => Promise<NextResponse>

/**
 * Higher-order function wrapper for cron job authentication
 *
 * Usage:
 * ```typescript
 * export const POST = withCronAuth(async (request) => {
 *   // Your cron job logic here
 *   return NextResponse.json({ success: true })
 * })
 * ```
 */
export function withCronAuth(handler: CronHandler): CronHandler {
  return async (request: NextRequest): Promise<NextResponse> => {
    const cronSecret = process.env.CRON_SECRET

    // Fail closed if not configured
    if (!cronSecret) {
      logger.error('CRON_SECRET not configured for endpoint', {
        endpoint: request.nextUrl.pathname,
      })
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Verify the secret using timing-safe comparison
    if (!verifyCronSecret(request)) {
      logUnauthorizedAttempt(request, 'Invalid or missing secret')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Secret valid - run the handler
    return handler(request)
  }
}

/**
 * Standalone verification function for routes that need custom handling
 *
 * Returns an object with verification result and error response if failed.
 */
export function checkCronAuth(request: NextRequest): {
  authorized: boolean
  errorResponse?: NextResponse
} {
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    logger.error('CRON_SECRET not configured')
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      ),
    }
  }

  if (!verifyCronSecret(request)) {
    logUnauthorizedAttempt(request, 'Invalid or missing secret')
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      ),
    }
  }

  return { authorized: true }
}
