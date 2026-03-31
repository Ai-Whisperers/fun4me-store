/**
 * Seed Test Database
 *
 * Seeds the test database with fixture data for testing.
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Test data from fixtures
const TEST_USERS = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    tenant_id: 'adris',
    full_name: 'Juan Propietario',
    email: 'owner1@test.local',
    phone: '+595981123456',
    role: 'owner',
    client_code: 'ADR-001',
  },
  {
    id: '00000000-0000-0000-0000-000000000010',
    tenant_id: 'adris',
    full_name: 'Dr. Roberto Veterinario',
    email: 'vet1@test.local',
    phone: '+595981456789',
    role: 'vet',
  },
  {
    id: '00000000-0000-0000-0000-000000000020',
    tenant_id: 'adris',
    full_name: 'Admin Principal',
    email: 'admin@test.local',
    phone: '+595981678901',
    role: 'admin',
  },
]

const TEST_PETS = [
  {
    id: '00000000-0000-0000-0001-000000000001',
    owner_id: '00000000-0000-0000-0000-000000000001',
    tenant_id: 'adris',
    name: 'Max',
    species: 'dog',
    breed: 'Golden Retriever',
    birth_date: '2020-03-15',
    weight_kg: 32.5,
    sex: 'male',
    is_neutered: true,
    color: 'Dorado',
    temperament: 'friendly',
  },
  {
    id: '00000000-0000-0000-0001-000000000002',
    owner_id: '00000000-0000-0000-0000-000000000001',
    tenant_id: 'adris',
    name: 'Luna',
    species: 'dog',
    breed: 'Labrador',
    birth_date: '2021-06-20',
    weight_kg: 28.0,
    sex: 'female',
    is_neutered: false,
    color: 'Negro',
    temperament: 'friendly',
  },
]

const TEST_VACCINES = [
  {
    id: '00000000-0000-0000-0002-000000000001',
    pet_id: '00000000-0000-0000-0001-000000000001',
    name: 'Rabia',
    administered_date: '2024-01-15',
    next_due_date: '2025-01-15',
    batch_number: 'RAB-2024-001',
    status: 'verified',
    administered_by: '00000000-0000-0000-0000-000000000010',
  },
  {
    id: '00000000-0000-0000-0002-000000000002',
    pet_id: '00000000-0000-0000-0001-000000000001',
    name: 'Sextuple',
    administered_date: '2024-02-20',
    next_due_date: '2025-02-20',
    batch_number: 'SEX-2024-042',
    status: 'verified',
    administered_by: '00000000-0000-0000-0000-000000000010',
  },
]

async function seedDatabase() {
  console.log('🌱 Seeding test database...')

  try {
    // Ensure tenants exist
    console.log('  Checking tenants...')
    const { data: tenants } = await supabase.from('tenants').select('id')
    if (!tenants || tenants.length === 0) {
      console.log('  Creating default tenants...')
      await supabase.from('tenants').insert([
        { id: 'adris', name: 'Veterinaria Adris' },
        { id: 'petlife', name: 'PetLife Center' },
      ])
    }

    // Seed profiles
    console.log('  Seeding profiles...')
    for (const user of TEST_USERS) {
      const { error } = await supabase.from('profiles').upsert(user, {
        onConflict: 'id',
      })
      if (error) console.warn(`  Warning: ${user.email} - ${error.message}`)
    }

    // Seed pets
    console.log('  Seeding pets...')
    for (const pet of TEST_PETS) {
      const { error } = await supabase.from('pets').upsert(pet, {
        onConflict: 'id',
      })
      if (error) console.warn(`  Warning: ${pet.name} - ${error.message}`)
    }

    // Seed vaccines
    console.log('  Seeding vaccines...')
    for (const vaccine of TEST_VACCINES) {
      const { error } = await supabase.from('vaccines').upsert(vaccine, {
        onConflict: 'id',
      })
      if (error) console.warn(`  Warning: ${vaccine.name} - ${error.message}`)
    }

    console.log('✅ Database seeding complete')
  } catch (error) {
    console.error('❌ Database seeding failed:', error)
    process.exit(1)
  }
}

seedDatabase()
