/**
 * Rate Limiting Utility
 * Implements sliding window rate limiting with in-memory storage
 * Optionally supports Redis for distributed environments
 */

import { NextRequest, NextResponse } from 'next/server'
import type { ApiErrorResponse } from './api/errors'
import { logger } from '@/lib/logger'

/**
 * Rate limit configuration for different endpoint types
 */
export const RATE_LIMITS = {
  auth: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5,
    message: 'Demasiadas solicitudes. Intente de nuevo en',
  },
  search: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
    message: 'Demasiadas búsquedas. Intente de nuevo en',
  },
  write: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
    message: 'Demasiadas solicitudes. Intente de nuevo en',
  },
  // Stricter limit for sensitive financial operations
  financial: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    message: 'Demasiadas operaciones financieras. Intente de nuevo en',
  },
  // Very strict limit for refunds (potential fraud prevention)
  refund: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5,
    message: 'Límite de reembolsos alcanzado. Intente de nuevo en',
  },
  // Strict limit for checkout operations
  checkout: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5,
    message: 'Demasiados intentos de pago. Intente de nuevo en',
  },
  // SEC-026: Cart operations (higher limit for frequent syncs)
  cart: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // Allow frequent cart updates
    message: 'Demasiadas operaciones de carrito. Intente de nuevo en',
  },
  // SEC-027: Booking request rate limit
  booking: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5, // 5 bookings per hour is generous
    message: 'Demasiadas solicitudes de reserva. Intente de nuevo en',
  },
  // SEC-028: GDPR verification rate limit (Epic 4.1)
  gdpr: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5, // 5 attempts per token per hour (prevents brute-force)
    message: 'Demasiados intentos de verificación. Intente de nuevo en',
  },
  default: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
    message: 'Demasiadas solicitudes. Intente de nuevo en',
  },
} as const

export type RateLimitType = keyof typeof RATE_LIMITS

/**
 * Request record with timestamps
 */
interface RequestRecord {
  timestamps: number[]
}

/**
 * In-memory store for rate limiting
 * Maps identifier (IP or user ID) to request timestamps
 */
class RateLimitStore {
  private store: Map<string, RequestRecord> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Clean up old entries every 5 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup()
      },
      5 * 60 * 1000
    )
  }

  /**
   * Get request timestamps for an identifier
   */
  get(identifier: string): number[] {
    return this.store.get(identifier)?.timestamps || []
  }

  /**
   * Add a new request timestamp for an identifier
   */
  add(identifier: string, timestamp: number): void {
    const record = this.store.get(identifier) || { timestamps: [] }
    record.timestamps.push(timestamp)
    this.store.set(identifier, record)
  }

  /**
   * Remove old timestamps outside the window
   */
  prune(identifier: string, windowStart: number): void {
    const record = this.store.get(identifier)
    if (!record) return

    record.timestamps = record.timestamps.filter((ts) => ts > windowStart)

    if (record.timestamps.length === 0) {
      this.store.delete(identifier)
    } else {
      this.store.set(identifier, record)
    }
  }

  /**
   * Clean up old entries (older than 10 minutes)
   */
  private cleanup(): void {
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000

    const entriesToDelete: string[] = []

    this.store.forEach((record, identifier) => {
      record.timestamps = record.timestamps.filter((ts) => ts > tenMinutesAgo)

      if (record.timestamps.length === 0) {
        entriesToDelete.push(identifier)
      }
    })

    entriesToDelete.forEach((id) => this.store.delete(id))
  }

  /**
   * Clear all entries (for testing)
   */
  clear(): void {
    this.store.clear()
  }

  /**
   * Cleanup on shutdown
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.clear()
  }
}

/**
 * Global in-memory store instance
 */
const inMemoryStore = new RateLimitStore()

/**
 * Redis client type (from redis package)
 */
type RedisClientType = {
  connect(): Promise<void>
  get(key: string): Promise<string | null>
  setEx(key: string, ttl: number, value: string): Promise<void>
  del(key: string): Promise<number>
}

/**
 * Redis-based rate limit store (optional)
 * Falls back to in-memory if Redis is not available
 */
class RedisStore {
  private client: RedisClientType | null = null
  private isConnected: boolean = false

  async connect(): Promise<void> {
    if (this.isConnected) return

    // Only attempt Redis connection if URL is provided
    const redisUrl = process.env.REDIS_URL
    if (!redisUrl) {
      // Using in-memory rate limiting
      return
    }

    // Skip Redis in test environment
    if (process.env.NODE_ENV === 'test') {
      return
    }

    try {
      // Dynamically import Redis client if available
      // Using variable to prevent Webpack from trying to bundle redis
      const redisModuleName = 'redis'
      const redisModule = await import(/* webpackIgnore: true */ redisModuleName).catch(() => null)
      if (!redisModule) {
        return // Redis not installed, use in-memory
      }

      const { createClient } = redisModule as {
        createClient: (config: { url: string }) => RedisClientType
      }
      this.client = createClient({ url: redisUrl })
      await this.client.connect()
      this.isConnected = true
      // Redis rate limiting enabled
    } catch (error: unknown) {
      logger.warn('[RateLimit] Redis connection failed, falling back to in-memory store', {
        error: error instanceof Error ? error.message : String(error),
      })
      this.isConnected = false
    }
  }

  async get(key: string): Promise<number[]> {
    if (!this.isConnected || !this.client) {
      return inMemoryStore.get(key)
    }

    try {
      const data = await this.client.get(key)
      return data ? JSON.parse(data) : []
    } catch (error: unknown) {
      logger.error('[RateLimit] Redis get error', {
        error: error instanceof Error ? error.message : String(error),
        key,
      })
      return inMemoryStore.get(key)
    }
  }

  async add(key: string, timestamp: number, ttlSeconds: number): Promise<void> {
    if (!this.isConnected || !this.client) {
      inMemoryStore.add(key, timestamp)
      return
    }

    try {
      const timestamps = await this.get(key)
      timestamps.push(timestamp)
      await this.client.setEx(key, ttlSeconds, JSON.stringify(timestamps))
    } catch (error: unknown) {
      logger.error('[RateLimit] Redis add error', {
        error: error instanceof Error ? error.message : String(error),
        key,
      })
      inMemoryStore.add(key, timestamp)
    }
  }

  async prune(key: string, windowStart: number, ttlSeconds: number): Promise<void> {
    if (!this.isConnected || !this.client) {
      inMemoryStore.prune(key, windowStart)
      return
    }

    try {
      const timestamps = await this.get(key)
      const filtered = timestamps.filter((ts) => ts > windowStart)

      if (filtered.length === 0) {
        await this.client.del(key)
      } else {
        await this.client.setEx(key, ttlSeconds, JSON.stringify(filtered))
      }
    } catch (error: unknown) {
      logger.error('[RateLimit] Redis prune error', {
        error: error instanceof Error ? error.message : String(error),
        key,
      })
      inMemoryStore.prune(key, windowStart)
    }
  }
}

const redisStore = new RedisStore()

/**
 * Get identifier for rate limiting
 * Prefers user ID if authenticated, falls back to IP address
 */
function getIdentifier(request: NextRequest, userId?: string): string {
  if (userId) {
    return `user:${userId}`
  }

  // Try to get real IP from various headers (considering proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0] || realIp || 'unknown'

  return `ip:${ip}`
}

/**
 * Check if request exceeds rate limit using sliding window algorithm
 *
 * @param identifier - Unique identifier (user ID or IP)
 * @param limitType - Type of rate limit to apply
 * @returns Object with isLimited flag and retry-after seconds
 */
async function checkRateLimit(
  identifier: string,
  limitType: RateLimitType = 'default'
): Promise<{ isLimited: boolean; retryAfter: number; remaining: number }> {
  // Initialize Redis connection if not already done
  await redisStore.connect()

  const config = RATE_LIMITS[limitType]
  const now = Date.now()
  const windowStart = now - config.windowMs

  // Create a unique key for this identifier + limit type
  const key = `ratelimit:${limitType}:${identifier}`

  // Get existing timestamps
  const timestamps = await redisStore.get(key)

  // Remove timestamps outside the current window
  await redisStore.prune(key, windowStart, Math.ceil(config.windowMs / 1000))

  // Get fresh timestamps after pruning
  const currentTimestamps = await redisStore.get(key)

  // Check if limit exceeded
  if (currentTimestamps.length >= config.maxRequests) {
    // Calculate retry-after based on oldest request in window
    const oldestTimestamp = Math.min(...currentTimestamps)
    const retryAfterMs = oldestTimestamp + config.windowMs - now
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000)

    return {
      isLimited: true,
      retryAfter: Math.max(1, retryAfterSeconds),
      remaining: 0,
    }
  }

  // Add current request timestamp
  await redisStore.add(key, now, Math.ceil(config.windowMs / 1000))

  return {
    isLimited: false,
    retryAfter: 0,
    remaining: Math.max(0, config.maxRequests - currentTimestamps.length - 1),
  }
}

/**
 * Rate limiting result
 */
export interface RateLimitResult {
  success: true
  remaining: number
}

export interface RateLimitError {
  success: false
  response: NextResponse<ApiErrorResponse>
}

/**
 * Apply rate limiting to a request
 *
 * @param request - NextRequest object
 * @param limitType - Type of rate limit to apply
 * @param userId - Optional user ID for authenticated requests
 * @returns Result object or error response
 *
 * @example
 * ```typescript
 * // In an API route
 * const rateLimitResult = await rateLimit(request, 'auth');
 * if (!rateLimitResult.success) {
 *   return rateLimitResult.response;
 * }
 *
 * // Continue with request handling...
 * ```
 */
export async function rateLimit(
  request: NextRequest,
  limitType: RateLimitType = 'default',
  userId?: string
): Promise<RateLimitResult | RateLimitError> {
  const identifier = getIdentifier(request, userId)
  const { isLimited, retryAfter, remaining } = await checkRateLimit(identifier, limitType)

  if (isLimited) {
    const config = RATE_LIMITS[limitType]
    return {
      success: false,
      response: NextResponse.json(
        {
          error: `${config.message} ${retryAfter} segundos.`,
          code: 'RATE_LIMITED',
          details: {
            retryAfter,
            limitType,
            maxRequests: config.maxRequests,
            windowMs: config.windowMs,
          },
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + retryAfter * 1000).toISOString(),
          },
        }
      ),
    }
  }

  return {
    success: true,
    remaining,
  }
}

/**
 * Higher-order function to wrap API handlers with rate limiting
 *
 * @param handler - The API route handler
 * @param limitType - Type of rate limit to apply
 * @param getUserId - Optional function to extract user ID from request
 * @returns Wrapped handler with rate limiting
 *
 * @example
 * ```typescript
 * export const POST = withRateLimit(
 *   async (request) => {
 *     // Your handler logic
 *     return NextResponse.json({ success: true });
 *   },
 *   'write'
 * );
 * ```
 */
export function withRateLimit<T, TContext extends unknown[] = []>(
  handler: (request: NextRequest, ...args: TContext) => Promise<NextResponse<T>>,
  limitType: RateLimitType = 'default',
  getUserId?: (request: NextRequest) => Promise<string | undefined>
): (request: NextRequest, ...args: TContext) => Promise<NextResponse<T | ApiErrorResponse>> {
  return async (request: NextRequest, ...args: TContext) => {
    // Get user ID if function provided
    const userId = getUserId ? await getUserId(request) : undefined

    // Check rate limit
    const rateLimitResult = await rateLimit(request, limitType, userId)

    if (!rateLimitResult.success) {
      return rateLimitResult.response as NextResponse<ApiErrorResponse>
    }

    // Add rate limit headers to response
    const response = await handler(request, ...args)

    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())

    return response
  }
}

/**
 * Rate limit result for server actions (without NextResponse)
 */
export interface ActionRateLimitResult {
  success: boolean
  error?: string
  retryAfter?: number
}

/**
 * Apply rate limiting to a server action using user ID
 * SEC-027: Rate limiting for server actions where NextRequest is not available
 *
 * @param userId - User ID to rate limit
 * @param limitType - Type of rate limit to apply
 * @returns Result object with success flag and optional error message
 *
 * @example
 * ```typescript
 * // In a server action
 * const rateLimitResult = await rateLimitByUser(user.id, 'booking');
 * if (!rateLimitResult.success) {
 *   return { success: false, error: rateLimitResult.error };
 * }
 * ```
 */
export async function rateLimitByUser(
  userId: string,
  limitType: RateLimitType = 'default'
): Promise<ActionRateLimitResult> {
  const identifier = `user:${userId}`
  const { isLimited, retryAfter } = await checkRateLimit(identifier, limitType)

  if (isLimited) {
    const config = RATE_LIMITS[limitType]
    return {
      success: false,
      error: `${config.message} ${retryAfter} segundos.`,
      retryAfter,
    }
  }

  return { success: true }
}

/**
 * Clear all rate limit data (for testing)
 */
export function clearRateLimits(): void {
  inMemoryStore.clear()
}

/**
 * Cleanup resources on shutdown
 */
export function shutdown(): void {
  inMemoryStore.destroy()
}
