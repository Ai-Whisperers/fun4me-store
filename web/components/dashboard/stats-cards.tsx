'use client'

/**
 * Stats Cards Component
 *
 * RES-001: Migrated to React Query for data fetching
 * - Replaced useEffect+fetch with useQuery hook
 * - Native refetchInterval replaces setInterval
 */

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { DASHBOARD_ICONS } from '@/lib/icons'
import { queryKeys } from '@/lib/queries'
import { staleTimes, gcTimes } from '@/lib/queries/utils'

interface DashboardStats {
  total_pets: number
  appointments_today: number
  pending_vaccines: number
  pending_invoices: number
  pending_amount: number
  pets_change?: number
  appointments_change?: number
  completed_today?: number
}

interface StatsCardsProps {
  clinic: string
}

interface StatCardConfig {
  title: string
  value: number
  icon: typeof DASHBOARD_ICONS.users
  href: string
  gradient: string
  iconBg: string
  change?: number
  changeLabel?: string
  subvalue?: string
  alert?: boolean
  alertMessage?: string
  progress?: number
}

function TrendIndicator({ change, label }: { change?: number; label?: string }) {
  if (change === undefined) return null

  const isPositive = change > 0
  const isNeutral = change === 0

  const Icon = isNeutral
    ? DASHBOARD_ICONS.minus
    : isPositive
      ? DASHBOARD_ICONS.trendingUp
      : DASHBOARD_ICONS.trendingDown

  const colorClass = isNeutral
    ? 'text-[var(--text-muted)] bg-[var(--bg-subtle)]'
    : isPositive
      ? 'text-[var(--status-success)] bg-[var(--status-success-bg)]'
      : 'text-[var(--status-error)] bg-[var(--status-error-bg)]'

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}
    >
      <Icon className="h-3 w-3" />
      <span>{isNeutral ? '0%' : `${isPositive ? '+' : ''}${change}%`}</span>
      {label && <span className="ml-1 text-[var(--text-muted)]">{label}</span>}
    </div>
  )
}

function ProgressBar({
  value,
  max = 100,
  colorClass,
}: {
  value: number
  max?: number
  colorClass: string
}) {
  const percentage = Math.min((value / max) * 100, 100)

  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/30">
      <div
        className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

function StatCard({ card, clinic: _clinic }: { card: StatCardConfig; clinic: string }) {
  const Icon = card.icon

  return (
    <Link
      href={card.href}
      className={`group relative overflow-hidden rounded-2xl border border-white/20 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${card.gradient}`}
    >
      {/* Background decoration - increased opacity for premium feel */}
      <div className="absolute right-0 top-0 h-32 w-32 opacity-20">
        <Icon className="h-full w-full text-white" />
      </div>

      {/* Alert badge */}
      {card.alert && (
        <div className="absolute right-3 top-3 flex animate-pulse items-center gap-1 rounded-full bg-[var(--status-error)] px-2 py-1 text-xs text-white">
          <DASHBOARD_ICONS.alertTriangle className="h-3 w-3" />
          <span>{card.alertMessage || 'Atención'}</span>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="mb-3 flex items-start justify-between">
          <div className={`rounded-xl p-2.5 ${card.iconBg} shadow-sm`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <DASHBOARD_ICONS.arrowUpRight className="h-5 w-5 text-white/70" />
          </div>
        </div>

        {/* Value */}
        <div className="mb-1">
          <p className="text-3xl font-bold tracking-tight text-white">
            {card.value.toLocaleString()}
          </p>
          {card.subvalue && (
            <p className="mt-0.5 text-sm font-medium text-white/80">{card.subvalue}</p>
          )}
        </div>

        {/* Title & Trend */}
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-white/90">{card.title}</h3>
          {card.change !== undefined && (
            <TrendIndicator change={card.change} label={card.changeLabel} />
          )}
        </div>

        {/* Progress bar for certain cards */}
        {card.progress !== undefined && (
          <div className="mt-3">
            <ProgressBar value={card.progress} colorClass="bg-white/80" />
          </div>
        )}
      </div>
    </Link>
  )
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="to-[var(--bg-subtle)]/80 animate-pulse rounded-2xl bg-gradient-to-br from-[var(--bg-subtle)] p-5"
        >
          <div className="mb-3 flex items-start justify-between">
            <div className="h-10 w-10 rounded-xl bg-[var(--border-default)]" />
          </div>
          <div className="mb-2 h-9 w-20 rounded bg-[var(--border-default)]" />
          <div className="h-4 w-28 rounded bg-[var(--border-default)]" />
        </div>
      ))}
    </div>
  )
}

export function StatsCards({ clinic }: StatsCardsProps) {
  // React Query: Fetch stats with 2-minute auto-refresh
  const { data: stats, isLoading: loading } = useQuery({
    queryKey: queryKeys.dashboard.stats(clinic),
    queryFn: async (): Promise<DashboardStats> => {
      const res = await fetch(`/api/dashboard/stats?clinic=${clinic}`)
      if (!res.ok) throw new Error('Error al cargar estadísticas')
      return res.json()
    },
    staleTime: staleTimes.SHORT, // 30 seconds
    gcTime: gcTimes.SHORT, // 5 minutes
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
  })

  if (loading) {
    return <LoadingSkeleton />
  }

  const cards: StatCardConfig[] = [
    {
      title: 'Mascotas Registradas',
      value: stats?.total_pets || 0,
      icon: DASHBOARD_ICONS.pawPrint,
      href: `/${clinic}/dashboard/patients`,
      gradient: 'bg-gradient-to-br from-blue-500 to-blue-600',
      iconBg: 'bg-blue-600/50',
      change: stats?.pets_change,
      changeLabel: 'vs mes ant.',
    },
    {
      title: 'Citas Hoy',
      value: stats?.appointments_today || 0,
      icon: DASHBOARD_ICONS.calendarCheck,
      href: `/${clinic}/dashboard/calendar`,
      gradient: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
      iconBg: 'bg-emerald-600/50',
      change: stats?.appointments_change,
      changeLabel: 'vs ayer',
      progress:
        stats?.completed_today !== undefined
          ? (stats.completed_today / Math.max(stats.appointments_today, 1)) * 100
          : undefined,
    },
    {
      title: 'Vacunas Pendientes',
      value: stats?.pending_vaccines || 0,
      icon: DASHBOARD_ICONS.syringe,
      href: `/${clinic}/dashboard/vaccines`,
      gradient: 'bg-gradient-to-br from-amber-500 to-orange-500',
      iconBg: 'bg-amber-600/50',
      alert: (stats?.pending_vaccines || 0) > 10,
      alertMessage: 'Revisar',
    },
    {
      title: 'Facturas Pendientes',
      value: stats?.pending_invoices || 0,
      icon: DASHBOARD_ICONS.receipt,
      href: `/${clinic}/dashboard/billing`,
      gradient: 'bg-gradient-to-br from-violet-500 to-purple-600',
      iconBg: 'bg-violet-600/50',
      subvalue: stats?.pending_amount ? `Gs. ${stats.pending_amount.toLocaleString()}` : undefined,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, i) => (
        <StatCard key={i} card={card} clinic={clinic} />
      ))}
    </div>
  )
}
