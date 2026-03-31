'use client'

import { Dog, Cat, Rabbit, X, ChevronDown } from 'lucide-react'
import type { FilterOptions } from './types'

interface PatientFiltersProps {
  filters: FilterOptions
  onFilterChange: (key: keyof FilterOptions, value: string) => void
  onClearFilters: () => void
  hasActiveFilters: boolean
}

export function PatientFilters({
  filters,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
}: PatientFiltersProps): React.ReactElement {
  return (
    <div className="space-y-3">
      {/* Species Filter - Toggle Buttons */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
          Especie
        </label>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onFilterChange('species', 'all')}
            className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
              filters.species === 'all'
                ? 'bg-[var(--primary)] text-white'
                : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]'
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => onFilterChange('species', 'dog')}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs transition-colors ${
              filters.species === 'dog'
                ? 'bg-blue-600 text-white'
                : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]'
            }`}
          >
            <Dog className="h-3 w-3" />
            Perros
          </button>
          <button
            type="button"
            onClick={() => onFilterChange('species', 'cat')}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs transition-colors ${
              filters.species === 'cat'
                ? 'bg-purple-600 text-white'
                : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]'
            }`}
          >
            <Cat className="h-3 w-3" />
            Gatos
          </button>
          <button
            type="button"
            onClick={() => onFilterChange('species', 'other')}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs transition-colors ${
              filters.species === 'other'
                ? 'bg-teal-600 text-white'
                : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]'
            }`}
          >
            <Rabbit className="h-3 w-3" />
            Otros
          </button>
        </div>
      </div>

      {/* Vaccine Filter - Dropdown */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
          Vacunas
        </label>
        <div className="relative">
          <select
            value={filters.vaccine}
            onChange={(e) => onFilterChange('vaccine', e.target.value)}
            className="w-full appearance-none rounded-lg border border-[var(--border-color)] bg-[var(--bg-subtle)] px-3 py-2 pr-8 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          >
            <option value="all">Todas</option>
            <option value="overdue">Vencidas</option>
            <option value="due-soon">Proximas (14 dias)</option>
            <option value="up-to-date">Al dia</option>
            <option value="none">Sin vacunas</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
        </div>
      </div>

      {/* Last Visit Filter - Dropdown */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
          Ultima visita
        </label>
        <div className="relative">
          <select
            value={filters.lastVisit}
            onChange={(e) => onFilterChange('lastVisit', e.target.value)}
            className="w-full appearance-none rounded-lg border border-[var(--border-color)] bg-[var(--bg-subtle)] px-3 py-2 pr-8 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          >
            <option value="all">Todos</option>
            <option value="recent">&lt;30 dias</option>
            <option value="1-3">1-3 meses</option>
            <option value="3-6">3-6 meses</option>
            <option value="6+">&gt;6 meses</option>
            <option value="never">Nunca</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
        </div>
      </div>

      {/* Neutered Filter - Toggle Buttons */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
          Esterilizado
        </label>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onFilterChange('neutered', 'all')}
            className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
              filters.neutered === 'all'
                ? 'bg-[var(--primary)] text-white'
                : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]'
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => onFilterChange('neutered', 'yes')}
            className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
              filters.neutered === 'yes'
                ? 'bg-green-600 text-white'
                : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]'
            }`}
          >
            Si
          </button>
          <button
            type="button"
            onClick={() => onFilterChange('neutered', 'no')}
            className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
              filters.neutered === 'no'
                ? 'bg-gray-600 text-white'
                : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]'
            }`}
          >
            No
          </button>
        </div>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--status-error-bg)] px-3 py-2 text-xs text-[var(--status-error)] transition-colors hover:opacity-80"
        >
          <X className="h-3 w-3" />
          Limpiar filtros
        </button>
      )}
    </div>
  )
}
