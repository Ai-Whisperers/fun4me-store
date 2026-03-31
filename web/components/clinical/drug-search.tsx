'use client'

/**
 * Drug Search Component
 *
 * RES-001: Migrated to use React Query for data fetching
 * - Replaced useEffect+fetch with useDrugSearch hook
 * - Server-side search using API ?q= parameter
 * - Automatic caching and deduplication
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Loader2 } from 'lucide-react'
import { queryKeys } from '@/lib/queries'
import { staleTimes, gcTimes } from '@/lib/queries/utils'

interface Drug {
  id: string
  name: string
  concentration_mg_ml?: number
  dose_mg_per_kg?: number
  species: string
  route?: string
  frequency?: string
}

interface DrugSearchProps {
  onSelect: (drug: Drug) => void
  placeholder?: string
  species?: string
}

export function DrugSearch({
  onSelect,
  placeholder = 'Buscar medicamento...',
  species,
}: DrugSearchProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  // Use React Query for drug search with debouncing handled by staleTime
  const { data, isLoading, isFetching } = useQuery({
    queryKey: [...queryKeys.clinical.drugSearch(query), species] as const,
    queryFn: async (): Promise<{ data: Drug[]; total: number }> => {
      const params = new URLSearchParams()
      params.set('q', query)
      params.set('limit', '10')
      if (species) params.set('species', species)

      const response = await fetch(`/api/drug_dosages?${params}`)
      if (!response.ok) {
        throw new Error('Error al buscar medicamentos')
      }
      return response.json()
    },
    enabled: query.length >= 2,
    staleTime: staleTimes.STATIC, // Drug data rarely changes
    gcTime: gcTimes.LONG,
  })

  const results = data?.data || []
  const loading = isLoading || isFetching

  // Open dropdown when we have results
  const showDropdown = isOpen && query.length >= 2 && results.length > 0

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          type="text"
          className="min-h-[44px] w-full rounded-lg border border-[var(--border,#e5e7eb)] bg-[var(--bg-paper)] py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-[var(--primary)]"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            // Delay closing to allow click on results
            setTimeout(() => setIsOpen(false), 200)
          }}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--text-muted)]" />
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-[var(--border-light,#f3f4f6)] bg-[var(--bg-paper)] shadow-xl">
          {results.map((d) => (
            <button
              key={d.id}
              className="flex min-h-[48px] w-full flex-col gap-1 px-4 py-3 text-left text-sm hover:bg-[var(--bg-subtle)] sm:flex-row sm:items-center sm:justify-between"
              onClick={() => {
                onSelect(d)
                setQuery('')
                setIsOpen(false)
              }}
            >
              <span className="font-bold text-[var(--text-secondary)]">{d.name}</span>
              <span className="text-xs text-[var(--text-muted)]">
                {d.dose_mg_per_kg ? `${d.dose_mg_per_kg} mg/kg` : ''} ({d.species})
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
