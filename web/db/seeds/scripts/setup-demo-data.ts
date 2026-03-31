/**
 * Setup Complete Demo Data
 *
 * This script ensures demo accounts have:
 * - Proper profile with tenant_id and role
 * - Pets with complete data
 * - Vaccines and medical records
 *
 * Usage:
 *   npx tsx db/seeds/scripts/setup-demo-data.ts
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'
import { TENANT_IDS } from '@/lib/constants/tenants';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

interface DemoUser {
  email: string
  tenant_id: string
  role: 'owner' | 'vet' | 'admin'
  full_name: string
}

const DEMO_USERS: DemoUser[] = [
  {
    email: 'admin@terrapet.demo',
    tenant_id: TENANT_IDS.ADRIS,
    role: 'admin',
    full_name: 'Maria Garcia (Admin)',
  },
  { email: 'vet@terrapet.demo', tenant_id: TENANT_IDS.ADRIS, role: 'vet', full_name: 'Dr. Carlos Rodriguez' },
  {
    email: 'owner@terrapet.demo',
    tenant_id: TENANT_IDS.ADRIS,
    role: 'owner',
    full_name: 'Juan Perez (Cliente)',
  },
  {
    email: 'admin@petlife.demo',
    tenant_id: TENANT_IDS.PETLIFE,
    role: 'admin',
    full_name: 'Ana Martinez (Admin)',
  },
  {
    email: 'vet@petlife.demo',
    tenant_id: TENANT_IDS.PETLIFE,
    role: 'vet',
    full_name: 'Dra. Laura Gonzalez',
  },
  {
    email: 'owner@petlife.demo',
    tenant_id: TENANT_IDS.PETLIFE,
    role: 'owner',
    full_name: 'Sofia Benitez (Cliente)',
  },
]

// Vaccination status types for demo variety
type VaccineStatus =
  | 'fully_vaccinated'
  | 'needs_boosters'
  | 'freshly_adopted'
  | 'upcoming_due'
  | 'mixed'

// Demo pets data with vaccination scenarios
const DEMO_PETS = [
  {
    ownerEmail: 'owner@terrapet.demo',
    pets: [
      {
        name: 'Luna',
        species: 'dog',
        breed: 'Labrador Retriever',
        color: 'Dorado',
        sex: 'female',
        birth_date: '2021-03-15',
        is_neutered: true,
        weight_kg: 28.5,
        microchip_number: 'DEMO-PY-001',
        vaccineStatus: 'fully_vaccinated' as VaccineStatus, // All vaccines up to date
      },
      {
        name: 'Max',
        species: 'dog',
        breed: 'Golden Retriever',
        color: 'Dorado claro',
        sex: 'male',
        birth_date: '2020-08-22',
        is_neutered: true,
        weight_kg: 32.0,
        microchip_number: 'DEMO-PY-002',
        vaccineStatus: 'needs_boosters' as VaccineStatus, // Some vaccines overdue
      },
      {
        name: 'Michi',
        species: 'cat',
        breed: 'Siamés',
        color: 'Crema con puntas oscuras',
        sex: 'female',
        birth_date: '2022-01-10',
        is_neutered: true,
        weight_kg: 4.2,
        microchip_number: 'DEMO-PY-003',
        vaccineStatus: 'freshly_adopted' as VaccineStatus, // No vaccines, needs full schedule
      },
      {
        name: 'Firulais',
        species: 'dog',
        breed: 'Mestizo',
        color: 'Marrón',
        sex: 'male',
        birth_date: '2023-06-01',
        is_neutered: false,
        weight_kg: 8.5,
        microchip_number: 'DEMO-PY-006',
        vaccineStatus: 'freshly_adopted' as VaccineStatus, // Puppy, needs initial vaccines
      },
    ],
  },
  {
    ownerEmail: 'owner@petlife.demo',
    pets: [
      {
        name: 'Rocky',
        species: 'dog',
        breed: 'Bulldog Francés',
        color: 'Atigrado',
        sex: 'male',
        birth_date: '2019-06-30',
        is_neutered: true,
        weight_kg: 12.5,
        microchip_number: 'DEMO-PY-004',
        vaccineStatus: 'upcoming_due' as VaccineStatus, // Vaccines due in next few days
      },
      {
        name: 'Cleo',
        species: 'cat',
        breed: 'Persa',
        color: 'Blanco',
        sex: 'female',
        birth_date: '2021-11-08',
        is_neutered: true,
        weight_kg: 5.5,
        microchip_number: 'DEMO-PY-005',
        vaccineStatus: 'mixed' as VaccineStatus, // Some complete, some scheduled
      },
    ],
  },
]

// Mandatory vaccines by species
const MANDATORY_DOG_VACCINES = [
  { name: 'Antirrábica', manufacturer: 'Nobivac', lot_number: 'RAB-2024-001', required: true },
  {
    name: 'Polivalente (DHPP)',
    manufacturer: 'Vanguard',
    lot_number: 'DHPP-2024-001',
    required: true,
  },
  { name: 'Leptospirosis', manufacturer: 'Nobivac', lot_number: 'LEP-2024-001', required: true },
  {
    name: 'Bordetella (Tos de las perreras)',
    manufacturer: 'Bronchi-Shield',
    lot_number: 'BOR-2024-001',
    required: false,
  },
  {
    name: 'Parvovirus (refuerzo)',
    manufacturer: 'Vanguard',
    lot_number: 'PARVO-2024-001',
    required: false,
  },
]

const MANDATORY_CAT_VACCINES = [
  { name: 'Antirrábica', manufacturer: 'Nobivac', lot_number: 'RAB-2024-002', required: true },
  {
    name: 'Triple Felina (FVRCP)',
    manufacturer: 'Felocell',
    lot_number: 'FEL-2024-001',
    required: true,
  },
  {
    name: 'Leucemia Felina (FeLV)',
    manufacturer: 'Purevax',
    lot_number: 'FELV-2024-001',
    required: true,
  },
]

async function setupDemoData(): Promise<void> {
  console.log('🚀 Setting up complete demo data...\n')

  // Get auth users
  const { data: authUsers } = await supabase.auth.admin.listUsers()
  if (!authUsers?.users) {
    console.error('❌ Could not fetch auth users')
    return
  }

  // Process each demo user
  for (const demoUser of DEMO_USERS) {
    console.log(`\n📧 Processing ${demoUser.email}...`)

    // Find auth user
    const authUser = authUsers.users.find((u) => u.email === demoUser.email)
    if (!authUser) {
      console.log(`  ⚠️ Auth user not found - run seed-demo-users.ts first`)
      continue
    }

    const userId = authUser.id
    console.log(`  ✓ Auth user ID: ${userId}`)

    // Check/create profile
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, tenant_id, role')
      .eq('id', userId)
      .single()

    if (existingProfile) {
      console.log(
        `  ✓ Profile exists (tenant: ${existingProfile.tenant_id}, role: ${existingProfile.role})`
      )

      // Update if needed
      if (
        existingProfile.tenant_id !== demoUser.tenant_id ||
        existingProfile.role !== demoUser.role
      ) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            tenant_id: demoUser.tenant_id,
            role: demoUser.role,
            full_name: demoUser.full_name,
          })
          .eq('id', userId)

        if (updateError) {
          console.log(`  ❌ Error updating profile: ${updateError.message}`)
        } else {
          console.log(`  ✓ Profile updated (tenant: ${demoUser.tenant_id}, role: ${demoUser.role})`)
        }
      }
    } else {
      // Create profile
      const { error: insertError } = await supabase.from('profiles').insert({
        id: userId,
        email: demoUser.email,
        full_name: demoUser.full_name,
        tenant_id: demoUser.tenant_id,
        role: demoUser.role,
        phone: '+595 981 000 000',
        address: 'Demo Address, Asunción',
        city: 'Asunción',
      })

      if (insertError) {
        console.log(`  ❌ Error creating profile: ${insertError.message}`)
      } else {
        console.log(`  ✓ Profile created`)
      }
    }

    // Create pets for owners
    if (demoUser.role === 'owner') {
      const demoPetData = DEMO_PETS.find((p) => p.ownerEmail === demoUser.email)
      if (demoPetData) {
        await createPetsForOwner(userId, demoUser.tenant_id, demoPetData.pets)
      }
    }

    // Create staff profile for vets
    if (demoUser.role === 'vet') {
      await createStaffProfile(userId, demoUser.tenant_id, demoUser.full_name)
    }
  }

  console.log('\n✅ Demo data setup complete!')
  console.log('\nYou can now log in:')
  console.log('  Owner: owner@terrapet.demo / demo123')
  console.log('  Vet: vet@terrapet.demo / demo123')
  console.log('  Admin: admin@terrapet.demo / demo123')
}

async function createPetsForOwner(
  ownerId: string,
  tenantId: string,
  pets: (typeof DEMO_PETS)[0]['pets']
): Promise<void> {
  for (const petData of pets) {
    // Check if pet already exists
    const { data: existingPet } = await supabase
      .from('pets')
      .select('id, name, tenant_id')
      .eq('owner_id', ownerId)
      .eq('name', petData.name)
      .single()

    let petId: string

    if (existingPet) {
      console.log(`    ✓ Pet "${petData.name}" already exists`)
      petId = existingPet.id

      // IMPORTANT: Fix pets that don't have tenant_id set
      if (!existingPet.tenant_id) {
        const { error: updateError } = await supabase
          .from('pets')
          .update({ tenant_id: tenantId })
          .eq('id', petId)

        if (updateError) {
          console.log(`      ❌ Error updating pet tenant_id: ${updateError.message}`)
        } else {
          console.log(`      ✓ Pet tenant_id set to "${tenantId}"`)
        }
      }
    } else {
      // Create pet WITH tenant_id
      const { data: newPet, error: petError } = await supabase
        .from('pets')
        .insert({
          owner_id: ownerId,
          tenant_id: tenantId, // CRITICAL: Include tenant_id for RLS policies
          name: petData.name,
          species: petData.species,
          breed: petData.breed,
          color: petData.color,
          sex: petData.sex,
          birth_date: petData.birth_date,
          is_neutered: petData.is_neutered,
          weight_kg: petData.weight_kg,
          microchip_number: petData.microchip_number,
          microchip_date: petData.birth_date,
        })
        .select('id')
        .single()

      if (petError) {
        console.log(`    ❌ Error creating pet "${petData.name}": ${petError.message}`)
        continue
      }

      petId = newPet.id
      console.log(`    ✓ Pet "${petData.name}" created (ID: ${petId})`)
    }

    // Create vaccines for the pet based on their vaccination status
    await createVaccinesForPet(petId, ownerId, tenantId, petData.species, petData.vaccineStatus)
  }
}

async function createVaccinesForPet(
  petId: string,
  ownerId: string,
  tenantId: string,
  species: string,
  vaccineStatus: VaccineStatus
): Promise<void> {
  // Delete existing vaccines for this pet to recreate with correct status
  await supabase.from('vaccines').delete().eq('pet_id', petId)

  // Get a vet ID for administering vaccines
  const { data: vetProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('role', 'vet')
    .limit(1)
    .single()

  const vetId = vetProfile?.id || ownerId

  // Get vaccines for species
  const vaccines = species === 'dog' ? MANDATORY_DOG_VACCINES : MANDATORY_CAT_VACCINES
  const today = new Date()

  let completedCount = 0
  let scheduledCount = 0

  for (let i = 0; i < vaccines.length; i++) {
    const vaccine = vaccines[i]

    // Determine vaccine status based on pet's vaccination scenario
    let status: 'completed' | 'scheduled' | 'missed'
    let administeredDate: Date | null = null
    let nextDueDate: Date

    switch (vaccineStatus) {
      case 'fully_vaccinated':
        // All vaccines completed, next due in 6-12 months
        status = 'completed'
        administeredDate = new Date(today.getFullYear(), today.getMonth() - 6 - i, today.getDate())
        nextDueDate = new Date(
          administeredDate.getFullYear() + 1,
          administeredDate.getMonth(),
          administeredDate.getDate()
        )
        break

      case 'needs_boosters':
        // Required vaccines are overdue, optional are completed
        if (vaccine.required) {
          status = 'completed'
          administeredDate = new Date(today.getFullYear() - 2, today.getMonth(), today.getDate()) // 2 years ago
          nextDueDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()) // Due 1 year ago (OVERDUE!)
        } else {
          status = 'completed'
          administeredDate = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate())
          nextDueDate = new Date(today.getFullYear() + 1, today.getMonth() - 3, today.getDate())
        }
        break

      case 'freshly_adopted':
        // No completed vaccines, all scheduled for upcoming dates
        // administered_date = scheduled date, next_due_date = 1 year after first dose
        status = 'scheduled'
        const scheduledDate = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() + 3 + i * 7
        )
        administeredDate = scheduledDate // When it's scheduled to be given
        nextDueDate = new Date(
          scheduledDate.getFullYear() + 1,
          scheduledDate.getMonth(),
          scheduledDate.getDate()
        )
        break

      case 'upcoming_due':
        // Vaccines completed but due in next 3-7 days
        status = 'completed'
        administeredDate = new Date(
          today.getFullYear() - 1,
          today.getMonth(),
          today.getDate() - 5 + i
        )
        nextDueDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1 + i) // Due in 1-5 days
        break

      case 'mixed':
        // First half completed, second half scheduled
        if (i < vaccines.length / 2) {
          status = 'completed'
          administeredDate = new Date(today.getFullYear(), today.getMonth() - 4, today.getDate())
          nextDueDate = new Date(today.getFullYear() + 1, today.getMonth() - 4, today.getDate())
        } else {
          status = 'scheduled'
          const mixedScheduledDate = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate() + 7 + i * 3
          )
          administeredDate = mixedScheduledDate
          nextDueDate = new Date(
            mixedScheduledDate.getFullYear() + 1,
            mixedScheduledDate.getMonth(),
            mixedScheduledDate.getDate()
          )
        }
        break

      default:
        status = 'scheduled'
        const defaultScheduledDate = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() + 14
        )
        administeredDate = defaultScheduledDate
        nextDueDate = new Date(
          defaultScheduledDate.getFullYear() + 1,
          defaultScheduledDate.getMonth(),
          defaultScheduledDate.getDate()
        )
    }

    const vaccineData: Record<string, unknown> = {
      pet_id: petId,
      administered_by_clinic: tenantId,
      name: vaccine.name,
      manufacturer: vaccine.manufacturer,
      batch_number: vaccine.lot_number,
      administered_date: administeredDate!.toISOString().split('T')[0], // Always required
      next_due_date: nextDueDate.toISOString().split('T')[0],
      status,
      route: 'SC',
    }

    // Add administered_by for completed vaccines
    if (status === 'completed') {
      vaccineData.administered_by = vetId
    }

    const { error } = await supabase.from('vaccines').insert(vaccineData)

    if (error) {
      console.log(`      ❌ Error creating vaccine "${vaccine.name}": ${error.message}`)
    } else {
      if (status === 'completed') completedCount++
      else scheduledCount++
    }
  }

  const statusLabel = {
    fully_vaccinated: '✅ fully vaccinated',
    needs_boosters: '⚠️ needs boosters (overdue)',
    freshly_adopted: '📋 freshly adopted (all scheduled)',
    upcoming_due: '📅 upcoming due (1-5 days)',
    mixed: '🔄 mixed (some complete, some scheduled)',
  }[vaccineStatus]

  console.log(`      ✓ ${statusLabel}: ${completedCount} completed, ${scheduledCount} scheduled`)
}

async function createStaffProfile(
  userId: string,
  tenantId: string,
  fullName: string
): Promise<void> {
  // Check if staff profile exists
  const { data: existingStaff } = await supabase
    .from('staff_profiles')
    .select('id')
    .eq('profile_id', userId)
    .single()

  if (existingStaff) {
    console.log(`  ✓ Staff profile already exists`)
    return
  }

  const { error } = await supabase.from('staff_profiles').insert({
    profile_id: userId,
    tenant_id: tenantId,
    license_number: `VET-${Date.now()}`,
    specializations: ['Medicina General', 'Cirugía'],
    bio: `${fullName} es un veterinario experimentado con años de experiencia en medicina de pequeños animales.`,
    is_active: true,
  })

  if (error) {
    console.log(`  ❌ Error creating staff profile: ${error.message}`)
  } else {
    console.log(`  ✓ Staff profile created`)
  }
}

setupDemoData().catch(console.error)
