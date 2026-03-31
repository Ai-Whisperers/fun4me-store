'use client'

/**
 * Coupons Filters Component
 *
 * REF-006: Extracted filter controls from client component
 */

import { Search, Filter } from 'lucide-react'
import type { CouponStatusFilter } from '../types'
import { STATUS_OPTIONS } from '../constants'

interface CouponsFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  onSearchSubmit: () => void
  statusFilter: CouponStatusFilter
  onStatusChange: (value: CouponStatusFilter) => void
}

export function CouponsFilters({
  search,
  onSearchChange,
  onSearchSubmit,
  statusFilter,
  onStatusChange,
}: CouponsFiltersProps): React.ReactElement {
  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    onSearchSubmit()
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row">
        {/* Search */}
        <form onSubmit={handleSubmit} className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar por código o nombre..."
              className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 transition-colors focus:border-[var(--primary)] focus:ring-2"
            />
          </div>
        </form>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value as CouponStatusFilter)}
            className="focus:ring-[var(--primary)]/20 rounded-xl border border-gray-200 bg-white px-4 py-2.5 focus:border-[var(--primary)] focus:ring-2"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
