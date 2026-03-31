/**
 * Admin Supabase Client
 *
 * Alias for service client - provides admin-level access.
 * Used primarily by GDPR and admin operations.
 */
import { createServiceClient } from './service'

/**
 * Create a Supabase client with admin/service role privileges.
 * This bypasses RLS and should only be used for admin operations.
 */
export function createAdminClient() {
  return createServiceClient()
}
