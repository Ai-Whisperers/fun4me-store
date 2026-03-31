import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

// Singleton client instance to avoid re-initialization overhead
let clientInstance: SupabaseClient | null = null

export function createClient(): SupabaseClient {
  if (clientInstance) {
    return clientInstance
  }

  clientInstance = createBrowserClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      // Use localStorage for persistence in the browser
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  })

  return clientInstance
}

/**
 * Quick check if there's a session in localStorage (synchronous)
 * Used for instant UI rendering before async verification
 */
export function hasStoredSession(): boolean {
  if (typeof window === 'undefined') return false

  try {
    // Supabase stores session with key pattern: sb-{project-ref}-auth-token
    const projectRef = env.SUPABASE_URL.split('//')[1]?.split('.')[0]
    const key = `sb-${projectRef}-auth-token`
    const stored = localStorage.getItem(key)
    return stored !== null && stored !== ''
  } catch (_error: unknown) {
    return false
  }
}
