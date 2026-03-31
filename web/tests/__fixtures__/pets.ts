/**
 * Test Fixtures: Pets
 *
 * Pre-defined pet data for testing pet management functionality.
 */

export type Species = 'dog' | 'cat' | 'rabbit' | 'bird' | 'other'
export type Sex = 'male' | 'female'
export type Temperament = 'friendly' | 'shy' | 'aggressive' | 'unknown'

export interface PetFixture {
  id: string
  ownerId: string
  tenantId: string
  name: string
  species: Species
  breed: string
  birthDate: string
  weightKg: number
  sex: Sex
  isNeutered: boolean
  color: string
  temperament: Temperament
  microchipId?: string | null
  dietCategory?: string | null
  dietNotes?: string | null
  allergies?: string | null
  existingConditions?: string | null
  notes?: string | null
  photoUrl?: string | null
}

/** Pre-defined test pets */
export const PETS: Record<string, PetFixture> = {
  // Dogs
  maxDog: {
    id: '00000000-0000-0000-0001-000000000001',
    ownerId: '00000000-0000-0000-0000-000000000001',
    tenantId: 'terrapet',
    name: 'Max',
    species: 'dog',
    breed: 'Golden Retriever',
    birthDate: '2020-03-15',
    weightKg: 32.5,
    sex: 'male',
    isNeutered: true,
    color: 'Dorado',
    temperament: 'friendly',
  },
  lunaDog: {
    id: '00000000-0000-0000-0001-000000000002',
    ownerId: '00000000-0000-0000-0000-000000000001',
    tenantId: 'terrapet',
    name: 'Luna',
    species: 'dog',
    breed: 'Labrador',
    birthDate: '2021-06-20',
    weightKg: 28.0,
    sex: 'female',
    isNeutered: false,
    color: 'Negro',
    temperament: 'friendly',
  },

  // Cats
  mishiCat: {
    id: '00000000-0000-0000-0001-000000000003',
    ownerId: '00000000-0000-0000-0000-000000000002',
    tenantId: 'terrapet',
    name: 'Mishi',
    species: 'cat',
    breed: 'Persa',
    birthDate: '2019-11-10',
    weightKg: 4.5,
    sex: 'female',
    isNeutered: true,
    color: 'Blanco',
    temperament: 'shy',
    allergies: 'Pollo',
  },
  simbacat: {
    id: '00000000-0000-0000-0001-000000000004',
    ownerId: '00000000-0000-0000-0000-000000000002',
    tenantId: 'terrapet',
    name: 'Simba',
    species: 'cat',
    breed: 'Mestizo',
    birthDate: '2022-01-05',
    weightKg: 5.2,
    sex: 'male',
    isNeutered: true,
    color: 'Anaranjado',
    temperament: 'friendly',
  },

  // Other species
  conejito: {
    id: '00000000-0000-0000-0001-000000000005',
    ownerId: '00000000-0000-0000-0000-000000000001',
    tenantId: 'terrapet',
    name: 'Copito',
    species: 'rabbit',
    breed: 'Holland Lop',
    birthDate: '2023-02-14',
    weightKg: 1.8,
    sex: 'male',
    isNeutered: false,
    color: 'Blanco',
    temperament: 'shy',
  },

  // PetLife tenant
  rockyPetlife: {
    id: '00000000-0000-0000-0001-000000000010',
    ownerId: '00000000-0000-0000-0000-000000000003',
    tenantId: 'petlife',
    name: 'Rocky',
    species: 'dog',
    breed: 'Bulldog Frances',
    birthDate: '2021-08-30',
    weightKg: 12.0,
    sex: 'male',
    isNeutered: true,
    color: 'Atigrado',
    temperament: 'friendly',
  },
}

/** Get pet by key */
export function getPet(key: string): PetFixture {
  const pet = PETS[key]
  if (!pet) {
    throw new Error(`Unknown pet: ${key}`)
  }
  return pet
}

/** Get pets by owner */
export function getPetsByOwner(ownerId: string): PetFixture[] {
  return Object.values(PETS).filter((pet) => pet.ownerId === ownerId)
}

/** Get pets by tenant */
export function getPetsByTenant(tenantId: string): PetFixture[] {
  return Object.values(PETS).filter((pet) => pet.tenantId === tenantId)
}

/** Get pets by species */
export function getPetsBySpecies(species: Species): PetFixture[] {
  return Object.values(PETS).filter((pet) => pet.species === species)
}

/** Default pet for quick access */
export const DEFAULT_PET = PETS.maxDog

/** All species for testing */
export const ALL_SPECIES: Species[] = ['dog', 'cat', 'rabbit', 'bird', 'other']

/** All temperaments for testing */
export const ALL_TEMPERAMENTS: Temperament[] = ['friendly', 'shy', 'aggressive', 'unknown']

/** Generate unique pet data for creation tests */
export function generatePetData(overrides: Partial<PetFixture> = {}): Omit<PetFixture, 'id'> {
  const random = Math.random().toString(36).substring(7)
  return {
    ownerId: '00000000-0000-0000-0000-000000000001',
    tenantId: 'terrapet',
    name: `TestPet-${random}`,
    species: 'dog',
    breed: 'Test Breed',
    birthDate: '2023-01-01',
    weightKg: 10.0,
    sex: 'male',
    isNeutered: false,
    color: 'Negro',
    temperament: 'friendly',
    ...overrides,
  }
}

/** Invalid pet data for validation tests */
export const INVALID_PET_DATA = {
  missingName: {
    ownerId: '00000000-0000-0000-0000-000000000001',
    tenantId: 'terrapet',
    species: 'dog',
    // name is missing
  },
  invalidWeight: {
    ownerId: '00000000-0000-0000-0000-000000000001',
    tenantId: 'terrapet',
    name: 'Invalid',
    species: 'dog',
    weightKg: -5, // Invalid negative weight
  },
  invalidSpecies: {
    ownerId: '00000000-0000-0000-0000-000000000001',
    tenantId: 'terrapet',
    name: 'Invalid',
    species: 'unicorn', // Invalid species
  },
}
