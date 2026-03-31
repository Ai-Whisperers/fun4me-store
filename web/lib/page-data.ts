import { createClient } from '@/lib/supabase/server'
import { getClinicData } from '@/lib/clinics'
import { redirect, notFound } from 'next/navigation'

import type { User } from '@supabase/supabase-js'

export interface PageContext {
  clinicData: Awaited<ReturnType<typeof getClinicData>>
  user: User | null
  profile: {
    id: string
    tenant_id: string
    role: string
    full_name: string
  } | null
  isStaff: boolean
  isAdmin: boolean
}

/**
 * Get common page context (clinic data + optional user)
 */
export async function getPageContext(clinic: string): Promise<PageContext> {
  const supabase = await createClient()

  const [
    clinicData,
    {
      data: { user },
    },
  ] = await Promise.all([getClinicData(clinic), supabase.auth.getUser()])

  if (!clinicData) {
    notFound()
  }

  let profile = null
  let isStaff = false
  let isAdmin = false

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('id, tenant_id, role, full_name')
      .eq('id', user.id)
      .single()

    profile = data
    isStaff = profile ? ['vet', 'admin'].includes(profile.role) : false
    isAdmin = profile?.role === 'admin'
  }

  return { clinicData, user, profile, isStaff, isAdmin }
}

/**
 * Get dashboard context - requires staff authentication
 */
export async function getDashboardContext(clinic: string) {
  const context = await getPageContext(clinic)

  if (!context.user || !context.profile) {
    redirect(`/${clinic}/portal/login`)
  }

  if (!context.isStaff) {
    redirect(`/${clinic}/portal`)
  }

  if (context.profile.tenant_id !== clinic) {
    redirect(`/${context.profile.tenant_id}/dashboard`)
  }

  return context as PageContext & {
    user: NonNullable<PageContext['user']>
    profile: NonNullable<PageContext['profile']>
    isStaff: true
  }
}

/**
 * Get portal context - requires any authentication
 */
export async function getPortalContext(clinic: string) {
  const context = await getPageContext(clinic)

  if (!context.user || !context.profile) {
    redirect(`/${clinic}/portal/login`)
  }

  if (context.profile.tenant_id !== clinic) {
    redirect(`/${context.profile.tenant_id}/portal`)
  }

  return context as PageContext & {
    user: NonNullable<PageContext['user']>
    profile: NonNullable<PageContext['profile']>
  }
}

/**
 * Get admin context - requires admin role
 */
export async function getAdminContext(clinic: string) {
  const context = await getDashboardContext(clinic)

  if (!context.isAdmin) {
    redirect(`/${clinic}/dashboard`)
  }

  return context as typeof context & { isAdmin: true }
}
