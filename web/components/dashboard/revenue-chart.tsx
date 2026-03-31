'use client'

/**
 * Revenue Chart Component
 *
 * RES-001: Migrated to React Query for data fetching
 * - Replaced useEffect+fetch with useQuery hook
 */

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { DollarSign, TrendingUp } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queries'
import { staleTimes, gcTimes } from '@/lib/queries/utils'

interface RevenueData {
  period_month: string
  total_revenue: number
  transaction_count: number
  avg_transaction: number
  by_payment_method?: Record<string, number>
}

interface RevenueChartProps {
  clinic: string
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1)
  return date.toLocaleDateString('es-PY', { month: 'short' })
}

const colors = ['#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE', '#EDE9FE', '#F5F3FF']

export function RevenueChart({ clinic }: RevenueChartProps) {
  // React Query: Fetch revenue chart data
  const { data = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.dashboard.revenueChart(clinic, 6),
    queryFn: async (): Promise<RevenueData[]> => {
      const res = await fetch(`/api/dashboard/revenue?clinic=${clinic}&months=6`)
      if (!res.ok) throw new Error('Error al cargar ingresos')
      const result = await res.json()
      return result.reverse() // Oldest first for chart
    },
    staleTime: staleTimes.LONG, // 10 minutes
    gcTime: gcTimes.LONG, // 30 minutes
  })

  // Memoized chart data transformations
  const chartData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      month: formatMonth(d.period_month),
      revenue: d.total_revenue,
    }))
  }, [data])

  const totalRevenue = useMemo(() => data.reduce((sum, d) => sum + d.total_revenue, 0), [data])
  const avgMonthly = useMemo(() => (data.length > 0 ? totalRevenue / data.length : 0), [data, totalRevenue])

  // Calculate growth
  const growth = useMemo(() => {
    if (data.length >= 2) {
      const current = data[data.length - 1]?.total_revenue || 0
      const previous = data[data.length - 2]?.total_revenue || 1
      return ((current - previous) / previous) * 100
    }
    return 0
  }, [data])

  if (loading) {
    return (
      <div className="rounded-xl bg-[var(--bg-paper)] p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="mb-4 h-6 w-1/4 rounded bg-[var(--bg-subtle)]"></div>
          <div className="h-64 rounded bg-[var(--border-light,#f3f4f6)]"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-[var(--bg-paper)] p-6 shadow-sm">
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-[var(--text-secondary)]" />
          <h3 className="font-semibold text-[var(--text-primary)]">Ingresos</h3>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            Gs. {avgMonthly.toLocaleString('es-PY', { maximumFractionDigits: 0 })}
          </p>
          <div
            className={`flex items-center justify-end text-sm ${
              growth >= 0
                ? 'text-[var(--status-success,#22c55e)]'
                : 'text-[var(--status-error,#ef4444)]'
            }`}
          >
            <TrendingUp className="mr-1 h-4 w-4" />
            {growth.toFixed(1)}% vs mes anterior
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-[var(--text-secondary)]">
          No hay datos de ingresos para mostrar
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: '#6B7280' }}
              tickLine={false}
              axisLine={{ stroke: '#E5E7EB' }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#6B7280' }}
              tickLine={false}
              axisLine={{ stroke: '#E5E7EB' }}
              tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
              formatter={(value?: number) => [
                `Gs. ${(value ?? 0).toLocaleString('es-PY')}`,
                'Ingresos',
              ]}
              labelFormatter={(label) => `Mes: ${label}`}
            />
            <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Summary stats */}
      <div className="mt-6 grid grid-cols-3 gap-4 border-t border-[var(--border-light,#f3f4f6)] pt-6">
        <div className="text-center">
          <p className="text-sm text-[var(--text-secondary)]">Total período</p>
          <p className="font-semibold text-[var(--text-primary)]">
            Gs. {totalRevenue.toLocaleString('es-PY', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-[var(--text-secondary)]">Transacciones</p>
          <p className="font-semibold text-[var(--text-primary)]">
            {data.reduce((sum, d) => sum + d.transaction_count, 0)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-[var(--text-secondary)]">Ticket promedio</p>
          <p className="font-semibold text-[var(--text-primary)]">
            Gs.{' '}
            {(
              data.reduce((sum, d) => sum + parseFloat(String(d.avg_transaction)), 0) /
              (data.length || 1)
            ).toLocaleString('es-PY', { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>
    </div>
  )
}
