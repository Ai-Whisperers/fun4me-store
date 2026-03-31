'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PetsByOwnerProps, FilterOptions } from './types'
import { useOwnerFiltering } from './useOwnerFiltering'
import { SearchHeader } from './SearchHeader'
import { OwnerList } from './OwnerList'
import { OwnerDetailsCard } from './OwnerDetailsCard'
import { PetsSection } from './PetsSection'
import { EmptyState } from './EmptyState'
import { InsightsBar } from './InsightsBar'

const DEFAULT_FILTERS: FilterOptions = {
  searchQuery: '',
  species: 'all',
  vaccine: 'all',
  lastVisit: 'all',
  neutered: 'all',
}

export function PetsByOwner({
  clinic,
  owners,
  insights,
  vaccineStatusByPet,
}: PetsByOwnerProps): React.ReactElement {
  const router = useRouter()
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(
    owners.length > 0 ? owners[0].id : null
  )
  const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTERS)

  const filteredOwners = useOwnerFiltering(owners, filters, vaccineStatusByPet)
  const selectedOwner =
    filteredOwners.find((o) => o.id === selectedOwnerId) || filteredOwners[0] || null

  const handleFilterChange = (key: keyof FilterOptions, value: string): void => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleSearchChange = (value: string): void => {
    setFilters((prev) => ({ ...prev, searchQuery: value }))
  }

  const handleInsightClick = (key: keyof FilterOptions, value: string): void => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handlePendingFilesClick = (): void => {
    router.push(`/${clinic}/dashboard/orders?status=pending_prescription`)
  }

  const clearFilters = (): void => {
    setFilters(DEFAULT_FILTERS)
  }

  const hasActiveFilters =
    filters.species !== 'all' ||
    filters.vaccine !== 'all' ||
    filters.lastVisit !== 'all' ||
    filters.neutered !== 'all'

  return (
    <div className="space-y-6">
      {/* Insights Bar */}
      <InsightsBar
        insights={insights}
        onFilterClick={handleInsightClick}
        onPendingFilesClick={handlePendingFilesClick}
      />

      {/* Main Layout */}
      <div className="flex h-[calc(100vh-20rem)] flex-col gap-6 lg:flex-row">
        {/* Left Panel - Owner List */}
        <div className="flex w-full flex-col overflow-hidden rounded-xl border border-[var(--border-color)] bg-white shadow-sm lg:w-96">
          <SearchHeader
            searchQuery={filters.searchQuery}
            onSearchChange={handleSearchChange}
            resultCount={filteredOwners.length}
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={clearFilters}
            hasActiveFilters={hasActiveFilters}
          />

          <div className="flex-1 overflow-y-auto">
            <OwnerList
              owners={filteredOwners}
              selectedOwnerId={selectedOwnerId}
              onSelectOwner={setSelectedOwnerId}
              searchQuery={filters.searchQuery}
            />
          </div>
        </div>

        {/* Right Panel - Owner Details & Pets */}
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto">
          {selectedOwner ? (
            <>
              <OwnerDetailsCard owner={selectedOwner} clinic={clinic} />
              <PetsSection owner={selectedOwner} clinic={clinic} />
            </>
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </div>
  )
}
