import { PublicHero } from './public-hero'
import { OwnerHero } from './owner-hero'
import { StaffHero } from './staff-hero'
import type { HomeData, ClinicConfig } from '@/lib/clinics'

interface UserProfile {
  id: string
  tenant_id: string
  role: 'owner' | 'vet' | 'admin'
  full_name: string | null
}

interface StaffStats {
  appointmentsToday: number
  pendingCheckIn: number
  completedToday: number
}

interface PersonalizedHeroProps {
  clinic: string
  home: HomeData
  config: ClinicConfig
  profile: UserProfile | null
  staffStats?: StaffStats | null
}

export function PersonalizedHero({
  clinic,
  home,
  config,
  profile,
  staffStats,
}: PersonalizedHeroProps): React.ReactElement {
  // Unauthenticated or profile doesn't match this clinic - show public hero
  if (!profile) {
    return <PublicHero clinic={clinic} home={home} config={config} />
  }

  // Staff (vet/admin) - show staff hero with stats
  if (profile.role === 'vet' || profile.role === 'admin') {
    return (
      <StaffHero
        clinic={clinic}
        profile={{
          full_name: profile.full_name,
          role: profile.role,
        }}
        config={config}
        todayStats={staffStats || { appointmentsToday: 0, pendingCheckIn: 0, completedToday: 0 }}
      />
    )
  }

  // Owner - show owner hero
  return (
    <OwnerHero
      clinic={clinic}
      profile={{
        full_name: profile.full_name,
        role: 'owner',
      }}
      config={config}
    />
  )
}
