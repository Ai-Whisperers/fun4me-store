/**
 * Pet Entity Types - Single Source of Truth
 *
 * This file contains the canonical Pet type and all derived variants.
 * Import from here instead of defining inline types.
 *
 * @example
 * ```typescript
 * import type { Pet, PetSummary, PetWithOwner } from '@/lib/types/entities/pet'
 * ```
 */

import type {
  PetSpecies,
  PetSex,
  PetTemperament,
  DietCategory,
} from '../database/enums'

// =============================================================================
// BASE PET TYPE (Database Entity)
// =============================================================================

/**
 * Base Pet entity - matches database schema exactly
 */
export interface Pet {
  id: string
  owner_id: string
  tenant_id: string
  name: string
  species: PetSpecies
  breed: string | null
  birth_date: string | null
  weight_kg: number | null
  microchip_number: string | null
  photo_url: string | null
  sex: PetSex | null
  color: string | null
  is_neutered: boolean | null
  temperament: PetTemperament | null
  diet_category: DietCategory | null
  diet_notes: string | null
  allergies: string[] | null
  chronic_conditions: string[] | null
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

// =============================================================================
// DERIVED TYPES (Use Pick/Omit for consistency)
// =============================================================================

/**
 * Minimal pet reference - for lists, dropdowns, cards
 * Use this when you only need id, name, species
 */
export type PetSummary = Pick<Pet, 'id' | 'name' | 'species'>

/**
 * Pet summary with photo - for cards and list items
 */
export type PetCardData = Pick<Pet, 'id' | 'name' | 'species' | 'breed' | 'photo_url'>

/**
 * Pet with owner information - for appointments, invoices
 */
export interface PetWithOwner extends Pet {
  owner: {
    id: string
    full_name: string
    email: string | null
    phone: string | null
  } | null
}

/**
 * Pet summary with owner - for booking, reminders
 */
export interface PetSummaryWithOwner extends PetSummary {
  owner?: {
    id: string
    full_name: string
    email?: string | null
    phone?: string | null
  } | null
}

/**
 * Form data for creating/updating a pet
 */
export type PetFormData = Omit<Pet, 'id' | 'owner_id' | 'tenant_id' | 'created_at' | 'updated_at' | 'deleted_at'>

/**
 * Data required to create a new pet
 */
export type CreatePetInput = Omit<Pet, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>

/**
 * Data for updating a pet
 */
export type UpdatePetInput = Partial<PetFormData>

/**
 * Pet for service selection (with size category)
 */
export interface PetForService extends PetSummary {
  breed: string | null
  weight_kg: number | null
  size_category?: 'small' | 'medium' | 'large' | 'extra_large'
}

/**
 * Pet info for reminders and notifications
 */
export type PetInfo = PetSummary

/**
 * Pet with vaccine summary
 */
export interface PetWithVaccines extends Pet {
  vaccines?: Array<{
    id: string
    name: string
    status: string
    next_due_date: string | null
  }>
}

/**
 * Pet for medical records
 */
export interface PetWithMedicalHistory extends Pet {
  medical_records?: Array<{
    id: string
    type: string
    title: string
    created_at: string
  }>
  vaccines?: Array<{
    id: string
    name: string
    administered_date: string | null
  }>
}
