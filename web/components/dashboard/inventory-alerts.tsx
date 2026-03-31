'use client'

/**
 * Inventory Alerts Component
 *
 * RES-001: Migrated to React Query for data fetching
 * - Replaced useEffect+fetch with useQuery hook
 * - Native refetchInterval replaces setInterval
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Package, Clock, XCircle } from 'lucide-react'
import { queryKeys } from '@/lib/queries'
import { staleTimes, gcTimes } from '@/lib/queries/utils'

interface InventoryAlert {
  product_id: string
  product_name: string
  sku: string
  alert_type: 'low_stock' | 'expiring' | 'out_of_stock'
  current_stock?: number
  min_stock?: number
  expiry_date?: string
}

interface AlertsData {
  low_stock: InventoryAlert[]
  expiring_soon: InventoryAlert[]
  out_of_stock?: InventoryAlert[]
}

interface InventoryAlertsProps {
  clinic: string
}

export function InventoryAlerts({ clinic }: InventoryAlertsProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'low_stock' | 'expiring'>('all')

  // React Query: Fetch inventory alerts with 10-minute auto-refresh
  const { data: alerts, isLoading: loading } = useQuery({
    queryKey: queryKeys.inventory.alerts(clinic),
    queryFn: async (): Promise<AlertsData> => {
      const res = await fetch(`/api/dashboard/inventory-alerts?clinic=${clinic}`)
      if (!res.ok) throw new Error('Error al cargar alertas de inventario')
      return res.json()
    },
    staleTime: staleTimes.MEDIUM, // 2 minutes
    gcTime: gcTimes.MEDIUM, // 15 minutes
    refetchInterval: 10 * 60 * 1000, // Refresh every 10 minutes
  })

  if (loading) {
    return (
      <div className="rounded-xl bg-[var(--bg-paper)] p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="mb-4 h-6 w-1/3 rounded bg-[var(--bg-subtle)]"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 rounded bg-[var(--border-light,#f3f4f6)]"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const totalAlerts =
    (alerts?.low_stock?.length || 0) +
    (alerts?.expiring_soon?.length || 0) +
    (alerts?.out_of_stock?.length || 0)

  const getFilteredAlerts = () => {
    if (!alerts) return []
    switch (activeTab) {
      case 'low_stock':
        return [...(alerts.low_stock || []), ...(alerts.out_of_stock || [])]
      case 'expiring':
        return alerts.expiring_soon || []
      default:
        return [
          ...(alerts.out_of_stock || []),
          ...(alerts.low_stock || []),
          ...(alerts.expiring_soon || []),
        ]
    }
  }

  const formatExpiry = (dateStr: string) => {
    const date = new Date(dateStr)
    const days = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (days < 0) return 'Vencido'
    if (days === 0) return 'Vence hoy'
    if (days === 1) return 'Vence mañana'
    return `Vence en ${days} días`
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'out_of_stock':
        return <XCircle className="h-5 w-5 text-[var(--status-error,#ef4444)]" />
      case 'low_stock':
        return <Package className="h-5 w-5 text-[var(--status-warning,#eab308)]" />
      case 'expiring':
        return <Clock className="h-5 w-5 text-[var(--status-warning,#f59e0b)]" />
      default:
        return <AlertTriangle className="h-5 w-5 text-[var(--text-secondary)]" />
    }
  }

  const getAlertBg = (type: string) => {
    switch (type) {
      case 'out_of_stock':
        return 'bg-[var(--status-error-bg,#fee2e2)] border-[var(--status-error,#ef4444)]/20'
      case 'low_stock':
        return 'bg-[var(--status-warning-bg,#fef3c7)] border-[var(--status-warning,#eab308)]/20'
      case 'expiring':
        return 'bg-[var(--status-warning-bg,#fef3c7)] border-[var(--status-warning,#f59e0b)]/20'
      default:
        return 'bg-[var(--bg-subtle)] border-[var(--border,#e5e7eb)]'
    }
  }

  return (
    <div className="rounded-xl bg-[var(--bg-paper)] p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-[var(--text-secondary)]" />
          <h3 className="font-semibold text-[var(--text-primary)]">Alertas de Inventario</h3>
          {totalAlerts > 0 && (
            <span className="rounded-full bg-[var(--status-error-bg,#fee2e2)] px-2 py-0.5 text-xs font-medium text-[var(--status-error,#dc2626)]">
              {totalAlerts}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2 border-b border-[var(--border-light,#f3f4f6)] pb-2">
        {[
          { key: 'all', label: 'Todas' },
          {
            key: 'low_stock',
            label: 'Stock bajo',
            count: (alerts?.low_stock?.length || 0) + (alerts?.out_of_stock?.length || 0),
          },
          { key: 'expiring', label: 'Por vencer', count: alerts?.expiring_soon?.length || 0 },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
              activeTab === tab.key
                ? 'bg-[var(--bg-inverse,#1f2937)] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`text-xs ${
                  activeTab === tab.key ? 'text-[var(--text-muted)]' : 'text-[var(--text-muted)]'
                }`}
              >
                ({tab.count})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Alerts list */}
      <div className="max-h-80 space-y-2 overflow-y-auto">
        {getFilteredAlerts().length === 0 ? (
          <div className="py-8 text-center text-[var(--text-secondary)]">
            <Package className="mx-auto mb-2 h-12 w-12 text-[var(--border,#e5e7eb)]" />
            <p>No hay alertas de inventario</p>
          </div>
        ) : (
          getFilteredAlerts().map((alert, i) => (
            <div
              key={`${alert.product_id}-${i}`}
              className={`flex items-center justify-between rounded-lg border p-3 ${getAlertBg(alert.alert_type)}`}
            >
              <div className="flex items-center gap-3">
                {getAlertIcon(alert.alert_type)}
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {alert.product_name}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">{alert.sku}</p>
                </div>
              </div>
              <div className="text-right text-sm">
                {alert.alert_type === 'expiring' && alert.expiry_date ? (
                  <span className="font-medium text-[var(--status-warning-dark,#a16207)]">
                    {formatExpiry(alert.expiry_date)}
                  </span>
                ) : (
                  <span
                    className={
                      alert.alert_type === 'out_of_stock'
                        ? 'font-medium text-[var(--status-error,#dc2626)]'
                        : 'text-[var(--status-warning-dark,#a16207)]'
                    }
                  >
                    {alert.current_stock === 0
                      ? 'Sin stock'
                      : `${alert.current_stock} / ${alert.min_stock}`}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
