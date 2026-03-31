'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import {
  PawPrint,
  Syringe,
  Users,
  Clock,
  AlertTriangle,
  TrendingUp,
  Loader2,
  AlertCircle,
  RefreshCcw,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts'
import { useTranslations, useLocale } from 'next-intl'
import { useFeatureFlags, UpgradePrompt } from '@/lib/features'

interface PatientAnalytics {
  speciesDistribution: { species: string; count: number; percentage: number }[]
  ageDistribution: { range: string; count: number; percentage: number }[]
  vaccinationCompliance: {
    upToDate: number
    overdue: number
    neverVaccinated: number
    complianceRate: number
  }
  returnVisitStats: {
    avgDaysBetweenVisits: number
    repeatVisitRate: number
    firstTimeVisitors: number
    returningVisitors: number
  }
  lostPatients: {
    count: number
    percentage: number
    recentlyLost: { name: string; lastVisit: string; ownerName: string }[]
  }
  newPatientsTrend: { date: string; count: number }[]
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4']

export default function PatientAnalyticsPage(): React.ReactElement {
  const params = useParams()
  const clinic = params?.clinic as string
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<PatientAnalytics | null>(null)
  const t = useTranslations('dashboard.patientAnalytics')
  const locale = useLocale()
  const { hasFeature, isLoading: featuresLoading, tierId } = useFeatureFlags()

  const fetchData = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/analytics/patients?clinic=${clinic}&period=${period}`)
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


  const vaccineComplianceData = [
    { name: t('vaccination.upToDate'), value: data.vaccinationCompliance.upToDate, color: '#10B981' },
    { name: t('vaccination.overdue'), value: data.vaccinationCompliance.overdue, color: '#F59E0B' },
    { name: t('vaccination.never'), value: data.vaccinationCompliance.neverVaccinated, color: '#EF4444' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[var(--primary)] bg-opacity-10 p-2">
            <PawPrint className="h-6 w-6 text-[var(--primary)]" />
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
          {(['week', 'month', 'quarter', 'year'] as const).map((p) => (
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
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('stats.totalPatients')}
          value={data.speciesDistribution.reduce((sum, s) => sum + s.count, 0)}
          icon={PawPrint}
          color="blue"
        />
        <StatCard
          title={t('stats.vaccineCompliance')}
          value={`${data.vaccinationCompliance.complianceRate}%`}
          icon={Syringe}
          color="green"
          subtitle={t('stats.upToDate')}
        />
        <StatCard
          title={t('stats.repeatVisitRate')}
          value={`${data.returnVisitStats.repeatVisitRate}%`}
          icon={Users}
          color="purple"
          subtitle={t('stats.returningPatients')}
        />
        <StatCard
          title={t('stats.avgDaysBetween')}
          value={data.returnVisitStats.avgDaysBetweenVisits}
          icon={Clock}
          color="orange"
          subtitle={t('stats.days')}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Species Distribution */}
        <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
            {t('charts.speciesDistribution')}
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.speciesDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  dataKey="count"
                  label={({ name, percent }) =>
                    `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  nameKey="species"
                >
                  {data.speciesDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [value, name]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Age Distribution */}
        <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
            {t('charts.ageDistribution')}
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.ageDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="range" tick={{ fontSize: 12 }} width={80} />
                <Tooltip
                  formatter={(value) => [value, t('stats.patients')]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Bar dataKey="count" fill="var(--primary)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Vaccination Compliance */}
        <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
            {t('charts.vaccinationCompliance')}
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={vaccineComplianceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {vaccineComplianceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* New Patients Trend */}
        <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
            {t('charts.newPatientsTrend')}
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.newPatientsTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => [value, t('stats.newPatients')]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Lost Patients Alert */}
      {data.lostPatients.count > 0 && (
        <div className="rounded-xl border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-[var(--status-warning)] bg-opacity-20 p-2">
              <AlertTriangle className="h-6 w-6 text-[var(--status-warning)]" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-[var(--status-warning-text)]">
                {t('lostPatients.title')}
              </h3>
              <p className="mt-1 text-sm text-[var(--status-warning-text)]">
                {t('lostPatients.description', {
                  count: data.lostPatients.count,
                  percentage: data.lostPatients.percentage,
                })}
              </p>

              {data.lostPatients.recentlyLost.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-[var(--status-warning-text)]">
                    {t('lostPatients.recentlyLost')}
                  </h4>
                  <ul className="mt-2 space-y-1">
                    {data.lostPatients.recentlyLost.map((patient, index) => (
                      <li key={index} className="text-sm text-[var(--status-warning-text)]">
                        • {patient.name} ({patient.ownerName}) - {t('lostPatients.lastVisit')}: {patient.lastVisit}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Return Visit Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl p-4 text-white" style={{ background: 'var(--gradient-blue)' }}>
          <TrendingUp className="mb-2 h-8 w-8 opacity-80" />
          <p className="text-2xl font-bold">{data.returnVisitStats.returningVisitors}</p>
          <p className="text-sm opacity-80">{t('stats.returningPatients')}</p>
        </div>
        <div className="rounded-xl p-4 text-white" style={{ background: 'var(--gradient-green)' }}>
          <Users className="mb-2 h-8 w-8 opacity-80" />
          <p className="text-2xl font-bold">{data.returnVisitStats.firstTimeVisitors}</p>
          <p className="text-sm opacity-80">{t('stats.firstTimeVisitors')}</p>
        </div>
        <div className="rounded-xl p-4 text-white" style={{ background: 'var(--gradient-purple)' }}>
          <Syringe className="mb-2 h-8 w-8 opacity-80" />
          <p className="text-2xl font-bold">{data.vaccinationCompliance.overdue}</p>
          <p className="text-sm opacity-80">{t('stats.overdueVaccines')}</p>
        </div>
        <div className="rounded-xl p-4 text-white" style={{ background: 'var(--gradient-orange)' }}>
          <AlertTriangle className="mb-2 h-8 w-8 opacity-80" />
          <p className="text-2xl font-bold">{data.lostPatients.count}</p>
          <p className="text-sm opacity-80">{t('stats.lostPatients')}</p>
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
  value: number | string
  icon: React.ElementType
  color: 'blue' | 'green' | 'purple' | 'orange'
  subtitle?: string
}): React.ReactElement {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  }

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--text-secondary)]">{title}</p>
          <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-[var(--text-muted)]">{subtitle}</p>
          )}
        </div>
        <div className={`rounded-lg p-3 ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  )
}
