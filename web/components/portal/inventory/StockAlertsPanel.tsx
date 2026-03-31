'use client'

/**
 * Stock Alerts Panel Component
 *
 * Displays low stock and expiring product alerts.
 */

import { AlertCircle } from 'lucide-react'
import type { InventoryAlerts, StockAlertItem } from './types'

interface StockAlertsPanelProps {
  alerts: InventoryAlerts
}

export function StockAlertsPanel({ alerts }: StockAlertsPanelProps): React.ReactElement | null {
  if (!alerts.hasAlerts) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* Low Stock Alert */}
      {alerts.lowStock && alerts.lowStock.length > 0 && (
        <AlertBanner
          type="warning"
          icon={<AlertCircle className="h-6 w-6 text-white" />}
          title="⚠️ Low Stock Alert"
          description={`${alerts.lowStock.length} product${alerts.lowStock.length > 1 ? 's' : ''} below minimum stock level`}
          items={alerts.lowStock}
          renderItem={(item) => `${item.name} (${item.stock_quantity}/${item.min_stock_level})`}
        />
      )}

      {/* Expiring Products Alert */}
      {alerts.expiring && alerts.expiring.length > 0 && (
        <AlertBanner
          type="error"
          icon={<AlertCircle className="h-6 w-6 text-white" />}
          title="🗓️ Expiring Products"
          description={`${alerts.expiring.length} product${alerts.expiring.length > 1 ? 's' : ''} expiring within 30 days`}
          items={alerts.expiring}
          renderItem={(item) =>
            `${item.name} (Exp: ${item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : 'N/A'})`
          }
        />
      )}
    </div>
  )
}

// =============================================================================
// Internal Components
// =============================================================================

interface AlertBannerProps {
  type: 'warning' | 'error'
  icon: React.ReactNode
  title: string
  description: string
  items: StockAlertItem[]
  renderItem: (item: StockAlertItem) => string
}

function AlertBanner({
  type,
  icon,
  title,
  description,
  items,
  renderItem,
}: AlertBannerProps): React.ReactElement {
  const colors = {
    warning: {
      border: 'border-orange-500',
      bg: 'bg-orange-50',
      iconBg: 'bg-orange-500',
      titleText: 'text-orange-900',
      descText: 'text-orange-800',
      tagBorder: 'border-orange-200',
      tagText: 'text-orange-700',
      moreText: 'text-orange-600',
    },
    error: {
      border: 'border-red-500',
      bg: 'bg-red-50',
      iconBg: 'bg-red-500',
      titleText: 'text-red-900',
      descText: 'text-red-800',
      tagBorder: 'border-red-200',
      tagText: 'text-red-700',
      moreText: 'text-red-600',
    },
  }

  const c = colors[type]

  return (
    <div className={`rounded-2xl border-l-4 ${c.border} ${c.bg} p-6`}>
      <div className="flex items-start gap-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${c.iconBg}`}>
          {icon}
        </div>
        <div className="flex-1">
          <h3 className={`mb-2 font-black ${c.titleText}`}>{title}</h3>
          <p className={`mb-3 text-sm ${c.descText}`}>{description}</p>
          <div className="flex flex-wrap gap-2">
            {items.slice(0, 5).map((item) => (
              <span
                key={item.id}
                className={`rounded-lg border ${c.tagBorder} bg-white px-3 py-1 text-xs font-bold ${c.tagText}`}
              >
                {renderItem(item)}
              </span>
            ))}
            {items.length > 5 && (
              <span className={`text-xs font-bold ${c.moreText}`}>+{items.length - 5} more</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
