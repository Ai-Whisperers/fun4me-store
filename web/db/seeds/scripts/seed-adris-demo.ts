/**
 * Seed Adris Demo Data
 *
 * This script creates comprehensive demo data for the Adris clinic using
 * builder-pattern factories. It creates:
 * - 10 owners with distinct personas
 * - 50 pets (5 per owner) with vaccine history
 * - Appointment history (past and future)
 * - Medical records for completed appointments
 * - Invoices and payments
 * - Store orders with various scenarios
 * - Loyalty points based on purchase history
 *
 * Usage:
 *   npx tsx web/db/seeds/scripts/seed-terrapet-demo.ts
 *
 * Modes:
 *   - 'seed': Data persists (default)
 *   - 'test': Data is tracked for cleanup
 */

import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables BEFORE any other imports
// This must happen synchronously before dynamic imports
config({ path: resolve(__dirname, '../../../.env.local') })

// Verify env vars are loaded
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase environment variables')
  console.error('   Make sure web/.env.local exists with:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const TENANT_ID = 'terrapet'

// Dynamic imports to ensure env vars are loaded first
let testContext: any
let setMode: any
let apiClient: any
let createPredefinedOwners: any
let createPetsForOwner: any
let createAppointmentHistory: any
let AppointmentFactory: any
let createInvoiceHistory: any
let createLoyaltyForPersona: any
let createOrderHistory: any
let createAbandonedCarts: any
let PREDEFINED_OWNERS: any

async function loadDependencies() {
  const contextModule = await import('../../../lib/test-utils/context')
  testContext = contextModule.testContext
  setMode = contextModule.setMode

  const apiModule = await import('../../../lib/test-utils/api-client')
  apiClient = apiModule.apiClient

  // Explicitly import from factories/index to get the builder-pattern factories
  const factoriesModule = await import('../../../lib/test-utils/factories/index')
  createPredefinedOwners = factoriesModule.createPredefinedOwners
  createPetsForOwner = factoriesModule.createPetsForOwner
  createAppointmentHistory = factoriesModule.createAppointmentHistory
  AppointmentFactory = factoriesModule.AppointmentFactory
  createInvoiceHistory = factoriesModule.createInvoiceHistory
  createLoyaltyForPersona = factoriesModule.createLoyaltyForPersona
  createOrderHistory = factoriesModule.createOrderHistory
  createAbandonedCarts = factoriesModule.createAbandonedCarts
  PREDEFINED_OWNERS = factoriesModule.PREDEFINED_OWNERS
}

interface SeedStats {
  owners: number
  pets: number
  vaccines: number
  appointments: number
  todayAppointments: number
  medicalRecords: number
  invoices: number
  payments: number
  storeOrders: number
  loyaltyTransactions: number
  carts: number
}

interface SeedResult {
  success: boolean
  stats: SeedStats
  errors: string[]
  duration: number
}

/**
 * Get or create a vet user for the clinic
 */
async function getOrCreateVet(): Promise<string | null> {
  // Try to find an existing vet
  const { data: vets } = await apiClient.dbSelect('profiles', {
    select: 'id',
    eq: { tenant_id: TENANT_ID, role: 'vet' },
    limit: 1,
  })

  if (vets && vets.length > 0) {
    return vets[0].id
  }

  // No vet found - create one
  console.log('  Creating demo vet...')
  const vetId = 'vet-terrapet-demo-001'

  const { error } = await apiClient.dbUpsert(
    'profiles',
    {
      id: vetId,
      tenant_id: TENANT_ID,
      email: 'vet.demo@terrapet.com',
      full_name: 'Dr. María González',
      phone: '+595981555001',
      role: 'vet',
      avatar_url: null,
    },
    'id'
  )

  if (error) {
    console.warn(`  Failed to create vet: ${error}`)
    return null
  }

  testContext.track('profiles', vetId, TENANT_ID)
  return vetId
}

/**
 * Seed all demo data for Adris clinic
 */
async function seedAdrisDemo(): Promise<SeedResult> {
  const startTime = Date.now()
  const errors: string[] = []
  const stats: SeedStats = {
    owners: 0,
    pets: 0,
    vaccines: 0,
    appointments: 0,
    todayAppointments: 0,
    medicalRecords: 0,
    invoices: 0,
    payments: 0,
    storeOrders: 0,
    loyaltyTransactions: 0,
    carts: 0,
  }

  console.log('🌱 Starting Adris Demo Seed...\n')

  try {
    // 1. Get or create vet
    console.log('1️⃣ Setting up staff...')
    const vetId = await getOrCreateVet()
    console.log(`  ✓ Vet ID: ${vetId || 'None'}\n`)

    // 2. Create owners with distinct personas
    console.log('2️⃣ Creating owners with distinct personas...')
    const owners = await createPredefinedOwners(TENANT_ID)
    stats.owners = owners.length
    console.log(`  ✓ Created ${owners.length} owners\n`)

    // 3. Create pets for each owner
    console.log('3️⃣ Creating pets with vaccine history...')
    const allPets: Array<{ ownerId: string; pets: Array<{ pet: any; vaccines: any[] }> }> = []

    for (const owner of owners) {
      try {
        const ownerPets = await createPetsForOwner(owner.id, 5, TENANT_ID)
        allPets.push({ ownerId: owner.id, pets: ownerPets })

        stats.pets += ownerPets.length
        for (const { vaccines } of ownerPets) {
          stats.vaccines += vaccines.length
        }

        console.log(
          `  ✓ ${owner.full_name}: ${ownerPets.length} pets, ${ownerPets.reduce((sum: number, p: any) => sum + p.vaccines.length, 0)} vaccines`
        )
      } catch (err) {
        const msg = `Failed to create pets for ${owner.full_name}: ${err}`
        console.error(`  ✗ ${msg}`)
        errors.push(msg)
      }
    }
    console.log(`  Total: ${stats.pets} pets, ${stats.vaccines} vaccines\n`)

    // 4. Create appointment history for each pet
    console.log('4️⃣ Creating appointment history...')
    for (const { ownerId, pets } of allPets) {
      for (const { pet } of pets) {
        try {
          const appointments = await createAppointmentHistory(pet.id, ownerId, vetId, TENANT_ID, {
            past: 3,
            future: 1,
            includeRecords: true,
          })

          stats.appointments += appointments.length
          stats.medicalRecords += appointments.filter((a: any) => a.medicalRecord).length
        } catch (err) {
          const msg = `Failed to create appointments for pet ${pet.name}: ${err}`
          console.error(`  ✗ ${msg}`)
          errors.push(msg)
        }
      }
    }
    console.log(
      `  ✓ Created ${stats.appointments} appointments, ${stats.medicalRecords} medical records\n`
    )

    // 4b. Create TODAY's appointments (for dashboard display)
    console.log("4️⃣b Creating today's appointments...")
    const appointmentScenarios: Array<
      'routine' | 'vaccine' | 'consultation' | 'followup' | 'dental' | 'grooming' | 'lab'
    > = [
      'consultation',
      'vaccine',
      'routine',
      'followup',
      'consultation',
      'dental',
      'grooming',
      'lab',
      'routine',
      'vaccine',
      'consultation',
      'followup',
      'dental',
      'routine',
      'consultation',
    ]

    // Create appointments at 30-minute intervals throughout the day
    const todaySlots = [
      { hour: 8, minute: 0 },
      { hour: 8, minute: 30 },
      { hour: 9, minute: 0 },
      { hour: 9, minute: 30 },
      { hour: 10, minute: 0 },
      { hour: 10, minute: 30 },
      { hour: 11, minute: 0 },
      { hour: 11, minute: 30 },
      { hour: 14, minute: 0 },
      { hour: 14, minute: 30 },
      { hour: 15, minute: 0 },
      { hour: 15, minute: 30 },
      { hour: 16, minute: 0 },
      { hour: 16, minute: 30 },
      { hour: 17, minute: 0 },
    ]

    // Flatten all pets into a single array for easier iteration
    const allPetsFlat: Array<{ pet: any; ownerId: string }> = []
    for (const ownerData of allPets) {
      for (const petData of ownerData.pets) {
        allPetsFlat.push({ pet: petData.pet, ownerId: ownerData.ownerId })
      }
    }

    for (let i = 0; i < todaySlots.length && i < allPetsFlat.length; i++) {
      const { pet, ownerId } = allPetsFlat[i]
      const scenario = appointmentScenarios[i % appointmentScenarios.length]
      const slot = todaySlots[i]

      try {
        const startTime = new Date()
        startTime.setHours(slot.hour, slot.minute, 0, 0)

        const result = await AppointmentFactory.create()
          .forTenant(TENANT_ID)
          .forPet(pet.id)
          .createdBy(ownerId)
          .withVet(vetId || undefined)
          .withScenario(scenario)
          .forToday()
          .atTime(startTime)
          .build()

        if (result.appointment) {
          stats.todayAppointments++
          stats.appointments++
        }
      } catch (err) {
        if (!String(err).includes('overlap')) {
          const msg = `Failed to create today's appointment for ${pet.name}: ${err}`
          console.error(`  ✗ ${msg}`)
          errors.push(msg)
        }
      }
    }
    console.log(`  ✓ Created ${stats.todayAppointments} appointments for today\n`)

    // 4c. Create appointments for THIS WEEK (Mon-Sat)
    console.log("4️⃣c Creating this week's appointments...")
    let weekAppointments = 0
    const weekSlots = [
      { hour: 9, minute: 0 },
      { hour: 10, minute: 0 },
      { hour: 11, minute: 0 },
      { hour: 14, minute: 0 },
      { hour: 15, minute: 0 },
      { hour: 16, minute: 0 },
    ]

    // Create appointments for the next 6 days
    for (let dayOffset = 1; dayOffset <= 6; dayOffset++) {
      const appointmentDate = new Date()
      appointmentDate.setDate(appointmentDate.getDate() + dayOffset)

      // Skip Sundays
      if (appointmentDate.getDay() === 0) continue

      // Create 4-6 appointments per day
      const appointmentsPerDay = 4 + Math.floor(Math.random() * 3)

      for (
        let slotIndex = 0;
        slotIndex < appointmentsPerDay && slotIndex < weekSlots.length;
        slotIndex++
      ) {
        const petIndex = (dayOffset * 6 + slotIndex) % allPetsFlat.length
        const { pet, ownerId } = allPetsFlat[petIndex]
        const scenario = appointmentScenarios[(dayOffset + slotIndex) % appointmentScenarios.length]
        const slot = weekSlots[slotIndex]

        try {
          const startTime = new Date(appointmentDate)
          startTime.setHours(slot.hour, slot.minute, 0, 0)

          const result = await AppointmentFactory.create()
            .forTenant(TENANT_ID)
            .forPet(pet.id)
            .createdBy(ownerId)
            .withVet(vetId || undefined)
            .withScenario(scenario)
            .atTime(startTime)
            .build()

          if (result.appointment) {
            weekAppointments++
            stats.appointments++
          }
        } catch (err) {
          if (!String(err).includes('overlap')) {
            const msg = `Failed to create week appointment for ${pet.name}: ${err}`
            console.error(`  ✗ ${msg}`)
            errors.push(msg)
          }
        }
      }
    }
    console.log(`  ✓ Created ${weekAppointments} appointments for this week\n`)

    // 5. Create invoices for each owner
    console.log('5️⃣ Creating invoices and payments...')
    for (const owner of owners) {
      const petId = allPets.find((p) => p.ownerId === owner.id)?.pets[0]?.pet.id || null

      try {
        const invoices = await createInvoiceHistory(owner.id, petId, TENANT_ID, {
          count: 3,
          includeUnpaid: true,
        })

        stats.invoices += invoices.length
        for (const { payments } of invoices) {
          stats.payments += payments.length
        }
      } catch (err) {
        const msg = `Failed to create invoices for ${owner.full_name}: ${err}`
        console.error(`  ✗ ${msg}`)
        errors.push(msg)
      }
    }
    console.log(`  ✓ Created ${stats.invoices} invoices, ${stats.payments} payments\n`)

    // 6. Create store orders
    console.log('6️⃣ Creating store orders...')
    for (const owner of owners) {
      const presetOwner = PREDEFINED_OWNERS.find((p: any) => p.email === owner.email)
      const persona = presetOwner?.persona || 'standard'

      // VIP and loyal customers have more orders
      const orderCount = persona === 'vip' ? 5 : persona === 'loyal' ? 4 : persona === 'new' ? 1 : 2
      const scenarios =
        persona === 'vip'
          ? (['simple', 'prescription', 'coupon', 'bulk', 'simple'] as const)
          : (['simple', 'coupon', 'simple'] as const)

      try {
        const orders = await createOrderHistory(owner.id, TENANT_ID, {
          count: orderCount,
          scenarios: [...scenarios], // Convert readonly array to mutable
        })

        stats.storeOrders += orders.length
      } catch (err) {
        const msg = `Failed to create orders for ${owner.full_name}: ${err}`
        console.error(`  ✗ ${msg}`)
        errors.push(msg)
      }
    }
    console.log(`  ✓ Created ${stats.storeOrders} store orders\n`)

    // 7. Create abandoned carts
    console.log('7️⃣ Creating abandoned carts...')
    try {
      const carts = await createAbandonedCarts(
        owners.map((o: { id: string }) => o.id),
        TENANT_ID
      )
      stats.carts = carts.length
      console.log(`  ✓ Created ${carts.length} abandoned carts\n`)
    } catch (err) {
      const msg = `Failed to create abandoned carts: ${err}`
      console.error(`  ✗ ${msg}`)
      errors.push(msg)
    }

    // 8. Create loyalty points based on persona
    console.log('8️⃣ Creating loyalty points...')
    for (const owner of owners) {
      const presetOwner = PREDEFINED_OWNERS.find((p: { email: string; persona?: string }) => p.email === owner.email)
      const persona = (presetOwner?.persona || 'standard') as 'vip' | 'frequent' | 'standard' | 'inactive'

      try {
        const { transactions } = await createLoyaltyForPersona(owner.id, persona, TENANT_ID)

        stats.loyaltyTransactions += transactions.length
      } catch (err) {
        const msg = `Failed to create loyalty for ${owner.full_name}: ${err}`
        console.error(`  ✗ ${msg}`)
        errors.push(msg)
      }
    }
    console.log(`  ✓ Created ${stats.loyaltyTransactions} loyalty transactions\n`)

    // 9. Note about dashboard stats
    console.log('9️⃣ Dashboard Stats Note:')
    console.log('  ℹ If dashboard shows 0 appointments for today, refresh the page.')
    console.log('  ℹ The dashboard API will use live queries to show current data.')
    console.log('  ℹ To refresh materialized view manually, run in SQL editor:')
    console.log('    REFRESH MATERIALIZED VIEW mv_clinic_dashboard_stats;\n')

    const duration = (Date.now() - startTime) / 1000

    console.log('═'.repeat(50))
    console.log('📊 SEED SUMMARY')
    console.log('═'.repeat(50))
    console.log(`  Owners:              ${stats.owners}`)
    console.log(`  Pets:                ${stats.pets}`)
    console.log(`  Vaccines:            ${stats.vaccines}`)
    console.log(`  Appointments:        ${stats.appointments}`)
    console.log(`  Today's Appointments: ${stats.todayAppointments}`)
    console.log(`  Medical Records:     ${stats.medicalRecords}`)
    console.log(`  Invoices:            ${stats.invoices}`)
    console.log(`  Payments:            ${stats.payments}`)
    console.log(`  Store Orders:        ${stats.storeOrders}`)
    console.log(`  Abandoned Carts:     ${stats.carts}`)
    console.log(`  Loyalty Transactions: ${stats.loyaltyTransactions}`)
    console.log('─'.repeat(50))
    console.log(`  Duration:            ${duration.toFixed(2)}s`)
    console.log(`  Errors:              ${errors.length}`)
    console.log('═'.repeat(50))

    if (errors.length > 0) {
      console.log('\n⚠️ Errors encountered:')
      for (const error of errors) {
        console.log(`  - ${error}`)
      }
    }

    return {
      success: errors.length === 0,
      stats,
      errors,
      duration,
    }
  } catch (error) {
    const msg = `Fatal error during seed: ${error}`
    errors.push(msg)
    console.error(`\n❌ ${msg}`)

    return {
      success: false,
      stats,
      errors,
      duration: (Date.now() - startTime) / 1000,
    }
  }
}

/**
 * Main entry point
 */
async function main() {
  // Load dependencies with dynamic imports (after env vars are loaded)
  await loadDependencies()

  // Set mode based on environment or argument
  const mode = process.argv.includes('--test') ? 'test' : 'seed'
  setMode(mode)

  console.log(`\n🔧 Mode: ${mode.toUpperCase()}`)
  console.log(`📍 Tenant: ${TENANT_ID}\n`)

  const result = await seedAdrisDemo()

  if (result.success) {
    console.log('\n✅ Seed completed successfully!\n')
    process.exit(0)
  } else {
    console.log('\n⚠️ Seed completed with errors.\n')
    process.exit(1)
  }
}

// Run if called directly
main().catch(console.error)

// Export for programmatic use
export { seedAdrisDemo }
export type { SeedResult, SeedStats }
