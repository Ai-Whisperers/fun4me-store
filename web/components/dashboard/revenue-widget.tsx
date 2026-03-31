'use client'

/**
 * Revenue Widget Component
 *
 * RES-001: Migrated to React Query for data fetching
 * - Replaced useEffect+fetch with useQuery hook
 * - Native refetchInterval replaces setInterval
 */

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
  CreditCard,
  Clock,
} from 'lucide-react'
import { queryKeys } from '@/lib/queries'
import { staleTimes, gcTimes } from '@/lib/queries/utils'

interface RevenueData {
  today: number
  week: number
  month: number
  todayChange?: number
  weekChange?: number
  monthChange?: number
  pendingAmount?: number
  pendingCount?: number
  recentPayments?: Array<{
    id: string
    amount: number
    method: string
    timestamp: string
    clientName?: string
  }>
}

interface RevenueWidgetProps {
  clinic: string
}

function formatCurrency(amount: number): string {
  return `Gs. ${amount.toLocaleString('es-PY')}`
}

function formatCompactCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `Gs. ${(amount / 1000000).toFixed(1)}M`
  }
  if (amount >= 1000) {
    return `Gs. ${(amount / 1000).toFixed(0)}K`
  }
  return `Gs. ${amount.toLocaleString()}`
}

function TrendBadge({ change }: { change?: number }) {
  if (change === undefined) return null

  const isPositive = change > 0
  const isNeutral = change === 0

  const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown
  const colorClass = isNeutral
    ? 'text-white/70 bg-white/20'
    : isPositive
      ? 'text-[var(--status-success)] bg-[var(--status-success-bg)]'
      : 'text-[var(--status-error)] bg-[var(--status-error-bg)]'

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium ${colorClass}`}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(change)}%
    </span>
  )
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="text-center">
            <div className="mx-auto mb-2 h-3 w-12 rounded bg-white/20" />
            <div className="mx-auto mb-1 h-6 w-20 rounded bg-white/20" />
            <div className="mx-auto h-3 w-10 rounded bg-white/20" />
          </div>
        ))}
      </div>
      <div className="h-20 rounded-xl bg-white/10" />
    </div>
  )
}

export function RevenueWidget({ clinic }: RevenueWidgetProps) {
  // React Query: Fetch revenue data with 5-minute auto-refresh
  const { data, isLoading: loading } = useQuery({
    queryKey: queryKeys.dashboard.revenue(clinic, 'overview'),
    queryFn: async (): Promise<RevenueData> => {
      const res = await fetch(`/api/dashboard/revenue?clinic=${clinic}`)
      if (!res.ok) throw new Error('Error al cargar datos de ingresos')
      return res.json()
    },
    staleTime: staleTimes.SHORT, // 30 seconds
    gcTime: gcTimes.MEDIUM, // 15 minutes
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  })

  return (
    <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-white/20 p-2">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold">Ingresos</h3>
            <p className="text-xs text-white/70">Resumen financiero</p>
          </div>
        </div>
        <Link
          href={`/${clinic}/dashboard/billing`}
          className="rounded-lg p-2 transition-colors hover:bg-white/10"
          title="Ver detalles"
        >
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Content */}
      <div className="p-5">
        {loading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* Revenue Grid */}
            <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-4">
              <div className="text-center">
                <p className="mb-1 text-xs text-white/70">Hoy</p>
                <p className="text-lg font-bold">{formatCompactCurrency(data?.today || 0)}</p>
                <TrendBadge change={data?.todayChange} />
              </div>
              <div className="border-l border-r border-white/20 text-center">
                <p className="mb-1 text-xs text-white/70">Esta Semana</p>
                <p className="text-lg font-bold">{formatCompactCurrency(data?.week || 0)}</p>
                <TrendBadge change={data?.weekChange} />
              </div>
              <div className="text-center">
                <p className="mb-1 text-xs text-white/70">Este Mes</p>
                <p className="text-lg font-bold">{formatCompactCurrency(data?.month || 0)}</p>
                <TrendBadge change={data?.monthChange} />
              </div>
            </div>

            {/* Pending Amount */}
            {(data?.pendingAmount || 0) > 0 && (
              <Link
                href={`/${clinic}/dashboard/billing?status=pending`}
                className="mb-4 flex items-center justify-between rounded-xl bg-white/10 p-3 transition-colors hover:bg-white/20"
              >
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-white/70" />
                  <span className="text-sm">Pagos pendientes</span>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatCompactCurrency(data?.pendingAmount || 0)}</p>
                  <p className="text-xs text-white/70">{data?.pendingCount || 0} facturas</p>
                </div>
              </Link>
            )}

            {/* Recent Payments */}
            {data?.recentPayments && data.recentPayments.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-white/70">Pagos recientes</p>
                <div className="space-y-2">
                  {data.recentPayments.slice(0, 3).map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between rounded-lg bg-white/5 p-2"
                    >
                      <div className="flex items-center gap-2">
                        <div className="rounded bg-white/10 p-1.5">
                          <CreditCard className="h-3 w-3" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{payment.clientName || 'Cliente'}</p>
                          <p className="text-xs text-white/60">{payment.method}</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold">+{formatCompactCurrency(payment.amount)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
