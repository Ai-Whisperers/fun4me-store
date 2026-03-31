'use client'

/**
 * Product Table Component
 *
 * Displays products in a table (desktop) or card (mobile) layout.
 */

import { Edit2, Loader2 } from 'lucide-react'
import type { Product } from './types'

interface ProductTableProps {
  products: Product[]
  isLoading: boolean
  onEditProduct: (product: Product) => void
}

export function ProductTable({
  products,
  isLoading,
  onEditProduct,
}: ProductTableProps): React.ReactElement {
  if (isLoading) {
    return (
      <div className="py-12 text-center text-gray-400">
        <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />
        Cargando productos...
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="py-12 text-center text-gray-400">No se encontraron productos.</div>
    )
  }

  return (
    <>
      {/* Mobile Cards */}
      <div className="space-y-3 md:hidden">
        {products.map((product) => (
          <MobileProductCard
            key={product.id}
            product={product}
            onEdit={() => onEditProduct(product)}
          />
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-50 text-xs font-bold uppercase tracking-wider text-gray-400">
              <th className="px-4 py-4">Producto</th>
              <th className="px-4 py-4">SKU</th>
              <th className="px-4 py-4">Precio Base</th>
              <th className="px-4 py-4 text-center">Stock</th>
              <th className="px-4 py-4 text-right">Accion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {products.map((product) => (
              <DesktopProductRow
                key={product.id}
                product={product}
                onEdit={() => onEditProduct(product)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

// =============================================================================
// Internal Components
// =============================================================================

interface ProductRowProps {
  product: Product
  onEdit: () => void
}

function MobileProductCard({ product, onEdit }: ProductRowProps): React.ReactElement {
  const stock = product.inventory?.stock_quantity ?? product.stock ?? 0
  const minStock = product.inventory?.min_stock_level ?? 5
  const price = product.base_price ?? product.price ?? 0
  const imageUrl = product.image_url ?? product.image
  const sku = product.sku ?? product.id

  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <div className="mb-3 flex items-start gap-3">
        {imageUrl && (
          <img
            src={imageUrl}
            alt=""
            className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-gray-900">{product.name}</p>
          {product.category?.name && (
            <p className="text-xs text-gray-400">{product.category.name}</p>
          )}
          <p className="mt-1 font-mono text-xs text-gray-400">SKU: {sku}</p>
        </div>
        <button
          onClick={onEdit}
          className="hover:bg-[var(--primary)]/5 flex-shrink-0 rounded-xl p-2 text-gray-400 transition hover:text-[var(--primary)]"
        >
          <Edit2 className="h-4 w-4" />
        </button>
      </div>
      <div className="flex items-center justify-between">
        <span className="font-bold text-gray-900">
          {new Intl.NumberFormat('es-PY', {
            style: 'currency',
            currency: 'PYG',
            maximumFractionDigits: 0,
          }).format(price)}
        </span>
        <StockBadge stock={stock} minStock={minStock} />
      </div>
    </div>
  )
}

function DesktopProductRow({ product, onEdit }: ProductRowProps): React.ReactElement {
  const stock = product.inventory?.stock_quantity ?? product.stock ?? 0
  const minStock = product.inventory?.min_stock_level ?? 5
  const price = product.base_price ?? product.price ?? 0
  const imageUrl = product.image_url ?? product.image
  const sku = product.sku ?? product.id

  return (
    <tr className="group transition-colors hover:bg-gray-50/50">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          {imageUrl && (
            <img src={imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
          )}
          <div>
            <span className="block font-bold text-gray-900">{product.name}</span>
            {product.category?.name && (
              <span className="text-xs text-gray-400">{product.category.name}</span>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-4 font-mono text-sm text-gray-500">{sku}</td>
      <td className="px-4 py-4 font-bold text-gray-900">
        {new Intl.NumberFormat('es-PY', {
          style: 'currency',
          currency: 'PYG',
          maximumFractionDigits: 0,
        }).format(price)}
      </td>
      <td className="px-4 py-4 text-center">
        <StockBadge stock={stock} minStock={minStock} />
      </td>
      <td className="px-4 py-4 text-right">
        <button
          onClick={onEdit}
          className="hover:bg-[var(--primary)]/5 rounded-xl p-2 text-gray-400 transition hover:text-[var(--primary)]"
        >
          <Edit2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  )
}

interface StockBadgeProps {
  stock: number
  minStock: number
}

function StockBadge({ stock, minStock }: StockBadgeProps): React.ReactElement {
  const getStockColor = (): string => {
    if (stock === 0) return 'bg-red-50 text-red-600'
    if (stock <= minStock) return 'bg-orange-50 text-orange-600'
    return 'bg-green-50 text-green-600'
  }

  return (
    <span className={`inline-block rounded-lg px-2 py-1 text-xs font-bold ${getStockColor()}`}>
      {stock} un.
    </span>
  )
}
