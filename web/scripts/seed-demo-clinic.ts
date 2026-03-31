#!/usr/bin/env npx tsx
/**
 * =============================================================================
 * DEMO CLINIC SEED DATA - "CLÍNICA VETERINARIA TERAPET"
 * =============================================================================
 * Creates comprehensive demo data for sales presentations.
 * Matches the scenarios described in demo-script-15min.md
 * 
 * Demo Accounts:
 * - admin@demo (Dr. María González - Director)  
 * - vet@demo (Dr. Carlos Rodríguez - Veterinario)
 * - owner@demo (Ana Pérez - Dueña de mascotas)
 * 
 * Demo Data:
 * - Realistic appointments for today
 * - Pet medical histories
 * - Inventory with low-stock alerts
 * - Financial transactions
 * - Complete clinic setup
 * 
 * Usage:
 *   npx tsx scripts/seed-demo-clinic.ts
 * =============================================================================
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { faker } from '@faker-js/faker'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
})

// =============================================================================
// CONFIGURATION
// =============================================================================

const DEMO_CLINIC = {
  id: 'terapet',
  name: 'Clínica Veterinaria TeraPet',
  email: 'info@terapet.py',
  phone: '+595 21 123-4567',
  address: 'Avda. Eusebio Ayala 1234, Asunción',
  country: 'Paraguay',
  timezone: 'America/Asuncion',
}

const DEMO_USERS = {
  admin: {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'admin@demo',
    full_name: 'Dr. María González',
    role: 'admin',
    title: 'Director de Clínica',
    phone: '+595 981 111-111'
  },
  vet: {
    id: '550e8400-e29b-41d4-a716-446655440002', 
    email: 'vet@demo',
    full_name: 'Dr. Carlos Rodríguez',
    role: 'vet',
    title: 'Veterinario',
    phone: '+595 981 222-222'
  },
  owner: {
    id: '550e8400-e29b-41d4-a716-446655440003',
    email: 'owner@demo', 
    full_name: 'Ana Pérez',
    role: 'customer',
    title: 'Dueña de mascotas',
    phone: '+595 981 333-333'
  }
}

// =============================================================================
// HELPER FUNCTIONS  
// =============================================================================

function today(): string {
  return new Date().toISOString().split('T')[0]
}

function todayAt(hours: number, minutes: number = 0): string {
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date.toISOString()
}

function daysFromNow(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

function monthsAgo(months: number): string {
  const date = new Date()
  date.setMonth(date.getMonth() - months)
  return date.toISOString()
}

function formatGuaranis(amount: number): string {
  return `Gs. ${amount.toLocaleString('es-PY')}`
}

// =============================================================================
// MAIN SEED FUNCTION
// =============================================================================

async function main() {
  console.log('🚀 Starting TeraPet demo clinic seed...')
  
  try {
    // 1. Create tenant (clinic)
    await createTenant()
    
    // 2. Create demo users
    await createUsers()
    
    // 3. Create services & pricing
    await createServices()
    
    // 4. Create inventory products
    await createInventory()
    
    // 5. Create demo pets with owners
    await createPets()
    
    // 6. Create medical histories
    await createMedicalRecords()
    
    // 7. Create today's appointments (for demo)
    await createTodayAppointments()
    
    // 8. Create financial data
    await createFinancialData()
    
    // 9. Create notifications & alerts
    await createAlertsAndNotifications()
    
    console.log('✅ Demo clinic seeded successfully!')
    console.log('')
    console.log('🔑 Demo Login Credentials:')
    console.log('   Admin: admin@demo (Dr. María González)')
    console.log('   Vet: vet@demo (Dr. Carlos Rodríguez)') 
    console.log('   Owner: owner@demo (Ana Pérez)')
    console.log('')
    console.log('🏥 Clinic: Clínica Veterinaria TeraPet')
    console.log('🌐 URL: [domain]/terapet')
    
  } catch (error) {
    console.error('❌ Error seeding demo data:', error)
    process.exit(1)
  }
}

// =============================================================================
// SEED FUNCTIONS
// =============================================================================

async function createTenant() {
  console.log('📋 Creating demo clinic...')
  
  const { error } = await supabase
    .from('tenants')
    .upsert({
      id: DEMO_CLINIC.id,
      name: DEMO_CLINIC.name,
      email: DEMO_CLINIC.email,
      phone: DEMO_CLINIC.phone,
      address: DEMO_CLINIC.address,
      country: DEMO_CLINIC.country,
      timezone: DEMO_CLINIC.timezone,
      config: {
        currency: 'PYG',
        language: 'es',
        vat_rate: 0.10, // 10% IVA Paraguay
        appointment_duration_minutes: 30,
        business_hours: {
          monday: { open: '08:00', close: '18:00' },
          tuesday: { open: '08:00', close: '18:00' },
          wednesday: { open: '08:00', close: '18:00' },
          thursday: { open: '08:00', close: '18:00' },
          friday: { open: '08:00', close: '18:00' },
          saturday: { open: '08:00', close: '13:00' },
          sunday: { closed: true }
        }
      }
    }, { onConflict: 'id' })

  if (error) throw new Error(`Failed to create tenant: ${error.message}`)
  console.log('✅ Demo clinic created')
}

async function createUsers() {
  console.log('👥 Creating demo users...')
  
  for (const [key, user] of Object.entries(DEMO_USERS)) {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        phone: user.phone,
        tenant_id: DEMO_CLINIC.id,
        created_at: monthsAgo(6),
        metadata: {
          title: user.title,
          demo_account: true
        }
      }, { onConflict: 'id' })

    if (error) throw new Error(`Failed to create user ${user.email}: ${error.message}`)
    console.log(`   ✅ Created ${user.full_name} (${user.email})`)
  }
}

async function createServices() {
  console.log('💼 Creating services & pricing...')
  
  const services = [
    {
      name: 'Consulta General',
      description: 'Consulta veterinaria estándar',
      price: 150000, // Gs. 150,000
      duration_minutes: 30,
      category: 'consultation'
    },
    {
      name: 'Vacunación',
      description: 'Aplicación de vacunas según calendario',
      price: 120000, // Gs. 120,000  
      duration_minutes: 15,
      category: 'vaccination'
    },
    {
      name: 'Cirugía Menor',
      description: 'Procedimientos quirúrgicos menores',
      price: 500000, // Gs. 500,000
      duration_minutes: 90,
      category: 'surgery'
    },
    {
      name: 'Análisis de Laboratorio',
      description: 'Estudios de sangre, orina, etc.',
      price: 200000, // Gs. 200,000
      duration_minutes: 10,
      category: 'lab'
    }
  ]

  for (const service of services) {
    const { error } = await supabase
      .from('services')
      .upsert({
        ...service,
        tenant_id: DEMO_CLINIC.id,
        active: true
      })

    if (error) throw new Error(`Failed to create service ${service.name}: ${error.message}`)
  }
  
  console.log(`   ✅ Created ${services.length} services`)
}

async function createInventory() {
  console.log('📦 Creating inventory products...')
  
  const products = [
    // Low stock items (for demo alerts)
    {
      name: 'Vacuna Triple (DHPP)',
      sku: 'VAC-001',
      category: 'Vacunas',
      current_stock: 3, // Low stock!
      min_stock: 10,
      unit_cost: 45000,
      unit_price: 65000,
      supplier: 'Distribuidora Salud Animal'
    },
    {
      name: 'Antiinflamatorio Rimadyl',
      sku: 'MED-005',
      category: 'Medicamentos',
      current_stock: 2, // Low stock!
      min_stock: 8,
      unit_cost: 85000,
      unit_price: 125000,
      supplier: 'Veterinaria Central'
    },
    
    // Normal stock items
    {
      name: 'Vacuna Antirrábica',
      sku: 'VAC-002',
      category: 'Vacunas',
      current_stock: 25,
      min_stock: 10,
      unit_cost: 35000,
      unit_price: 55000,
      supplier: 'Distribuidora Salud Animal'
    },
    {
      name: 'Antibiótico Amoxicilina',
      sku: 'MED-001',
      category: 'Medicamentos',
      current_stock: 15,
      min_stock: 5,
      unit_cost: 25000,
      unit_price: 45000,
      supplier: 'Farmacia Veterinaria SA'
    },
    {
      name: 'Desparasitante Drontal',
      sku: 'MED-003',
      category: 'Medicamentos',
      current_stock: 18,
      min_stock: 8,
      unit_cost: 15000,
      unit_price: 28000,
      supplier: 'Veterinaria Central'
    },
    
    // Supplies
    {
      name: 'Jeringa Descartable 5ml',
      sku: 'SUP-001',
      category: 'Insumos',
      current_stock: 150,
      min_stock: 50,
      unit_cost: 1500,
      unit_price: 3000,
      supplier: 'Insumos Médicos PY'
    },
    {
      name: 'Collar Isabelino Mediano',
      sku: 'ACC-001',
      category: 'Accesorios',
      current_stock: 8,
      min_stock: 5,
      unit_cost: 35000,
      unit_price: 65000,
      supplier: 'Pet Accessories'
    }
  ]

  for (const product of products) {
    const { error } = await supabase
      .from('inventory_products')
      .upsert({
        ...product,
        tenant_id: DEMO_CLINIC.id,
        active: true,
        created_at: monthsAgo(3)
      })

    if (error) throw new Error(`Failed to create product ${product.name}: ${error.message}`)
  }
  
  console.log(`   ✅ Created ${products.length} inventory items`)
  console.log('   ⚠️  2 items with low stock alerts')
}

async function createPets() {
  console.log('🐕 Creating demo pets...')
  
  const pets = [
    {
      id: '550e8400-e29b-41d4-a716-446655440101',
      name: 'Max',
      species: 'Canino',
      breed: 'Golden Retriever',
      gender: 'Macho',
      birth_date: '2022-03-15',
      weight: 28.5,
      color: 'Dorado',
      microchip: 'MIC123456789',
      owner_id: DEMO_USERS.owner.id
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440102',
      name: 'Luna',
      species: 'Felino',
      breed: 'Siamés',
      gender: 'Hembra',
      birth_date: '2021-08-20',
      weight: 4.2,
      color: 'Crema con extremidades oscuras',
      microchip: 'MIC987654321',
      owner_id: DEMO_USERS.owner.id
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440103',
      name: 'Rocky',
      species: 'Canino',
      breed: 'Pastor Alemán',
      gender: 'Macho',
      birth_date: '2020-11-10',
      weight: 35.0,
      color: 'Negro y fuego',
      microchip: 'MIC456789123',
      owner_id: DEMO_USERS.owner.id
    }
  ]

  for (const pet of pets) {
    const { error } = await supabase
      .from('pets')
      .upsert({
        ...pet,
        tenant_id: DEMO_CLINIC.id,
        created_at: monthsAgo(2)
      }, { onConflict: 'id' })

    if (error) throw new Error(`Failed to create pet ${pet.name}: ${error.message}`)
  }
  
  console.log(`   ✅ Created ${pets.length} demo pets`)
}

async function createMedicalRecords() {
  console.log('📋 Creating medical records...')
  
  // Max's medical history
  const maxRecords = [
    {
      pet_id: '550e8400-e29b-41d4-a716-446655440101',
      type: 'vaccination',
      title: 'Vacuna Triple (DHPP)',
      description: 'Primera dosis de vacuna múltiple',
      diagnosis: 'Vacunación preventiva',
      treatment: 'Aplicación subcutánea de DHPP',
      vet_id: DEMO_USERS.vet.id,
      date: monthsAgo(1),
      next_appointment: today() // Due today!
    },
    {
      pet_id: '550e8400-e29b-41d4-a716-446655440101', 
      type: 'consultation',
      title: 'Control de peso y crecimiento',
      description: 'Consulta de rutina para seguimiento',
      diagnosis: 'Desarrollo normal',
      treatment: 'Continuar con dieta actual',
      vet_id: DEMO_USERS.vet.id,
      date: monthsAgo(2)
    }
  ]

  for (const record of maxRecords) {
    const { error } = await supabase
      .from('medical_records')
      .insert({
        ...record,
        tenant_id: DEMO_CLINIC.id
      })

    if (error) throw new Error(`Failed to create medical record: ${error.message}`)
  }
  
  console.log('   ✅ Created medical history for Max')
}

async function createTodayAppointments() {
  console.log('📅 Creating today\'s appointments...')
  
  const appointments = [
    {
      id: '550e8400-e29b-41d4-a716-446655440201',
      pet_id: '550e8400-e29b-41d4-a716-446655440101', // Max
      service_name: 'Vacunación',
      start_time: todayAt(10, 30),
      end_time: todayAt(10, 45),
      status: 'scheduled',
      notes: 'Segunda dosis DHPP - recordar refuerzo',
      vet_id: DEMO_USERS.vet.id,
      client_id: DEMO_USERS.owner.id,
      priority: 'normal'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440202',
      pet_id: '550e8400-e29b-41d4-a716-446655440102', // Luna
      service_name: 'Consulta General',
      start_time: todayAt(11, 0),
      end_time: todayAt(11, 30),
      status: 'scheduled',
      notes: 'Revisión general, posible problemas digestivos',
      vet_id: DEMO_USERS.vet.id,
      client_id: DEMO_USERS.owner.id,
      priority: 'normal'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440203',
      pet_id: '550e8400-e29b-41d4-a716-446655440103', // Rocky  
      service_name: 'Cirugía Menor',
      start_time: todayAt(14, 0),
      end_time: todayAt(15, 30),
      status: 'scheduled',
      notes: '⚠️ URGENTE - Extracción de cuerpo extraño',
      vet_id: DEMO_USERS.vet.id,
      client_id: DEMO_USERS.owner.id,
      priority: 'urgent'
    },
    // Additional appointments to fill the day
    {
      id: '550e8400-e29b-41d4-a716-446655440204',
      service_name: 'Consulta General',
      start_time: todayAt(9, 0),
      end_time: todayAt(9, 30),
      status: 'completed',
      notes: 'Consulta regular - todo normal',
      vet_id: DEMO_USERS.vet.id,
      priority: 'normal'
    }
  ]

  for (const appointment of appointments) {
    const { error } = await supabase
      .from('appointments')
      .upsert({
        ...appointment,
        tenant_id: DEMO_CLINIC.id
      }, { onConflict: 'id' })

    if (error) throw new Error(`Failed to create appointment: ${error.message}`)
  }
  
  console.log(`   ✅ Created ${appointments.length} appointments for today`)
  console.log('   📍 Including 1 urgent case (Rocky)')
}

async function createFinancialData() {
  console.log('💰 Creating financial data...')
  
  // Weekly revenue simulation
  const invoices = [
    {
      invoice_number: 'FAC-001-2026',
      client_id: DEMO_USERS.owner.id,
      amount: 150000,
      vat_amount: 15000,
      total_amount: 165000,
      status: 'paid',
      payment_date: daysFromNow(-1),
      services: ['Consulta General']
    },
    {
      invoice_number: 'FAC-002-2026',
      client_id: DEMO_USERS.owner.id,
      amount: 120000,
      vat_amount: 12000,
      total_amount: 132000,
      status: 'paid',
      payment_date: daysFromNow(-2),
      services: ['Vacunación']
    }
  ]

  let totalWeekly = 0
  for (const invoice of invoices) {
    const { error } = await supabase
      .from('invoices')
      .insert({
        ...invoice,
        tenant_id: DEMO_CLINIC.id,
        created_at: invoice.payment_date
      })

    if (error) throw new Error(`Failed to create invoice: ${error.message}`)
    totalWeekly += invoice.total_amount
  }
  
  console.log(`   ✅ Created financial records`)
  console.log(`   💵 Weekly revenue: ${formatGuaranis(totalWeekly)}`)
}

async function createAlertsAndNotifications() {
  console.log('🔔 Creating alerts and notifications...')
  
  const alerts = [
    {
      type: 'low_stock',
      title: 'Stock bajo: Vacuna Triple',
      message: 'Quedan solo 3 unidades de Vacuna Triple (DHPP). Punto de reposición: 10 unidades.',
      priority: 'high',
      read: false
    },
    {
      type: 'low_stock', 
      title: 'Stock bajo: Antiinflamatorio',
      message: 'Quedan solo 2 unidades de Rimadyl. Punto de reposición: 8 unidades.',
      priority: 'high',
      read: false
    },
    {
      type: 'appointment_reminder',
      title: 'Cita próxima: Max - 10:30',
      message: 'Max (Golden Retriever) tiene cita de vacunación en 30 minutos.',
      priority: 'medium',
      read: false
    }
  ]

  for (const alert of alerts) {
    const { error } = await supabase
      .from('notifications')
      .insert({
        ...alert,
        tenant_id: DEMO_CLINIC.id,
        user_id: DEMO_USERS.admin.id,
        created_at: todayAt(8, 0)
      })

    if (error) throw new Error(`Failed to create notification: ${error.message}`)
  }
  
  console.log(`   ✅ Created ${alerts.length} alerts/notifications`)
}

// =============================================================================
// EXECUTION
// =============================================================================

if (require.main === module) {
  main().catch(console.error)
}

export { main as seedDemoClinic }