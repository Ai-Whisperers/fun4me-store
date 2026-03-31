/**
 * Test Data Factories
 *
 * Functions for generating test data with customizable properties.
 * Useful for creating many variations of test data quickly.
 */

import { getTestClient } from './db'
import { PetFixture, Species, Sex, Temperament } from '../__fixtures__/pets'
import { VaccineFixture, VACCINE_NAMES } from '../__fixtures__/vaccines'
import { AppointmentFixture, AppointmentType, TIME_SLOTS } from '../__fixtures__/appointments'

/**
 * Counter for unique sequence generation
 */
let sequenceCounter = 0

/**
 * Get next sequence number
 */
export function nextSequence(): number {
  return ++sequenceCounter
}

/**
 * Reset sequence counter (call in beforeEach)
 */
export function resetSequence(): void {
  sequenceCounter = 0
}

/**
 * Generate random item from array
 */
export function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

/**
 * Generate random date within range
 */
export function randomDate(start: Date, end: Date): string {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  return date.toISOString().split('T')[0]
}

/**
 * Generate future date
 */
export function futureDate(daysAhead: number = 30): string {
  const date = new Date()
  date.setDate(date.getDate() + daysAhead)
  return date.toISOString().split('T')[0]
}

/**
 * Generate past date
 */
export function pastDate(daysAgo: number = 30): string {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString().split('T')[0]
}

// =============================================================================
// Pet Factory
// =============================================================================

export interface PetFactoryOptions {
  ownerId?: string
  tenantId?: string
  species?: Species
  microchipId?: string | null
  dietCategory?: string | null
  dietNotes?: string | null
  allergies?: string | null
  existingConditions?: string | null
  notes?: string | null
  photoUrl?: string | null
  withMedicalHistory?: boolean
}

/**
 * Create pet data for testing
 */
export function buildPet(overrides: Partial<PetFixture> = {}): Omit<PetFixture, 'id'> {
  const seq = nextSequence()
  const species = overrides.species || randomItem<Species>(['dog', 'cat', 'rabbit'])

  const breeds: Record<string, string[]> = {
    dog: ['Labrador', 'Golden Retriever', 'Bulldog', 'Poodle', 'Mestizo'],
    cat: ['Persa', 'Siames', 'Maine Coon', 'Mestizo'],
    rabbit: ['Holland Lop', 'Mini Rex', 'Mestizo'],
    bird: ['Canario', 'Periquito'],
    other: ['Otro'],
  }

  return {
    ownerId: overrides.ownerId || '00000000-0000-0000-0000-000000000001',
    tenantId: overrides.tenantId || 'terrapet',
    name: overrides.name || `TestPet-${seq}`,
    species,
    breed: overrides.breed || randomItem(breeds[species] || breeds.other),
    birthDate: overrides.birthDate || pastDate(365 + Math.floor(Math.random() * 1825)),
    weightKg: overrides.weightKg || Math.round((Math.random() * 30 + 1) * 10) / 10,
    sex: overrides.sex || randomItem<Sex>(['male', 'female']),
    isNeutered: overrides.isNeutered ?? Math.random() > 0.5,
    color: overrides.color || randomItem(['Negro', 'Blanco', 'Marrón', 'Dorado', 'Gris']),
    temperament:
      overrides.temperament ||
      randomItem<Temperament>(['friendly', 'shy', 'aggressive', 'unknown']),
    microchipId: overrides.microchipId || null,
    dietCategory: overrides.dietCategory || null,
    dietNotes: overrides.dietNotes || null,
    allergies: overrides.allergies || null,
    existingConditions: overrides.existingConditions || null,
    notes: overrides.notes || null,
    photoUrl: overrides.photoUrl || null,
    ...overrides,
  }
}

/**
 * Create and persist pet in database
 */
export async function createPet(overrides: Partial<PetFixture> = {}): Promise<PetFixture> {
  const client = getTestClient({ serviceRole: true })
  const data = buildPet(overrides)

  // Insert only core required fields to avoid Supabase schema cache issues in tests
  // The schema cache may not be fully synchronized with the latest migrations
  const insertData: Record<string, unknown> = {
    owner_id: data.ownerId,
    tenant_id: data.tenantId,
    name: data.name,
    species: data.species,
  }

  // Add only well-established optional fields that are guaranteed to exist
  if (data.breed) insertData.breed = data.breed
  if (data.birthDate) insertData.birth_date = data.birthDate
  if (data.weightKg) insertData.weight_kg = data.weightKg
  if (data.sex) insertData.sex = data.sex
  if (data.isNeutered !== undefined) insertData.is_neutered = data.isNeutered
  if (data.color) insertData.color = data.color
  if (data.microchipId) insertData.microchip_number = data.microchipId
  if (data.notes) insertData.notes = data.notes
  if (data.photoUrl) insertData.photo_url = data.photoUrl
  if (data.temperament) insertData.temperament = data.temperament
  if (data.dietCategory) insertData.diet_category = data.dietCategory
  if (data.dietNotes) insertData.diet_notes = data.dietNotes
  if (data.allergies) insertData.allergies = Array.isArray(data.allergies) ? data.allergies : [data.allergies]
  if (data.existingConditions) insertData.existing_conditions = data.existingConditions

  const { data: pet, error } = await client
    .from('pets')
    .insert(insertData)
    .select()
    .single()

  if (error) throw new Error(`Failed to create pet: ${error.message}`)

  return {
    id: pet.id,
    ...data,
  }
}

/**
 * Create multiple pets
 */
export async function createPets(
  count: number,
  overrides: Partial<PetFixture> = {}
): Promise<PetFixture[]> {
  const pets: PetFixture[] = []
  for (let i = 0; i < count; i++) {
    pets.push(await createPet(overrides))
  }
  return pets
}

// =============================================================================
// Vaccine Factory
// =============================================================================

/**
 * Create vaccine data for testing
 */
export function buildVaccine(
  petId: string,
  overrides: Partial<VaccineFixture> = {}
): Omit<VaccineFixture, 'id'> {
  const seq = nextSequence()
  // species assignment removed as it was unused and shadowed

  return {
    petId,
    name: overrides.name || randomItem(VACCINE_NAMES.dog),
    administeredDate: overrides.administeredDate || pastDate(30),
    nextDueDate: overrides.nextDueDate || futureDate(335),
    batchNumber: overrides.batchNumber || `BATCH-${seq}-${Date.now()}`,
    status: overrides.status || 'pending',
    ...overrides,
  }
}

/**
 * Create and persist vaccine in database
 */
export async function createVaccine(
  petId: string,
  overrides: Partial<VaccineFixture> = {}
): Promise<VaccineFixture> {
  const client = getTestClient({ serviceRole: true })
  const data = buildVaccine(petId, overrides)

  const { data: vaccine, error } = await client
    .from('vaccines')
    .insert({
      pet_id: data.petId,
      name: data.name,
      administered_date: data.administeredDate,
      next_due_date: data.nextDueDate,
      batch_number: data.batchNumber,
      status: data.status,
      administered_by: data.administeredBy,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create vaccine: ${error.message}`)

  return {
    id: vaccine.id,
    ...data,
  }
}

// =============================================================================
// Appointment Factory
// =============================================================================

/**
 * Create appointment data for testing
 */
export function buildAppointment(
  overrides: Partial<AppointmentFixture> = {}
): Omit<AppointmentFixture, 'id'> {
  const seq = nextSequence()

  return {
    tenantId: overrides.tenantId || 'terrapet',
    petId: overrides.petId || '00000000-0000-0000-0001-000000000001',
    ownerId: overrides.ownerId || '00000000-0000-0000-0000-000000000001',
    type: overrides.type || randomItem<AppointmentType>(['consultation', 'vaccination', 'checkup']),
    date: overrides.date || futureDate(Math.floor(Math.random() * 14) + 1),
    time: overrides.time || randomItem(TIME_SLOTS),
    duration: overrides.duration || 30,
    status: overrides.status || 'confirmed',
    reason: overrides.reason || `Test appointment ${seq}`,
    ...overrides,
  }
}

/**
 * Create and persist appointment in database
 */
export async function createAppointment(
  overrides: Partial<AppointmentFixture> = {}
): Promise<AppointmentFixture> {
  const client = getTestClient({ serviceRole: true })
  const data = buildAppointment(overrides)

  // Create Date object from date/time (interprets as local)
  const startDate = new Date(`${data.date}T${data.time}:00`)
  const endDate = new Date(startDate.getTime() + (data.duration || 30) * 60000)

  const durationMinutes = data.duration || 30

  const { data: appointment, error } = await client
    .from('appointments')
    .insert({
      tenant_id: data.tenantId,
      pet_id: data.petId,
      vet_id: data.vetId,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      duration_minutes: durationMinutes,
      status: data.status,
      reason: data.reason,
      notes: data.notes,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create appointment: ${error.message}`)

  return {
    id: appointment.id,
    ...data,
  }
}

// =============================================================================
// Profile Factory
// =============================================================================

export interface ProfileData {
  id?: string
  tenantId: string
  fullName: string
  email: string
  phone: string
  role: 'owner' | 'vet' | 'admin'
}

/**
 * Create profile data for testing
 */
export function buildProfile(overrides: Partial<ProfileData> = {}): ProfileData {
  const seq = nextSequence()

  return {
    tenantId: overrides.tenantId || 'terrapet',
    fullName: overrides.fullName || `Test User ${seq}`,
    email: overrides.email || `test-${seq}-${Date.now()}@test.local`,
    phone: overrides.phone || `+595981${String(seq).padStart(6, '0')}`,
    role: overrides.role || 'owner',
    ...overrides,
  }
}

/**
 * Create and persist profile in database
 */
export async function createProfile(
  overrides: Partial<ProfileData> = {}
): Promise<ProfileData & { id: string }> {
  const client = getTestClient({ serviceRole: true })
  const data = buildProfile(overrides)

  const { data: profile, error } = await client
    .from('profiles')
    .insert({
      id: data.id || crypto.randomUUID(),
      tenant_id: data.tenantId,
      full_name: data.fullName,
      email: data.email,
      phone: data.phone,
      role: data.role,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create profile: ${error.message}`)

  return {
    id: profile.id,
    ...data,
  }
}

// =============================================================================
// Medical Record Factory
// =============================================================================

export interface MedicalRecordData {
  id?: string
  petId: string
  tenantId: string
  performedBy?: string
  type: 'consultation' | 'exam' | 'surgery' | 'hospitalization' | 'wellness' | 'other'
  title: string
  diagnosis?: string
  notes?: string
  vitals?: {
    weight?: number
    temp?: number
    hr?: number
    rr?: number
  }
}

/**
 * Create medical record data for testing
 */
export function buildMedicalRecord(
  petId: string,
  overrides: Partial<MedicalRecordData> = {}
): Omit<MedicalRecordData, 'id'> {
  const seq = nextSequence()

  return {
    petId,
    tenantId: overrides.tenantId || 'terrapet',
    type: overrides.type || 'consultation',
    title: overrides.title || `Medical Record ${seq}`,
    diagnosis: overrides.diagnosis || 'Test diagnosis',
    notes: overrides.notes || 'Test notes',
    vitals: overrides.vitals || {
      weight: Math.round(Math.random() * 30 * 10) / 10,
      temp: 38 + Math.random() * 2,
      hr: 60 + Math.floor(Math.random() * 60),
      rr: 15 + Math.floor(Math.random() * 15),
    },
    ...overrides,
  }
}

// =============================================================================
// Batch Creation Utilities
// =============================================================================

/**
 * Create a complete test scenario with owner, pets, and records
 */
export async function createCompleteTestScenario(
  options: {
    tenantId?: string
    petCount?: number
    vaccinesPerPet?: number
    appointmentsPerPet?: number
  } = {}
): Promise<{
  profile: ProfileData & { id: string }
  pets: PetFixture[]
  vaccines: VaccineFixture[]
  appointments: AppointmentFixture[]
}> {
  const { tenantId = 'terrapet', petCount = 2, vaccinesPerPet = 2, appointmentsPerPet = 1 } = options

  // Create owner profile
  const profile = await createProfile({ tenantId, role: 'owner' })

  // Create pets
  const pets = await createPets(petCount, {
    ownerId: profile.id,
    tenantId,
  })

  // Create vaccines for each pet
  const vaccines: VaccineFixture[] = []
  for (const pet of pets) {
    for (let i = 0; i < vaccinesPerPet; i++) {
      vaccines.push(await createVaccine(pet.id))
    }
  }

  // Create appointments for each pet
  const appointments: AppointmentFixture[] = []
  for (const pet of pets) {
    for (let i = 0; i < appointmentsPerPet; i++) {
      appointments.push(
        await createAppointment({
          petId: pet.id,
          ownerId: profile.id,
          tenantId,
        })
      )
    }
  }

  return { profile, pets, vaccines, appointments }
}

// =============================================================================
// Medical Record Factory
// =============================================================================

/**
 * Create and persist medical record
 */
export async function createMedicalRecord(
  petId: string,
  overrides: Partial<MedicalRecordData> = {}
): Promise<MedicalRecordData & { id: string }> {
  const client = getTestClient({ serviceRole: true })
  const data = buildMedicalRecord(petId, overrides)

  const { data: record, error } = await client
    .from('medical_records')
    .insert({
      pet_id: data.petId,
      tenant_id: data.tenantId,
      vet_id: data.performedBy,
      record_type: data.type || 'consultation',
      chief_complaint: data.title || 'General consultation',
      diagnosis_text: data.diagnosis,
      clinical_notes: data.notes,
      weight_kg: data.vitals?.weight,
      temperature_celsius: data.vitals?.temp,
      heart_rate_bpm: data.vitals?.hr,
      respiratory_rate_rpm: data.vitals?.rr,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create medical record: ${error.message}`)

  return {
    id: record.id,
    ...data,
  }
}

// =============================================================================
// Invoice Factory
// =============================================================================

export interface InvoiceData {
  id?: string
  tenantId: string
  clientId: string // Changed from ownerId to matches schema
  petId?: string
  status?: string
}

export function buildInvoice(overrides: Partial<InvoiceData> = {}): InvoiceData {
  return {
    tenantId: overrides.tenantId || 'terrapet',
    clientId: overrides.clientId || '00000000-0000-0000-0000-000000000001',
    status: overrides.status || 'draft',
    ...overrides,
  }
}

export async function createInvoice(
  overrides: Partial<InvoiceData> = {}
): Promise<InvoiceData & { id: string }> {
  const client = getTestClient({ serviceRole: true })
  const data = buildInvoice(overrides)

  // Invoice Number generator dummy
  const invoiceNumber = `INV-${Date.now()}`

  const { data: invoice, error } = await client
    .from('invoices')
    .insert({
      tenant_id: data.tenantId,
      client_id: data.clientId,
      pet_id: data.petId,
      invoice_number: invoiceNumber,
      status: data.status,
      subtotal: 0,
      discount_amount: 0,
      tax_rate: 10,
      tax_amount: 0,
      total_amount: 0,
      amount_paid: 0,
      balance_due: 0,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create invoice: ${error.message}`)

  return {
    id: invoice.id,
    ...data,
  }
}
