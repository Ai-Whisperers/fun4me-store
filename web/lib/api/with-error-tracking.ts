/**
 * API Error Tracking Middleware
 *
 * OPS-004: Wraps API route handlers with automatic error rate tracking.
 *
 * Usage:
 * ```typescript
 * // app/api/example/route.ts
 * import { withErrorTracking } from '@/lib/api/with-error-tracking'
 *
 * export const GET = withErrorTracking(async (request) => {
 *   // ... handler logic
 *   return NextResponse.json({ data })
 * })
 * ```
 *
 * Or for existing routes with custom logic:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const response = await handleRequest(request)
 *   trackApiResponse(request, response)
 *   return response
 * }
 * ```
 */

import { NextRequest, NextResponse } from 'next/server'
import { recordApiError } from '@/lib/monitoring/error-rate'
import { logger } from '@/lib/logger'

// =============================================================================
// Types
// =============================================================================

export type NextApiHandler = (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => Promise<NextResponse> | NextResponse

// =============================================================================
// Middleware Wrapper
// =============================================================================

/**
 * Wrap an API handler with automatic error rate tracking
 *
 * @param handler - The API route handler function
 * @returns Wrapped handler that tracks errors
 *
 * @example
 * ```typescript
 * export const GET = withErrorTracking(async (request) => {
 *   const data = await fetchData()
 *   return NextResponse.json(data)
 * })
 * ```
 */
export function withErrorTracking(handler: NextApiHandler): NextApiHandler {
  return async (request: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    const startTime = Date.now()
    const method = request.method
    const url = new URL(request.url)
    const endpoint = url.pathname

    try {
      // Execute the handler
      const response = await handler(request, context)

      // Record the response
      const duration = Date.now() - startTime
      recordApiError(method, endpoint, response.status, duration)

      return response
    } catch (error: unknown) {
      // Record the error
      const duration = Date.now() - startTime
      recordApiError(method, endpoint, 500, duration)

      // Log the error
      logger.error('API handler threw exception', {
        operation: 'api_exception',
        metadata: {
          method,
          endpoint,
          duration,
          error: error instanceof Error ? error.message : String(error),
        },
      })

      // Re-throw to let Next.js handle it
      throw error
    }
  }
}

// =============================================================================
// Manual Tracking Function
// =============================================================================

/**
 * Manually track an API response for error rate monitoring
 *
 * Use this when you can't use the withErrorTracking wrapper
 * (e.g., in complex routes with existing middleware)
 *
 * @param request - The incoming request
 * @param response - The response to track
 * @param startTime - Optional start time for duration calculation
 *
 * @example
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const start = Date.now()
 *   const response = await handleRequest(request)
 *   trackApiResponse(request, response, start)
 *   return response
 * }
 * ```
 */
export function trackApiResponse(
  request: NextRequest,
  response: NextResponse,
  startTime?: number
): void {
  const method = request.method
  const url = new URL(request.url)
  const endpoint = url.pathname
  const duration = startTime ? Date.now() - startTime : undefined

  recordApiError(method, endpoint, response.status, duration)
}

/**
 * Track an API error manually
 *
 * Use this when handling errors outside the normal response flow
 *
 * @param request - The incoming request
 * @param statusCode - The error status code
 * @param startTime - Optional start time for duration calculation
 */
export function trackApiError(
  request: NextRequest,
  statusCode: number,
  startTime?: number
): void {
  const method = request.method
  const url = new URL(request.url)
  const endpoint = url.pathname
  const duration = startTime ? Date.now() - startTime : undefined

  recordApiError(method, endpoint, statusCode, duration)
}

// =============================================================================
// Combined Auth + Error Tracking Wrapper
// =============================================================================

/**
 * Combine withErrorTracking with existing auth wrappers
 *
 * This is a utility to chain multiple wrappers together
 *
 * @example
 * ```typescript
 * const handler = async (request) => NextResponse.json({ data })
 *
 * export const GET = withErrorTracking(withApiAuth(handler))
 * ```
 */
export function composeMiddleware(
  ...middlewares: Array<(handler: NextApiHandler) => NextApiHandler>
): (handler: NextApiHandler) => NextApiHandler {
  return (handler: NextApiHandler) => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler)
  }
}
