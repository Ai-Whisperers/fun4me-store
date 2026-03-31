'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  RefreshCcw,
  Calendar,
  Timer,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  Legend,
  ComposedChart,
} from 'recharts'
import { useTranslations, useLocale } from 'next-intl'
import { useFeatureFlags, UpgradePrompt } from '@/lib/features'

interface OperationsAnalytics {
  appointmentMetrics: {
    total: number
    completed: number
    noShows: number
    cancelled: number
    completionRate: number
    noShowRate: number
    cancellationRate: number
  }
  peakHoursData: { hour: number; dayOfWeek: number; count: number }[]
  vetUtilization: {
    vetId: string
    vetName: string
    appointments: number
    totalMinutes: number
    utilizationRate: number
  }[]
  serviceDurationAccuracy: {
    avgActualDuration: number
    avgExpectedDuration: number
    accuracyRate: number
    overtimeAppointments: number
    undertimeAppointments: number
  }
  appointmentsByDayOfWeek: { day: string; appointments: number; revenue: number }[]
}

const dayLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export default function OperationsAnalyticsPage(): React.ReactElement {
  const params = useParams()
  const clinic = params?.clinic as string
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('month')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<OperationsAnalytics | null>(null)
  const t = useTranslations('dashboard.operationsAnalytics')
  const locale = useLocale()
  const { hasFeature, isLoading: featuresLoading, tierId } = useFeatureFlags()

  const formatCurrency = (value: number): string => {
    const localeStr = locale === 'es' ? 'es-PY' : 'en-US'
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M Gs.`
    }
    return `${value.toLocaleString(localeStr)} Gs.`
  }

  const fetchData = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/analytics/operations?clinic=${clinic}&period=${period}`)
      if (!response.ok) {
        throw new Error('Error al cargar datos')
      }
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
    }
  }, [clinic, period])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (isLoading || featuresLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  if (!hasFeature('analyticsBasic')) {
    return (
      <div className="container mx-auto px-4 py-8">
        <UpgradePrompt feature="analyticsBasic" currentTier={tierId} className="mx-auto max-w-lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-[var(--status-error)]" />
        <p className="text-[var(--text-secondary)]">{error}</p>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-white hover:bg-[var(--primary-dark)]"
        >
          <RefreshCcw className="h-4 w-4" />
          {t('retry')}
        </button>
      </div>
    )
  }

  if (!data) return <></>


  // Transform peak hours data for heatmap display
  const peakHoursMatrix = getPeakHoursMatrix(data.peakHoursData)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[var(--primary)] bg-opacity-10 p-2">
            <Clock className="h-6 w-6 text-[var(--primary)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t('title')}</h1>
            <p className="text-sm text-[var(--text-secondary)]">{t('subtitle')}</p>
          </div>
        </div>

        {/* Period Selector */}
        <div
          className="flex items-center gap-2 rounded-lg p-1"
          style={{ backgroundColor: 'var(--bg-subtle)' }}
        >
          {(['week', 'month', 'quarter'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-white text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t(`period.${p}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          title={t('stats.completionRate')}
          value={`${data.appointmentMetrics.completionRate}%`}
          icon={CheckCircle}
          color="green"
          subtitle={`${data.appointmentMetrics.completed} ${t('stats.appointments')}`}
        />
        <StatCard
          title={t('stats.noShowRate')}
          value={`${data.appointmentMetrics.noShowRate}%`}
          icon={AlertTriangle}
          color="orange"
          subtitle={`${data.appointmentMetrics.noShows} ${t('stats.noShows')}`}
        />
        <StatCard
          title={t('stats.cancellationRate')}
          value={`${data.appointmentMetrics.cancellationRate}%`}
          icon={XCircle}
          color="red"
          subtitle={`${data.appointmentMetrics.cancelled} ${t('stats.cancelled')}`}
        />
        <StatCard
          title={t('stats.durationAccuracy')}
          value={`${data.serviceDurationAccuracy.accuracyRate}%`}
          icon={Timer}
          color="blue"
          subtitle={t('stats.onSchedule')}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Appointments by Day */}
        <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
            {t('charts.appointmentsByDay')}
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.appointmentsByDayOfWeek}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === 'revenue') return [formatCurrency(value as number), t('stats.revenue')]
                    return [value, t('stats.appointments')]
                  }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="appointments"
                  fill="var(--primary)"
                  name={t('stats.appointments')}
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10B981"
                  strokeWidth={2}
                  name={t('stats.revenue')}
                  dot={{ r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vet Utilization */}
        <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
            {t('charts.vetUtilization')}
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.vetUtilization} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="vetName" tick={{ fontSize: 12 }} width={100} />
                <Tooltip
                  formatter={(value) => [`${value}%`, t('stats.utilization')]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Bar
                  dataKey="utilizationRate"
                  fill="var(--primary)"
                  radius={[0, 4, 4, 0]}
                  background={{ fill: '#f3f4f6' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Peak Hours Heatmap */}
      <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
          {t('charts.peakHours')}
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="w-20 p-2 text-left text-xs font-medium text-[var(--text-secondary)]">
                  {t('charts.hour')}
                </th>
                {dayLabels.map((day) => (
                  <th
                    key={day}
                    className="p-2 text-center text-xs font-medium text-[var(--text-secondary)]"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {peakHoursMatrix.map((row) => (
                <tr key={row.hour}>
                  <td className="p-2 text-xs text-[var(--text-secondary)]">
                    {row.hour}:00
                  </td>
                  {row.days.map((count, dayIndex) => (
                    <td key={dayIndex} className="p-1">
                      <div
                        className="mx-auto h-8 w-full max-w-12 rounded"
                        style={{
                          backgroundColor: getHeatmapColor(count, peakHoursMatrix),
                        }}
                        title={`${count} ${t('stats.appointments')}`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[var(--text-secondary)]">
            <span>{t('charts.low')}</span>
            <div className="flex gap-1">
              {[0.1, 0.3, 0.5, 0.7, 0.9].map((intensity) => (
                <div
                  key={intensity}
                  className="h-4 w-4 rounded"
                  style={{
                    backgroundColor: `rgba(59, 130, 246, ${intensity})`,
                  }}
                />
              ))}
            </div>
            <span>{t('charts.high')}</span>
          </div>
        </div>
      </div>

      {/* Service Duration Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl p-4 text-white" style={{ background: 'var(--gradient-blue)' }}>
          <Timer className="mb-2 h-8 w-8 opacity-80" />
          <p className="text-2xl font-bold">{data.serviceDurationAccuracy.avgActualDuration} min</p>
          <p className="text-sm opacity-80">{t('stats.avgActual')}</p>
        </div>
        <div className="rounded-xl p-4 text-white" style={{ background: 'var(--gradient-green)' }}>
          <Calendar className="mb-2 h-8 w-8 opacity-80" />
          <p className="text-2xl font-bold">{data.serviceDurationAccuracy.avgExpectedDuration} min</p>
          <p className="text-sm opacity-80">{t('stats.avgExpected')}</p>
        </div>
        <div className="rounded-xl p-4 text-white" style={{ background: 'var(--gradient-orange)' }}>
          <AlertTriangle className="mb-2 h-8 w-8 opacity-80" />
          <p className="text-2xl font-bold">{data.serviceDurationAccuracy.overtimeAppointments}</p>
          <p className="text-sm opacity-80">{t('stats.overtime')}</p>
        </div>
        <div className="rounded-xl p-4 text-white" style={{ background: 'var(--gradient-purple)' }}>
          <Clock className="mb-2 h-8 w-8 opacity-80" />
          <p className="text-2xl font-bold">{data.serviceDurationAccuracy.undertimeAppointments}</p>
          <p className="text-sm opacity-80">{t('stats.undertime')}</p>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  title: string
  value: string
  icon: React.ElementType
  color: 'green' | 'orange' | 'red' | 'blue'
  subtitle?: string
}): React.ReactElement {
  const colorClasses = {
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
    red: 'bg-red-100 text-red-600',
    blue: 'bg-blue-100 text-blue-600',
  }

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-[var(--text-secondary)]">{title}</p>
          <p className="mt-1 text-xl font-bold text-[var(--text-primary)]">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-[var(--text-muted)]">{subtitle}</p>
          )}
        </div>
        <div className={`rounded-lg p-2 ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function getPeakHoursMatrix(
  data: { hour: number; dayOfWeek: number; count: number }[]
): { hour: number; days: number[] }[] {
  const result: { hour: number; days: number[] }[] = []

  for (let hour = 7; hour <= 20; hour++) {
    const days: number[] = []
    for (let day = 0; day < 7; day++) {
      const item = data.find((d) => d.hour === hour && d.dayOfWeek === day)
      days.push(item?.count || 0)
    }
    result.push({ hour, days })
  }

  return result
}

function getHeatmapColor(
  count: number,
  matrix: { hour: number; days: number[] }[]
): string {
  if (count === 0) return '#f3f4f6'

  // Find max value for normalization
  const maxValue = Math.max(...matrix.flatMap((row) => row.days))
  if (maxValue === 0) return '#f3f4f6'

  const intensity = count / maxValue
  return `rgba(59, 130, 246, ${Math.max(0.1, intensity)})`
}
