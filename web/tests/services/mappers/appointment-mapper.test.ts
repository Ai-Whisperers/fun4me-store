/**
 * Appointment Mapper Tests
 *
 * Tests type-safe conversion from Supabase query results to domain types:
 * - Raw appointment data mapping
 * - Relation normalization (array vs single object)
 * - Error handling for missing required data
 * - Type guards and validation
 */

import { describe, it, expect } from 'vitest'
import {
  mapAppointmentWithDetails,
  mapAppointmentsWithDetails,
  isRawAppointmentWithDetails,
  type RawAppointmentWithDetails,
} from '@/lib/services/mappers/appointment-mapper'
import type { AppointmentWithDetails } from '@/lib/types/entities/appointment'

// =============================================================================
// TEST DATA FACTORIES
// =============================================================================

function createRawPetWithOwner() {
  return {
    id: 'pet-max-123',
    name: 'Max',
    species: 'dog',
    breed: 'Labrador',
    photo_url: 'https://example.com/max.jpg',
    owner: {
      id: 'owner-john-456',
      full_name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
    },
  }
}

function createRawService() {
  return {
    id: 'service-checkup-789',
    name: 'Consulta General',
    duration_minutes: 30,
    base_price: 50.0,
  }
}

function createRawVet() {
  return {
    id: 'vet-maria-012',
    full_name: 'Dr. María González',
  }
}

function createRawAppointmentWithDetails(
  overrides: Partial<RawAppointmentWithDetails> = {}
): RawAppointmentWithDetails {
  return {
    id: 'appointment-123-456',
    tenant_id: 'clinic-vet-centro',
    pet_id: 'pet-max-123',
    vet_id: 'vet-maria-012',
    service_id: 'service-checkup-789',
    created_by: 'user-admin-789',
    start_time: '2024-01-15T10:00:00Z',
    end_time: '2024-01-15T10:30:00Z',
    status: 'scheduled',
    reason: 'Checkup de rutina',
    notes: 'Paciente en buen estado general',
    created_at: '2024-01-10T09:00:00Z',
    updated_at: '2024-01-10T09:00:00Z',
    pet: createRawPetWithOwner(),
    service: createRawService(),
    vet: createRawVet(),
    ...overrides,
  }
}

// =============================================================================
// MAPPING TESTS
// =============================================================================

describe('mapAppointmentWithDetails', () => {
  it('should map complete appointment with all relations', () => {
    const raw = createRawAppointmentWithDetails()

    const result = mapAppointmentWithDetails(raw)

    expect(result).toEqual({
      id: 'appointment-123-456',
      tenant_id: 'clinic-vet-centro',
      pet_id: 'pet-max-123',
      vet_id: 'vet-maria-012',
      service_id: 'service-checkup-789',
      created_by: 'user-admin-789',
      start_time: '2024-01-15T10:00:00Z',
      end_time: '2024-01-15T10:30:00Z',
      status: 'scheduled',
      reason: 'Checkup de rutina',
      notes: 'Paciente en buen estado general',
      created_at: '2024-01-10T09:00:00Z',
      updated_at: '2024-01-10T09:00:00Z',
      deleted_at: undefined,
      pet: {
        id: 'pet-max-123',
        name: 'Max',
        species: 'dog',
        breed: 'Labrador',
        photo_url: 'https://example.com/max.jpg',
        owner: {
          id: 'owner-john-456',
          full_name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
        },
      },
      service: {
        id: 'service-checkup-789',
        name: 'Consulta General',
        duration_minutes: 30,
        base_price: 50.0,
      },
      vet: {
        id: 'vet-maria-012',
        full_name: 'Dr. María González',
      },
    } satisfies AppointmentWithDetails)
  })

  it('should handle null optional relations', () => {
    const raw = createRawAppointmentWithDetails({
      vet_id: null,
      service_id: null,
      vet: null,
      service: null,
      notes: null,
    })

    const result = mapAppointmentWithDetails(raw)

    expect(result.vet_id).toBe(null)
    expect(result.service_id).toBe(null)
    expect(result.vet).toBe(null)
    expect(result.service).toBe(null)
    expect(result.notes).toBe(null)
  })

  it('should handle deleted appointments', () => {
    const raw = createRawAppointmentWithDetails({
      deleted_at: '2024-01-16T12:00:00Z',
    })

    const result = mapAppointmentWithDetails(raw)

    expect(result.deleted_at).toBe('2024-01-16T12:00:00Z')
  })

  it('should handle pet with null owner', () => {
    const rawPetWithoutOwner = {
      id: 'pet-stray-789',
      name: 'Stray Cat',
      species: 'cat',
      breed: null,
      photo_url: null,
      owner: null,
    }

    const raw = createRawAppointmentWithDetails({
      pet: rawPetWithoutOwner,
    })

    const result = mapAppointmentWithDetails(raw)

    expect(result.pet?.owner).toBe(null)
    expect(result.pet?.breed).toBe(null)
    expect(result.pet?.photo_url).toBe(null)
  })

  it('should handle service with null prices', () => {
    const rawServiceNullPrice = {
      id: 'service-custom-999',
      name: 'Servicio Personalizado',
      duration_minutes: null,
      base_price: null,
    }

    const raw = createRawAppointmentWithDetails({
      service: rawServiceNullPrice,
    })

    const result = mapAppointmentWithDetails(raw)

    expect(result.service).toEqual({
      id: 'service-custom-999',
      name: 'Servicio Personalizado',
      duration_minutes: null,
      base_price: undefined, // null becomes undefined
    })
  })
})

// =============================================================================
// RELATION NORMALIZATION TESTS
// =============================================================================

describe('relation normalization', () => {
  it('should normalize single object relations', () => {
    const raw = createRawAppointmentWithDetails()

    const result = mapAppointmentWithDetails(raw)

    expect(result.pet).toBeDefined()
    expect(result.service).toBeDefined()
    expect(result.vet).toBeDefined()
  })

  it('should normalize array relations by taking first element', () => {
    const rawWithArrays = createRawAppointmentWithDetails({
      pet: [createRawPetWithOwner(), createRawPetWithOwner()],
      service: [createRawService(), createRawService()],
      vet: [createRawVet(), createRawVet()],
    } as any)

    const result = mapAppointmentWithDetails(rawWithArrays)

    expect(result.pet).toEqual(
      expect.objectContaining({
        id: 'pet-max-123',
        name: 'Max',
      })
    )
    expect(result.service).toEqual(
      expect.objectContaining({
        id: 'service-checkup-789',
        name: 'Consulta General',
      })
    )
    expect(result.vet).toEqual(
      expect.objectContaining({
        id: 'vet-maria-012',
        full_name: 'Dr. María González',
      })
    )
  })

  it('should handle empty arrays as null', () => {
    const rawWithEmptyArrays = createRawAppointmentWithDetails({
      vet: [],
      service: [],
    } as any)

    const result = mapAppointmentWithDetails(rawWithEmptyArrays)

    expect(result.vet).toBe(null)
    expect(result.service).toBe(null)
  })

  it('should normalize nested owner arrays', () => {
    const petWithOwnerArray = {
      ...createRawPetWithOwner(),
      owner: [
        {
          id: 'owner-john-456',
          full_name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
        },
        {
          id: 'owner-jane-789',
          full_name: 'Jane Doe',
          email: 'jane@example.com',
          phone: '+0987654321',
        },
      ],
    }

    const raw = createRawAppointmentWithDetails({
      pet: petWithOwnerArray as any,
    })

    const result = mapAppointmentWithDetails(raw)

    expect(result.pet?.owner).toEqual({
      id: 'owner-john-456',
      full_name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
    })
  })
})

// =============================================================================
// ERROR HANDLING TESTS
// =============================================================================

describe('error handling', () => {
  it('should throw error when pet relation is missing', () => {
    const raw = createRawAppointmentWithDetails({
      pet: null,
    })

    expect(() => mapAppointmentWithDetails(raw)).toThrow(
      'Appointment appointment-123-456 is missing required pet relation'
    )
  })

  it('should throw error when pet is empty array', () => {
    const raw = createRawAppointmentWithDetails({
      pet: [] as any,
    })

    expect(() => mapAppointmentWithDetails(raw)).toThrow(
      'Appointment appointment-123-456 is missing required pet relation'
    )
  })
})

// =============================================================================
// ARRAY MAPPING TESTS
// =============================================================================

describe('mapAppointmentsWithDetails', () => {
  it('should map array of appointments', () => {
    const rawAppointments = [
      createRawAppointmentWithDetails({
        id: 'appointment-1',
        start_time: '2024-01-15T10:00:00Z',
      }),
      createRawAppointmentWithDetails({
        id: 'appointment-2',
        start_time: '2024-01-15T11:00:00Z',
      }),
    ]

    const result = mapAppointmentsWithDetails(rawAppointments)

    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('appointment-1')
    expect(result[1].id).toBe('appointment-2')
    expect(result[0].start_time).toBe('2024-01-15T10:00:00Z')
    expect(result[1].start_time).toBe('2024-01-15T11:00:00Z')
  })

  it('should handle empty array', () => {
    const result = mapAppointmentsWithDetails([])

    expect(result).toEqual([])
  })

  it('should handle mixed valid and invalid appointments', () => {
    const rawAppointments = [
      createRawAppointmentWithDetails({
        id: 'appointment-valid',
      }),
      createRawAppointmentWithDetails({
        id: 'appointment-invalid',
        pet: null, // This will cause an error
      }),
    ]

    expect(() => mapAppointmentsWithDetails(rawAppointments)).toThrow()
  })
})

// =============================================================================
// TYPE GUARD TESTS
// =============================================================================

describe('isRawAppointmentWithDetails', () => {
  it('should return true for valid raw appointment data', () => {
    const raw = createRawAppointmentWithDetails()

    expect(isRawAppointmentWithDetails(raw)).toBe(true)
  })

  it('should return false for null/undefined', () => {
    expect(isRawAppointmentWithDetails(null)).toBe(false)
    expect(isRawAppointmentWithDetails(undefined)).toBe(false)
  })

  it('should return false for non-objects', () => {
    expect(isRawAppointmentWithDetails('string')).toBe(false)
    expect(isRawAppointmentWithDetails(123)).toBe(false)
    expect(isRawAppointmentWithDetails([])).toBe(false)
  })

  it('should return false for incomplete objects', () => {
    expect(
      isRawAppointmentWithDetails({
        id: 'appointment-123',
        // Missing required fields
      })
    ).toBe(false)

    expect(
      isRawAppointmentWithDetails({
        id: 'appointment-123',
        tenant_id: 'clinic-123',
        pet_id: 'pet-123',
        start_time: '2024-01-15T10:00:00Z',
        end_time: '2024-01-15T10:30:00Z',
        status: 'scheduled',
        // Missing pet relation
      })
    ).toBe(false)
  })

  it('should return false for objects with wrong field types', () => {
    expect(
      isRawAppointmentWithDetails({
        id: 123, // Should be string
        tenant_id: 'clinic-123',
        pet_id: 'pet-123',
        start_time: '2024-01-15T10:00:00Z',
        end_time: '2024-01-15T10:30:00Z',
        status: 'scheduled',
        pet: {},
      })
    ).toBe(false)
  })

  it('should return true even with optional fields missing', () => {
    expect(
      isRawAppointmentWithDetails({
        id: 'appointment-123',
        tenant_id: 'clinic-123',
        pet_id: 'pet-123',
        start_time: '2024-01-15T10:00:00Z',
        end_time: '2024-01-15T10:30:00Z',
        status: 'scheduled',
        pet: {},
        // Optional fields can be missing
      })
    ).toBe(true)
  })
})