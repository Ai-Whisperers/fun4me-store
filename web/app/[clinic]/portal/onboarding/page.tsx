import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard'

interface Props {
  params: Promise<{ clinic: string }>
}

export default async function OnboardingPage({ params }: Props): Promise<React.ReactElement> {
  const { clinic } = await params
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${clinic}/portal/login?redirect=onboarding`)
  }

  // Get user profile with role
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, onboarding_completed')
    .eq('id', user.id)
    .single()

  // Staff (vets/admins) don't need pet onboarding - redirect to dashboard
  if (profile?.role === 'vet' || profile?.role === 'admin') {
    redirect(`/${clinic}/dashboard`)
  }

  // If onboarding is already complete, redirect to portal dashboard
  if (profile?.onboarding_completed) {
    redirect(`/${clinic}/portal/dashboard`)
  }

  return (
    <OnboardingWizard
      clinic={clinic}
      userEmail={user.email}
      userName={profile?.full_name || undefined}
    />
  )
}
