/**
 * Reset Test Database
 *
 * Runs cleanup SQL scripts to reset the test database to a clean state.
 * Use before running integration/system tests.
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function resetDatabase() {
  console.log('🧹 Resetting test database...')

  try {
    // Clean test data from tables in reverse dependency order
    const tables = [
      'vaccine_reactions',
      'vaccines',
      'medical_records',
      'prescriptions',
      'appointments',
      'euthanasia_assessments',
      'reproductive_cycles',
      'loyalty_points',
      'qr_tags',
      'pets',
      'products',
      'clinic_invites',
      // Don't delete: profiles (linked to auth.users), tenants (seed data)
    ]

    for (const table of tables) {
      console.log(`  Cleaning ${table}...`)
      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

      if (error && !error.message.includes('No rows')) {
        console.warn(`  Warning: ${table} - ${error.message}`)
      }
    }

    // Clean test profiles (keep any real users)
    console.log('  Cleaning test profiles...')
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .ilike('email', '%@test.local')

    if (profileError) {
      console.warn(`  Warning: profiles - ${profileError.message}`)
    }

    console.log('✅ Database reset complete')
  } catch (error) {
    console.error('❌ Database reset failed:', error)
    process.exit(1)
  }
}

resetDatabase()
