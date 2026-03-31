/**
 * Legacy Simple Factories
 *
 * These factories are still fully supported but consider using the new unified API:
 *
 * @example New API
 * ```typescript
 * import { PetFactory, mockState, PETS } from '@/lib/test-utils';
 *
 * // Builder pattern factory
 * const pet = PetFactory.create().asDog().forOwner('owner-123').build();
 *
 * // Or use fixtures for common test data
 * const pet = PETS.MAX_DOG;
 * ```
 *
 * @see README.md for migration guide
 */

import type {
  Pet,
  Profile,
  Appointment,
  Invoice,
  Service,
  Hospitalization,
  LabOrder,
} from '@/lib/types'

// Simple ID generator for tests
let idCounter = 0
function generateId(): string {
  return `test-${++idCounter}`
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

// Pet factory
export function createMockPet(overrides: Partial<Pet> = {}): Pet {
  const id = generateId()
  return {
    id,
    tenant_id: 'test-tenant',
    owner_id: generateId(),
    name: `Pet ${id}`,
    species: 'dog',
    breed: 'Mixed',
    birth_date: randomDate(new Date(2018, 0, 1), new Date()).toISOString(),
    sex: Math.random() > 0.5 ? 'male' : 'female',
    weight_kg: Math.round(Math.random() * 30 * 10) / 10,
    is_neutered: Math.random() > 0.5,
    microchip_number: Math.random() > 0.5 ? `CHIP${Math.random().toString(36).slice(2, 17)}` : null,
    photo_url: null,
    color: null,
    temperament: null,
    diet_category: null,
    diet_notes: null,
    allergies: null,
    chronic_conditions: null,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

// Profile factory
export function createMockProfile(overrides: Partial<Profile> = {}): Profile {
  const id = generateId()
  return {
    id,
    tenant_id: 'test-tenant',
    email: `user${id}@test.com`,
    full_name: `Test User ${id}`,
    phone: `+595981${Math.random().toString().slice(2, 8)}`,
    secondary_phone: null,
    role: 'owner',
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

// Appointment factory
export function createMockAppointment(overrides: Partial<Appointment> = {}): Appointment {
  const startTime = randomDate(new Date(), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
  const endTime = new Date(startTime.getTime() + 30 * 60 * 1000)

  return {
    id: generateId(),
    tenant_id: 'test-tenant',
    pet_id: generateId(),
    vet_id: generateId(),
    created_by: generateId(),
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    status: 'scheduled',
    reason: 'Test appointment',
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

// Invoice factory
export function createMockInvoice(overrides: Partial<Invoice> = {}): Invoice {
  const subtotal = Math.round(Math.random() * 500000)
  const taxRate = 0.1
  const taxAmount = Math.round(subtotal * taxRate)
  const totalAmount = subtotal + taxAmount

  return {
    id: generateId(),
    tenant_id: 'test-tenant',
    client_id: generateId(),
    pet_id: null,
    invoice_number: `INV-${Date.now()}`,
    appointment_id: null,
    medical_record_id: null,
    hospitalization_id: null,
    subtotal,
    discount_amount: 0,
    discount_reason: null,
    tax_rate: taxRate,
    tax_amount: taxAmount,
    total_amount: totalAmount,
    amount_paid: 0,
    balance_due: totalAmount,
    status: 'draft',
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    paid_at: null,
    sent_at: null,
    voided_at: null,
    voided_by: null,
    notes: null,
    internal_notes: null,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

// Service factory
export function createMockService(overrides: Partial<Service> = {}): Service {
  const id = generateId()
  return {
    id,
    tenant_id: 'test-tenant',
    name: `Service ${id}`,
    description: 'Test service description',
    category: 'consultation',
    base_price: Math.round(Math.random() * 200000),
    duration_minutes: 30,
    is_active: true,
    tax_rate: 0.1,
    requires_appointment: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

// Hospitalization factory
export function createMockHospitalization(
  overrides: Partial<Hospitalization> = {}
): Hospitalization {
  return {
    id: generateId(),
    tenant_id: 'test-tenant',
    pet_id: generateId(),
    kennel_id: generateId(),
    hospitalization_number: `HOSP-${Date.now()}`,
    hospitalization_type: 'medical',
    admitted_at: new Date().toISOString(),
    expected_discharge_at: null,
    actual_discharge_at: null,
    admitted_by: null,
    discharged_by: null,
    primary_vet_id: null,
    admission_reason: 'Post-surgery observation',
    admission_diagnosis: null,
    admission_weight_kg: null,
    discharge_diagnosis: null,
    discharge_weight_kg: null,
    discharge_instructions: null,
    treatment_plan: {},
    diet_instructions: null,
    feeding_schedule: [],
    status: 'active',
    acuity_level: 'stable',
    emergency_contact_name: null,
    emergency_contact_phone: null,
    owner_consent_given: true,
    estimated_daily_cost: null,
    deposit_amount: 0,
    deposit_paid: false,
    invoice_id: null,
    notes: null,
    internal_notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

// Lab Order factory
export function createMockLabOrder(overrides: Partial<LabOrder> = {}): LabOrder {
  return {
    id: generateId(),
    tenant_id: 'test-tenant',
    pet_id: generateId(),
    order_number: `LAB-${Date.now()}`,
    ordered_at: new Date().toISOString(),
    ordered_by: generateId(),
    medical_record_id: null,
    hospitalization_id: null,
    clinical_notes: null,
    fasting_status: null,
    specimen_collected_at: null,
    specimen_collected_by: null,
    specimen_type: null,
    specimen_quality: null,
    lab_type: 'in_house',
    external_lab_name: null,
    external_lab_accession: null,
    sent_to_lab_at: null,
    status: 'ordered',
    priority: 'routine',
    results_received_at: null,
    reviewed_by: null,
    reviewed_at: null,
    has_critical_values: false,
    critical_values_acknowledged: false,
    invoice_id: null,
    total_cost: null,
    notes: null,
    internal_notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

// Batch creators
export function createMockPets(count: number, overrides: Partial<Pet> = {}): Pet[] {
  return Array.from({ length: count }, () => createMockPet(overrides))
}

export function createMockAppointments(
  count: number,
  overrides: Partial<Appointment> = {}
): Appointment[] {
  return Array.from({ length: count }, () => createMockAppointment(overrides))
}

// Reset counter for tests
export function resetIdCounter(): void {
  idCounter = 0
}
