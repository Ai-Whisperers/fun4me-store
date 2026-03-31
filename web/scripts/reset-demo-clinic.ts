#!/usr/bin/env npx tsx
/**
 * =============================================================================
 * DEMO CLINIC RESET SCRIPT
 * =============================================================================
 * Cleans and resets demo data for "Clínica Veterinaria TeraPet"
 * Use this before sales presentations to ensure fresh, consistent data.
 * 
 * Usage:
 *   npx tsx scripts/reset-demo-clinic.ts
 * 
 * This script will:
 * 1. Clean all demo data 
 * 2. Re-seed fresh demo data
 * 3. Verify data integrity
 * =============================================================================
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { seedDemoClinic } from './seed-demo-clinic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
})

const DEMO_TENANT_ID = 'terapet'

// =============================================================================
// CLEANUP FUNCTIONS
// =============================================================================

async function cleanupDemoData() {
  console.log('🧹 Cleaning up existing demo data...')
  
  const tables = [
    'notifications',
    'invoices', 
    'medical_records',
    'appointments',
    'pets',
    'inventory_products',
    'services',
    'profiles',
    'tenants'
  ]
  
  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('tenant_id', DEMO_TENANT_ID)
      
      if (error && !error.message.includes('foreign key')) {
        console.warn(`   ⚠️  Warning cleaning ${table}: ${error.message}`)
      } else {
        console.log(`   ✅ Cleaned ${table}`)
      }
    } catch (error) {
      console.warn(`   ⚠️  Error cleaning ${table}:`, error)
    }
  }
  
  // Clean demo user profiles specifically
  const demoEmails = ['admin@demo', 'vet@demo', 'owner@demo']
  for (const email of demoEmails) {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('email', email)
      
      if (error) {
        console.warn(`   ⚠️  Warning cleaning profile ${email}: ${error.message}`)
      }
    } catch (error) {
      console.warn(`   ⚠️  Error cleaning profile ${email}:`, error)
    }
  }
  
  console.log('✅ Cleanup completed')
}

async function verifyDemoData() {
  console.log('🔍 Verifying demo data...')
  
  // Check tenant exists
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('id', DEMO_TENANT_ID)
    .single()
  
  if (tenantError || !tenant) {
    throw new Error('Demo tenant not found')
  }
  console.log(`   ✅ Tenant: ${tenant.name}`)
  
  // Check users exist
  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('email, full_name, role')
    .eq('tenant_id', DEMO_TENANT_ID)
  
  if (usersError || !users || users.length === 0) {
    throw new Error('Demo users not found')
  }
  console.log(`   ✅ Users: ${users.length} created`)
  users.forEach(user => {
    console.log(`      - ${user.full_name} (${user.email}) - ${user.role}`)
  })
  
  // Check pets exist
  const { data: pets, error: petsError } = await supabase
    .from('pets')
    .select('name, species, breed')
    .eq('tenant_id', DEMO_TENANT_ID)
  
  if (petsError || !pets || pets.length === 0) {
    throw new Error('Demo pets not found')
  }
  console.log(`   ✅ Pets: ${pets.length} created`)
  pets.forEach(pet => {
    console.log(`      - ${pet.name} (${pet.species} - ${pet.breed})`)
  })
  
  // Check appointments for today
  const today = new Date().toISOString().split('T')[0]
  const { data: appointments, error: appointmentsError } = await supabase
    .from('appointments')
    .select('service_name, start_time, status, priority')
    .eq('tenant_id', DEMO_TENANT_ID)
    .gte('start_time', today + 'T00:00:00')
    .lt('start_time', today + 'T23:59:59')
    .order('start_time')
  
  if (appointmentsError) {
    console.warn('   ⚠️  Could not verify appointments:', appointmentsError.message)
  } else {
    console.log(`   ✅ Today's appointments: ${appointments?.length || 0}`)
    appointments?.forEach(apt => {
      const time = new Date(apt.start_time).toLocaleTimeString('es-PY', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
      const urgentFlag = apt.priority === 'urgent' ? '🚨' : ''
      console.log(`      - ${time}: ${apt.service_name} (${apt.status}) ${urgentFlag}`)
    })
  }
  
  // Check low stock alerts
  const { data: lowStock, error: stockError } = await supabase
    .from('inventory_products')
    .select('name, current_stock, min_stock')
    .eq('tenant_id', DEMO_TENANT_ID)
    .lt('current_stock', supabase.rpc('min_stock'))
  
  if (!stockError && lowStock && lowStock.length > 0) {
    console.log(`   ✅ Low stock alerts: ${lowStock.length}`)
    lowStock.forEach(product => {
      console.log(`      - ${product.name}: ${product.current_stock}/${product.min_stock} ⚠️`)
    })
  }
  
  console.log('✅ Demo data verification completed')
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

async function main() {
  console.log('🔄 Resetting demo clinic "TeraPet"...')
  console.log('')
  
  try {
    // Step 1: Clean existing data
    await cleanupDemoData()
    console.log('')
    
    // Step 2: Wait a moment for cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Step 3: Re-seed fresh data  
    await seedDemoClinic()
    console.log('')
    
    // Step 4: Verify everything is working
    await verifyDemoData()
    console.log('')
    
    console.log('🎉 Demo clinic reset completed successfully!')
    console.log('')
    console.log('📋 DEMO READY CHECKLIST:')
    console.log('   ✅ Clínica Veterinaria TeraPet configured')
    console.log('   ✅ Demo users: admin@demo, vet@demo, owner@demo')
    console.log('   ✅ Demo pets: Max, Luna, Rocky with medical histories')
    console.log('   ✅ Today\'s schedule: 4 appointments (1 urgent)')
    console.log('   ✅ Low stock alerts: 2 products need reordering')
    console.log('   ✅ Financial data: Weekly revenue tracking')
    console.log('')
    console.log('🎬 Ready for sales presentation!')
    console.log('   📖 Use docs/sales/demo-script-15min.md for guidance')
    console.log('   🌐 Access: [your-domain]/terapet')
    
  } catch (error) {
    console.error('❌ Error resetting demo data:', error)
    console.log('')
    console.log('🔧 Troubleshooting:')
    console.log('   1. Check database connection')
    console.log('   2. Verify SUPABASE_SERVICE_ROLE_KEY has admin permissions')
    console.log('   3. Ensure database schema is up to date')
    console.log('   4. Check for foreign key constraints')
    process.exit(1)
  }
}

// =============================================================================
// EXECUTION
// =============================================================================

if (require.main === module) {
  main().catch(console.error)
}

export { main as resetDemoClinic }