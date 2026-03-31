import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/utils/logger'

/**
 * Middleware to measure and log API response times
 * Adds X-Response-Time header and logs slow requests
 */
export function withResponseTime(handler: (req: NextRequest) => Promise<NextResponse> | NextResponse) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const start = Date.now()
    const url = req.url
    const method = req.method

    try {
      // Call the actual handler
      const response = await handler(req)
      
      const duration = Date.now() - start
      
      // Add response time header
      response.headers.set('X-Response-Time', `${duration}ms`)
      
      // Log slow requests (> 1 second)
      if (duration > 1000) {
        logger.warn('Slow API response', {
          method,
          url,
          duration,
          status: response.status,
        })
      }
      
      // Log all requests in development for debugging
      if (process.env.NODE_ENV === 'development') {
        logger.debug('API request completed', {
          method,
          url,
          duration,
          status: response.status,
        })
      }
      
      return response
    } catch (error) {
      const duration = Date.now() - start
      
      logger.error('API request failed', {
        method,
        url,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      
      throw error
    }
  }
}

/**
 * Helper function to wrap API route handlers with response time logging
 * Usage: export const GET = withApiResponseTime(async (req) => { ... })
 */
export function withApiResponseTime(
  handler: (req: NextRequest) => Promise<NextResponse> | NextResponse
) {
  return withResponseTime(handler)
}