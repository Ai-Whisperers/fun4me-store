/**
 * Test Factories
 *
 * Creates realistic test data for all entities used in tests.
 * Ensures consistency and proper relationship management.
 */

import { faker } from '@faker-js/faker'
import { UserFixture } from '../__fixtures__/users'

// Base interface for all factory objects
interface BaseFactoryObject {
  id: string
  tenant_id: string
  created_at: string
  updated_at: string
}

// Utility function to generate UUIDs
function generateId(prefix: string): string {
  return `${prefix}-${faker.string.uuid()}`
}

// Utility function to generate timestamps
function generateTimestamp(plusDays: number = 0): string {
  return faker.date.past({ years: 1 }).toISOString()
}

/**
 * Factory for pets
 */
export const petFactory = (overrides: Partial<any> = {}): any => {
  const now = new Date()
  return {
    id: generateId('pet'),
    tenant_id: overrides.tenant_id || 'test-tenant',
    owner_id: overrides.owner_id || 'test-owner-id',
    name: overrides.name || faker.person.firstName(),
    species: overrides.species || faker.helpers.arrayElement(['dog', 'cat', 'bird', 'rabbit']),
    breed: overrides.breed || faker.animal.dogBreed(),
    gender: overrides.gender || faker.helpers.arrayElement(['male', 'female']),
    birth_date: overrides.birth_date || faker.date.past({ years: 10 }).toISOString().split('T')[0],
    weight: overrides.weight || faker.number.float({ min: 1, max: 50, precision: 1 }),
    microchip_number: overrides.microchip_number || faker.string.numeric(15),
    color: overrides.color || faker.color.human(),
    notes: overrides.notes || faker.lorem.sentences(1),
    is_active: overrides.is_active !== undefined ? overrides.is_active : true,
    created_at: generateTimestamp(),
    updated_at: generateTimestamp(),
    ...overrides,
  }
}

/**
 * Factory for appointments
 */
export const appointmentFactory = (overrides: Partial<any> = {}): any => {
  return {
    id: generateId('appointment'),
    tenant_id: overrides.tenant_id || 'test-tenant',
    owner_id: overrides.owner_id || 'test-owner-id',
    pet_id: overrides.pet_id || generateId('pet'),
    veterinarian_id: overrides.veterinarian_id || 'test-vet-id',
    service_id: overrides.service_id || generateId('service'),
    status: overrides.status || 'requested',
    preferred_date_start: overrides.preferred_date_start || faker.date.future({ years: 0.5 }).toISOString(),
    preferred_date_end: overrides.preferred_date_end || faker.date.future({ years: 0.5 }).toISOString(),
    scheduled_date_start: overrides.scheduled_date_start || null,
    scheduled_date_end: overrides.scheduled_date_end || null,
    actual_date_start: overrides.actual_date_start || null,
    actual_date_end: overrides.actual_date_end || null,
    notes: overrides.notes || faker.lorem.sentences(1),
    urgent: overrides.urgent !== undefined ? overrides.urgent : false,
    created_at: generateTimestamp(),
    updated_at: generateTimestamp(),
    ...overrides,
  }
}

/**
 * Factory for services
 */
export const serviceFactory = (overrides: Partial<any> = {}): any => {
  return {
    id: generateId('service'),
    tenant_id: overrides.tenant_id || 'test-tenant',
    name: overrides.name || faker.commerce.productName(),
    description: overrides.description || faker.lorem.paragraph(),
    category: overrides.category || faker.helpers.arrayElement(['consultation', 'vaccination', 'surgery', 'grooming']),
    duration_minutes: overrides.duration_minutes || faker.number.int({ min: 15, max: 180 }),
    price: overrides.price || faker.number.int({ min: 50000, max: 500000 }), // In Guaraní
    requires_vet: overrides.requires_vet !== undefined ? overrides.requires_vet : true,
    is_active: overrides.is_active !== undefined ? overrides.is_active : true,
    booking_settings: overrides.booking_settings || {
      online_booking: true,
      phone_booking: true,
      walk_in: faker.datatype.boolean(),
    },
    created_at: generateTimestamp(),
    updated_at: generateTimestamp(),
    ...overrides,
  }
}

/**
 * Factory for medical records
 */
export const medicalRecordFactory = (overrides: Partial<any> = {}): any => {
  return {
    id: generateId('medical-record'),
    tenant_id: overrides.tenant_id || 'test-tenant',
    pet_id: overrides.pet_id || generateId('pet'),
    owner_id: overrides.owner_id || 'test-owner-id',
    veterinarian_id: overrides.veterinarian_id || 'test-vet-id',
    appointment_id: overrides.appointment_id || generateId('appointment'),
    record_type: overrides.record_type || faker.helpers.arrayElement(['consultation', 'exam', 'surgery', 'vaccination', 'lab_result']),
    diagnosis: overrides.diagnosis || faker.lorem.sentences(2),
    symptoms: overrides.symptoms || [faker.lorem.words(3), faker.lorem.words(2)],
    treatment: overrides.treatment || faker.lorem.sentences(2),
    notes: overrides.notes || faker.lorem.paragraph(),
    follow_up_required: overrides.follow_up_required !== undefined ? overrides.follow_up_required : false,
    follow_up_date: overrides.follow_up_date || null,
    created_at: generateTimestamp(),
    updated_at: generateTimestamp(),
    ...overrides,
  }
}

/**
 * Factory for prescriptions
 */
export const prescriptionFactory = (overrides: Partial<any> = {}): any => {
  return {
    id: generateId('prescription'),
    tenant_id: overrides.tenant_id || 'test-tenant',
    pet_id: overrides.pet_id || generateId('pet'),
    owner_id: overrides.owner_id || 'test-owner-id',
    veterinarian_id: overrides.veterinarian_id || 'test-vet-id',
    medications: overrides.medications || [
      {
        name: faker.commerce.productName(),
        dosage: `${faker.number.int({ min: 1, max: 100 })}mg`,
        frequency: faker.helpers.arrayElement(['twice daily', 'three times daily', 'once daily', 'as needed']),
        duration: faker.helpers.arrayElement(['3 days', '7 days', '14 days', '30 days']),
        instructions: faker.lorem.sentences(1),
        refills: faker.number.int({ min: 0, max: 3 }),
      }
    ],
    diagnosis: overrides.diagnosis || faker.lorem.sentences(1),
    notes: overrides.notes || faker.lorem.sentences(1),
    valid_until: overrides.valid_until || faker.date.future({ years: 0.5 }).toISOString(),
    status: overrides.status || 'active',
    created_at: generateTimestamp(),
    updated_at: generateTimestamp(),
    ...overrides,
  }
}

/**
 * Factory for vaccinations
 */
export const vaccinationFactory = (overrides: Partial<any> = {}): any => {
  return {
    id: generateId('vaccination'),
    tenant_id: overrides.tenant_id || 'test-tenant',
    pet_id: overrides.pet_id || generateId('pet'),
    owner_id: overrides.owner_id || 'test-owner-id',
    veterinarian_id: overrides.veterinarian_id || 'test-vet-id',
    vaccine_name: overrides.vaccine_name || faker.helpers.arrayElement(['DHPP', 'Rabies', 'Bordetella', 'Leptospirosis']),
    vaccine_type: overrides.vaccine_type || faker.helpers.arrayElement(['core', 'non-core']),
    manufacturer: overrides.manufacturer || faker.company.name(),
    batch_number: overrides.batch_number || `${faker.string.alphanumeric(8)}-${faker.number.int({ min: 1000, max: 9999 })}`,
    administration_date: overrides.administration_date || faker.date.past({ years: 2 }).toISOString().split('T')[0],
    next_due_date: overrides.next_due_date || faker.date.future({ years: 1 }).toISOString().split('T')[0],
    veterinarian: overrides.veterinarian || faker.person.fullName(),
    clinic_location: overrides.clinic_location || 'Main Clinic',
    reactions: overrides.reactions || null,
    notes: overrides.notes || faker.lorem.sentences(1),
    status: overrides.status || 'administered',
    created_at: generateTimestamp(),
    updated_at: generateTimestamp(),
    ...overrides,
  }
}

/**
 * Factory for lab orders
 */
export const labOrderFactory = (overrides: Partial<any> = {}): any => {
  return {
    id: generateId('lab-order'),
    tenant_id: overrides.tenant_id || 'test-tenant',
    patient_id: overrides.patient_id || generateId('patient'),
    owner_id: overrides.owner_id || 'test-owner-id',
    veterinarian_id: overrides.veterinarian_id || 'test-vet-id',
    urgent: overrides.urgent !== undefined ? overrides.urgent : false,
    status: overrides.status || 'pending',
    tests: overrides.tests || [
      {
        id: generateId('lab-test'),
        test_type: faker.helpers.arrayElement(['blood_work', 'urinalysis', 'fecal', 'skin_scrape', 'xray']),
        name: faker.commerce.productName(),
        code: faker.string.alphanumeric(8).toUpperCase(),
        description: faker.lorem.sentences(1),
      }
    ],
    notes: overrides.notes || faker.lorem.sentences(1),
    due_date: overrides.due_date || faker.date.future({ days: 3 }).toISOString(),
    created_at: generateTimestamp(),
    updated_at: generateTimestamp(),
    ...overrides,
  }
}

/**
 * Factory for orders
 */
export const orderFactory = (overrides: Partial<any> = {}): any => {
  const now = new Date()
  return {
    id: generateId('order'),
    tenant_id: overrides.tenant_id || 'test-tenant',
    user_id: overrides.user_id || 'test-owner-id',
    status: overrides.status || 'pending',
    subtotal: overrides.subtotal || faker.number.int({ min: 10000, max: 500000 }),
    tax_amount: overrides.tax_amount || faker.number.int({ min: 1000, max: 50000 }),
    total_amount: overrides.total_amount || faker.number.int({ min: 20000, max: 600000 }),
    payment_method: overrides.payment_method || 'card',
    payment_status: overrides.payment_status || 'pending',
    created_at: generateTimestamp(),
    updated_at: generateTimestamp(),
    ...overrides,
  }
}

/**
 * Factory for users
 */
export const userFactory = (overrides: Partial<UserFixture> = {}): UserFixture => {
  return {
    id: overrides.id || generateId('user'),
    email: overrides.email || faker.internet.email(),
    password: overrides.password || 'TestPassword123!',
    fullName: overrides.fullName || faker.person.fullName(),
    phone: overrides.phone || faker.phone.number(),
    role: overrides.role || 'owner',
    tenantId: overrides.tenantId || 'test-tenant',
    clientCode: overrides.clientCode || faker.string.alphanumeric(6).toUpperCase(),
    ...overrides,
  }
}

/**
 * Factory for invoices
 */
export const invoiceFactory = (overrides: Partial<any> = {}): any => {
  return {
    id: generateId('invoice'),
    tenant_id: overrides.tenant_id || 'test-tenant',
    patient_id: overrides.patient_id || generateId('patient'),
    owner_id: overrides.owner_id || 'test-owner-id',
    veterinarian_id: overrides.veterinarian_id || 'test-vet-id',
    invoice_number: overrides.invoice_number || `INV-${faker.number.int({ min: 10000, max: 99999 })}`,
    status: overrides.status || 'pending',
    subtotal: overrides.subtotal || faker.number.int({ min: 50000, max: 200000 }),
    tax_amount: overrides.tax_amount || faker.number.int({ min: 5000, max: 20000 }),
    total_amount: overrides.total_amount || faker.number.int({ min: 55000, max: 220000 }),
    due_date: overrides.due_date || faker.date.future({ days: 30 }).toISOString(),
    created_at: generateTimestamp(),
    updated_at: generateTimestamp(),
    ...overrides,
  }
}

/**
 * Factory for kennels
 */
export const kennelFactory = (overrides: Partial<any> = {}): any => {
  return {
    id: generateId('kennel'),
    tenant_id: overrides.tenant_id || 'test-tenant',
    name: overrides.name || `Kennel ${faker.string.alphanumeric(4).toUpperCase()}`,
    capacity: overrides.capacity || faker.number.int({ min: 1, max: 10 }),
    current_occupancy: overrides.current_occupancy || 0,
    status: overrides.status || 'available',
    kennel_type: overrides.kennel_type || faker.helpers.arrayElement(['standard', 'luxury', 'isolation', 'surgery_recovery']),
    features: overrides.features || [
      faker.helpers.arrayElement(['climate_control', 'monitoring', 'toys', 'bedding', 'water_fountain'])
    ],
    created_at: generateTimestamp(),
    updated_at: generateTimestamp(),
    ...overrides,
  }
}

/**
 * Factory for products
 */
export const productFactory = (overrides: Partial<any> = {}): any => {
  return {
    id: generateId('product'),
    tenant_id: overrides.tenant_id || 'test-tenant',
    name: overrides.name || faker.commerce.productName(),
    description: overrides.description || faker.lorem.paragraph(),
    category: overrides.category || faker.helpers.arrayElement(['medication', 'food', 'toys', 'accessories', 'grooming']),
    price: overrides.price || faker.number.int({ min: 10000, max: 300000 }),
    cost: overrides.cost || faker.number.int({ min: 5000, max: 200000 }),
    stock_quantity: overrides.stock_quantity || faker.number.int({ min: 0, max: 100 }),
    reorder_level: overrides.reorder_level || faker.number.int({ min: 5, max: 20 }),
    supplier: overrides.supplier || faker.company.name(),
    active: overrides.active !== undefined ? overrides.active : true,
    prescription_required: overrides.prescription_required !== undefined ? overrides.prescription_required : false,
    created_at: generateTimestamp(),
    updated_at: generateTimestamp(),
    ...overrides,
  }
}

/**
 * Factory for messages
 */
export const messageFactory = (overrides: Partial<any> = {}): any => {
  return {
    id: generateId('message'),
    tenant_id: overrides.tenant_id || 'test-tenant',
    sender_id: overrides.sender_id || 'test-sender-id',
    recipient_id: overrides.recipient_id || 'test-recipient-id',
    subject: overrides.subject || faker.lorem.sentence(),
    content: overrides.content || faker.lorem.paragraph(),
    type: overrides.type || faker.helpers.arrayElement(['general', 'appointment', 'medical', 'billing']),
    status: overrides.status || 'sent',
    read_at: overrides.read_at || null,
    urgent: overrides.urgent !== undefined ? overrides.urgent : false,
    attachments: overrides.attachments || [],
    created_at: generateTimestamp(),
    updated_at: generateTimestamp(),
    ...overrides,
  }
}

// Export all factories as a single object
export const factories = {
  pet: petFactory,
  appointment: appointmentFactory,
  service: serviceFactory,
  medicalRecord: medicalRecordFactory,
  prescription: prescriptionFactory,
  vaccination: vaccinationFactory,
  labOrder: labOrderFactory,
  order: orderFactory,
  user: userFactory,
  invoice: invoiceFactory,
  kennel: kennelFactory,
  product: productFactory,
  message: messageFactory,
}