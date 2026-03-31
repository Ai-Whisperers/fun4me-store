/**
 * Pet Summary Data Hook
 *
 * Manages vaccine fetching and data processing for pet summary.
 */

'use client'

import { useState, useEffect } from 'react'
import type { Vaccine, MissingVaccine, PetData } from './types'

interface UsePetSummaryDataProps {
  pet: PetData
}

export function usePetSummaryData({ pet }: UsePetSummaryDataProps) {
  const [missingMandatoryVaccines, setMissingMandatoryVaccines] = useState<MissingVaccine[]>([])
  const [isLoadingVaccines, setIsLoadingVaccines] = useState(true)
  const [displayedWeight, setDisplayedWeight] = useState<number | null>(pet.weight_kg ?? null)

  // Fetch missing mandatory vaccines
  useEffect(() => {
    async function fetchMissingVaccines(): Promise<void> {
      setIsLoadingVaccines(true)

      if (pet.species !== 'dog' && pet.species !== 'cat') {
        setIsLoadingVaccines(false)
        return
      }

      // Calculate age in weeks
      let ageWeeks: number | null = null
      if (pet.birth_date) {
        const birth = new Date(pet.birth_date)
        const now = new Date()
        const msPerWeek = 7 * 24 * 60 * 60 * 1000
        ageWeeks = Math.floor((now.getTime() - birth.getTime()) / msPerWeek)
      }

      // Get existing vaccine names
      const existingVaccineNames = (pet.vaccines || []).map((v) => v.name).join(',')

      const params = new URLSearchParams({
        species: pet.species,
        ...(ageWeeks !== null && { age_weeks: ageWeeks.toString() }),
        ...(existingVaccineNames && { existing_vaccine_names: existingVaccineNames }),
      })

      try {
        const response = await fetch(`/api/vaccines/recommendations?${params}`)
        if (!response.ok) {
          setIsLoadingVaccines(false)
          return
        }

        const data = await response.json()
        // Get ALL core vaccines that are missing (overdue, due, or just missing)
        const allMissingCoreVaccines = (data.core_vaccines || []).filter(
          (v: MissingVaccine) => v.status === 'overdue' || v.status === 'due' || v.status === 'missing'
        )
        setMissingMandatoryVaccines(allMissingCoreVaccines)
      } catch (error) {
        console.error('Error fetching missing vaccines:', error)
      } finally {
        setIsLoadingVaccines(false)
      }
    }

    fetchMissingVaccines()
  }, [pet.species, pet.birth_date, pet.vaccines])

  // Get allergies as array
  const getAllergies = (): string[] => {
    if (!pet.allergies) return []
    if (Array.isArray(pet.allergies)) return pet.allergies
    return [pet.allergies]
  }

  // Get conditions
  const getConditions = (): string[] => {
    if (pet.chronic_conditions && pet.chronic_conditions.length > 0) {
      return pet.chronic_conditions
    }
    if (pet.existing_conditions) {
      return [pet.existing_conditions]
    }
    return []
  }

  // Get upcoming vaccines
  const getUpcomingVaccines = (): Vaccine[] => {
    if (!pet.vaccines) return []
    const today = new Date()
    // Non-null assertions safe: filter ensures next_due_date exists
    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    return pet.vaccines
      .filter((v) => v.next_due_date && new Date(v.next_due_date) >= today)
      .sort((a, b) => new Date(a.next_due_date!).getTime() - new Date(b.next_due_date!).getTime())
      .slice(0, 3)
    /* eslint-enable @typescript-eslint/no-non-null-assertion */
  }

  // Get overdue vaccines
  const getOverdueVaccines = (): Vaccine[] => {
    if (!pet.vaccines) return []
    const today = new Date()
    return pet.vaccines.filter((v) => v.next_due_date && new Date(v.next_due_date) < today)
  }

  return {
    missingMandatoryVaccines,
    isLoadingVaccines,
    displayedWeight,
    setDisplayedWeight,
    allergies: getAllergies(),
    conditions: getConditions(),
    upcomingVaccines: getUpcomingVaccines(),
    overdueVaccines: getOverdueVaccines(),
  }
}
