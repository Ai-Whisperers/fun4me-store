import { getClinicData } from '@/lib/clinics'
import { notFound } from 'next/navigation'
import { requireStaff } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { TodayScheduleWidget } from '@/components/dashboard/today-schedule-widget'
import { UpcomingVaccines } from '@/components/dashboard/upcoming-vaccines'
import { MandatoryVaccinesWidget } from '@/components/dashboard/mandatory-vaccines-widget'
import { LostFoundWidget } from '@/components/safety/lost-found-widget'
import { WaitingRoomWrapper as WaitingRoom } from '@/components/dashboard/waiting-room'
import { TodayFocus } from '@/components/dashboard/today-focus'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { RevenueWidget } from '@/components/dashboard/revenue-widget'
import { AlertsPanel } from '@/components/dashboard/alerts-panel'
import { QuickSearch } from '@/components/dashboard/quick-search'
import { getTodayAppointmentsForClinic } from '@/lib/domain/appointments/queries'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { QuickActionsBar } from '@/components/dashboard/quick-actions-bar'
import { DailyBriefing } from '@/components/dashboard/daily-briefing'
import { MyPatientsWidget } from '@/components/dashboard/my-patients-widget'

interface Props {
  params: Promise<{ clinic: string }>
}

export async function generateStaticParams(): Promise<Array<{ clinic: string }>> {
  return [{ clinic: 'terrapet' }, { clinic: 'petlife' }]
}

// Get quick stats for dashboard header
async function getQuickStats(
  clinic: string
): Promise<{ waitingCount: number; todayAppointments: number }> {
  const supabase = await createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Fetch waiting count
  const { count: waitingCount } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', clinic)
    .eq('status', 'checked_in')

  // Fetch today's appointments count
  const { count: todayCount } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', clinic)
    .gte('start_time', today.toISOString())
    .lt('start_time', tomorrow.toISOString())
    .not('status', 'in', '("cancelled","no_show")')

  return {
    waitingCount: waitingCount || 0,
    todayAppointments: todayCount || 0,
  }
}

export default async function ClinicalDashboardPage({
  params,
}: Props): Promise<React.ReactElement> {
  const { clinic } = await params

  // SEC-006: Require staff authentication with tenant verification
  const { profile, isAdmin } = await requireStaff(clinic)

  const clinicData = await getClinicData(clinic)

  if (!clinicData) {
    notFound()
  }

  const todayAppointments = await getTodayAppointmentsForClinic(clinic)
  const quickStats = await getQuickStats(clinic)

  // Get greeting based on time
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'
  const firstName = profile.full_name?.split(' ')[0] || 'Doctor'
  const role = profile.role as 'vet' | 'admin'

  // Format date string
  const dateString = new Date().toLocaleDateString('es-PY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  // Count alerts for daily briefing
  const alertCount = todayAppointments.filter(
    (apt) => apt.status === 'checked_in' || apt.status === 'in_progress'
  ).length

  return (
    <div className="section-gap pb-8">
      {/* Enhanced Header Section */}
      <DashboardHeader
        greeting={greeting}
        firstName={firstName}
        role={role}
        dateString={dateString}
        quickStats={quickStats}
      />

      {/* Quick Actions Bar */}
      <div className="mt-6">
        <QuickActionsBar clinic={clinic} isAdmin={isAdmin} />
      </div>

      {/* Daily Briefing - Collapsible summary */}
      <div className="mt-6">
        <DailyBriefing
          clinic={clinic}
          todayAppointments={quickStats.todayAppointments}
          waitingCount={quickStats.waitingCount}
          alertCount={alertCount}
        />
      </div>

      {/* Quick Search Bar */}
      <div className="mt-6 max-w-2xl">
        <QuickSearch clinic={clinic} />
      </div>

      {/* Stats Cards - Enhanced with gradients and click navigation */}
      <div className="mt-6">
        <StatsCards clinic={clinic} />
      </div>

      {/* Main Content Grid - Redesigned Layout */}
      <div className="content-grid mt-6">
        {/* Left Column - Primary Content (8 cols on lg) */}
        <div className="content-main">
          {/* Today's Focus - Urgent items requiring attention */}
          <TodayFocus clinic={clinic} />

          {/* Waiting Room - Interactive Queue */}
          <WaitingRoom clinic={clinic} />

          {/* Today's Full Schedule */}
          <TodayScheduleWidget appointments={todayAppointments} clinic={clinic} />
        </div>

        {/* Right Column - Secondary Content (4 cols on lg) */}
        <div className="content-sidebar">
          {/* My Patients Widget - For vets */}
          {role === 'vet' && <MyPatientsWidget vetId={profile.id} clinic={clinic} />}

          {/* Admin-only: Revenue Widget */}
          {isAdmin && <RevenueWidget clinic={clinic} />}

          {/* Alerts Panel - Consolidated alerts */}
          <AlertsPanel clinic={clinic} />

          {/* Mandatory Vaccines Widget - High priority */}
          <MandatoryVaccinesWidget clinic={clinic} />

          {/* Activity Feed - Recent activities */}
          <ActivityFeed clinic={clinic} maxItems={6} />

          {/* Upcoming Vaccines */}
          <UpcomingVaccines clinic={clinic} />

          {/* Lost & Found Widget */}
          <LostFoundWidget />
        </div>
      </div>
    </div>
  )
}
