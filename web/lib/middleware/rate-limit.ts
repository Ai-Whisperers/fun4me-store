/**
 * Rate limiting middleware
 * Prevents abuse by limiting request frequency
 */

import { NextRequest, NextResponse } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { logger } from '@/lib/logger'

// Rate limiters for different endpoints
const authLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '10 m'), // 5 requests per 10 minutes
  analytics: true,
  prefix: 'ratelimit:auth',
})

const apiLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
  analytics: true,
  prefix: 'ratelimit:api',
})

const bookingLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 h'), // 10 bookings per hour
  analytics: true,
  prefix: 'ratelimit:booking',
})

export interface RateLimitOptions {
  limiter?: Ratelimit
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

export function withRateLimit(options: RateLimitOptions = {}) {
  const {
    limiter = apiLimiter,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = options

  return async function middleware(request: NextRequest) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1'

    try {
      const { success, limit, reset, remaining } = await limiter.limit(ip)

      // Add rate limit headers
      const response = NextResponse.next()
      response.headers.set('X-RateLimit-Limit', limit.toString())
      response.headers.set('X-RateLimit-Remaining', remaining.toString())
      response.headers.set('X-RateLimit-Reset', reset.toString())

      if (!success) {
        response.headers.set('Retry-After', reset.toString())
        return new NextResponse('Too Many Requests', {
          status: 429,
          headers: response.headers,
        })
      }

      return response
    } catch (error: unknown) {
      logger.error('[RateLimit] Service error', {
        error: error instanceof Error ? error.message : String(error),
        ip,
      })
      // On rate limit service error, allow the request
      return NextResponse.next()
    }
  }
}

// Pre-configured middleware for different use cases
export const authRateLimit = withRateLimit({ limiter: authLimiter })
export const apiRateLimit = withRateLimit({ limiter: apiLimiter })
export const bookingRateLimit = withRateLimit({ limiter: bookingLimiter })

// Utility function to get appropriate limiter based on path
export function getRateLimiter(pathname: string): Ratelimit {
  if (pathname.startsWith('/api/auth') || pathname.startsWith('/auth')) {
    return authLimiter
  }
  if (pathname.startsWith('/api/book') || pathname.startsWith('/book')) {
    return bookingLimiter
  }
  return apiLimiter
}
