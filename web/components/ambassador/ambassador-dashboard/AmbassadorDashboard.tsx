/**
 * Ambassador Dashboard Component
 *
 * Main orchestrator for ambassador dashboard view.
 */

'use client'

import { Clock, AlertCircle, Award } from 'lucide-react'
import { useAmbassadorData } from './use-ambassador-data'
import { ReferralCodeCard } from './ReferralCodeCard'
import { StatsGrid } from './StatsGrid'
import { RecentReferrals } from './RecentReferrals'
import { HowItWorks } from './HowItWorks'
import { tierStyles, tierLabels } from './utils'

function TierBadge({ tier }: { tier: string }) {
  const style = tierStyles[tier] || tierStyles.embajador
  const label = tierLabels[tier] || tier

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-semibold ${style}`}>
      <Award className="h-4 w-4" />
      {label}
    </span>
  )
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-48 rounded-xl bg-gray-200" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-lg bg-gray-200" />
        ))}
      </div>
    </div>
  )
}

function ErrorState({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
      <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
      <h3 className="mt-4 text-lg font-semibold text-red-800">Error</h3>
      <p className="mt-2 text-red-600">{error || 'No se pudo cargar el perfil de embajador'}</p>
      <button
        onClick={onRetry}
        className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
      >
        Reintentar
      </button>
    </div>
  )
}

function PendingApprovalState({ referralCode }: { referralCode: string }) {
  return (
    <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-8 text-center">
      <Clock className="mx-auto h-12 w-12 text-yellow-500" />
      <h3 className="mt-4 text-lg font-semibold text-yellow-800">Cuenta Pendiente de Aprobación</h3>
      <p className="mt-2 text-yellow-700">
        Tu registro como embajador está siendo revisado. Te notificaremos por email cuando sea aprobado.
      </p>
      <div className="mt-4 rounded-lg bg-white p-4 text-left">
        <p className="text-sm text-gray-600">
          <strong>Tu código de referido:</strong> {referralCode}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          (Estará activo cuando tu cuenta sea aprobada)
        </p>
      </div>
    </div>
  )
}

export function AmbassadorDashboard() {
  const {
    ambassador,
    stats,
    referrals,
    isLoading,
    copied,
    error,
    fetchData,
    copyCode,
    shareCode,
  } = useAmbassadorData()

  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (error || !ambassador) {
    return <ErrorState error={error} onRetry={fetchData} />
  }

  if (ambassador.status === 'pending') {
    return <PendingApprovalState referralCode={ambassador.referral_code} />
  }

  return (
    <div className="space-y-6">
      {/* Header with Tier Badge */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            ¡Hola, {ambassador.full_name.split(' ')[0]}!
          </h1>
          <p className="text-gray-600">Panel de Embajador</p>
        </div>
        <TierBadge tier={ambassador.tier} />
      </div>

      {/* Referral Code Card */}
      <ReferralCodeCard
        ambassador={ambassador}
        stats={stats}
        copied={copied}
        onCopyCode={copyCode}
        onShareCode={shareCode}
      />

      {/* Stats Grid */}
      {stats && <StatsGrid stats={stats} />}

      {/* Recent Referrals */}
      <RecentReferrals referrals={referrals} />

      {/* How it Works */}
      <HowItWorks commissionRate={stats?.commission_rate || 30} />
    </div>
  )
}

export default AmbassadorDashboard
