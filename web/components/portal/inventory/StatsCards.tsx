'use client'

/**
 * Inventory Stats Cards Component
 *
 * Displays key inventory metrics: products, low stock, value.
 */

import { Package, AlertCircle, TrendingUp } from 'lucide-react'
import type { InventoryStats } from './types'

interface StatsCardsProps {
  stats: InventoryStats | null
}

export function StatsCards({ stats }: StatsCardsProps): React.ReactElement {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <StatCard
        icon={<Package className="h-6 w-6" />}
        iconBg="bg-blue-50"
        iconColor="text-blue-600"
        label="Productos Activos"
        value={stats?.totalProducts ?? '...'}
      />
      <StatCard
        icon={<AlertCircle className="h-6 w-6" />}
        iconBg="bg-orange-50"
        iconColor="text-orange-600"
        label="Bajo Stock"
        value={stats?.lowStockCount ?? '...'}
      />
      <StatCard
        icon={<TrendingUp className="h-6 w-6" />}
        iconBg="bg-green-50"
        iconColor="text-green-600"
        label="Valor Inventario"
        value={
          stats
            ? new Intl.NumberFormat('es-PY', {
                style: 'currency',
                currency: 'PYG',
                maximumFractionDigits: 0,
              }).format(stats.totalValue)
            : '...'
        }
      />
    </div>
  )
}

// =============================================================================
// Internal Components
// =============================================================================

interface StatCardProps {
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  label: string
  value: string | number
}

function StatCard({ icon, iconBg, iconColor, label, value }: StatCardProps): React.ReactElement {
  return (
    <div className="flex items-center gap-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconBg} ${iconColor}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{label}</p>
        <p className="text-2xl font-black text-gray-900">{value}</p>
      </div>
    </div>
  )
}
