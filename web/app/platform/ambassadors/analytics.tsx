'use client'

import { TrendingUp, ArrowDownRight, ArrowUpRight } from 'lucide-react'

interface FunnelData {
  totalReferrals: number
  pendingTrials: number
  converted: number
  expired: number
  conversionRate: string
}

interface TopPerformer {
  id: string
  name: string
  tier: string
  conversions: number
  earned: number
  referrals: number
}

interface MonthlyData {
  month: string
  referrals: number
  conversions: number
  commission: number
}

interface TierDistribution {
  embajador: number
  promotor: number
  super: number
}

interface Stats {
  total: number
  active: number
  totalEarned: number
  totalPaid: number
  pendingPayouts: number
  totalReferrals: number
  totalConversions: number
}

interface AmbassadorAnalyticsProps {
  funnelData: FunnelData
  topPerformers: TopPerformer[]
  tierDistribution: TierDistribution
  monthlyData: MonthlyData[]
  stats: Stats
}

const TIER_COLORS: Record<string, string> = {
  embajador: 'bg-blue-500',
  promotor: 'bg-purple-500',
  super: 'bg-yellow-500',
}

const TIER_LABELS: Record<string, string> = {
  embajador: 'Embajador',
  promotor: 'Promotor',
  super: 'Super',
}

export function AmbassadorAnalytics({
  funnelData,
  topPerformers,
  tierDistribution,
  monthlyData,
  stats,
}: AmbassadorAnalyticsProps) {
  const totalTiers = tierDistribution.embajador + tierDistribution.promotor + tierDistribution.super

  // Calculate max values for chart scaling
  const maxReferrals = Math.max(...monthlyData.map((d) => d.referrals), 1)
  const maxConversions = Math.max(...monthlyData.map((d) => d.conversions), 1)

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-[var(--primary)]" />
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Analytics</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Conversion Funnel */}
        <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] p-6">
          <h3 className="mb-4 font-semibold text-[var(--text-primary)]">Embudo de Conversión</h3>

          <div className="space-y-3">
            <FunnelBar
              label="Referidos Totales"
              value={funnelData.totalReferrals}
              percentage={100}
              color="bg-blue-500"
            />
            <FunnelBar
              label="En Trial"
              value={funnelData.pendingTrials}
              percentage={funnelData.totalReferrals > 0 ? (funnelData.pendingTrials / funnelData.totalReferrals) * 100 : 0}
              color="bg-amber-500"
            />
            <FunnelBar
              label="Convertidos"
              value={funnelData.converted}
              percentage={funnelData.totalReferrals > 0 ? (funnelData.converted / funnelData.totalReferrals) * 100 : 0}
              color="bg-green-500"
            />
            <FunnelBar
              label="Expirados/Cancelados"
              value={funnelData.expired}
              percentage={funnelData.totalReferrals > 0 ? (funnelData.expired / funnelData.totalReferrals) * 100 : 0}
              color="bg-red-400"
            />
          </div>

          <div className="mt-4 flex items-center justify-between rounded-lg bg-green-50 p-3">
            <span className="text-sm font-medium text-green-700">Tasa de Conversión</span>
            <span className="text-xl font-bold text-green-700">{funnelData.conversionRate}%</span>
          </div>
        </div>

        {/* Top Performers */}
        <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] p-6">
          <h3 className="mb-4 font-semibold text-[var(--text-primary)]">Top Embajadores</h3>

          {topPerformers.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-[var(--text-muted)]">
              No hay embajadores activos con conversiones
            </div>
          ) : (
            <div className="space-y-3">
              {topPerformers.map((performer, index) => (
                <div
                  key={performer.id}
                  className="flex items-center gap-3 rounded-lg bg-[var(--bg-secondary)] p-3"
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : 'bg-gray-300'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[var(--text-primary)]">{performer.name}</span>
                      <span className={`rounded px-1.5 py-0.5 text-xs font-medium text-white ${TIER_COLORS[performer.tier]}`}>
                        {TIER_LABELS[performer.tier]}
                      </span>
                    </div>
                    <div className="flex gap-3 text-xs text-[var(--text-muted)]">
                      <span>{performer.referrals} referidos</span>
                      <span>•</span>
                      <span className="text-green-600">{performer.conversions} conversiones</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-[var(--text-primary)]">
                      Gs {performer.earned.toLocaleString()}
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">ganado</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Monthly Trend Chart */}
        <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] p-6">
          <h3 className="mb-4 font-semibold text-[var(--text-primary)]">Tendencia Mensual</h3>

          <div className="flex h-48 items-end gap-2">
            {monthlyData.map((month, index) => {
              const referralHeight = (month.referrals / maxReferrals) * 100
              const conversionHeight = (month.conversions / maxConversions) * 100

              return (
                <div key={index} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-40 w-full items-end justify-center gap-1">
                    {/* Referrals bar */}
                    <div
                      className="w-3 rounded-t bg-blue-300 transition-all"
                      style={{ height: `${Math.max(referralHeight, 4)}%` }}
                      title={`${month.referrals} referidos`}
                    />
                    {/* Conversions bar */}
                    <div
                      className="w-3 rounded-t bg-green-500 transition-all"
                      style={{ height: `${Math.max(conversionHeight, 4)}%` }}
                      title={`${month.conversions} conversiones`}
                    />
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">{month.month}</span>
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex justify-center gap-6 text-xs">
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-blue-300" />
              <span className="text-[var(--text-muted)]">Referidos</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-green-500" />
              <span className="text-[var(--text-muted)]">Conversiones</span>
            </div>
          </div>
        </div>

        {/* Tier Distribution & Financial Summary */}
        <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] p-6">
          <h3 className="mb-4 font-semibold text-[var(--text-primary)]">Distribución por Tier</h3>

          {/* Tier bars */}
          <div className="mb-6 space-y-3">
            {(['embajador', 'promotor', 'super'] as const).map((tier) => {
              const count = tierDistribution[tier]
              const percentage = totalTiers > 0 ? (count / totalTiers) * 100 : 0

              return (
                <div key={tier} className="flex items-center gap-3">
                  <div className="w-20 text-sm font-medium text-[var(--text-secondary)]">
                    {TIER_LABELS[tier]}
                  </div>
                  <div className="flex-1">
                    <div className="h-6 overflow-hidden rounded-full bg-[var(--bg-secondary)]">
                      <div
                        className={`h-full ${TIER_COLORS[tier]} transition-all`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-12 text-right text-sm font-semibold text-[var(--text-primary)]">
                    {count}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Financial Summary */}
          <div className="rounded-lg bg-[var(--bg-secondary)] p-4">
            <h4 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Resumen Financiero</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-[var(--text-muted)]">Total Ganado</div>
                <div className="flex items-center gap-1 text-lg font-bold text-green-600">
                  <ArrowUpRight className="h-4 w-4" />
                  Gs {stats.totalEarned.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-[var(--text-muted)]">Total Pagado</div>
                <div className="flex items-center gap-1 text-lg font-bold text-blue-600">
                  <ArrowDownRight className="h-4 w-4" />
                  Gs {stats.totalPaid.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FunnelBar({
  label,
  value,
  percentage,
  color,
}: {
  label: string
  value: number
  percentage: number
  color: string
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-[var(--text-secondary)]">{label}</span>
        <span className="font-semibold text-[var(--text-primary)]">{value}</span>
      </div>
      <div className="h-4 overflow-hidden rounded-full bg-[var(--bg-secondary)]">
        <div
          className={`h-full ${color} transition-all`}
          style={{ width: `${Math.max(percentage, 2)}%` }}
        />
      </div>
    </div>
  )
}
