'use client'

import Image from 'next/image'
import { Package, Globe, Store, History, Edit2, Trash2 } from 'lucide-react'
import type { InventoryProduct } from './types'

interface InventoryMobileCardProps {
  product: InventoryProduct
  onEdit: () => void
  onDelete: () => void
  onViewHistory: () => void
  showSourceBadge: boolean
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    maximumFractionDigits: 0,
  }).format(price)
}

export function InventoryMobileCard({
  product,
  onEdit,
  onDelete,
  onViewHistory,
  showSourceBadge,
}: InventoryMobileCardProps) {
  const stock = product.inventory?.stock_quantity ?? 0
  const minStock = product.inventory?.min_stock_level ?? 5
  const displayPrice = product.sale_price || product.assignment?.sale_price || product.base_price

  return (
    <div className="p-4">
      <div className="flex items-start gap-3">
        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-[var(--bg-muted)]">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              width={48}
              height={48}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Package className="h-6 w-6 text-[var(--text-muted)]" />
            </div>
          )}
          {product.source && showSourceBadge && (
            <div
              className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full ${
                product.source === 'catalog' ? 'bg-[var(--status-info-bg)]0' : 'bg-[var(--status-success-bg)]0'
              }`}
            >
              {product.source === 'catalog' ? (
                <Globe className="h-3 w-3 text-white" />
              ) : (
                <Store className="h-3 w-3 text-white" />
              )}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-bold text-[var(--text-primary)]">{product.name}</p>
            {product.source === 'catalog' && product.assignment?.margin_percentage && (
              <span className="rounded bg-[var(--status-info-bg)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--status-info)]">
                +{product.assignment.margin_percentage.toFixed(0)}%
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)]">{product.category?.name || 'Sin categoría'}</p>
          <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">SKU: {product.sku || '—'}</p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onViewHistory}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--status-special)]"
            title="Historial"
          >
            <History className="h-4 w-4" />
          </button>
          <button onClick={onEdit} className="p-2 text-[var(--text-muted)] hover:text-[var(--primary)]">
            <Edit2 className="h-4 w-4" />
          </button>
          <button onClick={onDelete} className="p-2 text-[var(--text-muted)] hover:text-[var(--status-error)]">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div>
          <span className="font-bold text-[var(--text-primary)]">{formatPrice(displayPrice)}</span>
          {product.inventory?.weighted_average_cost && (
            <span className="ml-2 text-[10px] text-[var(--text-muted)]">
              Costo: {formatPrice(product.inventory.weighted_average_cost)}
            </span>
          )}
        </div>
        <span
          className={`rounded-lg px-2 py-1 text-xs font-bold ${
            stock === 0
              ? 'bg-[var(--status-error-bg)] text-[var(--status-error)]'
              : stock <= minStock
                ? 'bg-[var(--status-warning-bg)] text-[var(--status-warning)]'
                : 'bg-[var(--status-success-bg)] text-[var(--status-success)]'
          }`}
        >
          {stock} un.
        </span>
      </div>
    </div>
  )
}

export default InventoryMobileCard
