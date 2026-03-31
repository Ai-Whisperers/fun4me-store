/**
 * Screenshot Data Fixtures
 *
 * Provides varied test data for different screenshot scenarios.
 * These are used to seed the database before capturing screenshots.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ============================================================================
// Types
// ============================================================================

export interface ScreenshotDataSet {
  name: string
  description: string
  setup: (client: SupabaseClient, tenantId: string) => Promise<void>
  cleanup: (client: SupabaseClient, tenantId: string) => Promise<void>
}

// ============================================================================
// Client Setup
// ============================================================================

let supabaseClient: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) {
      throw new Error('Missing Supabase environment variables')
    }

    supabaseClient = createClient(url, key)
  }
  return supabaseClient
}

// ============================================================================
// Data Generators
// ============================================================================

/** Generate a random UUID */
function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/** Generate a date in the past */
function pastDate(daysAgo: number): string {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString()
}

/** Generate a future date */
function futureDate(daysAhead: number): string {
  const date = new Date()
  date.setDate(date.getDate() + daysAhead)
  return date.toISOString()
}

/** Generate today's date at a specific hour */
function todayAt(hour: number): string {
  const date = new Date()
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

// ============================================================================
// Sample Data
// ============================================================================

const SAMPLE_PETS = [
  { name: 'Max', species: 'dog', breed: 'Golden Retriever', weightKg: 32.5, sex: 'male', color: 'Dorado' },
  { name: 'Luna', species: 'dog', breed: 'Labrador', weightKg: 28.0, sex: 'female', color: 'Negro' },
  { name: 'Mishi', species: 'cat', breed: 'Persa', weightKg: 4.5, sex: 'female', color: 'Blanco' },
  { name: 'Simba', species: 'cat', breed: 'Mestizo', weightKg: 5.2, sex: 'male', color: 'Anaranjado' },
  { name: 'Rocky', species: 'dog', breed: 'Bulldog Frances', weightKg: 12.0, sex: 'male', color: 'Atigrado' },
  { name: 'Pelusa', species: 'rabbit', breed: 'Holland Lop', weightKg: 1.8, sex: 'female', color: 'Blanco' },
]

const SAMPLE_VACCINES = [
  { name: 'Antirrábica', dueInDays: 30, status: 'pending' },
  { name: 'Séxtuple', dueInDays: -7, status: 'overdue' },
  { name: 'Parvovirus', dueInDays: 0, status: 'due_today' },
  { name: 'Triple Felina', dueInDays: 90, status: 'scheduled' },
]

const SAMPLE_APPOINTMENTS = [
  { service: 'Consulta General', hour: 9, status: 'confirmed' },
  { service: 'Vacunación', hour: 10, status: 'checked_in' },
  { service: 'Cirugía', hour: 11, status: 'in_progress' },
  { service: 'Control Post-Operatorio', hour: 14, status: 'confirmed' },
  { service: 'Baño y Peluquería', hour: 15, status: 'pending' },
]

const SAMPLE_INVOICES = [
  { total: 150000, status: 'paid', daysAgo: 5 },
  { total: 250000, status: 'pending', daysAgo: 2 },
  { total: 75000, status: 'overdue', daysAgo: 15 },
  { total: 180000, status: 'draft', daysAgo: 0 },
]

// ============================================================================
// Data Sets
// ============================================================================

export const DATA_SETS: Record<string, ScreenshotDataSet> = {
  /**
   * Empty state - minimal data
   */
  empty: {
    name: 'empty',
    description: 'Empty/minimal data state',
    setup: async () => {
      // No additional data needed
      console.log('📸 Empty data set - no additional setup')
    },
    cleanup: async () => {
      // Nothing to clean
    },
  },

  /**
   * Full data - all modules populated
   */
  full: {
    name: 'full',
    description: 'Full data with all modules populated',
    setup: async (client, tenantId) => {
      console.log('📸 Setting up full data set...')

      // Get owner profile
      const { data: ownerProfile } = await client
        .from('profiles')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('role', 'owner')
        .limit(1)
        .single()

      if (!ownerProfile) {
        console.log('⚠️ No owner profile found, skipping pet creation')
        return
      }

      // Create test pets
      const petIds: string[] = []
      for (const pet of SAMPLE_PETS) {
        const petId = uuid()
        petIds.push(petId)

        await client.from('pets').upsert({
          id: petId,
          owner_id: ownerProfile.id,
          tenant_id: tenantId,
          name: pet.name,
          species: pet.species,
          breed: pet.breed,
          birth_date: pastDate(365 * 2), // 2 years old
          weight_kg: pet.weightKg,
          sex: pet.sex,
          is_neutered: Math.random() > 0.5,
          color: pet.color,
          temperament: 'friendly',
          _screenshot_test: true,
        })
      }

      console.log(`✅ Created ${petIds.length} test pets`)

      // Create vaccines for first pet
      if (petIds.length > 0) {
        for (const vaccine of SAMPLE_VACCINES) {
          await client.from('vaccines').upsert({
            id: uuid(),
            pet_id: petIds[0],
            tenant_id: tenantId,
            vaccine_name: vaccine.name,
            administered_date: vaccine.dueInDays <= 0 ? null : pastDate(30),
            next_due_date: futureDate(vaccine.dueInDays),
            status: vaccine.status,
            _screenshot_test: true,
          })
        }
        console.log(`✅ Created ${SAMPLE_VACCINES.length} test vaccines`)
      }

      // Create today's appointments
      const { data: vetProfile } = await client
        .from('profiles')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('role', 'vet')
        .limit(1)
        .single()

      const { data: services } = await client
        .from('services')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .limit(5)

      if (vetProfile && services && petIds.length > 0) {
        for (let i = 0; i < SAMPLE_APPOINTMENTS.length; i++) {
          const apt = SAMPLE_APPOINTMENTS[i]
          const serviceId = services[i % services.length]?.id

          if (serviceId) {
            await client.from('appointments').upsert({
              id: uuid(),
              tenant_id: tenantId,
              pet_id: petIds[i % petIds.length],
              vet_id: vetProfile.id,
              service_id: serviceId,
              start_time: todayAt(apt.hour),
              end_time: todayAt(apt.hour + 1),
              status: apt.status,
              notes: `Cita de prueba - ${apt.service}`,
              _screenshot_test: true,
            })
          }
        }
        console.log(`✅ Created ${SAMPLE_APPOINTMENTS.length} test appointments`)
      }

      // Create invoices
      for (const inv of SAMPLE_INVOICES) {
        await client.from('invoices').upsert({
          id: uuid(),
          tenant_id: tenantId,
          client_id: ownerProfile.id,
          invoice_number: `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          subtotal: inv.total,
          tax_amount: Math.round(inv.total * 0.1),
          total: Math.round(inv.total * 1.1),
          status: inv.status,
          created_at: pastDate(inv.daysAgo),
          _screenshot_test: true,
        })
      }
      console.log(`✅ Created ${SAMPLE_INVOICES.length} test invoices`)
    },
    cleanup: async (client, tenantId) => {
      console.log('🧹 Cleaning up full data set...')

      // Delete test data (marked with _screenshot_test flag)
      await client.from('appointments').delete().eq('tenant_id', tenantId).eq('_screenshot_test', true)
      await client.from('vaccines').delete().eq('tenant_id', tenantId).eq('_screenshot_test', true)
      await client.from('invoices').delete().eq('tenant_id', tenantId).eq('_screenshot_test', true)
      await client.from('pets').delete().eq('tenant_id', tenantId).eq('_screenshot_test', true)

      console.log('✅ Cleaned up test data')
    },
  },

  /**
   * Busy day - lots of appointments and activity
   */
  busyDay: {
    name: 'busy-day',
    description: 'Busy clinic day with many appointments',
    setup: async (client, tenantId) => {
      console.log('📸 Setting up busy day data set...')

      const { data: vetProfile } = await client
        .from('profiles')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('role', 'vet')
        .limit(1)
        .single()

      const { data: ownerProfile } = await client
        .from('profiles')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('role', 'owner')
        .limit(1)
        .single()

      const { data: pets } = await client
        .from('pets')
        .select('id')
        .eq('tenant_id', tenantId)
        .limit(10)

      const { data: services } = await client
        .from('services')
        .select('id')
        .eq('tenant_id', tenantId)
        .limit(5)

      if (!vetProfile || !pets?.length || !services?.length) {
        console.log('⚠️ Missing required data for busy day')
        return
      }

      // Create 15 appointments throughout the day
      const statuses = ['confirmed', 'checked_in', 'in_progress', 'completed', 'pending']
      for (let hour = 8; hour <= 18; hour++) {
        const apt = {
          id: uuid(),
          tenant_id: tenantId,
          pet_id: pets[Math.floor(Math.random() * pets.length)].id,
          vet_id: vetProfile.id,
          service_id: services[Math.floor(Math.random() * services.length)].id,
          start_time: todayAt(hour),
          end_time: todayAt(hour + 1),
          status: statuses[Math.floor(Math.random() * statuses.length)],
          _screenshot_test: true,
        }
        await client.from('appointments').upsert(apt)
      }

      console.log('✅ Created 11 appointments for busy day')
    },
    cleanup: async (client, tenantId) => {
      await client.from('appointments').delete().eq('tenant_id', tenantId).eq('_screenshot_test', true)
    },
  },

  /**
   * Alerts state - low stock, overdue vaccines, pending orders
   */
  alerts: {
    name: 'alerts',
    description: 'State with various alerts and warnings',
    setup: async (client, tenantId) => {
      console.log('📸 Setting up alerts data set...')

      // Create low stock items
      const { data: products } = await client
        .from('store_products')
        .select('id')
        .eq('tenant_id', tenantId)
        .limit(5)

      if (products) {
        for (const product of products) {
          await client
            .from('store_inventory')
            .update({
              stock_quantity: Math.floor(Math.random() * 3), // 0-2 items
              reorder_point: 10,
            })
            .eq('product_id', product.id)
        }
        console.log(`✅ Set ${products.length} products to low stock`)
      }

      // Create expiring inventory (if expiry tracking exists)
      // This depends on your schema

      // Create overdue vaccine reminders
      const { data: pets } = await client
        .from('pets')
        .select('id')
        .eq('tenant_id', tenantId)
        .limit(3)

      if (pets) {
        for (const pet of pets) {
          await client.from('vaccines').upsert({
            id: uuid(),
            pet_id: pet.id,
            tenant_id: tenantId,
            vaccine_name: 'Antirrábica',
            next_due_date: pastDate(14), // 2 weeks overdue
            status: 'overdue',
            _screenshot_test: true,
          })
        }
        console.log(`✅ Created ${pets.length} overdue vaccine alerts`)
      }
    },
    cleanup: async (client, tenantId) => {
      await client.from('vaccines').delete().eq('tenant_id', tenantId).eq('_screenshot_test', true)
      // Reset inventory levels would need original values stored
    },
  },

  /**
   * Hospitalization scenario
   */
  hospitalization: {
    name: 'hospitalization',
    description: 'Active hospitalization cases',
    setup: async (client, tenantId) => {
      console.log('📸 Setting up hospitalization data set...')

      const { data: kennels } = await client
        .from('kennels')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('current_status', 'available')
        .limit(3)

      const { data: pets } = await client
        .from('pets')
        .select('id')
        .eq('tenant_id', tenantId)
        .limit(3)

      const { data: vetProfile } = await client
        .from('profiles')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('role', 'vet')
        .limit(1)
        .single()

      if (!kennels?.length || !pets?.length || !vetProfile) {
        console.log('⚠️ Missing required data for hospitalization')
        return
      }

      const acuityLevels = ['critical', 'high', 'medium', 'low']

      for (let i = 0; i < Math.min(kennels.length, pets.length); i++) {
        const hospitalizationId = uuid()

        // Create hospitalization
        await client.from('hospitalizations').upsert({
          id: hospitalizationId,
          tenant_id: tenantId,
          pet_id: pets[i].id,
          kennel_id: kennels[i].id,
          admitted_at: pastDate(Math.floor(Math.random() * 3)),
          status: 'active',
          acuity_level: acuityLevels[i % acuityLevels.length],
          primary_diagnosis: 'Observación post-quirúrgica',
          _screenshot_test: true,
        })

        // Update kennel status
        await client.from('kennels').update({ current_status: 'occupied' }).eq('id', kennels[i].id)

        // Add some vitals
        for (let v = 0; v < 3; v++) {
          await client.from('hospitalization_vitals').upsert({
            id: uuid(),
            hospitalization_id: hospitalizationId,
            temperature: 38.5 + Math.random(),
            heart_rate: 80 + Math.floor(Math.random() * 40),
            respiratory_rate: 15 + Math.floor(Math.random() * 10),
            pain_score: Math.floor(Math.random() * 5),
            recorded_at: pastDate(v),
            recorded_by: vetProfile.id,
            _screenshot_test: true,
          })
        }
      }

      console.log(`✅ Created ${Math.min(kennels.length, pets.length)} hospitalizations with vitals`)
    },
    cleanup: async (client, tenantId) => {
      // Get hospitalization IDs first
      const { data: hospitalizations } = await client
        .from('hospitalizations')
        .select('id, kennel_id')
        .eq('tenant_id', tenantId)
        .eq('_screenshot_test', true)

      if (hospitalizations) {
        // Delete vitals
        for (const h of hospitalizations) {
          await client.from('hospitalization_vitals').delete().eq('hospitalization_id', h.id)
          // Reset kennel
          await client.from('kennels').update({ current_status: 'available' }).eq('id', h.kennel_id)
        }
        // Delete hospitalizations
        await client.from('hospitalizations').delete().eq('tenant_id', tenantId).eq('_screenshot_test', true)
      }
    },
  },

  /**
   * Lab results scenario
   */
  labResults: {
    name: 'lab-results',
    description: 'Lab orders with results',
    setup: async (client, tenantId) => {
      console.log('📸 Setting up lab results data set...')

      const { data: pets } = await client
        .from('pets')
        .select('id')
        .eq('tenant_id', tenantId)
        .limit(2)

      const { data: vetProfile } = await client
        .from('profiles')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('role', 'vet')
        .limit(1)
        .single()

      const { data: tests } = await client
        .from('lab_test_catalog')
        .select('id, name, reference_range')
        .eq('tenant_id', tenantId)
        .limit(5)

      if (!pets?.length || !vetProfile || !tests?.length) {
        console.log('⚠️ Missing required data for lab results')
        return
      }

      // Create lab orders with results
      for (const pet of pets) {
        const orderId = uuid()

        await client.from('lab_orders').upsert({
          id: orderId,
          tenant_id: tenantId,
          pet_id: pet.id,
          ordered_by: vetProfile.id,
          status: 'completed',
          ordered_at: pastDate(2),
          _screenshot_test: true,
        })

        // Add test results
        for (const test of tests) {
          await client.from('lab_order_items').upsert({
            id: uuid(),
            lab_order_id: orderId,
            test_id: test.id,
            status: 'completed',
            _screenshot_test: true,
          })

          await client.from('lab_results').upsert({
            id: uuid(),
            lab_order_id: orderId,
            test_id: test.id,
            value: (Math.random() * 100).toFixed(2),
            unit: 'mg/dL',
            is_abnormal: Math.random() > 0.7,
            _screenshot_test: true,
          })
        }
      }

      console.log(`✅ Created lab orders with results for ${pets.length} pets`)
    },
    cleanup: async (client, tenantId) => {
      const { data: orders } = await client
        .from('lab_orders')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('_screenshot_test', true)

      if (orders) {
        for (const order of orders) {
          await client.from('lab_results').delete().eq('lab_order_id', order.id)
          await client.from('lab_order_items').delete().eq('lab_order_id', order.id)
        }
        await client.from('lab_orders').delete().eq('tenant_id', tenantId).eq('_screenshot_test', true)
      }
    },
  },
}

// ============================================================================
// Setup/Cleanup Functions
// ============================================================================

export async function setupDataSet(dataSetName: string, tenantId: string): Promise<void> {
  const dataSet = DATA_SETS[dataSetName]
  if (!dataSet) {
    throw new Error(`Unknown data set: ${dataSetName}`)
  }

  const client = getSupabaseClient()
  await dataSet.setup(client, tenantId)
}

export async function cleanupDataSet(dataSetName: string, tenantId: string): Promise<void> {
  const dataSet = DATA_SETS[dataSetName]
  if (!dataSet) {
    throw new Error(`Unknown data set: ${dataSetName}`)
  }

  const client = getSupabaseClient()
  await dataSet.cleanup(client, tenantId)
}

export async function cleanupAllTestData(tenantId: string): Promise<void> {
  console.log('🧹 Cleaning up all test data...')
  const client = getSupabaseClient()

  // Clean in dependency order
  await client.from('hospitalization_vitals').delete().eq('_screenshot_test', true)
  await client.from('hospitalization_medications').delete().eq('_screenshot_test', true)
  await client.from('hospitalization_feedings').delete().eq('_screenshot_test', true)
  await client.from('hospitalizations').delete().eq('tenant_id', tenantId).eq('_screenshot_test', true)
  await client.from('lab_results').delete().eq('_screenshot_test', true)
  await client.from('lab_order_items').delete().eq('_screenshot_test', true)
  await client.from('lab_orders').delete().eq('tenant_id', tenantId).eq('_screenshot_test', true)
  await client.from('appointments').delete().eq('tenant_id', tenantId).eq('_screenshot_test', true)
  await client.from('vaccines').delete().eq('tenant_id', tenantId).eq('_screenshot_test', true)
  await client.from('invoice_items').delete().eq('_screenshot_test', true)
  await client.from('invoices').delete().eq('tenant_id', tenantId).eq('_screenshot_test', true)
  await client.from('pets').delete().eq('tenant_id', tenantId).eq('_screenshot_test', true)

  console.log('✅ All test data cleaned')
}
