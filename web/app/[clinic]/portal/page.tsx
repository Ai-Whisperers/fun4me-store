import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'

interface Props {
  params: Promise<{ clinic: string }>
}

/**
 * Portal Index Page
 * Redirects users to the appropriate section based on their role:
 * - Owners (role: 'owner') → /portal/pets (see their pets)
 * - Staff (role: 'vet'/'admin') → /portal/dashboard (staff dashboard)
 */
export default async function PortalIndexPage({ params }: Props) {
  const { clinic } = await params
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Not authenticated - redirect to login
    redirect(`/${clinic}/portal/login`)
  }

  // Get user profile to determine role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    // No profile found - redirect to onboarding
    redirect(`/${clinic}/portal/onboarding`)
  }

  // Verify user belongs to this clinic
  if (profile.tenant_id !== clinic) {
    notFound()
  }

  // Redirect based on role
  if (profile.role === 'vet' || profile.role === 'admin') {
    // Staff users go to clinical dashboard
    redirect(`/${clinic}/dashboard`)
  } else {
    // Pet owners go to their portal dashboard (main page)
    redirect(`/${clinic}/portal/dashboard`)
  }
}
