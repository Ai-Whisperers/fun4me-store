import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { auditLogger } from '@/lib/logger'

interface StaffUser {
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
  isStaff: true
  isAdmin: boolean
}

/**
 * Requires user to be authenticated staff (vet or admin).
 * Optionally verifies they belong to a specific tenant.
 *
 * @param tenantId - Tenant ID for redirect URL and access verification
 * @returns Staff user data with profile information
 * @throws Redirects to login if not authenticated, or to portal if not staff
 */
export async function requireStaff(tenantId?: string): Promise<StaffUser> {
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

  // Verify staff role (vet or admin)
  const isStaff = ['vet', 'admin'].includes(profile.role)
  if (!isStaff) {
    redirect(`/${profile.tenant_id}/portal`)
  }

  // Verify tenant access if specified
  if (tenantId && profile.tenant_id !== tenantId) {
    // SEC-001: Log tenant mismatch attempt for security audit
    auditLogger.security('tenant_mismatch', {
      severity: 'medium',
      userId: user.id,
      tenant: profile.tenant_id,
      userRole: profile.role as 'owner' | 'vet' | 'admin',
      details: `Staff from tenant '${profile.tenant_id}' attempted to access tenant '${tenantId}' dashboard`,
    })
    redirect(`/${profile.tenant_id}/dashboard`)
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
    isStaff: true,
    isAdmin: profile.role === 'admin',
  }
}

interface AdminUser extends StaffUser {
  isAdmin: true
}

/**
 * Requires user to be authenticated admin.
 * Optionally verifies they belong to a specific tenant.
 *
 * @param tenantId - Optional tenant ID to verify access
 * @returns Admin user data with profile information
 * @throws Redirects to login if not authenticated, or to dashboard if not admin
 */
export async function requireAdmin(tenantId?: string): Promise<AdminUser> {
  const { user, profile } = await requireStaff(tenantId)

  if (profile.role !== 'admin') {
    redirect(`/${profile.tenant_id}/dashboard`)
  }

  return {
    user,
    profile,
    isStaff: true,
    isAdmin: true,
  }
}
