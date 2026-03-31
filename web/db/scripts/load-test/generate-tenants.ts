/**
 * Generate Test Tenants
 *
 * Creates test data for load testing:
 * - 10,000 tenants (clinics)
 * - 100,000 users (10 per clinic)
 * - 1,000,000 pets (100 per clinic)
 * - Associated medical records, appointments, invoices
 *
 * Usage:
 *   npx tsx db/scripts/load-test/generate-tenants.ts
 *   npm run db:load-test:generate
 */

import { createClient } from '@supabase/supabase-js'
import { config } from './config'
import * as fs from 'fs'
import * as path from 'path'

// Supabase client for direct database access
const supabase = createClient(config.supabaseUrl, config.supabaseKey, {
  auth: { persistSession: false },
})

// UUID generator
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Random selection from array with weights
function weightedRandom<T>(items: T[], weights: number[]): T {
  const totalWeight = weights.reduce((a, b) => a + b, 0)
  let random = Math.random() * totalWeight
  for (let i = 0; i < items.length; i++) {
    random -= weights[i]
    if (random <= 0) return items[i]
  }
  return items[items.length - 1]
}

// Random date within range
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

// Generate tenant data
interface Tenant {
  id: string
  name: string
  slug: string
  email: string
  phone: string
  address: string
}

function generateTenant(index: number): Tenant {
  const slug = `${config.tenants.prefix}-${index.toString().padStart(5, '0')}`
  return {
    id: slug,
    name: `Test Clinic ${index}`,
    slug,
    email: `clinic${index}@loadtest.local`,
    phone: `+595 21 ${index.toString().padStart(7, '0')}`,
    address: `Test Address ${index}, Asunción, Paraguay`,
  }
}

// Generate user data
interface User {
  id: string
  tenant_id: string
  email: string
  full_name: string
  role: 'owner' | 'vet' | 'admin'
  phone: string
}

function generateUsers(tenant: Tenant): User[] {
  const users: User[] = []
  const { distribution } = config.users

  // Generate owners
  for (let i = 0; i < distribution.owner; i++) {
    users.push({
      id: generateUUID(),
      tenant_id: tenant.id,
      email: `owner${i + 1}@${tenant.slug}.loadtest.local`,
      full_name: `Owner ${i + 1} - ${tenant.name}`,
      role: 'owner',
      phone: `+595 9${Math.floor(Math.random() * 100000000)
        .toString()
        .padStart(8, '0')}`,
    })
  }

  // Generate vets
  for (let i = 0; i < distribution.vet; i++) {
    users.push({
      id: generateUUID(),
      tenant_id: tenant.id,
      email: `vet${i + 1}@${tenant.slug}.loadtest.local`,
      full_name: `Dr. Vet ${i + 1} - ${tenant.name}`,
      role: 'vet',
      phone: `+595 9${Math.floor(Math.random() * 100000000)
        .toString()
        .padStart(8, '0')}`,
    })
  }

  // Generate admins
  for (let i = 0; i < distribution.admin; i++) {
    users.push({
      id: generateUUID(),
      tenant_id: tenant.id,
      email: `admin${i + 1}@${tenant.slug}.loadtest.local`,
      full_name: `Admin ${i + 1} - ${tenant.name}`,
      role: 'admin',
      phone: `+595 9${Math.floor(Math.random() * 100000000)
        .toString()
        .padStart(8, '0')}`,
    })
  }

  return users
}

// Generate pet data
interface Pet {
  id: string
  tenant_id: string
  owner_id: string
  name: string
  species: string
  breed: string
  birth_date: string
  weight_kg: number
}

const petNames = [
  'Luna',
  'Max',
  'Bella',
  'Rocky',
  'Mia',
  'Charlie',
  'Lucy',
  'Cooper',
  'Daisy',
  'Buddy',
  'Molly',
  'Jack',
  'Sadie',
  'Duke',
  'Bailey',
  'Maggie',
  'Bear',
  'Sophie',
  'Tucker',
  'Chloe',
]

const dogBreeds = ['Labrador', 'German Shepherd', 'Golden Retriever', 'Bulldog', 'Beagle', 'Poodle', 'Mixed']
const catBreeds = ['Persian', 'Siamese', 'Maine Coon', 'British Shorthair', 'Mixed', 'Domestic Shorthair']

function generatePets(tenant: Tenant, owners: User[]): Pet[] {
  const pets: Pet[] = []
  const petsPerOwner = Math.ceil(config.pets.perTenant / owners.length)

  for (const owner of owners) {
    for (let i = 0; i < petsPerOwner && pets.length < config.pets.perTenant; i++) {
      const species = weightedRandom(config.pets.species, config.pets.speciesDistribution)
      const breeds = species === 'dog' ? dogBreeds : species === 'cat' ? catBreeds : ['Standard']

      pets.push({
        id: generateUUID(),
        tenant_id: tenant.id,
        owner_id: owner.id,
        name: petNames[Math.floor(Math.random() * petNames.length)],
        species,
        breed: breeds[Math.floor(Math.random() * breeds.length)],
        birth_date: randomDate(new Date('2015-01-01'), new Date()).toISOString().split('T')[0],
        weight_kg: Math.round((Math.random() * 30 + 2) * 10) / 10,
      })
    }
  }

  return pets
}

// Generate appointments
interface Appointment {
  id: string
  tenant_id: string
  pet_id: string
  vet_id: string
  service_name: string
  start_time: string
  end_time: string
  status: string
}

const services = ['Consulta General', 'Vacunación', 'Desparasitación', 'Cirugía', 'Emergencia', 'Control']

function generateAppointments(tenant: Tenant, pets: Pet[], vets: User[]): Appointment[] {
  const appointments: Appointment[] = []
  const statuses = Object.entries(config.appointments.statusDistribution)

  for (let i = 0; i < config.appointments.perTenant; i++) {
    const pet = pets[Math.floor(Math.random() * pets.length)]
    const vet = vets[Math.floor(Math.random() * vets.length)]
    const startTime = randomDate(new Date('2024-01-01'), new Date('2026-12-31'))
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000) // 30 minutes later

    appointments.push({
      id: generateUUID(),
      tenant_id: tenant.id,
      pet_id: pet.id,
      vet_id: vet.id,
      service_name: services[Math.floor(Math.random() * services.length)],
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      status: weightedRandom(
        statuses.map(([k]) => k),
        statuses.map(([, v]) => v)
      ),
    })
  }

  return appointments
}

// Main generation function
async function generateTestData() {
  console.log('🚀 Starting test data generation...')
  console.log(`   Tenants: ${config.tenants.count}`)
  console.log(`   Users per tenant: ${config.users.perTenant}`)
  console.log(`   Pets per tenant: ${config.pets.perTenant}`)
  console.log('')

  const outputDir = path.join(__dirname, 'generated-data')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const allTenants: Tenant[] = []
  const allUsers: User[] = []
  const allPets: Pet[] = []
  const allAppointments: Appointment[] = []

  const batchSize = 100
  const totalBatches = Math.ceil(config.tenants.count / batchSize)

  for (let batch = 0; batch < totalBatches; batch++) {
    const start = batch * batchSize
    const end = Math.min(start + batchSize, config.tenants.count)

    console.log(`📦 Generating batch ${batch + 1}/${totalBatches} (tenants ${start + 1}-${end})...`)

    for (let i = start; i < end; i++) {
      const tenant = generateTenant(i + 1)
      const users = generateUsers(tenant)
      const owners = users.filter((u) => u.role === 'owner')
      const vets = users.filter((u) => u.role === 'vet' || u.role === 'admin')
      const pets = generatePets(tenant, owners)
      const appointments = generateAppointments(tenant, pets, vets)

      allTenants.push(tenant)
      allUsers.push(...users)
      allPets.push(...pets)
      allAppointments.push(...appointments)
    }
  }

  console.log('')
  console.log('📝 Writing data files...')

  // Write to JSON files (in batches for large datasets)
  const chunkSize = 10000
  const writeChunked = (data: unknown[], basename: string) => {
    const chunks = Math.ceil(data.length / chunkSize)
    for (let i = 0; i < chunks; i++) {
      const chunk = data.slice(i * chunkSize, (i + 1) * chunkSize)
      const filename = chunks === 1 ? `${basename}.json` : `${basename}_${i + 1}.json`
      fs.writeFileSync(path.join(outputDir, filename), JSON.stringify(chunk, null, 2))
    }
  }

  writeChunked(allTenants, 'tenants')
  writeChunked(allUsers, 'users')
  writeChunked(allPets, 'pets')
  writeChunked(allAppointments, 'appointments')

  console.log('')
  console.log('✅ Generation complete!')
  console.log(`   Tenants: ${allTenants.length}`)
  console.log(`   Users: ${allUsers.length}`)
  console.log(`   Pets: ${allPets.length}`)
  console.log(`   Appointments: ${allAppointments.length}`)
  console.log('')
  console.log(`📁 Files written to: ${outputDir}`)
  console.log('')
  console.log('Next steps:')
  console.log('  1. Run: npm run db:load-test:seed')
  console.log('  2. Run: npm run db:load-test:run')
}

// Execute
generateTestData().catch(console.error)
