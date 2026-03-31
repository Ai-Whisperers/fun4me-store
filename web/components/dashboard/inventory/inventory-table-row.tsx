'use client'

import Image from 'next/image'
import { Package, Globe, Store, History, Edit2, Trash2, ShoppingCart } from 'lucide-react'
import type { InventoryProduct } from './types'
import { useTranslations } from 'next-intl'

interface InventoryTableRowProps {
  product: InventoryProduct
  isSelected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  onViewHistory: () => void
  onAddToPO?: () => void
  showSourceBadge: boolean
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    maximumFractionDigits: 0,
  }).format(price)
}

export function InventoryTableRow({
  product,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onViewHistory,
  onAddToPO,
  showSourceBadge,
}: InventoryTableRowProps) {
  const t = useTranslations()
  const stock = product.inventory?.stock_quantity ?? 0
  const minStock = product.inventory?.min_stock_level ?? 5
  const displayPrice = product.sale_price || product.assignment?.sale_price || product.base_price

  return (
    <tr className="group transition-colors hover:bg-[var(--bg-subtle)]/50">
      <td className="px-4 py-3">
        <input
          type="checkbox"
          className="rounded border-[var(--border)]"
          checked={isSelected}
          onChange={onSelect}
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-[var(--bg-muted)]">
            {product.image_url ? (
              <Image
                src={product.image_url}
                alt={product.name}
                width={40}
                height={40}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Package className="h-5 w-5 text-[var(--text-muted)]" />
              </div>
            )}
            {product.source && showSourceBadge && (
              <div
                className={`absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full ${
                  product.source === 'catalog' ? 'bg-[var(--status-info-bg)]0' : 'bg-[var(--status-success-bg)]0'
                }`}
                title={product.source === 'catalog' ? 'Del catálogo' : 'Propio'}
              >
                {product.source === 'catalog' ? (
                  <Globe className="h-2.5 w-2.5 text-white" />
                ) : (
                  <Store className="h-2.5 w-2.5 text-white" />
                )}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate font-bold text-[var(--text-primary)]">{product.name}</p>
              {product.source === 'catalog' && product.assignment?.margin_percentage && (
                <span className="rounded bg-[var(--status-info-bg)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--status-info)]">
                  +{product.assignment.margin_percentage.toFixed(0)}%
                </span>
              )}
            </div>
            {product.brand?.name && (
              <p className="text-xs text-[var(--text-muted)]">{product.brand.name}</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="font-mono text-sm text-[var(--text-muted)]">{product.sku || '—'}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-[var(--text-secondary)]">{product.category?.name || '—'}</span>
      </td>
      <td className="px-4 py-3 text-right">
        <div>
          <span className="font-bold text-[var(--text-primary)]">{formatPrice(displayPrice)}</span>
          {product.inventory?.weighted_average_cost && (
            <p className="text-[10px] text-[var(--text-muted)]">
              Costo: {formatPrice(product.inventory.weighted_average_cost)}
            </p>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <span
          className={`inline-block rounded-lg px-2 py-1 text-xs font-bold ${
            stock === 0
              ? 'bg-[var(--status-error-bg)] text-[var(--status-error)]'
              : stock <= minStock
                ? 'bg-[var(--status-warning-bg)] text-[var(--status-warning)]'
                : 'bg-[var(--status-success-bg)] text-[var(--status-success)]'
          }`}
        >
          {stock} un.
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          {onAddToPO && (
            <button
              onClick={onAddToPO}
              className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-[var(--status-info-bg)] hover:text-[var(--status-info)]"
              title={`${t('common.add')} a Orden de Compra`}
            >
              <ShoppingCart className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onViewHistory}
            className="hover:bg-[var(--status-special-bg)] rounded-lg p-2 text-[var(--text-muted)] transition hover:text-[var(--status-special)]"
            title="Ver Historial"
          >
            <History className="h-4 w-4" />
          </button>
          <button
            onClick={onEdit}
            className="hover:bg-[var(--primary)]/5 rounded-lg p-2 text-[var(--text-muted)] transition hover:text-[var(--primary)]"
            title={t('common.edit')}
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-[var(--status-error-bg)] hover:text-[var(--status-error)]"
            title={t('common.delete')}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}

export default InventoryTableRow
