/**
 * Pet Factory - Builder pattern for creating pets with related data
 */

import { apiClient } from '../api-client'
import { testContext } from '../context'
import {
  generateId,
  pick,
  randomWeight,
  randomBirthDate,
  DOG_BREEDS,
  CAT_BREEDS,
  PET_NAMES,
  PET_COLORS,
} from './base'
import { PetProfile } from './types'
import { TENANT_IDS } from '@/lib/constants/tenants';

interface PetData {
  id: string
  tenant_id: string
  owner_id: string
  name: string
  species: string
  breed: string | null
  birth_date: string
  sex: 'male' | 'female'
  weight_kg: number | null
  is_neutered: boolean
  microchip_number: string | null
  photo_url: string | null
  color: string | null
  allergies: string[] | null
  chronic_conditions: string[] | null
  notes: string | null
}

interface VaccineData {
  id: string
  pet_id: string
  administered_by_clinic: string | null
  name: string
  manufacturer: string | null
  batch_number: string | null
  administered_date: string
  next_due_date: string | null
  administered_by: string | null
  status: 'completed' | 'scheduled' | 'missed' | 'cancelled'
  notes: string | null
}

interface PetProfileConfig {
  allergies: string[]
  conditions: string[]
  notes: string
}

const PROFILE_CONFIGS: Record<PetProfile, PetProfileConfig> = {
  healthy: {
    allergies: [],
    conditions: [],
    notes: 'Tranquilo y amigable. Dieta regular sin restricciones.',
  },
  chronic: {
    allergies: ['Pollo', 'Maíz'],
    conditions: ['Artritis', 'Hipotiroidismo'],
    notes: 'Sensible, requiere cuidado especial. Dieta hipoalergénica prescrita.',
  },
  senior: {
    allergies: [],
    conditions: ['Enfermedad renal crónica', 'Cataratas'],
    notes: 'Tranquilo, movilidad reducida. Dieta senior baja en proteínas.',
  },
  puppy: {
    allergies: [],
    conditions: [],
    notes: 'Muy activo y juguetón. Comida para cachorros, 3 veces al día.',
  },
  exotic: {
    allergies: [],
    conditions: [],
    notes: 'Variable según especie. Dieta especializada.',
  },
  rescue: {
    allergies: [],
    conditions: ['Historial desconocido'],
    notes: 'En observación. Dieta de transición.',
  },
  show: {
    allergies: [],
    conditions: [],
    notes: 'Bien entrenado, sociable. Dieta premium de competición.',
  },
  reactive: {
    allergies: ['Vacuna antirrábica (reacción previa)'],
    conditions: [],
    notes: 'Nervioso en veterinaria. Dieta regular.',
  },
  overweight: {
    allergies: [],
    conditions: ['Sobrepeso'],
    notes: 'Tranquilo, sedentario. Dieta baja en calorías, porciones controladas.',
  },
  standard: {
    allergies: [],
    conditions: [],
    notes: '',
  },
}

const VACCINES_BY_SPECIES: Record<string, Array<{ name: string; intervalMonths: number }>> = {
  dog: [
    { name: 'Séxtuple', intervalMonths: 12 },
    { name: 'Antirrábica', intervalMonths: 12 },
    { name: 'Tos de las perreras', intervalMonths: 12 },
    { name: 'Leptospirosis', intervalMonths: 6 },
  ],
  cat: [
    { name: 'Triple felina', intervalMonths: 12 },
    { name: 'Antirrábica', intervalMonths: 12 },
    { name: 'Leucemia felina', intervalMonths: 12 },
  ],
  rabbit: [
    { name: 'Mixomatosis', intervalMonths: 6 },
    { name: 'Enfermedad hemorrágica viral', intervalMonths: 12 },
  ],
}

const VACCINE_BRANDS = ['Nobivac', 'Eurican', 'Vanguard', 'Fel-O-Vax', 'Rabisin']

export class PetFactory {
  private data: Partial<PetData>
  private profile: PetProfile = 'standard'
  private shouldPersist: boolean = true
  private vaccineHistory: boolean = false
  private vaccineCount: number = 0

  private constructor() {
    this.data = {
      id: generateId(),
      tenant_id: TENANT_IDS.ADRIS,
      species: 'dog',
      is_neutered: Math.random() > 0.3,
      photo_url: null,
      microchip_number: null,
    }
  }

  /**
   * Start building a pet
   */
  static create(): PetFactory {
    return new PetFactory()
  }

  /**
   * Set a specific profile for this pet
   */
  withProfile(profile: PetProfile): PetFactory {
    this.profile = profile
    const config = PROFILE_CONFIGS[profile]
    this.data.allergies = config.allergies.length > 0 ? config.allergies : null
    this.data.chronic_conditions = config.conditions.length > 0 ? config.conditions : null
    this.data.notes = config.notes || null
    return this
  }

  /**
   * Set tenant ID
   */
  forTenant(tenantId: string): PetFactory {
    this.data.tenant_id = tenantId
    return this
  }

  /**
   * Set owner ID
   */
  forOwner(ownerId: string): PetFactory {
    this.data.owner_id = ownerId
    return this
  }

  /**
   * Set specific name
   */
  withName(name: string): PetFactory {
    this.data.name = name
    return this
  }

  /**
   * Set species and breed
   */
  asSpecies(
    species: 'dog' | 'cat' | 'bird' | 'rabbit' | 'hamster' | 'other',
    breed?: string
  ): PetFactory {
    this.data.species = species
    if (breed) {
      this.data.breed = breed
    }
    return this
  }

  /**
   * Set as dog with random or specific breed
   */
  asDog(breed?: string): PetFactory {
    this.data.species = 'dog'
    this.data.breed = breed || pick(DOG_BREEDS)
    return this
  }

  /**
   * Set as cat with random or specific breed
   */
  asCat(breed?: string): PetFactory {
    this.data.species = 'cat'
    this.data.breed = breed || pick(CAT_BREEDS)
    return this
  }

  /**
   * Set sex
   */
  withSex(sex: 'male' | 'female'): PetFactory {
    this.data.sex = sex
    return this
  }

  /**
   * Set birth date
   */
  bornOn(date: Date): PetFactory {
    this.data.birth_date = date.toISOString().split('T')[0]
    return this
  }

  /**
   * Set as puppy/kitten (young)
   */
  asYoung(): PetFactory {
    this.data.birth_date = randomBirthDate('puppy').toISOString().split('T')[0]
    return this
  }

  /**
   * Set as senior
   */
  asSenior(): PetFactory {
    this.data.birth_date = randomBirthDate('senior').toISOString().split('T')[0]
    return this
  }

  /**
   * Set weight explicitly
   */
  withWeight(weightKg: number): PetFactory {
    this.data.weight_kg = weightKg
    return this
  }

  /**
   * Set neutered status
   */
  neutered(isNeutered: boolean = true): PetFactory {
    this.data.is_neutered = isNeutered
    return this
  }

  /**
   * Add microchip
   */
  withMicrochip(chipNumber?: string): PetFactory {
    this.data.microchip_number = chipNumber || `985${Math.random().toString().slice(2, 17)}`
    return this
  }

  /**
   * Set color
   */
  withColor(color?: string): PetFactory {
    this.data.color = color || pick(PET_COLORS)
    return this
  }

  /**
   * Add notes
   */
  withNotes(notes: string): PetFactory {
    this.data.notes = notes
    return this
  }

  /**
   * Set ID explicitly (for idempotent seeding)
   */
  withId(id: string): PetFactory {
    this.data.id = id
    return this
  }

  /**
   * Generate vaccine history for this pet
   */
  withVaccines(count?: number): PetFactory {
    this.vaccineHistory = true
    this.vaccineCount = count || 0 // 0 means auto based on species
    return this
  }

  /**
   * Don't persist to database (for unit tests)
   */
  inMemoryOnly(): PetFactory {
    this.shouldPersist = false
    return this
  }

  /**
   * Build the pet data object (without persisting)
   */
  buildData(): PetData {
    // Generate name if not set
    if (!this.data.name) {
      this.data.name = pick(PET_NAMES)
    }

    // Generate breed if not set
    if (!this.data.breed) {
      if (this.data.species === 'dog') {
        this.data.breed = pick(DOG_BREEDS)
      } else if (this.data.species === 'cat') {
        this.data.breed = pick(CAT_BREEDS)
      }
    }

    // Generate sex if not set
    if (!this.data.sex) {
      this.data.sex = Math.random() > 0.5 ? 'male' : 'female'
    }

    // Generate birth date if not set
    if (!this.data.birth_date) {
      const ageProfile =
        this.profile === 'puppy' ? 'puppy' : this.profile === 'senior' ? 'senior' : 'standard'
      this.data.birth_date = randomBirthDate(ageProfile).toISOString().split('T')[0]
    }

    // Calculate weight based on species and age if not set
    if (!this.data.weight_kg) {
      // Test factory: birth_date and species are set in defaults or explicitly
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const birthDate = new Date(this.data.birth_date!)
      const ageYears = (Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.data.weight_kg = randomWeight(this.data.species!, ageYears)
    }

    // Generate color if not set
    if (!this.data.color) {
      this.data.color = pick(PET_COLORS)
    }

    return this.data as PetData
  }

  /**
   * Build and persist the pet to database
   */
  async build(): Promise<{ pet: PetData; vaccines: VaccineData[] }> {
    const petData = this.buildData()
    const vaccines: VaccineData[] = []

    if (!this.shouldPersist) {
      return { pet: petData, vaccines }
    }

    if (!petData.owner_id) {
      throw new Error('Pet must have an owner_id. Use .forOwner(ownerId) before building.')
    }

    // Insert pet
    const { error: petError } = await apiClient.dbInsert('pets', {
      id: petData.id,
      tenant_id: petData.tenant_id,
      owner_id: petData.owner_id,
      name: petData.name,
      species: petData.species,
      breed: petData.breed,
      birth_date: petData.birth_date,
      sex: petData.sex,
      weight_kg: petData.weight_kg,
      is_neutered: petData.is_neutered,
      microchip_number: petData.microchip_number,
      photo_url: petData.photo_url,
      color: petData.color,
      allergies: petData.allergies,
      chronic_conditions: petData.chronic_conditions,
      notes: petData.notes,
    })

    if (petError) {
      throw new Error(`Failed to create pet: ${petError}`)
    }

    testContext.track('pets', petData.id, petData.tenant_id)

    // Create vaccine history if requested
    if (this.vaccineHistory) {
      const vaccineRecords = await this.createVaccineHistory(petData)
      vaccines.push(...vaccineRecords)
    }

    return { pet: petData, vaccines }
  }

  /**
   * Create vaccine history for a pet with varied statuses for dashboard testing
   */
  private async createVaccineHistory(pet: PetData): Promise<VaccineData[]> {
    const speciesVaccines = VACCINES_BY_SPECIES[pet.species] || VACCINES_BY_SPECIES['dog']
    const vaccines: VaccineData[] = []

    const petBirthDate = new Date(pet.birth_date)
    const petAgeMonths = Math.floor(
      (Date.now() - petBirthDate.getTime()) / (30 * 24 * 60 * 60 * 1000)
    )
    const now = new Date()

    for (const vaccineType of speciesVaccines) {
      // Determine scenario for this vaccine type based on pet profile
      const scenario = this.getVaccineScenario(vaccineType.name)

      switch (scenario) {
        case 'completed_current':
          // Completed vaccine, next due in future (> 30 days)
          await this.createCompletedVaccine(pet, vaccineType, vaccines, 'future')
          break

        case 'due_soon':
          // Completed vaccine, next due within 30 days
          await this.createCompletedVaccine(pet, vaccineType, vaccines, 'soon')
          break

        case 'overdue':
          // Completed vaccine but next due date passed (expired/overdue)
          await this.createCompletedVaccine(pet, vaccineType, vaccines, 'overdue')
          break

        case 'scheduled':
          // Scheduled vaccine (not yet administered)
          await this.createScheduledVaccine(pet, vaccineType, vaccines)
          break

        case 'missed':
          // Missed vaccine (was scheduled but not administered)
          await this.createMissedVaccine(pet, vaccineType, vaccines)
          break

        default:
          // Default: create a completed vaccine with history
          await this.createCompletedVaccine(pet, vaccineType, vaccines, 'future')
      }
    }

    return vaccines
  }

  /**
   * Get vaccine scenario based on pet profile and vaccine type
   */
  private getVaccineScenario(vaccineName: string): string {
    // Distribute scenarios to populate all dashboard categories
    const rand = Math.random()

    if (this.profile === 'puppy') {
      // Puppies: mostly scheduled and due soon
      if (rand < 0.4) return 'scheduled'
      if (rand < 0.7) return 'due_soon'
      return 'completed_current'
    }

    if (this.profile === 'senior') {
      // Seniors: some overdue, some completed
      if (rand < 0.3) return 'overdue'
      if (rand < 0.5) return 'due_soon'
      return 'completed_current'
    }

    if (this.profile === 'chronic' || this.profile === 'reactive') {
      // Chronic/reactive: some missed, some overdue
      if (rand < 0.2) return 'missed'
      if (rand < 0.4) return 'overdue'
      if (rand < 0.6) return 'due_soon'
      return 'completed_current'
    }

    // Default distribution for healthy/standard pets
    if (rand < 0.15) return 'scheduled'
    if (rand < 0.25) return 'overdue'
    if (rand < 0.45) return 'due_soon'
    return 'completed_current'
  }

  /**
   * Create a completed vaccine record
   */
  private async createCompletedVaccine(
    pet: PetData,
    vaccineType: { name: string; intervalMonths: number },
    vaccines: VaccineData[],
    nextDueType: 'future' | 'soon' | 'overdue'
  ): Promise<void> {
    const now = new Date()
    let administeredDate: Date
    let nextDueDate: Date

    switch (nextDueType) {
      case 'future':
        // Administered recently, next due in 2-6 months
        administeredDate = new Date(now)
        administeredDate.setMonth(administeredDate.getMonth() - (vaccineType.intervalMonths - 3))
        nextDueDate = new Date(administeredDate)
        nextDueDate.setMonth(nextDueDate.getMonth() + vaccineType.intervalMonths)
        break

      case 'soon':
        // Next due within 30 days
        administeredDate = new Date(now)
        administeredDate.setMonth(administeredDate.getMonth() - vaccineType.intervalMonths)
        administeredDate.setDate(administeredDate.getDate() + Math.floor(Math.random() * 20)) // Due in 10-30 days
        nextDueDate = new Date(administeredDate)
        nextDueDate.setMonth(nextDueDate.getMonth() + vaccineType.intervalMonths)
        break

      case 'overdue':
        // Next due date has passed (expired)
        administeredDate = new Date(now)
        administeredDate.setMonth(administeredDate.getMonth() - vaccineType.intervalMonths - 1) // 1 month overdue
        administeredDate.setDate(administeredDate.getDate() - Math.floor(Math.random() * 30)) // Up to 2 months overdue
        nextDueDate = new Date(administeredDate)
        nextDueDate.setMonth(nextDueDate.getMonth() + vaccineType.intervalMonths)
        break
    }

    const vaccineData: VaccineData = {
      id: generateId(),
      pet_id: pet.id,
      administered_by_clinic: pet.tenant_id,
      name: vaccineType.name,
      manufacturer: pick(VACCINE_BRANDS),
      batch_number: `LOT${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
      administered_date: administeredDate.toISOString().split('T')[0],
      next_due_date: nextDueDate.toISOString().split('T')[0],
      administered_by: null,
      status: 'completed',
      notes: nextDueType === 'overdue' ? 'Vacuna vencida - requiere refuerzo' : null,
    }

    const { error } = await apiClient.dbInsert(
      'vaccines',
      vaccineData as unknown as Record<string, unknown>
    )
    if (error) {
      console.warn(`Failed to create vaccine: ${error}`)
      return
    }

    testContext.track('vaccines', vaccineData.id, pet.tenant_id)
    vaccines.push(vaccineData)
  }

  /**
   * Create a scheduled (pending) vaccine record
   */
  private async createScheduledVaccine(
    pet: PetData,
    vaccineType: { name: string; intervalMonths: number },
    vaccines: VaccineData[]
  ): Promise<void> {
    const now = new Date()

    // Scheduled for 1-4 weeks from now
    const scheduledDate = new Date(now)
    scheduledDate.setDate(scheduledDate.getDate() + 7 + Math.floor(Math.random() * 21))

    const vaccineData: VaccineData = {
      id: generateId(),
      pet_id: pet.id,
      administered_by_clinic: pet.tenant_id,
      name: vaccineType.name,
      manufacturer: pick(VACCINE_BRANDS),
      batch_number: null,
      administered_date: scheduledDate.toISOString().split('T')[0],
      next_due_date: null, // No next due for scheduled vaccines
      administered_by: null,
      status: 'scheduled',
      notes: 'Cita programada para vacunación',
    }

    const { error } = await apiClient.dbInsert(
      'vaccines',
      vaccineData as unknown as Record<string, unknown>
    )
    if (error) {
      console.warn(`Failed to create scheduled vaccine: ${error}`)
      return
    }

    testContext.track('vaccines', vaccineData.id, pet.tenant_id)
    vaccines.push(vaccineData)
  }

  /**
   * Create a missed vaccine record
   */
  private async createMissedVaccine(
    pet: PetData,
    vaccineType: { name: string; intervalMonths: number },
    vaccines: VaccineData[]
  ): Promise<void> {
    const now = new Date()

    // Was scheduled 1-4 weeks ago but missed
    const missedDate = new Date(now)
    missedDate.setDate(missedDate.getDate() - 7 - Math.floor(Math.random() * 21))

    const vaccineData: VaccineData = {
      id: generateId(),
      pet_id: pet.id,
      administered_by_clinic: pet.tenant_id,
      name: vaccineType.name,
      manufacturer: null,
      batch_number: null,
      administered_date: missedDate.toISOString().split('T')[0],
      next_due_date: null,
      administered_by: null,
      status: 'missed',
      notes: 'Cita perdida - reprogramar',
    }

    const { error } = await apiClient.dbInsert(
      'vaccines',
      vaccineData as unknown as Record<string, unknown>
    )
    if (error) {
      console.warn(`Failed to create missed vaccine: ${error}`)
      return
    }

    testContext.track('vaccines', vaccineData.id, pet.tenant_id)
    vaccines.push(vaccineData)
  }
}

/**
 * Create multiple pets for an owner
 */
export async function createPetsForOwner(
  ownerId: string,
  count: number = 5,
  tenantId: string = 'terrapet'
): Promise<Array<{ pet: PetData; vaccines: VaccineData[] }>> {
  const results: Array<{ pet: PetData; vaccines: VaccineData[] }> = []
  const profiles: PetProfile[] = ['healthy', 'chronic', 'senior', 'puppy', 'standard']

  for (let i = 0; i < count; i++) {
    const profile = profiles[i % profiles.length]
    const species = i % 2 === 0 ? 'dog' : 'cat'

    const factory = PetFactory.create()
      .forTenant(tenantId)
      .forOwner(ownerId)
      .withProfile(profile)
      .withColor()
      .withVaccines()

    if (species === 'dog') {
      factory.asDog()
    } else {
      factory.asCat()
    }

    // Apply profile-specific settings
    if (profile === 'puppy') {
      factory.asYoung()
    } else if (profile === 'senior') {
      factory.asSenior()
    }

    const result = await factory.build()
    results.push(result)
  }

  return results
}
