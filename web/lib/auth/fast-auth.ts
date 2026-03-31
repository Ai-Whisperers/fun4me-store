/**
 * Fast Auth - Optimized authentication for high-frequency API endpoints
 *
 * Uses session-based auth with caching for performance-critical endpoints
 * like cart operations. Trade-off: slightly less secure than getUser()
 * (doesn't validate JWT with server on every call), but much faster.
 *
 * Use this for:
 * - Cart operations (sync, merge)
 * - Non-sensitive read operations
 * - High-frequency polling endpoints
 *
 * Do NOT use for:
 * - Financial transactions (checkout, payments)
 * - Admin operations
 * - Sensitive data mutations
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { env } from '@/lib/env'
import type { User, SupabaseClient } from '@supabase/supabase-js'
import { getCachedSession, cacheSession } from './session-cache'

interface FastAuthResult {
  user: User | null
  supabase: SupabaseClient
  fromCache: boolean
}

/**
 * Get authenticated user with caching
 *
 * First checks memory cache, then falls back to session cookie,
 * only makes network call if neither is available.
 */
export async function getFastAuth(): Promise<FastAuthResult> {
  const cookieStore = await cookies()
  const authCookie = cookieStore.get(`sb-${env.SUPABASE_URL.split('//')[1]?.split('.')[0]}-auth-token`)?.value

  // Create Supabase client
  const supabase = createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set() {
        // Read-only for fast path
      },
      remove() {
        // Read-only for fast path
      },
    },
  })

  // Try to get user ID from session cookie first (fast path)
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) {
    return { user: null, supabase, fromCache: false }
  }

  // Check cache first
  const cachedUser = getCachedSession(session.user.id, authCookie)
  if (cachedUser) {
    return { user: cachedUser, supabase, fromCache: true }
  }

  // Validate with server (slow path, but necessary)
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { user: null, supabase, fromCache: false }
  }

  // Cache the validated user for subsequent requests
  cacheSession(user, authCookie)

  return { user, supabase, fromCache: false }
}

/**
 * Lightweight auth check - uses session only (no server validation)
 *
 * ONLY use for truly non-sensitive operations where a few seconds
 * of stale session is acceptable (e.g., showing cart count).
 */
export async function getSessionAuth(): Promise<FastAuthResult> {
  const cookieStore = await cookies()

  const supabase = createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set() {},
      remove() {},
    },
  })

  // Just read from session - no server validation
  const { data: { session } } = await supabase.auth.getSession()

  return {
    user: session?.user ?? null,
    supabase,
    fromCache: false,
  }
}
