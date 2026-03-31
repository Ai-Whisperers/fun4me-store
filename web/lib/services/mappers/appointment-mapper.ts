/**
 * Appointment Mappers - Type-safe conversion from Supabase to domain types
 *
 * Eliminates unsafe `as unknown as` casts by providing explicit mapping functions.
 * These mappers handle the structural differences between Supabase query results
 * and our domain types.
 */

import type { AppointmentWithDetails } from '@/lib/types/entities/appointment'
import type { PetCardData } from '@/lib/types/entities/pet'
import type { PetSpecies } from '@/lib/types/database/enums'

// =============================================================================
// RAW SUPABASE TYPES (what the query actually returns)
// =============================================================================

/**
 * Raw pet data from Supabase query with owner join
 */
interface RawPetWithOwner {
  id: string
  name: string
  species: string
  breed: string | null
  photo_url: string | null
  owner:
    | {
        id: string
        full_name: string
        email: string | null
        phone: string | null
      }
    | Array<{
        id: string
        full_name: string
        email: string | null
        phone: string | null
      }>
    | null
}

/**
 * Raw service data from Supabase query
 */
interface RawService {
  id: string
  name: string
  duration_minutes: number | null
  base_price: number | null
}

/**
 * Raw vet profile data from Supabase query
 */
interface RawVet {
  id: string
  full_name: string
}

/**
 * Raw appointment data from Supabase join query
 */
export interface RawAppointmentWithDetails {
  id: string
  tenant_id: string
  pet_id: string
  vet_id: string | null
  service_id: string | null
  created_by: string
  start_time: string
  end_time: string
  status: string
  reason: string
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
  pet: RawPetWithOwner | RawPetWithOwner[]
  service: RawService | RawService[] | null
  vet: RawVet | RawVet[] | null
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Normalize Supabase relation that might be array or single object
 */
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
 * Map raw pet data to PetCardData with owner
 */
function mapPetWithOwner(raw: RawPetWithOwner): PetCardData & {
  owner?: {
    id: string
    full_name: string
    email: string | null
    phone?: string | null
  } | null
} {
  const owner = normalizeRelation(raw.owner)

  return {
    id: raw.id,
    name: raw.name,
    species: raw.species as PetSpecies,
    breed: raw.breed,
    photo_url: raw.photo_url,
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
 * Map raw appointment with details to domain type
 */
export function mapAppointmentWithDetails(
  raw: RawAppointmentWithDetails
): AppointmentWithDetails {
  const pet = normalizeRelation(raw.pet)
  const service = normalizeRelation(raw.service)
  const vet = normalizeRelation(raw.vet)

  if (!pet) {
    throw new Error(`Appointment ${raw.id} is missing required pet relation`)
  }

  return {
    id: raw.id,
    tenant_id: raw.tenant_id,
    pet_id: raw.pet_id,
    vet_id: raw.vet_id,
    service_id: raw.service_id,
    created_by: raw.created_by,
    start_time: raw.start_time,
    end_time: raw.end_time,
    status: raw.status as AppointmentWithDetails['status'],
    reason: raw.reason,
    notes: raw.notes,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    deleted_at: raw.deleted_at,
    pet: mapPetWithOwner(pet),
    service: service
      ? {
          id: service.id,
          name: service.name,
          duration_minutes: service.duration_minutes,
          base_price: service.base_price ?? undefined,
        }
      : null,
    vet: vet
      ? {
          id: vet.id,
          full_name: vet.full_name,
        }
      : null,
  }
}

/**
 * Map array of raw appointments to domain types
 */
export function mapAppointmentsWithDetails(
  raw: RawAppointmentWithDetails[]
): AppointmentWithDetails[] {
  return raw.map(mapAppointmentWithDetails)
}

/**
 * Type guard to check if data matches RawAppointmentWithDetails structure
 */
export function isRawAppointmentWithDetails(
  data: unknown
): data is RawAppointmentWithDetails {
  if (typeof data !== 'object' || data === null) return false

  const obj = data as Record<string, unknown>

  return (
    typeof obj.id === 'string' &&
    typeof obj.tenant_id === 'string' &&
    typeof obj.pet_id === 'string' &&
    typeof obj.start_time === 'string' &&
    typeof obj.end_time === 'string' &&
    typeof obj.status === 'string' &&
    obj.pet !== undefined
  )
}
