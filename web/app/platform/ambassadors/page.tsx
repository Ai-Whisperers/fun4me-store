/**
 * Platform Admin - Ambassador Management
 *
 * Admin dashboard for managing ambassador applications and performance.
 */

import { createClient } from '@/lib/supabase/server'
import { AmbassadorAdminClient } from './client'
import { AmbassadorAnalytics } from './analytics'

export const metadata = {
  title: 'Embajadores | Vete Platform',
  description: 'Administración de embajadores de la plataforma',
}

export default async function AmbassadorsPage() {
  const supabase = await createClient()

  // Fetch ambassadors with stats
  const { data: ambassadors, error } = await supabase
    .from('ambassadors')
    .select(`
      id,
      email,
      full_name,
      phone,
      type,
      university,
      institution,
      status,
      tier,
      referral_code,
      referrals_count,
      conversions_count,
      commission_rate,
      total_earned,
      total_paid,
      pending_payout,
      bank_name,
      bank_account,
      bank_holder_name,
      notes,
      approved_by,
      approved_at,
      created_at
    `)
    .order('created_at', { ascending: false })

  // Fetch referrals for funnel data
  const { data: referrals } = await supabase
    .from('ambassador_referrals')
    .select('id, status, created_at, converted_at, commission_amount')
    .order('created_at', { ascending: false })

  // Fetch payouts
  const { data: payouts } = await supabase
    .from('ambassador_payouts')
    .select('id, amount, status, created_at, completed_at')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-700">
        Error al cargar embajadores: {error.message}
      </div>
    )
  }

  // Calculate summary stats
  const stats = {
    total: ambassadors?.length || 0,
    pending: ambassadors?.filter((a) => a.status === 'pending').length || 0,
    active: ambassadors?.filter((a) => a.status === 'active').length || 0,
    totalEarned: ambassadors?.reduce((sum, a) => sum + Number(a.total_earned || 0), 0) || 0,
    totalPaid: ambassadors?.reduce((sum, a) => sum + Number(a.total_paid || 0), 0) || 0,
    pendingPayouts: ambassadors?.reduce((sum, a) => sum + Number(a.pending_payout || 0), 0) || 0,
    totalReferrals: ambassadors?.reduce((sum, a) => sum + (a.referrals_count || 0), 0) || 0,
    totalConversions: ambassadors?.reduce((sum, a) => sum + (a.conversions_count || 0), 0) || 0,
  }

  // Calculate funnel data
  const funnelData = {
    totalReferrals: referrals?.length || 0,
    pendingTrials: referrals?.filter((r) => r.status === 'pending' || r.status === 'trial_started').length || 0,
    converted: referrals?.filter((r) => r.status === 'converted').length || 0,
    expired: referrals?.filter((r) => r.status === 'expired' || r.status === 'cancelled').length || 0,
    conversionRate: referrals && referrals.length > 0
      ? (referrals.filter((r) => r.status === 'converted').length / referrals.length * 100).toFixed(1)
      : '0',
  }

  // Calculate top performers (active ambassadors sorted by conversions)
  const topPerformers = (ambassadors || [])
    .filter((a) => a.status === 'active')
    .sort((a, b) => (b.conversions_count || 0) - (a.conversions_count || 0))
    .slice(0, 5)
    .map((a) => ({
      id: a.id,
      name: a.full_name,
      tier: a.tier,
      conversions: a.conversions_count || 0,
      earned: Number(a.total_earned || 0),
      referrals: a.referrals_count || 0,
    }))

  // Tier distribution
  const tierDistribution = {
    embajador: ambassadors?.filter((a) => a.tier === 'embajador' && a.status === 'active').length || 0,
    promotor: ambassadors?.filter((a) => a.tier === 'promotor' && a.status === 'active').length || 0,
    super: ambassadors?.filter((a) => a.tier === 'super' && a.status === 'active').length || 0,
  }

  // Monthly conversions (last 6 months)
  const now = new Date()
  const monthlyData = []
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
    const monthReferrals = referrals?.filter((r) => {
      const created = new Date(r.created_at)
      return created >= monthStart && created <= monthEnd
    }) || []
    const monthConversions = referrals?.filter((r) => {
      if (!r.converted_at) return false
      const converted = new Date(r.converted_at)
      return converted >= monthStart && converted <= monthEnd
    }) || []

    monthlyData.push({
      month: monthStart.toLocaleDateString('es-PY', { month: 'short', year: '2-digit' }),
      referrals: monthReferrals.length,
      conversions: monthConversions.length,
      commission: monthConversions.reduce((sum, r) => sum + Number(r.commission_amount || 0), 0),
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Embajadores</h1>
        <p className="mt-1 text-[var(--text-muted)]">
          Gestiona las aplicaciones y el rendimiento de embajadores
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Embajadores"
          value={stats.total}
          color="blue"
        />
        <StatCard
          label="Pendientes"
          value={stats.pending}
          color="amber"
          highlight={stats.pending > 0}
        />
        <StatCard
          label="Conversiones"
          value={stats.totalConversions}
          color="green"
        />
        <StatCard
          label="Comisiones Pendientes"
          value={`Gs ${stats.pendingPayouts.toLocaleString()}`}
          color="purple"
        />
      </div>

      {/* Analytics Section */}
      <AmbassadorAnalytics
        funnelData={funnelData}
        topPerformers={topPerformers}
        tierDistribution={tierDistribution}
        monthlyData={monthlyData}
        stats={stats}
      />

      {/* Ambassador Management Client */}
      <AmbassadorAdminClient ambassadors={ambassadors || []} />
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
  highlight,
}: {
  label: string
  value: string | number
  color: 'blue' | 'green' | 'amber' | 'purple'
  highlight?: boolean
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    purple: 'bg-purple-50 text-purple-700',
  }

  return (
    <div
      className={`rounded-xl p-4 ${highlight ? 'ring-2 ring-amber-400' : ''} ${colorClasses[color]}`}
    >
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  )
}
