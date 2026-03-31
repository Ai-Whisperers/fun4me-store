/**
 * Owner Factory - Builder pattern for creating pet owner profiles
 */

import { apiClient } from '../api-client'
import { testContext } from '../context'
import {
  generateId,
  randomPhone,
  randomEmail,
  pick,
  PARAGUAYAN_FIRST_NAMES,
  PARAGUAYAN_LAST_NAMES,
} from './base'
import { OwnerPersona } from './types'
import { TENANT_IDS } from '@/lib/constants/tenants';

interface OwnerData {
  id: string
  tenant_id: string
  email: string
  full_name: string
  phone: string
  role: 'owner' | 'vet' | 'admin'
  avatar_url: string | null
  address?: string
  city?: string
  notes?: string
}

interface OwnerPersonaConfig {
  notePrefix: string
  tags: string[]
}

const PERSONA_CONFIGS: Record<OwnerPersona, OwnerPersonaConfig> = {
  vip: {
    notePrefix: 'Cliente VIP - Atención prioritaria.',
    tags: ['vip', 'premium'],
  },
  budget: {
    notePrefix: 'Cliente sensible al precio.',
    tags: ['budget'],
  },
  new: {
    notePrefix: 'Cliente nuevo - Bienvenida especial.',
    tags: ['new'],
  },
  frequent: {
    notePrefix: 'Visitante frecuente.',
    tags: ['frequent'],
  },
  breeder: {
    notePrefix: 'Criador profesional.',
    tags: ['breeder', 'professional'],
  },
  senior: {
    notePrefix: 'Dueño de mascotas senior.',
    tags: ['senior-pets'],
  },
  emergency: {
    notePrefix: 'Historial de visitas de emergencia.',
    tags: ['emergency-history'],
  },
  loyal: {
    notePrefix: 'Cliente leal desde hace años.',
    tags: ['loyal', 'long-term'],
  },
  inactive: {
    notePrefix: 'No ha visitado recientemente.',
    tags: ['inactive'],
  },
  standard: {
    notePrefix: '',
    tags: [],
  },
}

const ADDRESSES = [
  'Av. Mariscal López 1234',
  'Calle Palma 567',
  'Av. España 890',
  'Calle Brasil 432',
  'Av. Eusebio Ayala 765',
  'Calle Cerro Corá 321',
  'Av. Mcal. Estigarribia 654',
  'Calle Chile 987',
  'Av. Artigas 147',
  'Calle Sacramento 258',
]

const CITIES = ['Asunción', 'San Lorenzo', 'Luque', 'Fernando de la Mora', 'Lambaré']

export class OwnerFactory {
  private data: Partial<OwnerData>
  private persona: OwnerPersona = 'standard'
  private shouldPersist: boolean = true

  private constructor() {
    this.data = {
      id: generateId(),
      tenant_id: TENANT_IDS.ADRIS,
      role: 'owner',
      avatar_url: null,
    }
  }

  /**
   * Start building an owner
   */
  static create(): OwnerFactory {
    return new OwnerFactory()
  }

  /**
   * Set a specific persona for this owner
   */
  withPersona(persona: OwnerPersona): OwnerFactory {
    this.persona = persona
    const config = PERSONA_CONFIGS[persona]
    this.data.notes = config.notePrefix
    return this
  }

  /**
   * Set tenant ID (defaults to 'terrapet')
   */
  forTenant(tenantId: string): OwnerFactory {
    this.data.tenant_id = tenantId
    return this
  }

  /**
   * Set specific name
   */
  withName(fullName: string): OwnerFactory {
    this.data.full_name = fullName
    this.data.email = randomEmail(fullName)
    return this
  }

  /**
   * Set specific email
   */
  withEmail(email: string): OwnerFactory {
    this.data.email = email
    return this
  }

  /**
   * Set specific phone
   */
  withPhone(phone: string): OwnerFactory {
    this.data.phone = phone
    return this
  }

  /**
   * Add address information
   */
  withAddress(address?: string, city?: string): OwnerFactory {
    this.data.address = address || pick(ADDRESSES)
    this.data.city = city || pick(CITIES)
    return this
  }

  /**
   * Add notes
   */
  withNotes(notes: string): OwnerFactory {
    this.data.notes = notes
    return this
  }

  /**
   * Set ID explicitly (for idempotent seeding)
   */
  withId(id: string): OwnerFactory {
    this.data.id = id
    return this
  }

  /**
   * Don't persist to database (for unit tests)
   */
  inMemoryOnly(): OwnerFactory {
    this.shouldPersist = false
    return this
  }

  /**
   * Build the owner data object (without persisting)
   */
  buildData(): OwnerData {
    // Generate name if not set
    if (!this.data.full_name) {
      const firstName = pick(PARAGUAYAN_FIRST_NAMES)
      const lastName = pick(PARAGUAYAN_LAST_NAMES)
      this.data.full_name = `${firstName} ${lastName}`
    }

    // Generate email if not set
    if (!this.data.email) {
      this.data.email = randomEmail(this.data.full_name)
    }

    // Generate phone if not set
    if (!this.data.phone) {
      this.data.phone = randomPhone()
    }

    return this.data as OwnerData
  }

  /**
   * Build and persist the owner to database
   */
  async build(): Promise<OwnerData> {
    const ownerData = this.buildData()

    if (!this.shouldPersist) {
      return ownerData
    }

    // Insert into profiles table
    const { error } = await apiClient.dbInsert('profiles', {
      id: ownerData.id,
      tenant_id: ownerData.tenant_id,
      email: ownerData.email,
      full_name: ownerData.full_name,
      phone: ownerData.phone,
      role: ownerData.role,
      avatar_url: ownerData.avatar_url,
    })

    if (error) {
      throw new Error(`Failed to create owner: ${error}`)
    }

    // Track for cleanup in test mode
    testContext.track('profiles', ownerData.id, ownerData.tenant_id)

    return ownerData
  }
}

/**
 * Create owners with all distinct personas for Adris clinic
 */
export async function createDistinctOwners(tenantId: string = 'terrapet'): Promise<OwnerData[]> {
  const personas: OwnerPersona[] = [
    'vip',
    'budget',
    'new',
    'frequent',
    'breeder',
    'senior',
    'emergency',
    'loyal',
    'inactive',
    'standard',
  ]

  const owners: OwnerData[] = []

  for (const persona of personas) {
    const owner = await OwnerFactory.create()
      .forTenant(tenantId)
      .withPersona(persona)
      .withAddress()
      .build()

    owners.push(owner)
  }

  return owners
}

/**
 * Predefined owner profiles for deterministic seeding
 * Note: IDs are generated at runtime (UUIDs required by profiles table)
 * Idempotency is achieved by checking email before creating
 */
export const PREDEFINED_OWNERS: Array<{
  persona: OwnerPersona
  name: string
  email: string
}> = [
  { persona: 'vip', name: 'Carlos Benítez', email: 'carlos.benitez.demo@terrapet.com' },
  { persona: 'budget', name: 'María López', email: 'maria.lopez.demo@terrapet.com' },
  { persona: 'new', name: 'Ana Fernández', email: 'ana.fernandez.demo@terrapet.com' },
  { persona: 'frequent', name: 'Pedro Sánchez', email: 'pedro.sanchez.demo@terrapet.com' },
  { persona: 'breeder', name: 'Roberto Acosta', email: 'roberto.acosta.demo@terrapet.com' },
  { persona: 'senior', name: 'Rosa Villalba', email: 'rosa.villalba.demo@terrapet.com' },
  { persona: 'emergency', name: 'Diego Ramírez', email: 'diego.ramirez.demo@terrapet.com' },
  { persona: 'loyal', name: 'Lucía Giménez', email: 'lucia.gimenez.demo@terrapet.com' },
  { persona: 'inactive', name: 'José Torres', email: 'jose.torres.demo@terrapet.com' },
  { persona: 'standard', name: 'Sofía Romero', email: 'sofia.romero.demo@terrapet.com' },
]

/**
 * Create all predefined owners (idempotent)
 * Checks by email to avoid duplicates
 */
export async function createPredefinedOwners(tenantId: string = 'terrapet'): Promise<OwnerData[]> {
  const owners: OwnerData[] = []

  for (const preset of PREDEFINED_OWNERS) {
    // Check if owner already exists by email
    const { data: existing } = await apiClient.dbSelect<OwnerData>('profiles', {
      select: 'id, tenant_id, email, full_name, phone, role, avatar_url',
      eq: { email: preset.email, tenant_id: tenantId },
      limit: 1,
    })

    if (existing && existing.length > 0) {
      owners.push(existing[0])
      continue
    }

    // Create new owner with generated UUID
    const owner = await OwnerFactory.create()
      .forTenant(tenantId)
      .withPersona(preset.persona)
      .withName(preset.name)
      .withEmail(preset.email)
      .withAddress()
      .build()

    owners.push(owner)
  }

  return owners
}
