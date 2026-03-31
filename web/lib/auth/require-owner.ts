import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { auditLogger } from '@/lib/logger'

interface OwnerUser {
  user: {
    id: string
    email?: string
  }
  profile: {
    id: string
    tenant_id: string
    role: string
    full_name: string | null
  }
  isOwner: boolean
}

/**
 * Requires user to be authenticated as a pet owner.
 * Optionally verifies they belong to a specific tenant.
 *
 * @param tenantId - Tenant ID for redirect URL and access verification
 * @returns Owner user data with profile information
 * @throws Redirects to login if not authenticated, or to clinic home if wrong tenant
 */
export async function requireOwner(tenantId?: string): Promise<OwnerUser> {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    // Redirect to clinic-specific login if tenantId provided, otherwise home
    redirect(tenantId ? `/${tenantId}/portal/login` : '/')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, tenant_id, role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile) {
    // Redirect to clinic-specific login if tenantId provided, otherwise home
    redirect(tenantId ? `/${tenantId}/portal/login` : '/')
  }

  // Verify tenant access if specified
  if (tenantId && profile.tenant_id !== tenantId) {
    // SEC-001: Log tenant mismatch attempt for security audit
    auditLogger.security('tenant_mismatch', {
      severity: 'medium',
      userId: user.id,
      tenant: profile.tenant_id,
      details: `User from tenant '${profile.tenant_id}' attempted to access tenant '${tenantId}' portal`,
    })
    redirect(`/${profile.tenant_id}`)
  }

  return {
    user: {
      id: user.id,
      email: user.email,
    },
    profile: {
      id: profile.id,
      tenant_id: profile.tenant_id,
      role: profile.role,
      full_name: profile.full_name,
    },
    isOwner: profile.role === 'owner',
  }
}
