import { useMemo } from 'react'
import type { Owner, FilterOptions, VaccineStatus } from './types'

export function useOwnerFiltering(
  owners: Owner[],
  filters: FilterOptions,
  vaccineStatusByPet: Record<string, VaccineStatus>
): Owner[] {
  const filteredOwners = useMemo(() => {
    let filtered = owners

    // Search query filter
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase()
      filtered = filtered.filter(
        (owner) =>
          owner.full_name.toLowerCase().includes(query) ||
          owner.email.toLowerCase().includes(query) ||
          owner.phone?.toLowerCase().includes(query) ||
          owner.pets.some(
            (pet) =>
              pet.name.toLowerCase().includes(query) ||
              pet.species.toLowerCase().includes(query) ||
              pet.breed?.toLowerCase().includes(query)
          )
      )
    }

    // Species filter
    if (filters.species !== 'all') {
      filtered = filtered.filter((owner) =>
        owner.pets.some((pet) => {
          if (filters.species === 'other') {
            return !['dog', 'cat'].includes(pet.species.toLowerCase())
          }
          return pet.species.toLowerCase() === filters.species
        })
      )
    }

    // Vaccine filter
    if (filters.vaccine !== 'all') {
      filtered = filtered.filter((owner) =>
        owner.pets.some((pet) => {
          const status = vaccineStatusByPet[pet.id]
          if (!status) return filters.vaccine === 'none'

          switch (filters.vaccine) {
            case 'overdue':
              return status.hasOverdue
            case 'due-soon':
              return status.hasDueSoon
            case 'up-to-date':
              return status.hasVaccines && !status.hasOverdue && !status.hasDueSoon
            case 'none':
              return !status.hasVaccines
            default:
              return true
          }
        })
      )
    }

    // Last visit filter
    if (filters.lastVisit !== 'all') {
      filtered = filtered.filter((owner) => {
        if (filters.lastVisit === 'never') return !owner.last_visit
        if (!owner.last_visit) return false

        const days = (Date.now() - new Date(owner.last_visit).getTime()) / (1000 * 60 * 60 * 24)
        switch (filters.lastVisit) {
          case 'recent':
            return days <= 30
          case '1-3':
            return days > 30 && days <= 90
          case '3-6':
            return days > 90 && days <= 180
          case '6+':
            return days > 180
          default:
            return true
        }
      })
    }

    // Neutered filter
    if (filters.neutered !== 'all') {
      const isNeutered = filters.neutered === 'yes'
      filtered = filtered.filter((owner) =>
        owner.pets.some((pet) => pet.is_neutered === isNeutered)
      )
    }

    return filtered
  }, [owners, filters, vaccineStatusByPet])

  return filteredOwners
}
