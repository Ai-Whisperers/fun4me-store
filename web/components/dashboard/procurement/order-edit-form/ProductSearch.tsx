/**
 * Product Search Component
 *
 * Search input with dropdown results for adding products to the order.
 */

'use client'

import { Search, Loader2, Package } from 'lucide-react'
import type { Product } from './types'

interface ProductSearchProps {
  searchValue: string
  onSearchChange: (value: string) => void
  searchResults: Product[]
  searching: boolean
  onSelectProduct: (product: Product) => void
}

export function ProductSearch({
  searchValue,
  onSearchChange,
  searchResults,
  searching,
  onSelectProduct,
}: ProductSearchProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">Agregar Productos</label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por nombre o SKU..."
          className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 focus:border-[var(--primary)] focus:outline-none"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
        )}

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg">
            {searchResults.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => onSelectProduct(product)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
              >
                <Package className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="font-medium text-[var(--text-primary)]">{product.name}</p>
                  <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
