/**
 * Search Filters Component
 *
 * Search input and filter controls for the clinic network.
 */

'use client'

import { Search, Filter, ChevronDown } from 'lucide-react'
import { allCities, allSpecialties } from './data'

interface SearchFiltersProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedCity: string | null
  onCityChange: (city: string | null) => void
  selectedSpecialty: string | null
  onSpecialtyChange: (specialty: string | null) => void
  showFilters: boolean
  onToggleFilters: () => void
  onClearFilters: () => void
  hasActiveFilters: boolean
}

export function SearchFilters({
  searchQuery,
  onSearchChange,
  selectedCity,
  onCityChange,
  selectedSpecialty,
  onSpecialtyChange,
  showFilters,
  onToggleFilters,
  onClearFilters,
  hasActiveFilters,
}: SearchFiltersProps) {
  return (
    <div className="mx-auto mb-8 max-w-4xl">
      <div className="flex flex-col gap-4 md:flex-row">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Buscar por nombre, ciudad o barrio..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="focus:border-[var(--primary)]/50 w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-white placeholder-white/40 transition-all focus:outline-none"
          />
        </div>

        {/* Filter Toggle Button */}
        <button
          onClick={onToggleFilters}
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 transition-all ${
            showFilters || hasActiveFilters
              ? 'bg-[var(--primary)]/10 border-[var(--primary)]/30 text-[var(--primary)]'
              : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20'
          }`}
        >
          <Filter className="h-5 w-5" />
          Filtros
          {hasActiveFilters && <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />}
          <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap gap-4">
            {/* City Filter */}
            <div className="min-w-[200px] flex-1">
              <label className="mb-2 block text-sm text-white/50">Ciudad</label>
              <select
                value={selectedCity || ''}
                onChange={(e) => onCityChange(e.target.value || null)}
                className="focus:border-[var(--primary)]/50 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:outline-none"
              >
                <option value="">Todas las ciudades</option>
                {allCities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            {/* Specialty Filter */}
            <div className="min-w-[200px] flex-1">
              <label className="mb-2 block text-sm text-white/50">Especialidad</label>
              <select
                value={selectedSpecialty || ''}
                onChange={(e) => onSpecialtyChange(e.target.value || null)}
                className="focus:border-[var(--primary)]/50 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:outline-none"
              >
                <option value="">Todas las especialidades</option>
                {allSpecialties.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={onClearFilters}
                className="self-end px-4 py-2 text-white/60 transition-colors hover:text-white"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
