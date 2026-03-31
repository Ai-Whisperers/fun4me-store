import { Search, Filter, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import type { FilterOptions } from './types'
import { PatientFilters } from './PatientFilters'

interface SearchHeaderProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  resultCount: number
  filters: FilterOptions
  onFilterChange: (key: keyof FilterOptions, value: string) => void
  onClearFilters: () => void
  hasActiveFilters: boolean
}

export function SearchHeader({
  searchQuery,
  onSearchChange,
  resultCount,
  filters,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
}: SearchHeaderProps): React.ReactElement {
  const [showFilters, setShowFilters] = useState(false)

  return (
    <div className="border-b border-[var(--border-color)]">
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="Buscar propietario o mascota..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-subtle)] py-2.5 pl-10 pr-4 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>

        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-[var(--text-secondary)]">
            {resultCount} propietario{resultCount !== 1 ? 's' : ''}
            {(searchQuery || hasActiveFilters) && ` encontrado${resultCount !== 1 ? 's' : ''}`}
          </p>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition-colors ${
              hasActiveFilters
                ? 'bg-[var(--primary)] text-white'
                : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            Filtros
            {hasActiveFilters && (
              <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
                {
                  [
                    filters.species !== 'all',
                    filters.vaccine !== 'all',
                    filters.lastVisit !== 'all',
                    filters.neutered !== 'all',
                  ].filter(Boolean).length
                }
              </span>
            )}
            {showFilters ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Collapsible Filters Panel */}
      {showFilters && (
        <div className="border-t border-[var(--border-color)] bg-[var(--bg-subtle)] px-4 pb-4 pt-3">
          <PatientFilters
            filters={filters}
            onFilterChange={onFilterChange}
            onClearFilters={onClearFilters}
            hasActiveFilters={hasActiveFilters}
          />
        </div>
      )}
    </div>
  )
}
