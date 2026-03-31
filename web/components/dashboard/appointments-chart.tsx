'use client'

/**
 * Appointments Chart
 *
 * RES-001: Migrated to React Query for data fetching
 * - Replaced useAsyncData with useQuery hook
 */

import { useState, useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Calendar } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { ErrorBoundary, LoadingSpinner } from '@/components/shared'
import { queryKeys } from '@/lib/queries'
import { staleTimes, gcTimes } from '@/lib/queries/utils'

interface AppointmentData {
  period_start: string
  total_appointments: number
  completed: number
  cancelled: number
  no_shows: number
  completion_rate: number
}

interface AppointmentsChartProps {
  clinic: string
}

export function AppointmentsChart({ clinic }: AppointmentsChartProps) {
  const t = useTranslations('dashboard.appointmentsChart')
  const locale = useLocale()
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week')

  // React Query: Fetch appointment chart data
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.dashboard.appointmentsChart(clinic, period),
    queryFn: async (): Promise<AppointmentData[]> => {
      const res = await fetch(`/api/dashboard/appointments?clinic=${clinic}&period=${period}`)
      if (!res.ok) {
        throw new Error('Failed to fetch appointment data')
      }
      return res.json()
    },
    staleTime: staleTimes.MEDIUM,
    gcTime: gcTimes.MEDIUM,
  })

  const localeStr = locale === 'es' ? 'es-PY' : 'en-US'

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    if (period === 'day') {
      return date.toLocaleDateString(localeStr, { weekday: 'short', day: 'numeric' })
    }
    return date.toLocaleDateString(localeStr, { month: 'short', day: 'numeric' })
  }

  // Build legend labels map
  const legendLabels: Record<string, string> = useMemo(() => ({
    completed: t('legend.completed'),
    cancelled: t('legend.cancelled'),
    no_shows: t('legend.noShows'),
  }), [t])

  if (error) {
    return (
      <div className="rounded-xl bg-[var(--bg-paper)] p-6 shadow-sm">
        <div className="flex h-64 items-center justify-center text-[var(--text-secondary)]">
          <div className="text-center">
            <p>{t('errorLoading')}</p>
            <button
              onClick={() => refetch()}
              className="mt-2 text-sm text-[var(--primary)] hover:underline"
            >
              {t('retry')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const chartData = (data || []).map((d) => ({
    ...d,
    date: formatDate(d.period_start),
  }))

  return (
    <ErrorBoundary>
      <div className="rounded-xl bg-[var(--bg-paper)] p-6 shadow-sm">
        {isLoading && (
          <div className="flex h-64 items-center justify-center">
            <LoadingSpinner text={t('loadingData')} />
          </div>
        )}

        {!isLoading && (
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[var(--text-secondary)]" />
              <h3 className="font-semibold text-[var(--text-primary)]">{t('title')}</h3>
            </div>
            <div className="flex gap-1 rounded-lg bg-[var(--bg-subtle)] p-1">
              {(['day', 'week', 'month'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`rounded-md px-3 py-1 text-sm transition-colors ${
                    period === p
                      ? 'bg-[var(--bg-paper)] text-[var(--text-primary)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {t(`period.${p}`)}
                </button>
              ))}
            </div>
          </div>
        )}

        {(data || []).length === 0 ? (
          <div className="flex h-64 items-center justify-center text-[var(--text-secondary)]">
            {t('noData')}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCancelled" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: '#6B7280' }}
                tickLine={false}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#6B7280' }}
                tickLine={false}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
                formatter={(value?: number, name?: string) => {
                  return [value ?? 0, legendLabels[name || ''] || name || '']
                }}
              />
              <Legend
                formatter={(value: string) => {
                  return legendLabels[value] || value
                }}
              />
              <Area
                type="monotone"
                dataKey="completed"
                stroke="#10B981"
                fill="url(#colorCompleted)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="cancelled"
                stroke="#EF4444"
                fill="url(#colorCancelled)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="no_shows"
                stroke="#F59E0B"
                fill="transparent"
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </ErrorBoundary>
  )
}
