'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import {
  Calendar,
  DollarSign,
  Users,
  PawPrint,
  Activity,
  Package,
  Loader2,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingCart,
  ArrowRight,
  Download,
} from 'lucide-react'
import Link from 'next/link'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useTranslations, useLocale } from 'next-intl'
import { useFeatureFlags, UpgradePrompt } from '@/lib/features'
import { AnalyticsExportModal } from '@/components/analytics/analytics-pdf'

interface Stats {
  revenue: {
    current: number
    previous: number
    change: number
  }
  appointments: {
    current: number
    previous: number
    change: number
  }
  newClients: {
    current: number
    previous: number
    change: number
  }
  newPets: {
    current: number
    previous: number
    change: number
  }
}

interface ChartData {
  revenueByDay: Array<{ date: string; amount: number }>
  appointmentsByType: Array<{ type: string; count: number; color: string }>
  topServices: Array<{ name: string; revenue: number; count: number }>
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

export default function AnalyticsPage(): React.ReactElement {
  const params = useParams()
  const clinic = params?.clinic as string
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('month')
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<Stats | null>(null)
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const t = useTranslations('dashboard.analytics')
  const locale = useLocale()
  const { hasFeature, isLoading: featuresLoading, tierId } = useFeatureFlags()

  useEffect(() => {
    const fetchAnalytics = async (): Promise<void> => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/analytics?clinic=${clinic}&period=${period}`)
        if (response.ok) {
          const data = await response.json()
          setStats(data.stats)
          setChartData(data.chartData)
        } else {
          // Use mock data for demo
          setStats({
            revenue: { current: 45680000, previous: 38500000, change: 18.6 },
            appointments: { current: 156, previous: 142, change: 9.9 },
            newClients: { current: 23, previous: 18, change: 27.8 },
            newPets: { current: 31, previous: 25, change: 24.0 },
          })
          setChartData({
            revenueByDay: [
              { date: 'Lun', amount: 5200000 },
              { date: 'Mar', amount: 7100000 },
              { date: 'Mié', amount: 6800000 },
              { date: 'Jue', amount: 8500000 },
              { date: 'Vie', amount: 9200000 },
              { date: 'Sáb', amount: 6500000 },
              { date: 'Dom', amount: 2380000 },
            ],
            appointmentsByType: [
              { type: 'Consulta General', count: 45, color: '#3B82F6' },
              { type: 'Vacunación', count: 32, color: '#10B981' },
              { type: 'Cirugía', count: 12, color: '#F59E0B' },
              { type: 'Emergencia', count: 8, color: '#EF4444' },
              { type: 'Laboratorio', count: 25, color: '#8B5CF6' },
              { type: 'Grooming', count: 34, color: '#EC4899' },
            ],
            topServices: [
              { name: 'Consulta General', revenue: 12500000, count: 45 },
              { name: 'Vacuna Polivalente', revenue: 8600000, count: 32 },
              { name: 'Cirugía Menor', revenue: 7200000, count: 12 },
              { name: 'Hemograma', revenue: 4500000, count: 25 },
              { name: 'Baño y Corte', revenue: 3400000, count: 34 },
            ],
          })
        }
      } catch (error) {
        // Client-side error logging - only in development
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching analytics:', error)
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnalytics()
  }, [clinic, period])

  const formatCurrency = (value: number): string => {
    const localeStr = locale === 'es' ? 'es-PY' : 'en-US'
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M Gs.`
    }
    return `${value.toLocaleString(localeStr)} Gs.`
  }

  const StatCard = ({
    title,
    value,
    change,
    icon: Icon,
    format = 'number',
  }: {
    title: string
    value: number
    change: number
    icon: React.ElementType
    format?: 'number' | 'currency'
  }): React.ReactElement => {
    const isPositive = change >= 0
    const localeStr = locale === 'es' ? 'es-PY' : 'en-US'
    const displayValue =
      format === 'currency' ? formatCurrency(value) : value.toLocaleString(localeStr)

    return (
      <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--text-secondary)]">{title}</p>
            <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{displayValue}</p>
          </div>
          <div className="rounded-lg bg-[var(--primary)] bg-opacity-10 p-3">
            <Icon className="h-6 w-6 text-[var(--primary)]" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-1">
          {isPositive ? (
            <ArrowUpRight className="h-4 w-4" style={{ color: 'var(--status-success)' }} />
          ) : (
            <ArrowDownRight className="h-4 w-4" style={{ color: 'var(--status-error)' }} />
          )}
          <span
            className="text-sm font-medium"
            style={{ color: isPositive ? 'var(--status-success)' : 'var(--status-error)' }}
          >
            {isPositive ? '+' : ''}
            {change.toFixed(1)}%
          </span>
          <span className="text-sm text-[var(--text-secondary)]">
            {t('stats.vsPrevious')}
          </span>
        </div>
      </div>
    )
  }

  if (isLoading || featuresLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  // Feature gate: Analytics requires 'analyticsBasic' or higher
  if (!hasFeature('analyticsBasic')) {
    return (
      <div className="container mx-auto px-4 py-8">
        <UpgradePrompt feature="analyticsBasic" currentTier={tierId} className="mx-auto max-w-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[var(--primary)] bg-opacity-10 p-2">
            <BarChart3 className="h-6 w-6 text-[var(--primary)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {t('title')}
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">{t('subtitle')}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Export Button */}
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-white px-4 py-2 text-sm font-medium text-[var(--text-primary)] shadow-sm transition-colors hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            {t('export')}
          </button>

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
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={t('stats.revenue')}
            value={stats.revenue.current}
            change={stats.revenue.change}
            icon={DollarSign}
            format="currency"
          />
          <StatCard
            title={t('stats.appointments')}
            value={stats.appointments.current}
            change={stats.appointments.change}
            icon={Calendar}
          />
          <StatCard
            title={t('stats.newClients')}
            value={stats.newClients.current}
            change={stats.newClients.change}
            icon={Users}
          />
          <StatCard
            title={t('stats.newPets')}
            value={stats.newPets.current}
            change={stats.newPets.change}
            icon={PawPrint}
          />
        </div>
      )}

      {/* Charts Row */}
      {chartData && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Revenue Chart */}
          <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
              {t('charts.revenueByDay')}
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.revenueByDay}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                  />
                  <Tooltip
                    formatter={(value) => [
                      formatCurrency(value as number),
                      t('stats.revenue'),
                    ]}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Appointments by Type */}
          <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
              {t('charts.appointmentsByType')}
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.appointmentsByType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                    label={({ name, percent }) =>
                      `${(name as string)?.split(' ')[0] || ''} ${((percent || 0) * 100).toFixed(0)}%`
                    }
                  >
                    {chartData.appointmentsByType.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color || COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [value as number, t('stats.appointments')]}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Top Services */}
      {chartData && (
        <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
            {t('charts.topServices')}
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.topServices} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={120} />
                <Tooltip
                  formatter={(value) => [
                    formatCurrency(value as number),
                    t('stats.revenue'),
                  ]}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                  }}
                />
                <Bar dataKey="revenue" fill="var(--primary)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl p-4 text-white" style={{ background: 'var(--gradient-blue)' }}>
          <Activity className="mb-2 h-8 w-8 opacity-80" />
          <p className="text-2xl font-bold">98%</p>
          <p className="text-sm opacity-80">{t('quickStats.satisfaction')}</p>
        </div>
        <div className="rounded-xl p-4 text-white" style={{ background: 'var(--gradient-green)' }}>
          <Calendar className="mb-2 h-8 w-8 opacity-80" />
          <p className="text-2xl font-bold">15 min</p>
          <p className="text-sm opacity-80">{t('quickStats.waitTime')}</p>
        </div>
        <div className="rounded-xl p-4 text-white" style={{ background: 'var(--gradient-purple)' }}>
          <Users className="mb-2 h-8 w-8 opacity-80" />
          <p className="text-2xl font-bold">89%</p>
          <p className="text-sm opacity-80">{t('quickStats.retention')}</p>
        </div>
        <div className="rounded-xl p-4 text-white" style={{ background: 'var(--gradient-orange)' }}>
          <Package className="mb-2 h-8 w-8 opacity-80" />
          <p className="text-2xl font-bold">12</p>
          <p className="text-sm opacity-80">{t('quickStats.lowStock')}</p>
        </div>
      </div>

      {/* Analytics Navigation Links */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Store Analytics Link */}
        <Link
          href={`/${clinic}/dashboard/analytics/store`}
          className="group block rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-[var(--primary)] bg-opacity-10 p-3">
                <ShoppingCart className="h-8 w-8 text-[var(--primary)]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  {t('storeAnalytics.title')}
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  {t('storeAnalytics.subtitle')}
                </p>
              </div>
            </div>
            <ArrowRight className="h-6 w-6 text-[var(--text-secondary)] transition-colors group-hover:text-[var(--primary)]" />
          </div>
        </Link>

        {/* Patient Analytics Link */}
        <Link
          href={`/${clinic}/dashboard/analytics/patients`}
          className="group block rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-green-100 p-3">
                <PawPrint className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  {t('patientAnalytics.title')}
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  {t('patientAnalytics.subtitle')}
                </p>
              </div>
            </div>
            <ArrowRight className="h-6 w-6 text-[var(--text-secondary)] transition-colors group-hover:text-green-600" />
          </div>
        </Link>

        {/* Operations Analytics Link */}
        <Link
          href={`/${clinic}/dashboard/analytics/operations`}
          className="group block rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-purple-100 p-3">
                <Activity className="h-8 w-8 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  {t('operationsAnalytics.title')}
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  {t('operationsAnalytics.subtitle')}
                </p>
              </div>
            </div>
            <ArrowRight className="h-6 w-6 text-[var(--text-secondary)] transition-colors group-hover:text-purple-600" />
          </div>
        </Link>
      </div>

      {/* Export Modal */}
      <AnalyticsExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        clinicName={clinic}
      />
    </div>
  )
}
