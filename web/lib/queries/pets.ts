/**
 * Pets Query Hooks
 *
 * RES-001: React Query Migration - Phase 2
 *
 * Query hooks for pet data fetching.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from './keys'
import { buildUrl, staleTimes, gcTimes, parseErrorResponse } from './utils'

// Types
export interface Pet {
  id: string
  tenant_id: string
  owner_id: string
  owner_name?: string
  name: string
  species: 'dog' | 'cat' | 'bird' | 'rabbit' | 'hamster' | 'fish' | 'reptile' | 'other'
  breed: string | null
  date_of_birth: string | null
  sex: 'male' | 'female' | 'unknown'
  weight_kg: number | null
  microchip_id: string | null
  is_neutered: boolean
  photo_url: string | null
  notes: string | null
  is_deceased: boolean
  created_at: string
  updated_at: string
}

export interface MedicalRecord {
  id: string
  pet_id: string
  tenant_id: string
  vet_id: string
  vet_name?: string
  record_type: 'consultation' | 'surgery' | 'procedure' | 'follow_up' | 'emergency'
  diagnosis_code?: string
  diagnosis_name?: string
  chief_complaint: string | null
  clinical_findings: string | null
  diagnosis: string | null
  treatment: string | null
  notes: string | null
  created_at: string
}

export interface Vaccine {
  id: string
  pet_id: string
  vaccine_name: string
  batch_number: string | null
  administered_date: string
  next_due_date: string | null
  administered_by: string | null
  vet_name?: string
  status: 'completed' | 'scheduled' | 'overdue'
  notes: string | null
}

export interface GrowthDataPoint {
  date: string
  weight_kg: number
  age_weeks: number
}

export interface WeightEntry {
  id: string
  pet_id: string
  weight_kg: number
  recorded_at: string
  recorded_by?: string
  notes?: string
}

// Query Hooks

/**
 * Fetch pets list
 */
export function usePetsList(
  clinic: string,
  ownerId?: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.pets.list(clinic, ownerId),
    queryFn: async (): Promise<Pet[]> => {
      const url = buildUrl(`/api/${clinic}/pets`, { owner_id: ownerId })
      const response = await fetch(url)
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'pets/list')
        throw new Error(error.error || 'Error al cargar mascotas')
      }
      return response.json()
    },
    enabled: options?.enabled ?? true,
    staleTime: staleTimes.MEDIUM,
    gcTime: gcTimes.MEDIUM,
  })
}

/**
 * Fetch single pet
 */
export function usePet(petId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.pets.detail(petId),
    queryFn: async (): Promise<Pet> => {
      const response = await fetch(`/api/pets/${petId}`)
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'pets/detail')
        throw new Error(error.error || 'Error al cargar mascota')
      }
      return response.json()
    },
    enabled: (options?.enabled ?? true) && !!petId,
    staleTime: staleTimes.MEDIUM,
    gcTime: gcTimes.MEDIUM,
  })
}

/**
 * Fetch pet's medical records
 */
export function usePetMedicalRecords(petId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.pets.medical(petId),
    queryFn: async (): Promise<MedicalRecord[]> => {
      const response = await fetch(`/api/pets/${petId}/medical-records`)
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'pets/medical-records')
        throw new Error(error.error || 'Error al cargar historial médico')
      }
      return response.json()
    },
    enabled: (options?.enabled ?? true) && !!petId,
    staleTime: staleTimes.MEDIUM,
    gcTime: gcTimes.MEDIUM,
  })
}

/**
 * Fetch pet's vaccines
 */
export function usePetVaccines(petId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.pets.vaccines(petId),
    queryFn: async (): Promise<Vaccine[]> => {
      const response = await fetch(`/api/pets/${petId}/vaccines`)
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'pets/vaccines')
        throw new Error(error.error || 'Error al cargar vacunas')
      }
      return response.json()
    },
    enabled: (options?.enabled ?? true) && !!petId,
    staleTime: staleTimes.MEDIUM,
    gcTime: gcTimes.MEDIUM,
  })
}

/**
 * Fetch pet's growth chart data
 */
export function usePetGrowthChart(petId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.pets.growthChart(petId),
    queryFn: async (): Promise<{
      pet: Pet
      weights: GrowthDataPoint[]
      standards?: { age_weeks: number; p5: number; p50: number; p95: number }[]
    }> => {
      const response = await fetch(`/api/pets/${petId}/growth-chart`)
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'pets/growth-chart')
        throw new Error(error.error || 'Error al cargar gráfico de crecimiento')
      }
      return response.json()
    },
    enabled: (options?.enabled ?? true) && !!petId,
    staleTime: staleTimes.MEDIUM,
    gcTime: gcTimes.MEDIUM,
  })
}

/**
 * Fetch pet's weight history
 */
export function usePetWeightHistory(petId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.pets.weightHistory(petId),
    queryFn: async (): Promise<WeightEntry[]> => {
      const response = await fetch(`/api/pets/${petId}/weight-history`)
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'pets/weight-history')
        throw new Error(error.error || 'Error al cargar historial de peso')
      }
      return response.json()
    },
    enabled: (options?.enabled ?? true) && !!petId,
    staleTime: staleTimes.MEDIUM,
    gcTime: gcTimes.MEDIUM,
  })
}

// Mutation Hooks

interface CreatePetInput {
  name: string
  species: Pet['species']
  breed?: string
  date_of_birth?: string
  sex?: Pet['sex']
  weight_kg?: number
  microchip_id?: string
  is_neutered?: boolean
  notes?: string
}

/**
 * Create a new pet
 */
export function useCreatePet(clinic: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreatePetInput): Promise<Pet> => {
      const response = await fetch(`/api/${clinic}/pets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'pets/create')
        throw new Error(error.error || 'Error al crear mascota')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pets.all })
    },
  })
}

interface UpdatePetInput extends Partial<CreatePetInput> {
  id: string
}

/**
 * Update a pet
 */
export function useUpdatePet(clinic: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdatePetInput): Promise<Pet> => {
      const response = await fetch(`/api/${clinic}/pets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'pets/update')
        throw new Error(error.error || 'Error al actualizar mascota')
      }
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pets.list(clinic) })
      queryClient.setQueryData(queryKeys.pets.detail(data.id), data)
    },
  })
}

/**
 * Record weight for a pet
 */
export function useRecordWeight(clinic: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      petId,
      weight_kg,
      notes,
    }: {
      petId: string
      weight_kg: number
      notes?: string
    }): Promise<WeightEntry> => {
      const response = await fetch(`/api/${clinic}/pets/${petId}/weight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight_kg, notes }),
      })
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'pets/record-weight')
        throw new Error(error.error || 'Error al registrar peso')
      }
      return response.json()
    },
    onSuccess: (_, { petId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pets.weightHistory(petId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.pets.growthChart(petId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.pets.detail(petId) })
    },
  })
}

/**
 * Add vaccine record
 */
export function useAddVaccine(clinic: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      petId,
      vaccine_name,
      administered_date,
      next_due_date,
      batch_number,
      notes,
    }: {
      petId: string
      vaccine_name: string
      administered_date: string
      next_due_date?: string
      batch_number?: string
      notes?: string
    }): Promise<Vaccine> => {
      const response = await fetch(`/api/${clinic}/pets/${petId}/vaccines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vaccine_name,
          administered_date,
          next_due_date,
          batch_number,
          notes,
        }),
      })
      if (!response.ok) {
        const error = await parseErrorResponse(response, 'pets/add-vaccine')
        throw new Error(error.error || 'Error al registrar vacuna')
      }
      return response.json()
    },
    onSuccess: (_, { petId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pets.vaccines(petId) })
    },
  })
}
