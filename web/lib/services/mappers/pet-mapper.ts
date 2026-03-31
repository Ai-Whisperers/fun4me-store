/**
 * Pet Mappers - Type-safe conversion from Supabase to domain types
 *
 * Eliminates unsafe `as unknown as` casts by providing explicit mapping functions.
 */

import type { Pet, PetWithOwner } from '@/lib/types/entities/pet'

// =============================================================================
// RAW SUPABASE TYPES
// =============================================================================

interface RawOwner {
  id: string
  full_name: string
  email: string | null
  phone: string | null
}

/**
 * Raw pet data from Supabase query with owner join
 */
export interface RawPetWithOwner {
  id: string
  owner_id: string
  tenant_id: string
  name: string
  species: string
  breed: string | null
  birth_date: string | null
  weight_kg: number | null
  microchip_number: string | null
  photo_url: string | null
  sex: string | null
  color: string | null
  is_neutered: boolean | null
  temperament: string | null
  diet_category: string | null
  diet_notes: string | null
  allergies: string[] | null
  chronic_conditions: string[] | null
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
  owner: RawOwner | RawOwner[] | null
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function normalizeRelation<T>(relation: T | T[] | null): T | null {
  if (relation === null) return null
  if (Array.isArray(relation)) {
    return relation.length > 0 ? relation[0] : null
  }
  return relation
}

// =============================================================================
// MAPPER FUNCTIONS
// =============================================================================

/**
 * Map raw pet with owner to domain type
 */
export function mapPetWithOwner(raw: RawPetWithOwner): PetWithOwner {
  const owner = normalizeRelation(raw.owner)

  return {
    id: raw.id,
    owner_id: raw.owner_id,
    tenant_id: raw.tenant_id,
    name: raw.name,
    species: raw.species as Pet['species'],
    breed: raw.breed,
    birth_date: raw.birth_date,
    weight_kg: raw.weight_kg,
    microchip_number: raw.microchip_number,
    photo_url: raw.photo_url,
    sex: raw.sex as Pet['sex'],
    color: raw.color,
    is_neutered: raw.is_neutered,
    temperament: raw.temperament as Pet['temperament'],
    diet_category: raw.diet_category as Pet['diet_category'],
    diet_notes: raw.diet_notes,
    allergies: raw.allergies,
    chronic_conditions: raw.chronic_conditions,
    notes: raw.notes,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    deleted_at: raw.deleted_at,
    owner: owner
      ? {
          id: owner.id,
          full_name: owner.full_name,
          email: owner.email,
          phone: owner.phone,
        }
      : null,
  }
}

/**
 * Map array of raw pets to domain types
 */
export function mapPetsWithOwner(raw: RawPetWithOwner[]): PetWithOwner[] {
  return raw.map(mapPetWithOwner)
}

/**
 * Type guard for raw pet data
 */
export function isRawPetWithOwner(data: unknown): data is RawPetWithOwner {
  if (typeof data !== 'object' || data === null) return false

  const obj = data as Record<string, unknown>

  return (
    typeof obj.id === 'string' &&
    typeof obj.owner_id === 'string' &&
    typeof obj.tenant_id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.species === 'string'
  )
}
