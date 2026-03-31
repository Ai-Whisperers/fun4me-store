'use client'

/**
 * Stats Cards Component
 *
 * REF-006: Stats section extracted from client component
 */

import { Package, AlertCircle, TrendingUp } from 'lucide-react'
import { formatPrice } from '../utils'

interface InventoryStats {
  totalProducts: number
  lowStockCount: number
  totalValue: number
}

interface StatsCardsProps {
  stats: InventoryStats | null
}

export function StatsCards({ stats }: StatsCardsProps): React.ReactElement {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-default)] p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--status-info-bg)] text-[var(--status-info)]">
          <Package className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-[var(--text-secondary)]">Productos Activos</p>
          <p className="text-2xl font-black text-[var(--text-primary)]">{stats?.totalProducts ?? '—'}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-default)] p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--status-warning-bg)] text-[var(--status-warning)]">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-[var(--text-secondary)]">Stock Bajo</p>
          <p className="text-2xl font-black text-[var(--text-primary)]">{stats?.lowStockCount ?? '—'}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-default)] p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--status-success-bg)] text-[var(--status-success)]">
          <TrendingUp className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-[var(--text-secondary)]">Valor Inventario</p>
          <p className="text-2xl font-black text-[var(--text-primary)]">
            {stats ? formatPrice(stats.totalValue) : '—'}
          </p>
        </div>
      </div>
    </div>
  )
}
