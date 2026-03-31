/**
 * Profile Seeder
 *
 * Creates demo user profiles (owners, vets, admins) for testing.
 * Idempotent: skips existing profiles.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { SeederOptions } from './base-seeder'
import { SeederResult, createSeederResult } from '../utils/reporting'

interface DemoProfile {
  full_name: string
  email: string
  phone: string
  role: 'owner' | 'vet' | 'admin'
  is_staff?: boolean
}

const DEMO_PROFILES: Record<string, DemoProfile[]> = {
  terrapet: [
    // Staff
    {
      full_name: 'Dra. Silvia Carolina Sánchez',
      email: 'silvia@terrapet.vet',
      phone: '+595981123456',
      role: 'vet',
      is_staff: true,
    },
    {
      full_name: 'Dr. Roberto Javier Díaz',
      email: 'roberto@terrapet.vet',
      phone: '+595981234567',
      role: 'vet',
      is_staff: true,
    },
    {
      full_name: 'Admin Adris',
      email: 'admin@terrapet.vet',
      phone: '+595981345678',
      role: 'admin',
      is_staff: true,
    },
    // Demo accounts (with standard passwords for testing)
    {
      full_name: 'Dr. Test Veterinario',
      email: 'vet@terrapet.demo',
      phone: '+595981111111',
      role: 'vet',
      is_staff: true,
    },
    {
      full_name: 'Admin Test',
      email: 'admin@terrapet.demo',
      phone: '+595981222222',
      role: 'admin',
      is_staff: true,
    },
    {
      full_name: 'Cliente Test (Adris)',
      email: 'cliente@terrapet.demo',
      phone: '+595981333333',
      role: 'owner',
    },
    // Owners
    {
      full_name: 'María González (Cliente)',
      email: 'maria.gonzalez@email.com',
      phone: '+595982100001',
      role: 'owner',
    },
    {
      full_name: 'Carlos Benítez',
      email: 'carlos.benitez@email.com',
      phone: '+595982100002',
      role: 'owner',
    },
    {
      full_name: 'Ana Fernández',
      email: 'ana.fernandez@email.com',
      phone: '+595982100003',
      role: 'owner',
    },
    {
      full_name: 'Pedro Sánchez',
      email: 'pedro.sanchez@email.com',
      phone: '+595982100004',
      role: 'owner',
    },
    {
      full_name: 'Lucía Giménez',
      email: 'lucia.gimenez@email.com',
      phone: '+595982100005',
      role: 'owner',
    },
    {
      full_name: 'Diego Ramírez',
      email: 'diego.ramirez@email.com',
      phone: '+595982100006',
      role: 'owner',
    },
    {
      full_name: 'María López',
      email: 'maria.lopez@email.com',
      phone: '+595982100007',
      role: 'owner',
    },
    {
      full_name: 'José Torres',
      email: 'jose.torres@email.com',
      phone: '+595982100008',
      role: 'owner',
    },
    {
      full_name: 'Rosa Villalba',
      email: 'rosa.villalba@email.com',
      phone: '+595982100009',
      role: 'owner',
    },
    {
      full_name: 'Roberto Acosta',
      email: 'roberto.acosta@email.com',
      phone: '+595982100010',
      role: 'owner',
    },
    {
      full_name: 'Sofía Romero',
      email: 'sofia.romero@email.com',
      phone: '+595982100011',
      role: 'owner',
    },
  ],
  petlife: [
    // Staff
    {
      full_name: 'Dr. Marco Pereira',
      email: 'marco@petlife.vet',
      phone: '+595983100001',
      role: 'vet',
      is_staff: true,
    },
    {
      full_name: 'Dra. Laura Méndez',
      email: 'laura@petlife.vet',
      phone: '+595983100002',
      role: 'vet',
      is_staff: true,
    },
    {
      full_name: 'Admin PetLife',
      email: 'admin@petlife.vet',
      phone: '+595983100003',
      role: 'admin',
      is_staff: true,
    },
    // Demo accounts
    {
      full_name: 'Dr. Test PetLife',
      email: 'vet@petlife.demo',
      phone: '+595983200001',
      role: 'vet',
      is_staff: true,
    },
    {
      full_name: 'Admin Test PetLife',
      email: 'admin@petlife.demo',
      phone: '+595983200002',
      role: 'admin',
      is_staff: true,
    },
    {
      full_name: 'Cliente Test (PetLife)',
      email: 'cliente@petlife.demo',
      phone: '+595983200003',
      role: 'owner',
    },
    // Owners
    {
      full_name: 'Fernando García',
      email: 'fernando.garcia@email.com',
      phone: '+595984100001',
      role: 'owner',
    },
    {
      full_name: 'Patricia Núñez',
      email: 'patricia.nunez@email.com',
      phone: '+595984100002',
      role: 'owner',
    },
    {
      full_name: 'Ricardo Ortiz',
      email: 'ricardo.ortiz@email.com',
      phone: '+595984100003',
      role: 'owner',
    },
    {
      full_name: 'Carmen Rojas',
      email: 'carmen.rojas@email.com',
      phone: '+595984100004',
      role: 'owner',
    },
    {
      full_name: 'Miguel Ángel Duarte',
      email: 'miguel.duarte@email.com',
      phone: '+595984100005',
      role: 'owner',
    },
  ],
}

export class ProfileSeeder {
  protected client: SupabaseClient
  protected options: SeederOptions

  constructor(client: SupabaseClient, options: SeederOptions) {
    this.client = client
    this.options = options
  }

  getTableName(): string {
    return 'profiles'
  }

  async loadData(): Promise<DemoProfile[]> {
    const tenantId = this.options.tenantId
    if (!tenantId || !DEMO_PROFILES[tenantId]) {
      return []
    }
    return DEMO_PROFILES[tenantId]
  }

  async seed(): Promise<SeederResult> {
    const startTime = new Date()
    const tenantId = this.options.tenantId

    if (!tenantId) {
      return createSeederResult('profiles', 0, 0, [], [], startTime)
    }

    const profiles = await this.loadData()
    if (profiles.length === 0) {
      return createSeederResult('profiles', 0, 0, [], ['No profiles to seed'], startTime)
    }

    // Check existing profiles
    const { data: existing } = await this.client
      .from('profiles')
      .select('email')
      .eq('tenant_id', tenantId)

    const existingEmails = new Set((existing || []).map((p) => p.email))

    let created = 0
    let skipped = 0
    const errors: Array<{ error: Error }> = []

    for (const profile of profiles) {
      if (existingEmails.has(profile.email)) {
        skipped++
        continue
      }

      if (this.options.dryRun) {
        created++
        continue
      }

      // Generate a UUID for the profile
      const profileId = crypto.randomUUID()

      const { error } = await this.client.from('profiles').insert({
        id: profileId,
        tenant_id: tenantId,
        full_name: profile.full_name,
        email: profile.email,
        phone: profile.phone,
        role: profile.role,
        onboarding_completed: true, // Skip onboarding for demo accounts
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (error) {
        errors.push({ error: new Error(`${profile.email}: ${error.message}`) })
      } else {
        created++

        // Create staff_profiles for vets and admins
        if (profile.is_staff && (profile.role === 'vet' || profile.role === 'admin')) {
          await this.client.from('staff_profiles').insert({
            profile_id: profileId,
            tenant_id: tenantId,
            specialization: profile.role === 'vet' ? 'Medicina General' : null,
            license_number:
              profile.role === 'vet' ? `VET-${Date.now().toString().slice(-6)}` : null,
            is_active: true,
          })
        }
      }
    }

    return createSeederResult('profiles', created, skipped, errors, [], startTime)
  }
}
