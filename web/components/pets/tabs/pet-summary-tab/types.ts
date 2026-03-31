/**
 * Pet Summary Tab Types
 *
 * Type definitions for pet summary tab component.
 */

export interface Vaccine {
  id: string
  name: string
  administered_date?: string | null
  next_due_date?: string | null
  status: string
}

export interface WeightRecord {
  date: string
  weight_kg: number
  age_weeks?: number
}

export interface MissingVaccine {
  vaccine_name: string
  vaccine_code: string
  status: 'missing' | 'due' | 'overdue'
}

export interface PetData {
  id: string
  name: string
  species: string
  breed?: string | null
  sex?: string | null
  birth_date?: string | null
  weight_kg?: number | null
  temperament?: string | null
  allergies?: string[] | string | null
  chronic_conditions?: string[] | null
  existing_conditions?: string | null
  diet_category?: string | null
  diet_notes?: string | null
  vaccines?: Vaccine[]
  primary_vet_name?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
}

export interface PetSummaryTabProps {
  pet: PetData
  weightHistory: WeightRecord[]
  clinic: string
  clinicName?: string
  onWeightUpdated?: () => void
}
