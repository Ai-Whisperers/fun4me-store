/**
 * Platform Admin Dashboard
 *
 * Main overview page for Vetic platform administration.
 */

import { createClient } from '@/lib/supabase/server'
import { PlatformStatsCards } from '@/components/admin/platform-stats-cards'
import { RecentTenantsTable } from '@/components/admin/recent-tenants-table'
import { CommissionsSummary } from '@/components/admin/commissions-summary'
import { ReferralsSummary } from '@/components/admin/referrals-summary'

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  // Fetch platform stats
  const [
    { count: totalTenants },
    { count: activeTenants },
    { count: trialTenants },
    { count: paidTenants },
    { count: totalReferrals },
    { count: convertedReferrals },
  ] = await Promise.all([
    supabase.from('tenants').select('*', { count: 'exact', head: true }),
    supabase.from('tenants').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('tenants').select('*', { count: 'exact', head: true }).eq('is_trial', true).eq('is_active', true),
    supabase.from('tenants').select('*', { count: 'exact', head: true }).neq('subscription_tier', 'gratis').eq('is_active', true),
    supabase.from('referrals').select('*', { count: 'exact', head: true }),
    supabase.from('referrals').select('*', { count: 'exact', head: true }).eq('status', 'converted'),
  ])

  // Fetch recent commissions total
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { data: monthlyCommissions } = await supabase
    .from('store_commissions')
    .select('commission_amount')
    .gte('calculated_at', startOfMonth.toISOString())

  const monthlyCommissionTotal = monthlyCommissions?.reduce(
    (sum, c) => sum + (parseFloat(c.commission_amount) || 0),
    0
  ) || 0

  // Fetch recent tenants
  const { data: recentTenants } = await supabase
    .from('tenants')
    .select('id, name, subscription_tier, is_trial, trial_end_date, created_at')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(5)

  const stats = {
    totalTenants: totalTenants || 0,
    activeTenants: activeTenants || 0,
    trialTenants: trialTenants || 0,
    paidTenants: paidTenants || 0,
    totalReferrals: totalReferrals || 0,
    convertedReferrals: convertedReferrals || 0,
    monthlyCommissionTotal,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Panel de Administración
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Resumen de la plataforma Vetic
        </p>
      </div>

      {/* Stats Cards */}
      <PlatformStatsCards stats={stats} />

      {/* Two-column grid for summaries */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CommissionsSummary />
        <ReferralsSummary />
      </div>

      {/* Recent Tenants */}
      <RecentTenantsTable tenants={recentTenants || []} />
    </div>
  )
}
