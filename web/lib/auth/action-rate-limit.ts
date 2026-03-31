/**
 * Rate Limiting for Server Actions
 *
 * Provides rate limiting for public server actions that don't use the
 * standard API route infrastructure. Uses the same underlying rate
 * limiting system as API routes for consistency.
 *
 * @module lib/auth/action-rate-limit
 * @see SEC-011: Server Action Rate Limiting
 */

import { headers } from 'next/headers'
import { RATE_LIMITS, type RateLimitType } from '@/lib/rate-limit'

/**
 * In-memory store for action rate limiting
 * Mirrors the approach used in rate-limit.ts
 */
interface RequestRecord {
  timestamps: number[]
}

const actionRateLimitStore: Map<string, RequestRecord> = new Map()

// Cleanup old entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(
    () => {
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000
      const keysToDelete: string[] = []

      actionRateLimitStore.forEach((record, key) => {
        record.timestamps = record.timestamps.filter((ts) => ts > tenMinutesAgo)
        if (record.timestamps.length === 0) {
          keysToDelete.push(key)
        }
      })

      keysToDelete.forEach((key) => actionRateLimitStore.delete(key))
    },
    5 * 60 * 1000
  )
}

/**
 * Result of checking action rate limit
 */
export interface ActionRateLimitResult {
  success: boolean
  remaining: number
  retryAfter: number
  message?: string
}

/**
 * Gets the client IP from server action context
 */
async function getClientIp(): Promise<string> {
  const headersList = await headers()
  const forwarded = headersList.get('x-forwarded-for')
  const realIp = headersList.get('x-real-ip')
  return forwarded?.split(',')[0] || realIp || 'unknown'
}

/**
 * Check rate limit for a server action
 *
 * @param type - Rate limit type (auth, search, write, etc.)
 * @param identifier - Optional custom identifier (defaults to IP)
 * @returns Rate limit check result
 *
 * @example
 * ```typescript
 * export async function submitContactForm(formData: FormData) {
 *   const rateLimitResult = await checkActionRateLimit('auth')
 *   if (!rateLimitResult.success) {
 *     return { success: false, error: rateLimitResult.message }
 *   }
 *   // ... process form
 * }
 * ```
 */
export async function checkActionRateLimit(
  type: RateLimitType = 'default',
  identifier?: string
): Promise<ActionRateLimitResult> {
  const config = RATE_LIMITS[type]
  const now = Date.now()
  const windowStart = now - config.windowMs

  // Get identifier (IP by default)
  const id = identifier || `ip:${await getClientIp()}`
  const key = `action:${type}:${id}`

  // Get existing timestamps
  const record = actionRateLimitStore.get(key) || { timestamps: [] }

  // Prune old timestamps
  record.timestamps = record.timestamps.filter((ts) => ts > windowStart)

  // Check if limit exceeded
  if (record.timestamps.length >= config.maxRequests) {
    const oldestTimestamp = Math.min(...record.timestamps)
    const retryAfterMs = oldestTimestamp + config.windowMs - now
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000)

    return {
      success: false,
      remaining: 0,
      retryAfter: Math.max(1, retryAfterSeconds),
      message: `${config.message} ${Math.max(1, retryAfterSeconds)} segundos.`,
    }
  }

  // Add current request timestamp
  record.timestamps.push(now)
  actionRateLimitStore.set(key, record)

  return {
    success: true,
    remaining: Math.max(0, config.maxRequests - record.timestamps.length),
    retryAfter: 0,
  }
}

/**
 * Custom rate limit configurations for specific actions
 * These extend the base RATE_LIMITS with action-specific settings
 */
export const ACTION_RATE_LIMITS = {
  /**
   * Contact form submission - 5 per minute (matches auth)
   * Prevents spam submissions
   */
  contactForm: {
    type: 'auth' as RateLimitType,
  },

  /**
   * Found pet reporting - 10 per hour
   * More permissive to allow legitimate reports but prevent abuse
   */
  foundPetReport: {
    type: 'refund' as RateLimitType, // 5 per hour - using existing strict limit
  },
} as const

/**
 * Clear rate limit data for testing
 */
export function clearActionRateLimits(): void {
  actionRateLimitStore.clear()
}
