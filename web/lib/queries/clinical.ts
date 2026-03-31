/**
 * Clinical Query Hooks
 *
 * RES-001: React Query Migration - Phase 2
 *
 * Query hooks for clinical tools data fetching.
 */

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from './keys'
import { buildUrl, staleTimes, gcTimes, parseErrorResponse } from './utils'

// Types
export interface Drug {
  id: string
  name: string
  generic_name: string | null
  brand: string | null
  form: string
  strength: string | null
  species: string[]
  category: string
  requires_prescription: boolean
}

export interface DrugDosage {
  id: string
  drug_id: string
  drug_name: string
  species: string
  dose_mg_per_kg: number
  dose_unit: string
  route: string
  frequency: string
  max_dose_mg: number | null
  notes: string | null
}

export interface DiagnosisCode {
  id: string
  code: string
  name: string
  description: string | null
  category: string
  species: string[]
  source: 'venom' | 'snomed' | 'custom'
}

export interface LabTest {
  id: string
  code: string
  name: string
  category: string
  description: string | null
  reference_range: string | null
  unit: string | null
  price: number
}

export interface LabPanel {
  id: string
  name: string
  description: string | null
  tests: string[] // test IDs
  price: number
}

export interface DosageCalculation {
  drug_name: string
  species: string
  weight_kg: number
  dose_mg: number
  dose_unit: string
  frequency: string
  route: string
  notes: string | null
}

// Query Hooks

/**
 * Search drugs by name
 */
export function useDrugSearch(
  query: string,
  options?: { enabled?: boolean; species?: string }
) {
  return useQuery({
    queryKey: queryKeys.clinical.drugSearch(query),
    queryFn: async (): Promise<Drug[]> => {
      if (!query || query.length < 2) return []

      const url = buildUrl('/api/clinical/drugs/search', {
        q: query,
        species: options?.species,
      })
      const response = await fetch(url)
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'clinical/drug-search')
        throw new Error(error.error || 'Error al buscar medicamentos')
      }
      return response.json()
    },
    enabled: (options?.enabled ?? true) && query.length >= 2,
    staleTime: staleTimes.STATIC, // Drug database rarely changes
    gcTime: gcTimes.LONG,
  })
}

/**
 * Search diagnosis codes
 */
export function useDiagnosisSearch(
  query: string,
  options?: { enabled?: boolean; species?: string; source?: string }
) {
  return useQuery({
    queryKey: queryKeys.clinical.diagnosisSearch(query),
    queryFn: async (): Promise<DiagnosisCode[]> => {
      if (!query || query.length < 2) return []

      const url = buildUrl('/api/clinical/diagnosis/search', {
        q: query,
        species: options?.species,
        source: options?.source,
      })
      const response = await fetch(url)
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'clinical/diagnosis-search')
        throw new Error(error.error || 'Error al buscar diagnósticos')
      }
      return response.json()
    },
    enabled: (options?.enabled ?? true) && query.length >= 2,
    staleTime: staleTimes.STATIC, // Diagnosis codes rarely change
    gcTime: gcTimes.LONG,
  })
}

/**
 * Calculate drug dosage
 */
export function useDosageCalculation(
  drugId: string,
  species: string,
  weightKg: number,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.clinical.dosageCalculator(drugId, species, weightKg),
    queryFn: async (): Promise<DosageCalculation> => {
      const url = buildUrl('/api/clinical/dosage/calculate', {
        drug_id: drugId,
        species,
        weight_kg: weightKg,
      })
      const response = await fetch(url)
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'clinical/dosage-calculation')
        throw new Error(error.error || 'Error al calcular dosis')
      }
      return response.json()
    },
    enabled: (options?.enabled ?? true) && !!drugId && !!species && weightKg > 0,
    staleTime: staleTimes.STATIC, // Dosage formulas don't change
    gcTime: gcTimes.LONG,
  })
}

/**
 * Fetch lab test catalog
 */
export function useLabTestCatalog(clinic: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.clinical.labTests(clinic),
    queryFn: async (): Promise<LabTest[]> => {
      const response = await fetch(`/api/${clinic}/lab/tests`)
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'clinical/lab-tests')
        throw new Error(error.error || 'Error al cargar catálogo de pruebas')
      }
      return response.json()
    },
    enabled: options?.enabled ?? true,
    staleTime: staleTimes.LONG, // Lab catalog changes infrequently
    gcTime: gcTimes.LONG,
  })
}

/**
 * Fetch lab panels
 */
export function useLabPanels(clinic: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.clinical.labPanels(clinic),
    queryFn: async (): Promise<LabPanel[]> => {
      const response = await fetch(`/api/${clinic}/lab/panels`)
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'clinical/lab-panels')
        throw new Error(error.error || 'Error al cargar paneles')
      }
      return response.json()
    },
    enabled: options?.enabled ?? true,
    staleTime: staleTimes.LONG,
    gcTime: gcTimes.LONG,
  })
}

/**
 * Fetch drug dosage guidelines for a species
 */
export function useDrugDosages(
  species: string,
  options?: { enabled?: boolean; drugId?: string }
) {
  return useQuery({
    queryKey: ['clinical', 'dosages', species, options?.drugId] as const,
    queryFn: async (): Promise<DrugDosage[]> => {
      const url = buildUrl('/api/clinical/dosages', {
        species,
        drug_id: options?.drugId,
      })
      const response = await fetch(url)
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'clinical/dosages')
        throw new Error(error.error || 'Error al cargar dosificaciones')
      }
      return response.json()
    },
    enabled: (options?.enabled ?? true) && !!species,
    staleTime: staleTimes.STATIC,
    gcTime: gcTimes.LONG,
  })
}
