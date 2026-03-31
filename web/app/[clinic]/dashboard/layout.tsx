import { getClinicData } from '@/lib/clinics'
import { notFound } from 'next/navigation'
import { requireStaff } from '@/lib/auth'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { DashboardProviders } from './providers'
import { getTenantFeatures } from '@/lib/features/server'

interface DashboardLayoutProps {
  children: React.ReactNode
  params: Promise<{ clinic: string }>
}

/**
 * Dashboard Layout - Server component that provides the dashboard shell
 *
 * This layout:
 * 1. Requires staff authentication (vet/admin only)
 * 2. Provides the sidebar navigation
 * 3. Provides keyboard shortcuts and command palette
 * 4. Provides feature flags for tier-based feature gating
 * 5. Removes the public website header/footer (handled by parent layout)
 */
export default async function DashboardLayout({ children, params }: DashboardLayoutProps) {
  const { clinic } = await params

  // Require staff authentication
  const { isAdmin, profile } = await requireStaff(clinic)

  // Get clinic data for the shell
  const clinicData = await getClinicData(clinic)
  if (!clinicData) {
    notFound()
  }

  // Get tenant features for feature gating (server-side for instant hydration)
  const tenantFeatures = await getTenantFeatures(profile.tenant_id)

  return (
    <DashboardProviders
      tenantId={profile.tenant_id}
      initialFeatures={tenantFeatures ?? undefined}
    >
      <DashboardShell clinic={clinic} clinicName={clinicData.config.name} isAdmin={isAdmin}>
        {children}
      </DashboardShell>
    </DashboardProviders>
  )
}
