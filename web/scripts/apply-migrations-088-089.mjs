#!/usr/bin/env node
/**
 * Apply migrations 088-089 (Atomic Appointment Functions)
 * 
 * Usage:
 *   node scripts/apply-migrations-088-089.mjs [--dry-run]
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DRY_RUN = process.argv.includes('--dry-run')

// Initialize Supabase client with service role (bypasses RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

/**
 * Execute SQL migration
 */
async function executeMigration(fileName, sql) {
  console.log(`\n📄 Processing: ${fileName}`)
  console.log('─'.repeat(80))
  
  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - SQL preview:')
    console.log(sql.substring(0, 500) + '...')
    return { success: true, dryRun: true }
  }

  try {
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
    
    if (error) {
      // Supabase doesn't have exec_sql by default, use direct query
      // We'll split by semicolon and execute statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))
      
      for (const statement of statements) {
        if (statement.length === 0) continue
        
        console.log(`  ⚙️  Executing statement...`)
        const { error: stmtError } = await supabase.rpc('exec', { sql: statement })
        
        if (stmtError) {
          // Try direct connection approach (this requires DATABASE_URL)
          console.log(`  ⚠️  RPC approach failed, trying direct connection...`)
          const { Pool } = await import('pg')
          const pool = new Pool({ connectionString: process.env.DATABASE_URL })
          
          try {
            await pool.query(statement)
            console.log(`  ✅ Statement executed successfully`)
          } catch (pgError) {
            console.error(`  ❌ Statement failed:`, pgError.message)
            throw pgError
          } finally {
            await pool.end()
          }
        } else {
          console.log(`  ✅ Statement executed successfully`)
        }
      }
    }

    console.log(`✅ ${fileName} applied successfully`)
    return { success: true }
    
  } catch (error) {
    console.error(`❌ Failed to apply ${fileName}:`, error.message)
    return { success: false, error }
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Applying Atomic Appointment Migrations (088-089)')
  console.log('═'.repeat(80))
  
  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n')
  }

  const migrationsDir = join(__dirname, '..', 'db', 'migrations')
  
  const migrations = [
    '088_atomic_appointment_booking.sql',
    '089_atomic_appointment_reschedule.sql'
  ]

  const results = []

  for (const migration of migrations) {
    const filePath = join(migrationsDir, migration)
    
    try {
      const sql = readFileSync(filePath, 'utf8')
      const result = await executeMigration(migration, sql)
      results.push({ migration, ...result })
    } catch (error) {
      console.error(`❌ Failed to read ${migration}:`, error.message)
      results.push({ migration, success: false, error })
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(80))
  console.log('📊 SUMMARY')
  console.log('═'.repeat(80))
  
  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  
  console.log(`✅ Successful: ${successful}`)
  console.log(`❌ Failed: ${failed}`)
  
  if (DRY_RUN) {
    console.log('\n⚠️  This was a DRY RUN. No changes were made.')
    console.log('Run without --dry-run to apply migrations.')
  }

  if (failed > 0) {
    console.log('\n❌ Some migrations failed. Please check the errors above.')
    process.exit(1)
  }

  console.log('\n✅ All migrations applied successfully!')
  process.exit(0)
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error)
  process.exit(1)
})
