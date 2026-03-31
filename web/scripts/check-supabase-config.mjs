#!/usr/bin/env node
/**
 * Supabase Configuration Checker for E2E Tests
 * 
 * Verifies Supabase is properly configured for E2E testing
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('\n=== Supabase Configuration Check ===\n')

// Check environment variables
console.log('1. Environment Variables:')
console.log(`   URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`)
console.log(`   Anon Key: ${anonKey ? '✅ Set' : '❌ Missing'}`)
console.log(`   Service Key: ${serviceKey ? '✅ Set' : '❌ Missing'}`)

if (!supabaseUrl || !serviceKey) {
  console.log('\n❌ Missing required environment variables\n')
  process.exit(1)
}

// Test service role client
console.log('\n2. Service Role Permissions:')
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

try {
  // Test admin API access
  const { data: users, error } = await supabase.auth.admin.listUsers()
  
  if (error) {
    console.log(`   ❌ Cannot list users: ${error.message}`)
  } else {
    console.log(`   ✅ Can list users (found ${users.users.length})`)
    
    // Check for test users
    const testUsers = users.users.filter(u => u.email?.includes('@test.local'))
    console.log(`   ℹ️  Test users found: ${testUsers.length}`)
    testUsers.forEach(u => console.log(`      - ${u.email}`))
  }
} catch (err) {
  console.log(`   ❌ Error: ${err.message}`)
}

// Test database access
console.log('\n3. Database Access:')
try {
  const { count, error } = await supabase
    .from('tenants')
    .select('*', { count: 'exact', head: true })
  
  if (error) {
    console.log(`   ❌ Cannot query tenants: ${error.message}`)
  } else {
    console.log(`   ✅ Can query database (${count} tenants)`)
  }
} catch (err) {
  console.log(`   ❌ Error: ${err.message}`)
}

// Check schema for problematic columns
console.log('\n4. Schema Checks:')
const schemaChecks = [
  { table: 'loyalty_points', column: 'user_id' },
  { table: 'store_coupons', column: 'discount_type' },
  { table: 'appointments', column: 'preferred_date_start' },
]

for (const check of schemaChecks) {
  try {
    // Try to select the column
    const { error } = await supabase
      .from(check.table)
      .select(check.column)
      .limit(0)
    
    if (error) {
      if (error.message.includes(`column "${check.column}"`)) {
        console.log(`   ⚠️  ${check.table}.${check.column} - NOT FOUND`)
      } else {
        console.log(`   ❓ ${check.table}.${check.column} - ${error.message}`)
      }
    } else {
      console.log(`   ✅ ${check.table}.${check.column} - exists`)
    }
  } catch (err) {
    console.log(`   ❌ ${check.table}.${check.column} - ${err.message}`)
  }
}

// Recommendations
console.log('\n=== Recommendations ===\n')
console.log('For better E2E testing:')
console.log('')
console.log('1. ⚙️  Auth Settings (Supabase Dashboard → Auth → Settings):')
console.log('   - Disable email confirmations for test users')
console.log('   - Increase rate limits or whitelist test IPs')
console.log('')
console.log('2. 🗄️  Database Schema:')
console.log('   - Fix missing columns (see schema checks above)')
console.log('   - Or keep test setup code disabled')
console.log('')
console.log('3. 🌳 Consider:')
console.log('   - Create separate test project/branch')
console.log('   - Add SQL seed script for test data')
console.log('')

console.log('=== End of Check ===\n')
