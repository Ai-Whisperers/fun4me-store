'use client'

/**
 * Platform Statistics Cards
 *
 * Overview cards showing key platform metrics.
 */

import { Building2, Gift, CreditCard, TrendingUp } from 'lucide-react'

interface PlatformStats {
  totalTenants: number
  activeTenants: number
  trialTenants: number
  paidTenants: number
  totalReferrals: number
  convertedReferrals: number
  monthlyCommissionTotal: number
}

interface PlatformStatsCardsProps {
  stats: PlatformStats
}

export function PlatformStatsCards({ stats }: PlatformStatsCardsProps) {
  const conversionRate = stats.totalReferrals > 0
    ? ((stats.convertedReferrals / stats.totalReferrals) * 100).toFixed(1)
    : '0'

  const cards = [
    {
      name: 'Clínicas Activas',
      value: stats.activeTenants.toLocaleString(),
      subtext: `${stats.trialTenants} en prueba`,
      icon: Building2,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      name: 'Clínicas Pagando',
      value: stats.paidTenants.toLocaleString(),
      subtext: `${((stats.paidTenants / stats.activeTenants) * 100 || 0).toFixed(1)}% conversión`,
      icon: CreditCard,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      name: 'Referidos',
      value: stats.totalReferrals.toLocaleString(),
      subtext: `${stats.convertedReferrals} convertidos (${conversionRate}%)`,
      icon: Gift,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
    {
      name: 'Comisiones del Mes',
      value: `Gs ${stats.monthlyCommissionTotal.toLocaleString('es-PY')}`,
      subtext: 'E-commerce 3-5%',
      icon: TrendingUp,
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.name}
          className="rounded-lg border border-gray-200 bg-white p-5"
        >
          <div className="flex items-center gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${card.iconBg}`}>
              <card.icon className={`h-6 w-6 ${card.iconColor}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{card.name}</p>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-500">{card.subtext}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
