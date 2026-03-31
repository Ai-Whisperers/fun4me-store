'use client'

/**
 * Platform Dashboard Client Component
 *
 * Shows platform-wide statistics and overview for platform admins.
 */

import { useState, useEffect } from 'react'
import {
  Building2,
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  Activity,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import { formatInTimeZone } from 'date-fns-tz'
import { es } from 'date-fns/locale'

interface PlatformStats {
  overview: {
    total_tenants: number
    total_users: number
    total_pets: number
    appointments_30d: number
    revenue_30d: number
    invoices_30d: number
  }
  growth: {
    tenants_by_month: Record<string, number>
  }
  recent_activity: {
    id: string
    action: string
    action_category: string
    target_tenant_id: string | null
    created_at: string
  }[]
}

export function PlatformDashboardClient() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/platform/stats')
        if (!res.ok) {
          throw new Error('Error al cargar estadísticas')
        }
        const data = await res.json()
        setStats(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'decimal',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return formatInTimeZone(new Date(dateStr), 'America/Asuncion', 'd MMM yyyy HH:mm', { locale: es })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[var(--status-error,#dc2626)] bg-[var(--status-error-bg,#fef2f2)] p-4 text-[var(--status-error,#dc2626)]">
        <AlertCircle className="mr-2 inline h-5 w-5" />
        {error}
      </div>
    )
  }

  const statCards = [
    {
      label: 'Clínicas Activas',
      value: stats?.overview.total_tenants || 0,
      icon: Building2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      label: 'Usuarios Totales',
      value: stats?.overview.total_users || 0,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      label: 'Citas (30 días)',
      value: stats?.overview.appointments_30d || 0,
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      label: 'Ingresos (30 días)',
      value: `${formatCurrency(stats?.overview.revenue_30d || 0)} Gs`,
      icon: DollarSign,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Panel de Plataforma</h1>
        <p className="text-[var(--text-muted)]">Visión general de todas las clínicas</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className="rounded-xl border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <TrendingUp className="h-4 w-4 text-[var(--status-success,#16a34a)]" />
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{stat.value}</p>
              <p className="text-sm text-[var(--text-muted)]">{stat.label}</p>
            </div>
          )
        })}
      </div>

      {/* Additional Stats */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Growth Chart Placeholder */}
        <div className="rounded-xl border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] p-6">
          <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
            Crecimiento de Clínicas
          </h2>
          <div className="space-y-3">
            {Object.entries(stats?.growth.tenants_by_month || {}).map(([month, count]) => (
              <div key={month} className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">{month}</span>
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 rounded-full bg-[var(--primary)]"
                    style={{ width: `${Math.min(count * 20, 100)}px` }}
                  />
                  <span className="text-sm font-medium text-[var(--text-primary)]">{count}</span>
                </div>
              </div>
            ))}
            {Object.keys(stats?.growth.tenants_by_month || {}).length === 0 && (
              <p className="text-sm text-[var(--text-muted)]">Sin datos de crecimiento</p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] p-6">
          <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
            Actividad Reciente
          </h2>
          <div className="space-y-3">
            {(stats?.recent_activity || []).map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-3 rounded-lg border border-[var(--border-light,#e5e7eb)] p-3"
              >
                <div className="rounded-full bg-[var(--bg-secondary,#f3f4f6)] p-2">
                  <Activity className="h-4 w-4 text-[var(--text-muted)]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{activity.action}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {activity.action_category} • {formatDate(activity.created_at)}
                  </p>
                </div>
              </div>
            ))}
            {(stats?.recent_activity || []).length === 0 && (
              <p className="text-sm text-[var(--text-muted)]">Sin actividad reciente</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="rounded-xl border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] p-6">
        <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">Resumen Global</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="text-center">
            <p className="text-3xl font-bold text-[var(--primary)]">{stats?.overview.total_pets || 0}</p>
            <p className="text-sm text-[var(--text-muted)]">Mascotas Registradas</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-[var(--primary)]">
              {stats?.overview.invoices_30d || 0}
            </p>
            <p className="text-sm text-[var(--text-muted)]">Facturas (30 días)</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-[var(--primary)]">
              {Math.round((stats?.overview.total_users || 0) / (stats?.overview.total_tenants || 1))}
            </p>
            <p className="text-sm text-[var(--text-muted)]">Usuarios promedio/clínica</p>
          </div>
        </div>
      </div>
    </div>
  )
}
