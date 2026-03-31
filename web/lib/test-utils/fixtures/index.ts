/**
 * Consolidated Test Fixtures
 *
 * Single source of truth for all test fixture data.
 * Eliminates hardcoded IDs and duplicate fixture definitions.
 *
 * @example
 * ```typescript
 * import { TENANTS, USERS, PETS, INVOICES } from '@/lib/test-utils/fixtures';
 *
 * const pet = PETS.MAX_DOG;
 * const owner = USERS.OWNER_JUAN;
 * const tenant = TENANTS.ADRIS;
 * ```
 */

// =============================================================================
// Tenants
// =============================================================================

export interface TenantFixture {
  id: string
  name: string
  slug: string
}

export const TENANTS = {
  ADRIS: {
    id: 'terrapet',
    name: 'Veterinaria Adris',
    slug: 'terrapet',
  },
  PETLIFE: {
    id: 'petlife',
    name: 'PetLife Center',
    slug: 'petlife',
  },
  TEST: {
    id: 'test-tenant',
    name: 'Test Clinic',
    slug: 'test',
  },
} as const satisfies Record<string, TenantFixture>

export type TenantId = (typeof TENANTS)[keyof typeof TENANTS]['id']

export const DEFAULT_TENANT = TENANTS.ADRIS
export const ALL_TENANT_IDS = Object.values(TENANTS).map((t) => t.id)

// =============================================================================
// Users
// =============================================================================

export type UserRole = 'owner' | 'vet' | 'admin'

export interface UserFixture {
  id: string
  email: string
  password: string
  fullName: string
  phone: string
  role: UserRole
  tenantId: string
}

export interface ProfileFixture {
  id: string
  tenant_id: string
  role: UserRole
  full_name: string
  email: string
  phone?: string
}

const TEST_PASSWORD = 'TestPassword123!'

// Define base users first
const USERS_BASE = {
  // Owners
  OWNER_JUAN: {
    id: 'a0000001-0000-0000-0000-000000000001',
    email: 'juan@gmail.com',
    password: TEST_PASSWORD,
    fullName: 'Juan Pérez',
    phone: '+595981123456',
    role: 'owner' as const,
    tenantId: TENANTS.ADRIS.id,
  },
  OWNER_MARIA: {
    id: 'a0000001-0000-0000-0000-000000000002',
    email: 'maria@gmail.com',
    password: TEST_PASSWORD,
    fullName: 'María López',
    phone: '+595981234567',
    role: 'owner' as const,
    tenantId: TENANTS.ADRIS.id,
  },
  OWNER_PETLIFE: {
    id: 'a0000001-0000-0000-0000-000000000003',
    email: 'carlos.petlife@gmail.com',
    password: TEST_PASSWORD,
    fullName: 'Carlos PetLife',
    phone: '+595981345678',
    role: 'owner' as const,
    tenantId: TENANTS.PETLIFE.id,
  },

  // Vets
  VET_CARLOS: {
    id: 'user-vet-carlos',
    email: 'carlos@terrapet.com',
    password: TEST_PASSWORD,
    fullName: 'Dr. Carlos Rodríguez',
    phone: '+595981456789',
    role: 'vet' as const,
    tenantId: TENANTS.ADRIS.id,
  },
  VET_ANA: {
    id: 'user-vet-ana',
    email: 'ana@terrapet.com',
    password: TEST_PASSWORD,
    fullName: 'Dra. Ana García',
    phone: '+595981567890',
    role: 'vet' as const,
    tenantId: TENANTS.ADRIS.id,
  },

  // Admins
  ADMIN_PRINCIPAL: {
    id: 'user-admin-principal',
    email: 'admin@terrapet.com',
    password: TEST_PASSWORD,
    fullName: 'Admin Principal',
    phone: '+595981678901',
    role: 'admin' as const,
    tenantId: TENANTS.ADRIS.id,
  },
  ADMIN_PETLIFE: {
    id: 'c0000001-0000-0000-0000-000000000002',
    email: 'admin@petlife.com',
    password: TEST_PASSWORD,
    fullName: 'Admin PetLife',
    phone: '+595981789012',
    role: 'admin' as const,
    tenantId: TENANTS.PETLIFE.id,
  },
} as const satisfies Record<string, UserFixture>

// Export with legacy shorthand aliases included
export const USERS = {
  ...USERS_BASE,
  // Legacy aliases for backward compatibility
  OWNER: USERS_BASE.OWNER_JUAN,
  VET: USERS_BASE.VET_CARLOS,
  ADMIN: USERS_BASE.ADMIN_PRINCIPAL,
} as const

export const DEFAULT_OWNER = USERS.OWNER_JUAN
export const DEFAULT_VET = USERS.VET_CARLOS
export const DEFAULT_ADMIN = USERS.ADMIN_PRINCIPAL

/**
 * Convert UserFixture to ProfileFixture (for database inserts)
 */
export function toProfile(user: UserFixture): ProfileFixture {
  return {
    id: user.id,
    tenant_id: user.tenantId,
    role: user.role,
    full_name: user.fullName,
    email: user.email,
    phone: user.phone,
  }
}

// =============================================================================
// Pets
// =============================================================================

export interface PetFixture {
  id: string
  name: string
  species: 'dog' | 'cat' | 'bird' | 'rabbit' | 'other'
  breed?: string
  tenant_id: string
  owner_id: string
  weight_kg?: number
  birth_date?: string
  is_neutered?: boolean
  microchip_id?: string
}

// Define base pets first (using USERS_BASE for references)
const PETS_BASE = {
  MAX_DOG: {
    id: 'pet-max',
    name: 'Max',
    species: 'dog' as const,
    breed: 'Labrador Retriever',
    tenant_id: TENANTS.ADRIS.id,
    owner_id: USERS_BASE.OWNER_JUAN.id,
    weight_kg: 28.5,
    birth_date: '2021-03-15',
    is_neutered: true,
  },
  LUNA_CAT: {
    id: 'pet-luna',
    name: 'Luna',
    species: 'cat' as const,
    breed: 'Siamés',
    tenant_id: TENANTS.ADRIS.id,
    owner_id: USERS_BASE.OWNER_JUAN.id,
    weight_kg: 4.2,
    birth_date: '2022-06-20',
    is_neutered: true,
  },
  ROCKY_DOG: {
    id: 'pet-rocky',
    name: 'Rocky',
    species: 'dog' as const,
    breed: 'Bulldog',
    tenant_id: TENANTS.ADRIS.id,
    owner_id: USERS_BASE.OWNER_MARIA.id,
    weight_kg: 22.0,
    birth_date: '2020-09-01',
    is_neutered: false,
  },
  MILO_PETLIFE: {
    id: 'pet-milo',
    name: 'Milo',
    species: 'dog' as const,
    breed: 'Golden Retriever',
    tenant_id: TENANTS.PETLIFE.id,
    owner_id: USERS_BASE.OWNER_PETLIFE.id,
    weight_kg: 32.0,
  },
} as const satisfies Record<string, PetFixture>

// Export with legacy shorthand aliases included
export const PETS = {
  ...PETS_BASE,
  // Legacy aliases for backward compatibility
  MAX: PETS_BASE.MAX_DOG,
  LUNA: PETS_BASE.LUNA_CAT,
  ROCKY: PETS_BASE.ROCKY_DOG,
  MILO: PETS_BASE.MILO_PETLIFE,
} as const

export const DEFAULT_PET = PETS.MAX_DOG

// =============================================================================
// Invoices
// =============================================================================

export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'cancelled'

export interface InvoiceFixture {
  id: string
  tenant_id: string
  client_id: string
  invoice_number: string
  status: InvoiceStatus
  subtotal: number
  tax_amount: number
  total_amount: number
  amount_paid: number
  balance_due: number
}

export const INVOICES = {
  DRAFT: {
    id: 'invoice-draft',
    tenant_id: TENANTS.ADRIS.id,
    client_id: USERS.OWNER_JUAN.id,
    invoice_number: 'INV-2024-001',
    status: 'draft' as const,
    subtotal: 100000,
    tax_amount: 10000,
    total_amount: 110000,
    amount_paid: 0,
    balance_due: 110000,
  },
  SENT: {
    id: 'invoice-sent',
    tenant_id: TENANTS.ADRIS.id,
    client_id: USERS.OWNER_JUAN.id,
    invoice_number: 'INV-2024-002',
    status: 'sent' as const,
    subtotal: 150000,
    tax_amount: 15000,
    total_amount: 165000,
    amount_paid: 0,
    balance_due: 165000,
  },
  PARTIAL: {
    id: 'invoice-partial',
    tenant_id: TENANTS.ADRIS.id,
    client_id: USERS.OWNER_MARIA.id,
    invoice_number: 'INV-2024-003',
    status: 'partial' as const,
    subtotal: 200000,
    tax_amount: 20000,
    total_amount: 220000,
    amount_paid: 100000,
    balance_due: 120000,
  },
  PAID: {
    id: 'invoice-paid',
    tenant_id: TENANTS.ADRIS.id,
    client_id: USERS.OWNER_JUAN.id,
    invoice_number: 'INV-2024-004',
    status: 'paid' as const,
    subtotal: 150000,
    tax_amount: 15000,
    total_amount: 165000,
    amount_paid: 165000,
    balance_due: 0,
  },
} as const satisfies Record<string, InvoiceFixture>

// =============================================================================
// Hospitalizations
// =============================================================================

export type HospitalizationStatus = 'active' | 'discharged' | 'transferred' | 'deceased'
export type AcuityLevel = 'critical' | 'unstable' | 'stable' | 'observation'

export interface HospitalizationFixture {
  id: string
  tenant_id: string
  pet_id: string
  kennel_id: string
  status: HospitalizationStatus
  acuity_level: AcuityLevel
  admitted_at?: string
}

export const HOSPITALIZATIONS = {
  ACTIVE: {
    id: 'hosp-active',
    tenant_id: TENANTS.ADRIS.id,
    pet_id: PETS.MAX_DOG.id,
    kennel_id: 'kennel-001',
    status: 'active' as const,
    acuity_level: 'stable' as const,
    admitted_at: new Date().toISOString(),
  },
  CRITICAL: {
    id: 'hosp-critical',
    tenant_id: TENANTS.ADRIS.id,
    pet_id: PETS.ROCKY_DOG.id,
    kennel_id: 'kennel-002',
    status: 'active' as const,
    acuity_level: 'critical' as const,
  },
} as const satisfies Record<string, HospitalizationFixture>

// =============================================================================
// Kennels
// =============================================================================

export type KennelStatus = 'available' | 'occupied' | 'maintenance' | 'reserved'

export interface KennelFixture {
  id: string
  tenant_id: string
  name: string
  code: string
  current_status: KennelStatus
  daily_rate: number
}

export const KENNELS = {
  K001: {
    id: 'kennel-001',
    tenant_id: TENANTS.ADRIS.id,
    name: 'Kennel 1',
    code: 'K001',
    current_status: 'occupied' as const,
    daily_rate: 50000,
  },
  K002: {
    id: 'kennel-002',
    tenant_id: TENANTS.ADRIS.id,
    name: 'Kennel 2',
    code: 'K002',
    current_status: 'available' as const,
    daily_rate: 50000,
  },
  K003: {
    id: 'kennel-003',
    tenant_id: TENANTS.ADRIS.id,
    name: 'Kennel VIP',
    code: 'K003',
    current_status: 'available' as const,
    daily_rate: 100000,
  },
} as const satisfies Record<string, KennelFixture>

// =============================================================================
// Services
// =============================================================================

export interface ServiceFixture {
  id: string
  tenant_id: string
  name: string
  category: string
  base_price: number
  duration_minutes: number
}

export const SERVICES = {
  CONSULTATION: {
    id: 'service-consultation',
    tenant_id: TENANTS.ADRIS.id,
    name: 'Consulta General',
    category: 'consulta',
    base_price: 80000,
    duration_minutes: 30,
  },
  VACCINATION: {
    id: 'service-vaccination',
    tenant_id: TENANTS.ADRIS.id,
    name: 'Vacunación',
    category: 'preventivo',
    base_price: 120000,
    duration_minutes: 15,
  },
  SURGERY_MINOR: {
    id: 'service-surgery-minor',
    tenant_id: TENANTS.ADRIS.id,
    name: 'Cirugía Menor',
    category: 'cirugia',
    base_price: 350000,
    duration_minutes: 60,
  },
  GROOMING: {
    id: 'service-grooming',
    tenant_id: TENANTS.ADRIS.id,
    name: 'Baño y Peluquería',
    category: 'estetica',
    base_price: 60000,
    duration_minutes: 45,
  },
} as const satisfies Record<string, ServiceFixture>

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate a tenant-prefixed URL
 */
export function tenantUrl(tenant: TenantFixture | string, path: string = ''): string {
  const slug = typeof tenant === 'string' ? tenant : tenant.slug
  return `/${slug}${path.startsWith('/') ? path : `/${path}`}`
}

/**
 * Generate a unique test email
 */
export function generateTestEmail(prefix: string = 'test'): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(7)
  return `${prefix}-${timestamp}-${random}@test.local`
}

/**
 * Generate a unique test phone
 */
export function generateTestPhone(): string {
  const random = Math.floor(Math.random() * 900000000) + 100000000
  return `+595${random}`
}

/**
 * Get users by role
 */
export function getUsersByRole(role: UserRole): UserFixture[] {
  return Object.values(USERS).filter((user) => user.role === role)
}

/**
 * Get users by tenant
 */
export function getUsersByTenant(tenantId: string): UserFixture[] {
  return Object.values(USERS).filter((user) => user.tenantId === tenantId)
}

/**
 * Invalid credentials for auth failure tests
 */
export const INVALID_CREDENTIALS = {
  email: 'nonexistent@test.local',
  password: 'WrongPassword123!',
}

// =============================================================================
// Vaccines
// =============================================================================

export interface VaccineFixture {
  id: string
  pet_id: string
  tenant_id: string
  vaccine_name: string
  vaccine_type: string
  administered_date: string
  next_due_date?: string
  administered_by?: string
  lot_number?: string
  status: 'completed' | 'scheduled' | 'overdue'
}

export const VACCINES = {
  RABIES_MAX: {
    id: 'vaccine-rabies-max',
    pet_id: PETS.MAX_DOG.id,
    tenant_id: TENANTS.ADRIS.id,
    vaccine_name: 'Antirrábica',
    vaccine_type: 'rabies',
    administered_date: '2024-06-15',
    next_due_date: '2025-06-15',
    administered_by: USERS.VET_CARLOS.id,
    lot_number: 'LOT-2024-001',
    status: 'completed' as const,
  },
  DISTEMPER_MAX: {
    id: 'vaccine-distemper-max',
    pet_id: PETS.MAX_DOG.id,
    tenant_id: TENANTS.ADRIS.id,
    vaccine_name: 'Moquillo Canino',
    vaccine_type: 'distemper',
    administered_date: '2024-03-10',
    next_due_date: '2025-03-10',
    administered_by: USERS.VET_CARLOS.id,
    status: 'completed' as const,
  },
  FELINE_LUNA: {
    id: 'vaccine-feline-luna',
    pet_id: PETS.LUNA_CAT.id,
    tenant_id: TENANTS.ADRIS.id,
    vaccine_name: 'Triple Felina',
    vaccine_type: 'fvrcp',
    administered_date: '2024-07-20',
    next_due_date: '2025-07-20',
    status: 'completed' as const,
  },
  OVERDUE: {
    id: 'vaccine-overdue',
    pet_id: PETS.ROCKY_DOG.id,
    tenant_id: TENANTS.ADRIS.id,
    vaccine_name: 'Antirrábica',
    vaccine_type: 'rabies',
    administered_date: '2023-01-15',
    next_due_date: '2024-01-15',
    status: 'overdue' as const,
  },
} as const satisfies Record<string, VaccineFixture>

// =============================================================================
// Vaccine Reactions
// =============================================================================

export type ReactionSeverity = 'mild' | 'moderate' | 'severe'
export type ReactionType = 'local' | 'systemic' | 'anaphylactic' | 'other'

export interface VaccineReactionFixture {
  id: string
  pet_id: string
  vaccine_id: string
  tenant_id: string
  reaction_type: ReactionType
  severity: ReactionSeverity
  onset_hours: number
  description: string
  treatment?: string
  resolved_at?: string
  reported_by: string
  created_at?: string
}

export const VACCINE_REACTIONS = {
  MILD_LOCAL: {
    id: 'reaction-mild-local',
    pet_id: PETS.MAX_DOG.id,
    vaccine_id: VACCINES.RABIES_MAX.id,
    tenant_id: TENANTS.ADRIS.id,
    reaction_type: 'local' as const,
    severity: 'mild' as const,
    onset_hours: 2,
    description: 'Leve hinchazón en el sitio de inyección',
    treatment: 'Compresa fría',
    resolved_at: new Date().toISOString(),
    reported_by: USERS.VET_CARLOS.id,
  },
  MODERATE_SYSTEMIC: {
    id: 'reaction-moderate-systemic',
    pet_id: PETS.ROCKY_DOG.id,
    vaccine_id: VACCINES.OVERDUE.id,
    tenant_id: TENANTS.ADRIS.id,
    reaction_type: 'systemic' as const,
    severity: 'moderate' as const,
    onset_hours: 6,
    description: 'Fiebre leve y letargia',
    treatment: 'Antipiréticos y observación',
    reported_by: USERS.VET_CARLOS.id,
  },
  SEVERE_ANAPHYLACTIC: {
    id: 'reaction-severe-anaphylactic',
    pet_id: PETS.LUNA_CAT.id,
    vaccine_id: VACCINES.FELINE_LUNA.id,
    tenant_id: TENANTS.ADRIS.id,
    reaction_type: 'anaphylactic' as const,
    severity: 'severe' as const,
    onset_hours: 0.5,
    description: 'Reacción alérgica severa con dificultad respiratoria',
    treatment: 'Epinefrina y corticoides IV',
    reported_by: USERS.VET_ANA.id,
  },
} as const satisfies Record<string, VaccineReactionFixture>

// =============================================================================
// Prescriptions
// =============================================================================

export type PrescriptionStatus = 'active' | 'filled' | 'expired' | 'cancelled'

export interface PrescriptionFixture {
  id: string
  pet_id: string
  tenant_id: string
  vet_id: string
  medications: Array<{
    name: string
    dosage: string
    frequency: string
    duration: string
  }>
  notes?: string
  valid_until: string
  status: PrescriptionStatus
  signature_url?: string
  created_at?: string
}

export const PRESCRIPTIONS = {
  ACTIVE: {
    id: 'prescription-active',
    pet_id: PETS.MAX_DOG.id,
    tenant_id: TENANTS.ADRIS.id,
    vet_id: USERS.VET_CARLOS.id,
    medications: [
      {
        name: 'Amoxicilina',
        dosage: '250mg',
        frequency: 'Cada 12 horas',
        duration: '7 días',
      },
    ],
    notes: 'Tomar con alimentos',
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'active' as const,
  },
  FILLED: {
    id: 'prescription-filled',
    pet_id: PETS.ROCKY_DOG.id,
    tenant_id: TENANTS.ADRIS.id,
    vet_id: USERS.VET_ANA.id,
    medications: [
      {
        name: 'Metronidazol',
        dosage: '500mg',
        frequency: 'Cada 8 horas',
        duration: '5 días',
      },
      {
        name: 'Probióticos',
        dosage: '1 sobre',
        frequency: 'Una vez al día',
        duration: '10 días',
      },
    ],
    valid_until: new Date().toISOString().split('T')[0],
    status: 'filled' as const,
  },
  EXPIRED: {
    id: 'prescription-expired',
    pet_id: PETS.LUNA_CAT.id,
    tenant_id: TENANTS.ADRIS.id,
    vet_id: USERS.VET_CARLOS.id,
    medications: [
      {
        name: 'Prednisolona',
        dosage: '5mg',
        frequency: 'Cada 24 horas',
        duration: '14 días',
      },
    ],
    valid_until: '2024-01-01',
    status: 'expired' as const,
  },
} as const satisfies Record<string, PrescriptionFixture>

// =============================================================================
// Appointments
// =============================================================================

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'

export interface AppointmentFixture {
  id: string
  tenant_id: string
  pet_id: string
  owner_id: string
  service_id: string
  vet_id?: string
  start_time: string
  end_time: string
  status: AppointmentStatus
  notes?: string
}

export const APPOINTMENTS = {
  SCHEDULED: {
    id: 'appointment-scheduled',
    tenant_id: TENANTS.ADRIS.id,
    pet_id: PETS.MAX_DOG.id,
    owner_id: USERS.OWNER_JUAN.id,
    service_id: SERVICES.CONSULTATION.id,
    vet_id: USERS.VET_CARLOS.id,
    start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
    status: 'scheduled' as const,
  },
  CONFIRMED: {
    id: 'appointment-confirmed',
    tenant_id: TENANTS.ADRIS.id,
    pet_id: PETS.LUNA_CAT.id,
    owner_id: USERS.OWNER_JUAN.id,
    service_id: SERVICES.VACCINATION.id,
    vet_id: USERS.VET_ANA.id,
    start_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString(),
    status: 'confirmed' as const,
  },
  CHECKED_IN: {
    id: 'appointment-checked-in',
    tenant_id: TENANTS.ADRIS.id,
    pet_id: PETS.ROCKY_DOG.id,
    owner_id: USERS.OWNER_MARIA.id,
    service_id: SERVICES.GROOMING.id,
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
    status: 'checked_in' as const,
  },
  COMPLETED: {
    id: 'appointment-completed',
    tenant_id: TENANTS.ADRIS.id,
    pet_id: PETS.MAX_DOG.id,
    owner_id: USERS.OWNER_JUAN.id,
    service_id: SERVICES.CONSULTATION.id,
    vet_id: USERS.VET_CARLOS.id,
    start_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
    status: 'completed' as const,
    notes: 'Consulta de rutina, todo bien',
  },
} as const satisfies Record<string, AppointmentFixture>

// =============================================================================
// Conversations
// =============================================================================

export type ConversationStatus = 'active' | 'closed' | 'archived'
export type ConversationChannel = 'internal' | 'whatsapp' | 'email'

export interface ConversationFixture {
  id: string
  tenant_id: string
  client_id: string
  pet_id?: string
  channel: ConversationChannel
  status: ConversationStatus
  last_message_at?: string
  unread_count?: number
}

export const CONVERSATIONS = {
  ACTIVE_INTERNAL: {
    id: 'conversation-active-internal',
    tenant_id: TENANTS.ADRIS.id,
    client_id: USERS.OWNER_JUAN.id,
    pet_id: PETS.MAX_DOG.id,
    channel: 'internal' as const,
    status: 'active' as const,
    last_message_at: new Date().toISOString(),
    unread_count: 2,
  },
  ACTIVE_WHATSAPP: {
    id: 'conversation-active-whatsapp',
    tenant_id: TENANTS.ADRIS.id,
    client_id: USERS.OWNER_MARIA.id,
    channel: 'whatsapp' as const,
    status: 'active' as const,
    last_message_at: new Date().toISOString(),
    unread_count: 0,
  },
  CLOSED: {
    id: 'conversation-closed',
    tenant_id: TENANTS.ADRIS.id,
    client_id: USERS.OWNER_JUAN.id,
    pet_id: PETS.LUNA_CAT.id,
    channel: 'internal' as const,
    status: 'closed' as const,
    last_message_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    unread_count: 0,
  },
} as const satisfies Record<string, ConversationFixture>

// =============================================================================
// Messages
// =============================================================================

export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed'
export type SenderType = 'staff' | 'client'

export interface MessageFixture {
  id: string
  conversation_id: string
  sender_id: string
  sender_type: SenderType
  content: string
  status: MessageStatus
  created_at?: string
}

export const MESSAGES = {
  FROM_STAFF: {
    id: 'message-from-staff',
    conversation_id: CONVERSATIONS.ACTIVE_INTERNAL.id,
    sender_id: USERS.VET_CARLOS.id,
    sender_type: 'staff' as const,
    content: 'Hola, ¿cómo se encuentra Max después de la consulta?',
    status: 'delivered' as const,
  },
  FROM_CLIENT: {
    id: 'message-from-client',
    conversation_id: CONVERSATIONS.ACTIVE_INTERNAL.id,
    sender_id: USERS.OWNER_JUAN.id,
    sender_type: 'client' as const,
    content: 'Muy bien, gracias por preguntar. Ya está comiendo normal.',
    status: 'read' as const,
  },
} as const satisfies Record<string, MessageFixture>

// =============================================================================
// Reminders
// =============================================================================

export type ReminderType = 'vaccine' | 'appointment' | 'followup' | 'medication'
export type ReminderStatus = 'pending' | 'sent' | 'failed' | 'cancelled'
export type ReminderChannel = 'email' | 'sms' | 'whatsapp' | 'push'

export interface ReminderFixture {
  id: string
  tenant_id: string
  client_id: string
  pet_id?: string
  type: ReminderType
  channel: ReminderChannel
  scheduled_at: string
  status: ReminderStatus
  message?: string
}

export const REMINDERS = {
  VACCINE_PENDING: {
    id: 'reminder-vaccine-pending',
    tenant_id: TENANTS.ADRIS.id,
    client_id: USERS.OWNER_JUAN.id,
    pet_id: PETS.MAX_DOG.id,
    type: 'vaccine' as const,
    channel: 'email' as const,
    scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending' as const,
    message: 'Recordatorio: La vacuna antirrábica de Max vence pronto',
  },
  APPOINTMENT_SENT: {
    id: 'reminder-appointment-sent',
    tenant_id: TENANTS.ADRIS.id,
    client_id: USERS.OWNER_MARIA.id,
    pet_id: PETS.ROCKY_DOG.id,
    type: 'appointment' as const,
    channel: 'whatsapp' as const,
    scheduled_at: new Date().toISOString(),
    status: 'sent' as const,
  },
  FOLLOWUP_FAILED: {
    id: 'reminder-followup-failed',
    tenant_id: TENANTS.ADRIS.id,
    client_id: USERS.OWNER_JUAN.id,
    type: 'followup' as const,
    channel: 'sms' as const,
    scheduled_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    status: 'failed' as const,
  },
} as const satisfies Record<string, ReminderFixture>

// =============================================================================
// Lab Orders
// =============================================================================

export type LabOrderStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

export interface LabOrderFixture {
  id: string
  tenant_id: string
  pet_id: string
  ordered_by: string
  status: LabOrderStatus
  ordered_at: string
  completed_at?: string
  notes?: string
}

export const LAB_ORDERS = {
  PENDING: {
    id: 'lab-order-pending',
    tenant_id: TENANTS.ADRIS.id,
    pet_id: PETS.MAX_DOG.id,
    ordered_by: USERS.VET_CARLOS.id,
    status: 'pending' as const,
    ordered_at: new Date().toISOString(),
    notes: 'Hemograma completo y química sanguínea',
  },
  IN_PROGRESS: {
    id: 'lab-order-in-progress',
    tenant_id: TENANTS.ADRIS.id,
    pet_id: PETS.ROCKY_DOG.id,
    ordered_by: USERS.VET_ANA.id,
    status: 'in_progress' as const,
    ordered_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  COMPLETED: {
    id: 'lab-order-completed',
    tenant_id: TENANTS.ADRIS.id,
    pet_id: PETS.LUNA_CAT.id,
    ordered_by: USERS.VET_CARLOS.id,
    status: 'completed' as const,
    ordered_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
} as const satisfies Record<string, LabOrderFixture>

// =============================================================================
// Consent Documents
// =============================================================================

export interface ConsentDocumentFixture {
  id: string
  tenant_id: string
  pet_id: string
  template_id: string
  signed_at?: string
  signature_url?: string
  signed_by: string
  expires_at?: string
}

export const CONSENT_DOCUMENTS = {
  SURGERY_SIGNED: {
    id: 'consent-surgery-signed',
    tenant_id: TENANTS.ADRIS.id,
    pet_id: PETS.MAX_DOG.id,
    template_id: 'template-surgery',
    signed_at: new Date().toISOString(),
    signature_url: 'https://storage.example.com/signatures/consent-1.png',
    signed_by: USERS.OWNER_JUAN.id,
  },
  ANESTHESIA_SIGNED: {
    id: 'consent-anesthesia-signed',
    tenant_id: TENANTS.ADRIS.id,
    pet_id: PETS.ROCKY_DOG.id,
    template_id: 'template-anesthesia',
    signed_at: new Date().toISOString(),
    signed_by: USERS.OWNER_MARIA.id,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  PENDING: {
    id: 'consent-pending',
    tenant_id: TENANTS.ADRIS.id,
    pet_id: PETS.LUNA_CAT.id,
    template_id: 'template-treatment',
    signed_by: USERS.OWNER_JUAN.id,
  },
} as const satisfies Record<string, ConsentDocumentFixture>

// =============================================================================
// Insurance Claims
// =============================================================================

export type InsuranceClaimStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'paid'

export interface InsuranceClaimFixture {
  id: string
  tenant_id: string
  pet_id: string
  policy_id: string
  claim_type: string
  amount: number
  status: InsuranceClaimStatus
  submitted_at?: string
}

export const INSURANCE_CLAIMS = {
  SUBMITTED: {
    id: 'claim-submitted',
    tenant_id: TENANTS.ADRIS.id,
    pet_id: PETS.MAX_DOG.id,
    policy_id: 'policy-001',
    claim_type: 'surgery',
    amount: 500000,
    status: 'submitted' as const,
    submitted_at: new Date().toISOString(),
  },
  APPROVED: {
    id: 'claim-approved',
    tenant_id: TENANTS.ADRIS.id,
    pet_id: PETS.ROCKY_DOG.id,
    policy_id: 'policy-002',
    claim_type: 'consultation',
    amount: 80000,
    status: 'approved' as const,
    submitted_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  REJECTED: {
    id: 'claim-rejected',
    tenant_id: TENANTS.ADRIS.id,
    pet_id: PETS.LUNA_CAT.id,
    policy_id: 'policy-003',
    claim_type: 'grooming',
    amount: 60000,
    status: 'rejected' as const,
    submitted_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
} as const satisfies Record<string, InsuranceClaimFixture>

// =============================================================================
// Procurement Orders
// =============================================================================

export type PurchaseOrderStatus = 'draft' | 'sent' | 'confirmed' | 'shipped' | 'received' | 'cancelled'

export interface ProcurementOrderFixture {
  id: string
  tenant_id: string
  supplier_id: string
  status: PurchaseOrderStatus
  total_amount: number
  order_date: string
  expected_delivery?: string
  items: Array<{
    product_id: string
    quantity: number
    unit_price: number
  }>
}

export const PROCUREMENT_ORDERS = {
  DRAFT: {
    id: 'po-draft',
    tenant_id: TENANTS.ADRIS.id,
    supplier_id: 'supplier-001',
    status: 'draft' as const,
    total_amount: 250000,
    order_date: new Date().toISOString().split('T')[0],
    items: [
      { product_id: 'product-001', quantity: 10, unit_price: 25000 },
    ],
  },
  SENT: {
    id: 'po-sent',
    tenant_id: TENANTS.ADRIS.id,
    supplier_id: 'supplier-002',
    status: 'sent' as const,
    total_amount: 500000,
    order_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    expected_delivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [
      { product_id: 'product-002', quantity: 20, unit_price: 25000 },
    ],
  },
  RECEIVED: {
    id: 'po-received',
    tenant_id: TENANTS.ADRIS.id,
    supplier_id: 'supplier-001',
    status: 'received' as const,
    total_amount: 750000,
    order_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [
      { product_id: 'product-001', quantity: 15, unit_price: 25000 },
      { product_id: 'product-003', quantity: 10, unit_price: 37500 },
    ],
  },
} as const satisfies Record<string, ProcurementOrderFixture>

// =============================================================================
// Store Products
// =============================================================================

export interface ProductFixture {
  id: string
  tenant_id: string
  name: string
  sku: string
  base_price: number
  stock_quantity: number
  is_prescription_required: boolean
  is_active: boolean
}

export const PRODUCTS = {
  DOG_FOOD: {
    id: '00000000-0000-4000-a000-000000000001',
    tenant_id: TENANTS.ADRIS.id,
    name: 'Alimento Premium Perros 15kg',
    sku: 'ALI-DOG-15',
    base_price: 180000,
    stock_quantity: 25,
    is_prescription_required: false,
    is_active: true,
  },
  ANTIBIOTIC: {
    id: '00000000-0000-4000-a000-000000000002',
    tenant_id: TENANTS.ADRIS.id,
    name: 'Amoxicilina 500mg x 20',
    sku: 'MED-AMX-500',
    base_price: 45000,
    stock_quantity: 50,
    is_prescription_required: true,
    is_active: true,
  },
  SHAMPOO: {
    id: '00000000-0000-4000-a000-000000000003',
    tenant_id: TENANTS.ADRIS.id,
    name: 'Shampoo Medicado 250ml',
    sku: 'HIG-SHP-250',
    base_price: 35000,
    stock_quantity: 30,
    is_prescription_required: false,
    is_active: true,
  },
  OUT_OF_STOCK: {
    id: '00000000-0000-4000-a000-000000000004',
    tenant_id: TENANTS.ADRIS.id,
    name: 'Collar Antipulgas Premium',
    sku: 'ACC-COL-001',
    base_price: 65000,
    stock_quantity: 0,
    is_prescription_required: false,
    is_active: true,
  },
  CAT_TREATS: {
    id: '00000000-0000-4000-a000-000000000005',
    tenant_id: TENANTS.ADRIS.id,
    name: 'Snacks Premium Gatos 200g',
    sku: 'SNK-CAT-200',
    base_price: 25000,
    stock_quantity: 40,
    is_prescription_required: false,
    is_active: true,
  },
} as const satisfies Record<string, ProductFixture>

// =============================================================================
// Cron Secrets (for testing cron job authentication)
// =============================================================================

export const CRON_SECRETS = {
  VALID: 'test-cron-secret-valid',
  INVALID: 'invalid-cron-secret',
} as const

