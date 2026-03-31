'use client'

/**
 * Filter Bar Component
 *
 * Search, category filter, stock filter, and items per page selector.
 */

import { Search, Filter } from 'lucide-react'
import type { Category, StockFilterValue } from './types'
import { STOCK_FILTER_OPTIONS, ITEMS_PER_PAGE_OPTIONS } from './types'

interface FilterBarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  categories: Category[]
  selectedCategory: string
  onCategoryChange: (category: string) => void
  stockFilter: StockFilterValue
  onStockFilterChange: (filter: StockFilterValue) => void
  itemsPerPage: number
  onItemsPerPageChange: (limit: number) => void
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  categories,
  selectedCategory,
  onCategoryChange,
  stockFilter,
  onStockFilterChange,
  itemsPerPage,
  onItemsPerPageChange,
}: FilterBarProps): React.ReactElement {
  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre o SKU..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="focus:ring-[var(--primary)]/20 w-full rounded-2xl border border-gray-100 bg-gray-50 py-3 pl-11 pr-4 text-sm font-medium transition-all focus:outline-none focus:ring-2"
        />
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col gap-4 rounded-2xl bg-gray-50 p-4 sm:flex-row">
        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="focus:ring-[var(--primary)]/20 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:ring-2"
          >
            <option value="all">Todas las categorías</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Stock Filter Tabs */}
        <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1">
          {STOCK_FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onStockFilterChange(option.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                stockFilter === option.value
                  ? 'bg-[var(--primary)] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Items per page */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-gray-500">Mostrar:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="focus:ring-[var(--primary)]/20 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:ring-2"
          >
            {ITEMS_PER_PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} items
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
