/**
 * Session Cache for Auth Performance Optimization
 *
 * Caches validated auth sessions for a short TTL to reduce network calls to Supabase.
 * In development, this reduces 800-3000ms auth calls to <1ms for subsequent requests.
 *
 * Security considerations:
 * - TTL is kept short (5s dev, 2s prod) to limit stale session window
 * - Cache is cleared on logout/session change via cookie change detection
 * - Only caches successful validations, never errors
 */

import type { User } from '@supabase/supabase-js'

interface CachedSession {
  user: User
  timestamp: number
  cookieHash: string
}

// In-memory cache (server-side only)
const sessionCache = new Map<string, CachedSession>()

// TTL: shorter in production for security, longer in dev for speed
const CACHE_TTL_MS = process.env.NODE_ENV === 'production' ? 2000 : 5000

// Max cache size to prevent memory leaks
const MAX_CACHE_SIZE = 1000

/**
 * Simple hash for cookie string to detect session changes
 */
function hashCookie(cookieValue: string | undefined): string {
  if (!cookieValue) return 'no-cookie'
  // Use last 16 chars of cookie as a simple fingerprint
  return cookieValue.slice(-16)
}

/**
 * Get cached session if valid and not expired
 */
export function getCachedSession(
  userId: string,
  cookieValue: string | undefined
): User | null {
  const cached = sessionCache.get(userId)
  if (!cached) return null

  const now = Date.now()
  const age = now - cached.timestamp

  // Check TTL
  if (age > CACHE_TTL_MS) {
    sessionCache.delete(userId)
    return null
  }

  // Check cookie hasn't changed (session refresh/logout detection)
  const currentHash = hashCookie(cookieValue)
  if (cached.cookieHash !== currentHash) {
    sessionCache.delete(userId)
    return null
  }

  return cached.user
}

/**
 * Cache a validated session
 */
export function cacheSession(
  user: User,
  cookieValue: string | undefined
): void {
  // Prevent memory leak with LRU-like behavior
  if (sessionCache.size >= MAX_CACHE_SIZE) {
    // Delete oldest entries (first 10%)
    const deleteCount = Math.floor(MAX_CACHE_SIZE * 0.1)
    const keys = sessionCache.keys()
    for (let i = 0; i < deleteCount; i++) {
      const key = keys.next().value
      if (key) sessionCache.delete(key)
    }
  }

  sessionCache.set(user.id, {
    user,
    timestamp: Date.now(),
    cookieHash: hashCookie(cookieValue),
  })
}

/**
 * Clear a specific user's cached session (call on logout)
 */
export function clearCachedSession(userId: string): void {
  sessionCache.delete(userId)
}

/**
 * Clear all cached sessions (for testing/debugging)
 */
export function clearAllCachedSessions(): void {
  sessionCache.clear()
}

/**
 * Get cache stats (for debugging)
 */
export function getCacheStats(): { size: number; ttlMs: number } {
  return {
    size: sessionCache.size,
    ttlMs: CACHE_TTL_MS,
  }
}
