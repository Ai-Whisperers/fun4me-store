#!/usr/bin/env tsx
/**
 * Database Setup Runner
 *
 * Runs the complete database setup against Supabase.
 * Requires DATABASE_URL environment variable with the connection string.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npx tsx web/scripts/run-db-setup.ts
 *   npx tsx web/scripts/run-db-setup.ts --reset   # Include cleanup
 *   npx tsx web/scripts/run-db-setup.ts --seed    # Include seed data (default)
 *   npx tsx web/scripts/run-db-setup.ts --no-seed # Skip seed data
 */

import { Client } from 'pg'
import fs from 'fs'
import path from 'path'

const DB_DIR = path.resolve(__dirname, '../db')

// All files in execution order
const SCHEMA_FILES = [
  '01_extensions.sql',
  '02_schema_core.sql',
  '03_schema_pets.sql',
  '04_schema_medical.sql',
  '05_schema_clinical.sql',
  '06_schema_appointments.sql',
  '07_schema_inventory.sql',
  '08_schema_finance.sql',
  '09_schema_safety.sql',
  '10_schema_epidemiology.sql',
  '11_indexes.sql',
  '12_functions.sql',
  '13_triggers.sql',
  '14_rls_policies.sql',
  '15_rpcs.sql',
  '16_storage.sql',
  '17_realtime.sql',
  '21_schema_invoicing.sql',
  '22_schema_reminders.sql',
  '23_schema_hospitalization.sql',
  '24_schema_lab_results.sql',
  '25_schema_consent.sql',
  '26_schema_staff.sql',
  '27_schema_messaging.sql',
  '28_schema_insurance.sql',
  '29_soft_deletes.sql',
  '30_enhanced_audit.sql',
  '31_materialized_views.sql',
  '32_scheduled_jobs.sql',
  '50_rls_policies_complete.sql',
  '51_fk_cascades.sql',
  '52_performance_indexes.sql',
  '53_updated_at_triggers.sql',
  '54_tenant_setup.sql',
  '55_appointment_overlap.sql',
  '56_appointment_functions.sql',
  '57_materialized_views.sql',
  '58_appointment_workflow.sql',
  '70_whatsapp_messages.sql',
  '80_fix_missing_rls_and_indexes.sql',
  '81_checkout_functions.sql',
  '82_store_enhancements.sql',
  '83_store_orders.sql',
  '84_notification_read_status.sql',
  '85_fix_checkout_inventory_table.sql',
  '86_owner_clinic_connections.sql',
  '88_fix_checkout_schema_mismatch.sql',
  '89_exec_sql_helper.sql',
]

const SEED_FILES = [
  '90_seed_tenants.sql',
  '91_seed_demo_users.sql',
  '92_seed_services.sql',
  '93_seed_store.sql',
  '94_seed_pets.sql',
  '95_seed_appointments.sql',
  '96_seed_invites.sql',
  '99_seed_finalize.sql',
]

async function runSQL(client: Client, sql: string, fileName: string): Promise<boolean> {
  try {
    await client.query(sql)
    console.log(`  ✅ ${fileName}`)
    return true
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`  ❌ ${fileName}: ${message}`)
    return false
  }
}

async function main() {
  const args = process.argv.slice(2)
  const includeReset = args.includes('--reset') || args.includes('-r')
  const includeSeed = !args.includes('--no-seed')

  // Check for database credentials
  const databaseUrl = process.env.DATABASE_URL
  const dbHost = process.env.DB_HOST || 'db.okddppczckbjdotrxiev.supabase.co'
  const dbPort = parseInt(process.env.DB_PORT || '5432')
  const dbUser = process.env.DB_USER || 'postgres'
  const dbPassword = process.env.DB_PASSWORD
  const dbName = process.env.DB_NAME || 'postgres'

  if (!databaseUrl && !dbPassword) {
    console.log('\n📋 Database credentials not found.\n')
    console.log('To run this script, you need the Supabase database password.')
    console.log(
      '\n1. Go to: https://supabase.com/dashboard/project/okddppczcbkjdotrxiev/settings/database'
    )
    console.log('2. Copy the database password')
    console.log('3. Run:')
    console.log('\n   DB_PASSWORD="your-password" npx tsx web/scripts/run-db-setup.ts\n')
    console.log('\n--- ALTERNATIVE: Manual Setup ---\n')
    console.log('1. Open: web/db/_FULL_SETUP.sql')
    console.log('2. Copy all content')
    console.log('3. Go to: https://supabase.com/dashboard/project/okddppczcbkjdotrxiev/sql/new')
    console.log('4. Paste and click "Run"')
    console.log('\nTo regenerate _FULL_SETUP.sql with options:')
    console.log('   npx tsx web/scripts/generate-full-sql.ts --seed --reset')
    console.log('')
    process.exit(1)
  }

  console.log('\n🚀 Database Setup Runner\n')
  console.log(`Options:`)
  console.log(`  Reset: ${includeReset ? 'YES (will delete all data!)' : 'NO'}`)
  console.log(`  Seed:  ${includeSeed ? 'YES' : 'NO'}`)
  console.log('')

  // Connect to database - prefer individual params over URL for special characters
  const client = dbPassword
    ? new Client({
        host: dbHost,
        port: dbPort,
        user: dbUser,
        password: dbPassword,
        database: dbName,
        ssl: { rejectUnauthorized: false },
      })
    : new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } })

  try {
    console.log('📡 Connecting to database...')
    await client.connect()
    console.log('✅ Connected!\n')

    let success = 0
    let failed = 0

    // Run cleanup if requested
    if (includeReset) {
      console.log('🧹 Running cleanup...')
      const cleanupPath = path.join(DB_DIR, '00_cleanup.sql')
      if (fs.existsSync(cleanupPath)) {
        const sql = fs.readFileSync(cleanupPath, 'utf8')
        if (await runSQL(client, sql, '00_cleanup.sql')) {
          success++
        } else {
          failed++
        }
      }
      console.log('')
    }

    // Run schema files
    console.log('📦 Running schema files...')
    for (const file of SCHEMA_FILES) {
      const filePath = path.join(DB_DIR, file)
      if (fs.existsSync(filePath)) {
        const sql = fs.readFileSync(filePath, 'utf8')
        if (await runSQL(client, sql, file)) {
          success++
        } else {
          failed++
        }
      } else {
        console.log(`  ⏭️  Skipping (not found): ${file}`)
      }
    }
    console.log('')

    // Run seed files
    if (includeSeed) {
      console.log('🌱 Running seed files...')
      for (const file of SEED_FILES) {
        const filePath = path.join(DB_DIR, file)
        if (fs.existsSync(filePath)) {
          const sql = fs.readFileSync(filePath, 'utf8')
          if (await runSQL(client, sql, file)) {
            success++
          } else {
            failed++
          }
        } else {
          console.log(`  ⏭️  Skipping (not found): ${file}`)
        }
      }
      console.log('')
    }

    console.log('============================================')
    console.log('SETUP COMPLETE')
    console.log('============================================')
    console.log(`  Success: ${success}`)
    console.log(`  Failed:  ${failed}`)
    console.log('')

    if (includeSeed) {
      console.log('🔑 Demo accounts (password: password123):')
      console.log('   owner@demo.com  - Pet owner with 3 pets')
      console.log('   owner2@demo.com - Pet owner with 2 pets')
      console.log('   vet@demo.com    - Veterinarian')
      console.log('   admin@demo.com  - Clinic admin')
      console.log('')
      console.log('🌐 Access the app at:')
      console.log('   http://localhost:3000/terrapet')
      console.log('   http://localhost:3000/petlife')
    }
    console.log('')
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`\n❌ Connection error: ${message}\n`)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
