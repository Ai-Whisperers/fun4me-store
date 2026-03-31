'use client'

/**
 * Alerts Panel Component
 *
 * RES-001: Migrated to React Query for data fetching
 * - Replaced useEffect+fetch with useQuery hook
 * - Native refetchInterval replaces setInterval
 */

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  Package,
  Syringe,
  Calendar,
  ChevronRight,
  Bell,
  CheckCircle2,
  X,
  ExternalLink,
} from 'lucide-react'
import { queryKeys } from '@/lib/queries'
import { staleTimes, gcTimes } from '@/lib/queries/utils'

type AlertType = 'inventory' | 'vaccine' | 'appointment' | 'system'
type AlertSeverity = 'critical' | 'warning' | 'info'

interface Alert {
  id: string
  type: AlertType
  severity: AlertSeverity
  title: string
  description: string
  count?: number
  href?: string
  dismissable?: boolean
  timestamp?: string
}

interface AlertsPanelProps {
  clinic: string
}

interface Vaccine {
  id: string
  pet_id: string
  vaccine_name: string
  is_overdue: boolean
  due_date?: string
}

const severityConfig = {
  critical: {
    bg: 'bg-[var(--status-error-bg)]',
    border: 'border-[var(--status-error)]/30',
    icon: 'text-[var(--status-error)]',
    badge: 'bg-[var(--status-error-bg)] text-[var(--status-error)]',
    dot: 'bg-[var(--status-error)]',
  },
  warning: {
    bg: 'bg-[var(--status-warning-bg)]',
    border: 'border-[var(--status-warning)]/30',
    icon: 'text-[var(--status-warning)]',
    badge: 'bg-[var(--status-warning-bg)] text-[var(--status-warning)]',
    dot: 'bg-[var(--status-warning)]',
  },
  info: {
    bg: 'bg-[var(--status-info-bg)]',
    border: 'border-[var(--status-info)]/30',
    icon: 'text-[var(--status-info)]',
    badge: 'bg-[var(--status-info-bg)] text-[var(--status-info)]',
    dot: 'bg-[var(--status-info)]',
  },
}

const typeIcons = {
  inventory: Package,
  vaccine: Syringe,
  appointment: Calendar,
  system: Bell,
}

function AlertCard({ alert, onDismiss }: { alert: Alert; onDismiss?: (id: string) => void }) {
  const config = severityConfig[alert.severity]
  const Icon = typeIcons[alert.type]

  const content = (
    <div
      className={`relative flex items-start gap-3 rounded-xl border p-4 ${config.bg} ${config.border} group transition-all hover:shadow-sm`}
    >
      {/* Severity dot */}
      <div className={`absolute left-0 top-4 h-8 w-1 rounded-r-full ${config.dot}`} />

      {/* Icon */}
      <div className={`rounded-lg bg-[var(--bg-paper)] p-2 shadow-sm ${config.icon} flex-shrink-0`}>
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <h4 className="truncate text-sm font-semibold text-[var(--text-primary)]">
            {alert.title}
          </h4>
          {alert.count !== undefined && alert.count > 0 && (
            <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${config.badge}`}>
              {alert.count}
            </span>
          )}
        </div>
        <p className="line-clamp-2 text-xs text-[var(--text-secondary)]">{alert.description}</p>
      </div>

      {/* Actions */}
      <div className="flex flex-shrink-0 items-center gap-1">
        {alert.href && (
          <ChevronRight className="h-4 w-4 text-[var(--text-muted)] transition-all group-hover:translate-x-0.5 group-hover:text-[var(--primary)]" />
        )}
        {alert.dismissable && onDismiss && (
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onDismiss(alert.id)
            }}
            className="hover:bg-[var(--bg-paper)]/50 rounded p-1 transition-colors"
          >
            <X className="h-3.5 w-3.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)]" />
          </button>
        )}
      </div>
    </div>
  )

  if (alert.href) {
    return <Link href={alert.href}>{content}</Link>
  }
  return content
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="flex animate-pulse items-start gap-3 rounded-xl border border-[var(--border-light)] bg-[var(--bg-subtle)] p-4"
        >
          <div className="h-8 w-8 flex-shrink-0 rounded-lg bg-[var(--border-light)]" />
          <div className="flex-1">
            <div className="mb-2 h-4 w-32 rounded bg-[var(--border-light)]" />
            <div className="h-3 w-48 rounded bg-[var(--border-light)]" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--status-success-bg)]">
        <CheckCircle2 className="h-6 w-6 text-[var(--status-success)]" />
      </div>
      <h4 className="mb-1 text-sm font-semibold text-[var(--text-primary)]">Sin alertas</h4>
      <p className="text-xs text-[var(--text-muted)]">Todo está funcionando correctamente</p>
    </div>
  )
}

export function AlertsPanel({ clinic }: AlertsPanelProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  // React Query: Fetch alerts with 5-minute auto-refresh
  const { data: rawAlerts = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.dashboard.alerts(clinic),
    queryFn: async (): Promise<Alert[]> => {
      // Fetch alerts from multiple sources in parallel
      const [inventoryRes, vaccinesRes] = await Promise.all([
        fetch(`/api/dashboard/inventory-alerts?clinic=${clinic}`),
        fetch(`/api/dashboard/vaccines?clinic=${clinic}&days=7`),
      ])

      const alertItems: Alert[] = []

      // Process inventory alerts
      // API returns { low_stock: [], expiring_soon: [], out_of_stock: [] }
      if (inventoryRes.ok) {
        const inventoryData = await inventoryRes.json()
        const lowStockCount = (inventoryData.low_stock || []).length
        const outOfStockCount = (inventoryData.out_of_stock || []).length
        const expiringCount = (inventoryData.expiring_soon || []).length
        const criticalCount = lowStockCount + outOfStockCount

        if (criticalCount > 0) {
          alertItems.push({
            id: 'inventory-low',
            type: 'inventory',
            severity: 'critical',
            title: 'Stock bajo',
            description: `${criticalCount} productos necesitan reposición urgente`,
            count: criticalCount,
            href: `/${clinic}/dashboard/inventory?filter=low_stock`,
          })
        }

        if (expiringCount > 0) {
          alertItems.push({
            id: 'inventory-expiring',
            type: 'inventory',
            severity: 'warning',
            title: 'Productos por vencer',
            description: `${expiringCount} productos vencen pronto`,
            count: expiringCount,
            href: `/${clinic}/dashboard/inventory?filter=expiring`,
          })
        }
      }

      // Process vaccine alerts
      // API returns array with is_overdue flag
      if (vaccinesRes.ok) {
        const vaccinesData = await vaccinesRes.json()
        const vaccines = Array.isArray(vaccinesData) ? vaccinesData : []
        const overdueCount = vaccines.filter((v: Vaccine) => v.is_overdue).length
        const upcomingCount = vaccines.filter((v: Vaccine) => !v.is_overdue).length

        if (overdueCount > 0) {
          alertItems.push({
            id: 'vaccines-overdue',
            type: 'vaccine',
            severity: 'critical',
            title: 'Vacunas vencidas',
            description: `${overdueCount} mascotas con vacunas vencidas`,
            count: overdueCount,
            href: `/${clinic}/dashboard/vaccines?filter=overdue`,
          })
        }

        if (upcomingCount > 0) {
          alertItems.push({
            id: 'vaccines-upcoming',
            type: 'vaccine',
            severity: 'warning',
            title: 'Vacunas próximas',
            description: `${upcomingCount} vacunaciones programadas esta semana`,
            count: upcomingCount,
            href: `/${clinic}/dashboard/vaccines`,
          })
        }
      }

      return alertItems
    },
    staleTime: staleTimes.MEDIUM, // 2 minutes
    gcTime: gcTimes.MEDIUM, // 15 minutes
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  })

  // Sort by severity (memoized)
  const alerts = useMemo(() => {
    const severityOrder = { critical: 0, warning: 1, info: 2 }
    return [...rawAlerts].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
  }, [rawAlerts])

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set([...prev, id]))
  }

  const visibleAlerts = alerts.filter((alert) => !dismissed.has(alert.id))
  const criticalCount = visibleAlerts.filter((a) => a.severity === 'critical').length

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border-light)] bg-[var(--bg-paper)] shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-light)] px-5 py-4">
        <div className="flex items-center gap-2">
          <div
            className={`rounded-lg p-2 ${
              criticalCount > 0 ? 'bg-[var(--status-error-bg)]' : 'bg-[var(--primary)]/10'
            }`}
          >
            <AlertTriangle
              className={`h-5 w-5 ${
                criticalCount > 0 ? 'text-[var(--status-error)]' : 'text-[var(--primary)]'
              }`}
            />
          </div>
          <div>
            <h3 className="font-bold text-[var(--text-primary)]">Alertas</h3>
            <p className="text-xs text-[var(--text-muted)]">
              {visibleAlerts.length} activa{visibleAlerts.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {criticalCount > 0 && (
          <span className="animate-pulse rounded-full bg-[var(--status-error-bg)] px-2.5 py-1 text-xs font-bold text-[var(--status-error)]">
            {criticalCount} crítica{criticalCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <LoadingSkeleton />
        ) : visibleAlerts.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {visibleAlerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onDismiss={alert.dismissable ? handleDismiss : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {visibleAlerts.length > 0 && (
        <div className="bg-[var(--bg-subtle)]/50 flex items-center justify-between border-t border-[var(--border-light)] px-5 py-3">
          <Link
            href={`/${clinic}/dashboard/alerts`}
            className="flex items-center gap-1 text-sm font-medium text-[var(--primary)] hover:underline"
          >
            Ver todas las alertas
            <ExternalLink className="h-3 w-3" />
          </Link>
          {dismissed.size > 0 && (
            <button
              onClick={() => setDismissed(new Set())}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            >
              Mostrar descartadas ({dismissed.size})
            </button>
          )}
        </div>
      )}
    </div>
  )
}
