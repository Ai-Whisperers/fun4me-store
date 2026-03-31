/**
 * Pet Mapper Tests
 *
 * Tests type-safe conversion from Supabase query results to domain types:
 * - Raw pet data mapping with owner relations
 * - Nullable field handling
 * - Relation normalization (array vs single object)
 * - Type guards and validation
 * - Enum type conversion
 */

import { describe, it, expect } from 'vitest'
import {
  mapPetWithOwner,
  mapPetsWithOwner,
  isRawPetWithOwner,
  type RawPetWithOwner,
} from '@/lib/services/mappers/pet-mapper'
import type { PetWithOwner } from '@/lib/types/entities/pet'

// =============================================================================
// TEST DATA FACTORIES
// =============================================================================

function createRawOwner() {
  return {
    id: 'owner-john-456',
    full_name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
  }
}

function createRawPetWithOwner(
  overrides: Partial<RawPetWithOwner> = {}
): RawPetWithOwner {
  return {
    id: 'pet-max-123',
    owner_id: 'owner-john-456',
    tenant_id: 'clinic-vet-centro',
    name: 'Max',
    species: 'dog',
    breed: 'Labrador Retriever',
    birth_date: '2022-03-15',
    weight_kg: 28.5,
    microchip_number: 'MC123456789',
    photo_url: 'https://example.com/photos/max.jpg',
    sex: 'male',
    color: 'Golden',
    is_neutered: true,
    temperament: 'friendly',
    diet_category: 'premium',
    diet_notes: 'Sin problemas alimentarios conocidos',
    allergies: ['polen', 'pulgas'],
    chronic_conditions: ['displasia_cadera'],
    notes: 'Paciente modelo, muy obediente',
    created_at: '2022-04-01T10:00:00Z',
    updated_at: '2024-01-15T14:30:00Z',
    owner: createRawOwner(),
    ...overrides,
  }
}

// =============================================================================
// MAPPING TESTS
// =============================================================================

describe('mapPetWithOwner', () => {
  it('should map complete pet with all fields and owner', () => {
    const raw = createRawPetWithOwner()

    const result = mapPetWithOwner(raw)

    expect(result).toEqual({
      id: 'pet-max-123',
      owner_id: 'owner-john-456',
      tenant_id: 'clinic-vet-centro',
      name: 'Max',
      species: 'dog',
      breed: 'Labrador Retriever',
      birth_date: '2022-03-15',
      weight_kg: 28.5,
      microchip_number: 'MC123456789',
      photo_url: 'https://example.com/photos/max.jpg',
      sex: 'male',
      color: 'Golden',
      is_neutered: true,
      temperament: 'friendly',
      diet_category: 'premium',
      diet_notes: 'Sin problemas alimentarios conocidos',
      allergies: ['polen', 'pulgas'],
      chronic_conditions: ['displasia_cadera'],
      notes: 'Paciente modelo, muy obediente',
      created_at: '2022-04-01T10:00:00Z',
      updated_at: '2024-01-15T14:30:00Z',
      deleted_at: undefined,
      owner: {
        id: 'owner-john-456',
        full_name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
      },
    } satisfies PetWithOwner)
  })

  it('should handle pet with null optional fields', () => {
    const raw = createRawPetWithOwner({
      breed: null,
      birth_date: null,
      weight_kg: null,
      microchip_number: null,
      photo_url: null,
      sex: null,
      color: null,
      is_neutered: null,
      temperament: null,
      diet_category: null,
      diet_notes: null,
      allergies: null,
      chronic_conditions: null,
      notes: null,
    })

    const result = mapPetWithOwner(raw)

    expect(result.breed).toBe(null)
    expect(result.birth_date).toBe(null)
    expect(result.weight_kg).toBe(null)
    expect(result.microchip_number).toBe(null)
    expect(result.photo_url).toBe(null)
    expect(result.sex).toBe(null)
    expect(result.color).toBe(null)
    expect(result.is_neutered).toBe(null)
    expect(result.temperament).toBe(null)
    expect(result.diet_category).toBe(null)
    expect(result.diet_notes).toBe(null)
    expect(result.allergies).toBe(null)
    expect(result.chronic_conditions).toBe(null)
    expect(result.notes).toBe(null)
  })

  it('should handle pet with null owner', () => {
    const raw = createRawPetWithOwner({
      owner: null,
    })

    const result = mapPetWithOwner(raw)

    expect(result.owner).toBe(null)
  })

  it('should handle deleted pet', () => {
    const raw = createRawPetWithOwner({
      deleted_at: '2024-01-16T12:00:00Z',
    })

    const result = mapPetWithOwner(raw)

    expect(result.deleted_at).toBe('2024-01-16T12:00:00Z')
  })

  it('should handle different species types', () => {
    const catRaw = createRawPetWithOwner({
      id: 'pet-whiskers-456',
      name: 'Whiskers',
      species: 'cat',
      breed: 'Persa',
      sex: 'female',
      temperament: 'independent',
    })

    const result = mapPetWithOwner(catRaw)

    expect(result.species).toBe('cat')
    expect(result.sex).toBe('female')
    expect(result.temperament).toBe('independent')
  })

  it('should handle different temperament types', () => {
    const aggressiveRaw = createRawPetWithOwner({
      temperament: 'aggressive',
    })

    const result = mapPetWithOwner(aggressiveRaw)

    expect(result.temperament).toBe('aggressive')
  })

  it('should handle different diet categories', () => {
    const sensitiveRaw = createRawPetWithOwner({
      diet_category: 'sensitive',
      diet_notes: 'Requiere dieta hipoalergénica',
    })

    const result = mapPetWithOwner(sensitiveRaw)

    expect(result.diet_category).toBe('sensitive')
    expect(result.diet_notes).toBe('Requiere dieta hipoalergénica')
  })

  it('should handle empty arrays for allergies and conditions', () => {
    const raw = createRawPetWithOwner({
      allergies: [],
      chronic_conditions: [],
    })

    const result = mapPetWithOwner(raw)

    expect(result.allergies).toEqual([])
    expect(result.chronic_conditions).toEqual([])
  })

  it('should handle multiple allergies and conditions', () => {
    const raw = createRawPetWithOwner({
      allergies: ['polen', 'dust_mites', 'chicken'],
      chronic_conditions: ['arthritis', 'kidney_disease', 'diabetes'],
    })

    const result = mapPetWithOwner(raw)

    expect(result.allergies).toEqual(['polen', 'dust_mites', 'chicken'])
    expect(result.chronic_conditions).toEqual(['arthritis', 'kidney_disease', 'diabetes'])
  })
})

// =============================================================================
// RELATION NORMALIZATION TESTS
// =============================================================================

describe('relation normalization', () => {
  it('should normalize single object owner relation', () => {
    const raw = createRawPetWithOwner()

    const result = mapPetWithOwner(raw)

    expect(result.owner).toEqual({
      id: 'owner-john-456',
      full_name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
    })
  })

  it('should normalize array owner relation by taking first element', () => {
    const rawWithOwnerArray = createRawPetWithOwner({
      owner: [
        {
          id: 'owner-john-456',
          full_name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
        },
        {
          id: 'owner-jane-789',
          full_name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '+0987654321',
        },
      ] as any,
    })

    const result = mapPetWithOwner(rawWithOwnerArray)

    expect(result.owner).toEqual({
      id: 'owner-john-456',
      full_name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
    })
  })

  it('should handle empty owner array as null', () => {
    const rawWithEmptyOwnerArray = createRawPetWithOwner({
      owner: [] as any,
    })

    const result = mapPetWithOwner(rawWithEmptyOwnerArray)

    expect(result.owner).toBe(null)
  })

  it('should handle owner with null email and phone', () => {
    const rawWithPartialOwner = createRawPetWithOwner({
      owner: {
        id: 'owner-minimal-123',
        full_name: 'Minimal Owner',
        email: null,
        phone: null,
      },
    })

    const result = mapPetWithOwner(rawWithPartialOwner)

    expect(result.owner).toEqual({
      id: 'owner-minimal-123',
      full_name: 'Minimal Owner',
      email: null,
      phone: null,
    })
  })
})

// =============================================================================
// SPECIAL CASES TESTS
// =============================================================================

describe('special cases', () => {
  it('should handle exotic pet species', () => {
    const exoticRaw = createRawPetWithOwner({
      id: 'pet-exotic-789',
      name: 'Spike',
      species: 'other',
      breed: 'Iguana Verde',
      temperament: 'calm',
      diet_category: 'specialized',
      diet_notes: 'Dieta herbívora estricta',
    })

    const result = mapPetWithOwner(exoticRaw)

    expect(result.species).toBe('other')
    expect(result.breed).toBe('Iguana Verde')
    expect(result.diet_category).toBe('specialized')
  })

  it('should handle very old pet with long medical history', () => {
    const oldPetRaw = createRawPetWithOwner({
      id: 'pet-senior-012',
      name: 'Senior',
      birth_date: '2010-01-01',
      weight_kg: 15.2,
      chronic_conditions: [
        'arthritis',
        'kidney_disease',
        'heart_murmur',
        'cataracts',
        'diabetes',
      ],
      diet_category: 'senior',
      diet_notes: 'Dieta baja en proteínas para problemas renales',
      notes: 'Paciente geriátrico, requiere cuidados especiales',
    })

    const result = mapPetWithOwner(oldPetRaw)

    expect(result.chronic_conditions).toHaveLength(5)
    expect(result.diet_category).toBe('senior')
    expect(result.notes).toContain('geriátrico')
  })

  it('should handle pet without microchip', () => {
    const noChipRaw = createRawPetWithOwner({
      microchip_number: null,
    })

    const result = mapPetWithOwner(noChipRaw)

    expect(result.microchip_number).toBe(null)
  })

  it('should handle unknown weight', () => {
    const unknownWeightRaw = createRawPetWithOwner({
      weight_kg: null,
    })

    const result = mapPetWithOwner(unknownWeightRaw)

    expect(result.weight_kg).toBe(null)
  })
})

// =============================================================================
// ARRAY MAPPING TESTS
// =============================================================================

describe('mapPetsWithOwner', () => {
  it('should map array of pets', () => {
    const rawPets = [
      createRawPetWithOwner({
        id: 'pet-1',
        name: 'Max',
        species: 'dog',
      }),
      createRawPetWithOwner({
        id: 'pet-2',
        name: 'Whiskers',
        species: 'cat',
      }),
    ]

    const result = mapPetsWithOwner(rawPets)

    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('pet-1')
    expect(result[1].id).toBe('pet-2')
    expect(result[0].name).toBe('Max')
    expect(result[1].name).toBe('Whiskers')
    expect(result[0].species).toBe('dog')
    expect(result[1].species).toBe('cat')
  })

  it('should handle empty array', () => {
    const result = mapPetsWithOwner([])

    expect(result).toEqual([])
  })

  it('should handle mixed pets with different completeness', () => {
    const rawPets = [
      createRawPetWithOwner({
        id: 'pet-complete',
        name: 'Complete Pet',
      }),
      createRawPetWithOwner({
        id: 'pet-minimal',
        name: 'Minimal Pet',
        breed: null,
        photo_url: null,
        owner: null,
      }),
    ]

    const result = mapPetsWithOwner(rawPets)

    expect(result).toHaveLength(2)
    expect(result[0].owner).not.toBe(null)
    expect(result[1].owner).toBe(null)
  })
})

// =============================================================================
// TYPE GUARD TESTS
// =============================================================================

describe('isRawPetWithOwner', () => {
  it('should return true for valid raw pet data', () => {
    const raw = createRawPetWithOwner()

    expect(isRawPetWithOwner(raw)).toBe(true)
  })

  it('should return false for null/undefined', () => {
    expect(isRawPetWithOwner(null)).toBe(false)
    expect(isRawPetWithOwner(undefined)).toBe(false)
  })

  it('should return false for non-objects', () => {
    expect(isRawPetWithOwner('string')).toBe(false)
    expect(isRawPetWithOwner(123)).toBe(false)
    expect(isRawPetWithOwner([])).toBe(false)
  })

  it('should return false for incomplete objects', () => {
    expect(
      isRawPetWithOwner({
        id: 'pet-123',
        name: 'Test Pet',
        // Missing required fields
      })
    ).toBe(false)

    expect(
      isRawPetWithOwner({
        id: 'pet-123',
        owner_id: 'owner-456',
        name: 'Test Pet',
        // Missing tenant_id and species
      })
    ).toBe(false)
  })

  it('should return false for objects with wrong field types', () => {
    expect(
      isRawPetWithOwner({
        id: 123, // Should be string
        owner_id: 'owner-456',
        tenant_id: 'clinic-123',
        name: 'Test Pet',
        species: 'dog',
      })
    ).toBe(false)

    expect(
      isRawPetWithOwner({
        id: 'pet-123',
        owner_id: 'owner-456',
        tenant_id: 'clinic-123',
        name: 123, // Should be string
        species: 'dog',
      })
    ).toBe(false)
  })

  it('should return true even with optional fields missing', () => {
    expect(
      isRawPetWithOwner({
        id: 'pet-123',
        owner_id: 'owner-456',
        tenant_id: 'clinic-123',
        name: 'Test Pet',
        species: 'dog',
        // Optional fields can be missing
      })
    ).toBe(true)
  })

  it('should return true with minimal required fields', () => {
    expect(
      isRawPetWithOwner({
        id: 'pet-minimal',
        owner_id: 'owner-123',
        tenant_id: 'clinic-456',
        name: 'Minimal Pet',
        species: 'cat',
        breed: null,
        birth_date: null,
        weight_kg: null,
        microchip_number: null,
        photo_url: null,
        sex: null,
        color: null,
        is_neutered: null,
        temperament: null,
        diet_category: null,
        diet_notes: null,
        allergies: null,
        chronic_conditions: null,
        notes: null,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        owner: null,
      })
    ).toBe(true)
  })
})