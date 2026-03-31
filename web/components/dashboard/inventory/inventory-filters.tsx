'use client'

import { Search, Filter, X } from 'lucide-react'

// Types
export type ProductSource = 'all' | 'own' | 'catalog'

export interface Category {
  id: string
  name: string
  slug: string
}

export interface InventoryFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  categoryFilter: string
  onCategoryChange: (value: string) => void
  categories: Category[]
  stockFilter: string
  onStockChange: (value: string) => void
  onClearFilters: () => void
  activeFilterCount: number
  itemsPerPage?: number
  onItemsPerPageChange?: (value: number) => void
  itemsPerPageOptions?: number[]
  totalCount?: number
}

// Constants
export const STOCK_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'in_stock', label: 'En Stock' },
  { value: 'low_stock', label: 'Stock Bajo' },
  { value: 'out_of_stock', label: 'Sin Stock' },
] as const

const DEFAULT_ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100]

export function InventoryFilters({
  search,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  categories,
  stockFilter,
  onStockChange,
  onClearFilters,
  activeFilterCount,
  itemsPerPage,
  onItemsPerPageChange,
  itemsPerPageOptions = DEFAULT_ITEMS_PER_PAGE_OPTIONS,
  totalCount,
}: InventoryFiltersProps) {
  return (
    <div className="border-b border-[var(--border)] p-4">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Catálogo de Productos</h2>
          {totalCount !== undefined && (
            <p className="text-sm text-[var(--text-muted)]">{totalCount} productos en total</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {activeFilterCount > 0 && (
            <button
              onClick={onClearFilters}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-secondary)]"
            >
              <X className="h-4 w-4" />
              Limpiar ({activeFilterCount})
            </button>
          )}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Buscar por nombre o SKU..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2"
            />
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[var(--text-muted)]" />
          <select
            value={categoryFilter}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="focus:ring-[var(--primary)]/20 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] px-3 py-2 text-sm font-medium outline-none focus:ring-2"
          >
            <option value="all">Todas las categorías</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] p-1">
          {STOCK_FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onStockChange(option.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                stockFilter === option.value
                  ? 'bg-[var(--primary)] text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {itemsPerPage !== undefined && onItemsPerPageChange && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-[var(--text-muted)]">Mostrar:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className="focus:ring-[var(--primary)]/20 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] px-3 py-2 text-sm font-medium outline-none focus:ring-2"
            >
              {itemsPerPageOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  )
}

export default InventoryFilters
