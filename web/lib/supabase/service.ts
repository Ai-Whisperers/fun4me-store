import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

/**
 * Create a Supabase client with service role key
 *
 * This client bypasses RLS and should only be used for:
 * - Server-side background jobs (cron, webhooks)
 * - Admin operations that need full table access
 * - Notification service operations
 *
 * NEVER expose this client to client-side code.
 */
export function createServiceClient() {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
