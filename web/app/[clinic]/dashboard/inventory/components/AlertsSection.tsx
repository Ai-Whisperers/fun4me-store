'use client'

/**
 * Alerts Section Component
 *
 * REF-006: Alerts section extracted from client component
 */

import { AlertCircle, Clock } from 'lucide-react'

interface StockAlertItem {
  id: string
  name: string
  stock_quantity: number
  min_stock_level: number
  expiry_date?: string
}

interface InventoryAlerts {
  hasAlerts: boolean
  lowStock: StockAlertItem[]
  expiring: StockAlertItem[]
}

interface AlertsSectionProps {
  alerts: InventoryAlerts | null
  clinic: string
}

export function AlertsSection({ alerts, clinic }: AlertsSectionProps): React.ReactElement | null {
  if (!alerts?.hasAlerts) return null

  return (
    <div className="space-y-3">
      {alerts.lowStock?.length > 0 && (
        <div className="rounded-xl border-l-4 border-[var(--status-warning)] bg-[var(--status-warning-bg)] p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-[var(--status-warning)]" />
            <div className="flex-1">
              <h3 className="font-bold text-[var(--status-warning-dark)]">Alerta de Stock Bajo</h3>
              <p className="mt-1 text-sm text-[var(--status-warning)]">
                {alerts.lowStock.length} producto{alerts.lowStock.length > 1 ? 's' : ''} por
                debajo del nivel mínimo
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {alerts.lowStock.slice(0, 5).map((item) => (
                  <span
                    key={item.id}
                    className="rounded border border-[var(--status-warning-light)] bg-[var(--bg-default)] px-2 py-1 text-xs font-medium text-[var(--status-warning)]"
                  >
                    {item.name} ({item.stock_quantity}/{item.min_stock_level})
                  </span>
                ))}
                {alerts.lowStock.length > 5 && (
                  <span className="text-xs font-medium text-[var(--status-warning)]">
                    +{alerts.lowStock.length - 5} más
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {alerts.expiring?.length > 0 && (
        <div className="rounded-xl border-l-4 border-[var(--status-error)] bg-[var(--status-error-bg)] p-4">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 text-[var(--status-error)]" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[var(--status-error-text)]">Productos por Vencer</h3>
                <button
                  onClick={() =>
                    (window.location.href = `/${clinic}/dashboard/inventory/expiring`)
                  }
                  className="text-xs font-medium text-[var(--status-error)] hover:text-[var(--status-error-text)] hover:underline"
                >
                  Ver todo →
                </button>
              </div>
              <p className="mt-1 text-sm text-[var(--status-error-text)]">
                {alerts.expiring.length} producto{alerts.expiring.length > 1 ? 's' : ''} vencen
                en los próximos 30 días
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {alerts.expiring.slice(0, 5).map((item) => (
                  <span
                    key={item.id}
                    className="rounded border border-[var(--status-error-border)] bg-[var(--bg-default)] px-2 py-1 text-xs font-medium text-[var(--status-error-text)]"
                  >
                    {item.name} (Vence:{' '}
                    {item.expiry_date
                      ? new Date(item.expiry_date).toLocaleDateString('es-PY')
                      : 'N/A'}
                    )
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
