#!/usr/bin/env npx tsx
/**
 * =============================================================================
 * SEED-DASHBOARD-TEST-DATA.TS
 * =============================================================================
 * Creates dynamic test data for dashboard visualization with "today's" dates.
 * This script generates appointments, invoices, vaccines, and activity data
 * that will show up on the dashboard widgets.
 *
 * Usage:
 *   npx tsx scripts/seed-dashboard-test-data.ts
 *
 * Run this after the main seed to have visible dashboard data.
 * =============================================================================
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
})

const TENANT_ID = 'terrapet'

// =============================================================================
// HELPERS
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

function daysAgo(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().split('T')[0]
}

function uuid(): string {
  return crypto.randomUUID()
}

// =============================================================================
// MAIN SEEDING FUNCTIONS
// =============================================================================

async function seedTodayAppointments(): Promise<void> {
  console.log("\n📅 Seeding today's appointments...")

  // Get existing pets and vets
  const { data: pets } = await supabase
    .from('pets')
    .select('id, name, owner_id')
    .eq('tenant_id', TENANT_ID)
    .limit(10)

  const { data: vets } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('tenant_id', TENANT_ID)
    .in('role', ['vet', 'admin'])

  const { data: services } = await supabase
    .from('services')
    .select('id, name')
    .eq('tenant_id', TENANT_ID)
    .limit(5)

  if (!pets?.length || !vets?.length || !services?.length) {
    console.log('   ⚠️ Need existing pets, vets, and services first')
    return
  }

  const appointments = [
    { status: 'checked_in', hour: 9, notes: 'Consulta general - en sala de espera' },
    { status: 'in_progress', hour: 9, notes: 'Consulta en curso' },
    { status: 'scheduled', hour: 10, notes: 'Vacunación programada' },
    { status: 'scheduled', hour: 11, notes: 'Control post-operatorio' },
    { status: 'confirmed', hour: 12, notes: 'Chequeo anual' },
    { status: 'scheduled', hour: 14, notes: 'Consulta dermatológica' },
    { status: 'confirmed', hour: 15, notes: 'Limpieza dental' },
    { status: 'scheduled', hour: 16, notes: 'Consulta de urgencia' },
  ]

  for (let i = 0; i < Math.min(appointments.length, pets.length); i++) {
    const apt = appointments[i]
    const pet = pets[i]
    const vet = vets[i % vets.length]
    const service = services[i % services.length]

    const { error } = await supabase.from('appointments').insert({
      id: uuid(),
      tenant_id: TENANT_ID,
      pet_id: pet.id,
      owner_id: pet.owner_id,
      vet_id: vet.id,
      service_id: service.id,
      start_time: todayAt(apt.hour, 0),
      end_time: todayAt(apt.hour, 30),
      status: apt.status,
      notes: apt.notes,
    })

    if (error) {
      console.log(`   ⚠️ Appointment ${i + 1}: ${error.message}`)
    } else {
      console.log(`   ✅ ${pet.name} - ${apt.status} @ ${apt.hour}:00`)
    }
  }
}

async function seedPendingVaccines(): Promise<void> {
  console.log('\n💉 Seeding pending vaccines...')

  const { data: pets } = await supabase
    .from('pets')
    .select('id, name')
    .eq('tenant_id', TENANT_ID)
    .limit(6)

  if (!pets?.length) {
    console.log('   ⚠️ Need existing pets first')
    return
  }

  const vaccineTypes = [
    { name: 'Antirrábica', dueIn: -2 }, // Overdue
    { name: 'Séxtuple', dueIn: 0 }, // Due today
    { name: 'Triple Felina', dueIn: 1 }, // Due tomorrow
    { name: 'Bordetella', dueIn: 3 }, // Due in 3 days
    { name: 'Leptospirosis', dueIn: 5 }, // Due in 5 days
    { name: 'Parvovirus', dueIn: 7 }, // Due in 7 days
  ]

  for (let i = 0; i < Math.min(vaccineTypes.length, pets.length); i++) {
    const vaccine = vaccineTypes[i]
    const pet = pets[i]

    const { error } = await supabase.from('vaccines').insert({
      id: uuid(),
      tenant_id: TENANT_ID,
      pet_id: pet.id,
      vaccine_name: vaccine.name,
      administered_date: daysAgo(365),
      next_due_date: daysFromNow(vaccine.dueIn),
      status: vaccine.dueIn < 0 ? 'overdue' : vaccine.dueIn <= 7 ? 'due_soon' : 'valid',
      notes: vaccine.dueIn < 0 ? 'VACUNA VENCIDA' : 'Programada para renovación',
    })

    if (error) {
      console.log(`   ⚠️ ${vaccine.name}: ${error.message}`)
    } else {
      console.log(`   ✅ ${pet.name} - ${vaccine.name} (due in ${vaccine.dueIn} days)`)
    }
  }
}

async function seedPendingInvoices(): Promise<void> {
  console.log('\n💰 Seeding pending invoices...')

  const { data: clients } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('tenant_id', TENANT_ID)
    .eq('role', 'owner')
    .limit(5)

  if (!clients?.length) {
    console.log('   ⚠️ Need existing clients first')
    return
  }

  const invoices = [
    { status: 'sent', amount: 150000, daysAgo: 0 },
    { status: 'sent', amount: 280000, daysAgo: 2 },
    { status: 'partial', amount: 450000, daysAgo: 5 },
    { status: 'sent', amount: 95000, daysAgo: 7 },
    { status: 'overdue', amount: 320000, daysAgo: 15 },
  ]

  for (let i = 0; i < Math.min(invoices.length, clients.length); i++) {
    const inv = invoices[i]
    const client = clients[i]
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}${i}`

    const subtotal = inv.amount
    const taxAmount = Math.round(subtotal * 0.1)
    const total = subtotal + taxAmount
    const amountDue = inv.status === 'partial' ? Math.round(total * 0.5) : total

    const { error } = await supabase.from('invoices').insert({
      id: uuid(),
      tenant_id: TENANT_ID,
      client_id: client.id,
      invoice_number: invoiceNumber,
      status: inv.status,
      subtotal,
      tax_amount: taxAmount,
      total,
      amount_due: amountDue,
      due_date: daysFromNow(30 - inv.daysAgo),
      created_at: new Date(Date.now() - inv.daysAgo * 24 * 60 * 60 * 1000).toISOString(),
    })

    if (error) {
      console.log(`   ⚠️ Invoice ${invoiceNumber}: ${error.message}`)
    } else {
      console.log(`   ✅ ${client.full_name} - Gs ${total.toLocaleString()} (${inv.status})`)
    }
  }
}

async function seedRecentStoreOrders(): Promise<void> {
  console.log('\n🛒 Seeding recent store orders...')

  const { data: customers } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('tenant_id', TENANT_ID)
    .eq('role', 'owner')
    .limit(8)

  if (!customers?.length) {
    console.log('   ⚠️ Need existing customers first')
    return
  }

  const orders = [
    { status: 'delivered', total: 185000, daysAgo: 0 },
    { status: 'shipped', total: 95000, daysAgo: 0 },
    { status: 'processing', total: 320000, daysAgo: 1 },
    { status: 'confirmed', total: 145000, daysAgo: 1 },
    { status: 'delivered', total: 275000, daysAgo: 2 },
    { status: 'delivered', total: 89000, daysAgo: 3 },
    { status: 'delivered', total: 420000, daysAgo: 5 },
    { status: 'delivered', total: 156000, daysAgo: 7 },
  ]

  for (let i = 0; i < Math.min(orders.length, customers.length); i++) {
    const order = orders[i]
    const customer = customers[i]
    const orderNumber = `ORD-${String(Date.now()).slice(-8)}${i}`

    const { error } = await supabase.from('store_orders').insert({
      id: uuid(),
      tenant_id: TENANT_ID,
      customer_id: customer.id,
      order_number: orderNumber,
      status: order.status,
      subtotal: order.total,
      discount_amount: 0,
      shipping_cost: 0,
      tax_amount: Math.round(order.total * 0.1),
      total: order.total + Math.round(order.total * 0.1),
      payment_method: 'cash_on_delivery',
      shipping_method: 'delivery',
      created_at: new Date(Date.now() - order.daysAgo * 24 * 60 * 60 * 1000).toISOString(),
    })

    if (error) {
      console.log(`   ⚠️ Order ${orderNumber}: ${error.message}`)
    } else {
      console.log(
        `   ✅ ${customer.full_name} - Gs ${order.total.toLocaleString()} (${order.status})`
      )
    }
  }
}

async function seedRecentActivity(): Promise<void> {
  console.log('\n📝 Seeding recent activity...')

  const { data: users } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('tenant_id', TENANT_ID)
    .limit(5)

  if (!users?.length) {
    console.log('   ⚠️ Need existing users first')
    return
  }

  const activities = [
    { action: 'appointment.created', description: 'Cita programada para Max', minutesAgo: 5 },
    { action: 'pet.registered', description: 'Nuevo paciente: Luna', minutesAgo: 15 },
    { action: 'invoice.sent', description: 'Factura INV-2025-001 enviada', minutesAgo: 30 },
    { action: 'vaccine.administered', description: 'Vacuna antirrábica aplicada', minutesAgo: 45 },
    { action: 'prescription.created', description: 'Receta generada para Rocky', minutesAgo: 60 },
    { action: 'appointment.completed', description: 'Consulta completada - Mimi', minutesAgo: 90 },
    { action: 'store_order.shipped', description: 'Pedido ORD-001 enviado', minutesAgo: 120 },
    { action: 'client.registered', description: 'Nuevo cliente registrado', minutesAgo: 180 },
  ]

  for (let i = 0; i < activities.length; i++) {
    const activity = activities[i]
    const user = users[i % users.length]

    const { error } = await supabase.from('audit_logs').insert({
      id: uuid(),
      tenant_id: TENANT_ID,
      user_id: user.id,
      action: activity.action,
      resource: activity.action.split('.')[0],
      details: { description: activity.description },
      created_at: new Date(Date.now() - activity.minutesAgo * 60 * 1000).toISOString(),
    })

    if (error) {
      console.log(`   ⚠️ Activity: ${error.message}`)
    } else {
      console.log(`   ✅ ${activity.description} (${activity.minutesAgo}m ago)`)
    }
  }
}

async function seedLowStockAlerts(): Promise<void> {
  console.log('\n📦 Seeding low stock alerts...')

  // Get products with inventory
  const { data: inventory } = await supabase
    .from('store_inventory')
    .select('id, product_id, stock_quantity, reorder_point')
    .eq('tenant_id', TENANT_ID)
    .limit(10)

  if (!inventory?.length) {
    console.log('   ⚠️ Need existing inventory first')
    return
  }

  // Update some to be low stock
  const lowStockUpdates = inventory.slice(0, 5)
  for (const item of lowStockUpdates) {
    const { error } = await supabase
      .from('store_inventory')
      .update({
        stock_quantity: Math.max(0, Math.floor(Math.random() * 5)),
        reorder_point: 10,
      })
      .eq('id', item.id)

    if (error) {
      console.log(`   ⚠️ Stock update: ${error.message}`)
    } else {
      console.log(`   ✅ Set low stock for product ${item.product_id}`)
    }
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  console.log('🚀 Seeding Dashboard Test Data')
  console.log('================================')
  console.log(`Tenant: ${TENANT_ID}`)
  console.log(`Date: ${today()}`)

  try {
    await seedTodayAppointments()
    await seedPendingVaccines()
    await seedPendingInvoices()
    await seedRecentStoreOrders()
    await seedRecentActivity()
    await seedLowStockAlerts()

    console.log('\n✅ Dashboard test data seeding complete!')
    console.log('\nRefresh http://localhost:3000/terrapet/dashboard to see the data.')
  } catch (error) {
    console.error('\n❌ Error during seeding:', error)
    process.exit(1)
  }
}

main()
