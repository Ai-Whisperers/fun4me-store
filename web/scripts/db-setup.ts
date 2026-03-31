#!/usr/bin/env tsx
/**
 * Unified Database Setup Script
 *
 * Provides a single entry point for all database operations:
 * - setup: Complete database setup with schema and seed data
 * - reset: Clean database and setup from scratch
 * - seed: Seed data only (requires schema to exist)
 * - users: Create demo users only
 * - validate: Validate schema and data
 *
 * Usage:
 *   npx tsx web/scripts/db-setup.ts <command> [environment]
 *
 * Commands:
 *   setup [env]     Full database setup
 *   reset [env]     Clean and setup (DESTRUCTIVE)
 *   seed [env]      Seed data only
 *   users           Create demo users
 *   validate        Validate schema
 *   info            Show current database info
 *
 * Environments: dev (default), test, prod
 *
 * Examples:
 *   npx tsx web/scripts/db-setup.ts setup dev
 *   npx tsx web/scripts/db-setup.ts reset test
 *   npx tsx web/scripts/db-setup.ts users
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || ''

type Environment = 'dev' | 'test' | 'prod'

interface DemoUser {
  email: string
  password: string
  name: string
  role: 'owner' | 'vet' | 'admin'
  tenant: string
  phone?: string
}

const DEMO_USERS: DemoUser[] = [
  {
    email: 'admin@demo.com',
    password: 'password123',
    name: 'Admin Adris',
    role: 'admin',
    tenant: 'terrapet',
  },
  {
    email: 'vet@demo.com',
    password: 'password123',
    name: 'Dr. House',
    role: 'vet',
    tenant: 'terrapet',
  },
  {
    email: 'owner@demo.com',
    password: 'password123',
    name: 'Juan Perez',
    role: 'owner',
    tenant: 'terrapet',
    phone: '+595981234567',
  },
  {
    email: 'owner2@demo.com',
    password: 'password123',
    name: 'Maria Gonzalez',
    role: 'owner',
    tenant: 'terrapet',
    phone: '+595987654321',
  },
  {
    email: 'vet@petlife.com',
    password: 'password123',
    name: 'Dr. PetLife',
    role: 'vet',
    tenant: 'petlife',
  },
  {
    email: 'admin@petlife.com',
    password: 'password123',
    name: 'Admin PetLife',
    role: 'admin',
    tenant: 'petlife',
  },
]

// Schema files in execution order
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
  // Extended features
  '21_schema_invoicing.sql',
  '22_schema_reminders.sql',
  '23_schema_hospitalization.sql',
  '24_schema_lab_results.sql',
  '25_schema_consent.sql',
  '26_schema_staff.sql',
  '27_schema_messaging.sql',
  '28_schema_insurance.sql',
  // Infrastructure
  '11_indexes.sql',
  '12_functions.sql',
  '13_triggers.sql',
  '14_rls_policies.sql',
  '50_rls_policies_complete.sql',
  '15_rpcs.sql',
  '16_storage.sql',
  '17_realtime.sql',
  // System features
  '29_soft_deletes.sql',
  '30_enhanced_audit.sql',
  '31_materialized_views.sql',
  '32_scheduled_jobs.sql',
  // Tenant & appointments
  '51_fk_cascades.sql',
  '52_performance_indexes.sql',
  '53_updated_at_triggers.sql',
  '54_tenant_setup.sql',
  '55_appointment_overlap.sql',
  '56_appointment_functions.sql',
  '57_materialized_views.sql',
  '58_appointment_workflow.sql',
  // Additional migrations
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

// Seed files by environment (90+ series)
const SEED_FILES: Record<Environment, string[]> = {
  dev: [
    '90_seed_tenants.sql',
    '91_seed_demo_users.sql',
    '92_seed_services.sql',
    '93_seed_store.sql',
    '94_seed_pets.sql',
    '95_seed_appointments.sql',
    '96_seed_invites.sql',
    '99_seed_finalize.sql',
  ],
  test: [
    '90_seed_tenants.sql',
    '91_seed_demo_users.sql',
    '92_seed_services.sql',
    '93_seed_store.sql',
    '94_seed_pets.sql',
    '95_seed_appointments.sql',
    '96_seed_invites.sql',
    '99_seed_finalize.sql',
  ],
  prod: ['90_seed_tenants.sql'],
}

class DatabaseSetup {
  private supabase: SupabaseClient
  private supabaseAdmin: SupabaseClient
  private dbDir: string

  constructor() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('❌ Missing environment variables:')
      console.error('   NEXT_PUBLIC_SUPABASE_URL')
      console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY')
      process.exit(1)
    }

    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    if (SUPABASE_SERVICE_KEY) {
      this.supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    } else {
      console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not set - some operations will be limited')
      this.supabaseAdmin = this.supabase
    }

    this.dbDir = path.resolve(__dirname, '../db')
  }

  private log(message: string): void {
    console.log(message)
  }

  private logFile(filename: string, success: boolean, message?: string): void {
    if (success) {
      console.log(`   ✅ ${filename}`)
    } else {
      console.log(`   ❌ ${filename}${message ? `: ${message}` : ''}`)
    }
  }

  async executeSQL(filename: string): Promise<boolean> {
    const filePath = path.join(this.dbDir, filename)

    if (!fs.existsSync(filePath)) {
      console.log(`   ⏭️  Skipping (not found): ${filename}`)
      return true
    }

    const sql = fs.readFileSync(filePath, 'utf8')

    // Note: This requires the exec_sql function to exist in Supabase
    // Alternatively, use direct database connection with pg library
    try {
      const { error } = await this.supabaseAdmin.rpc('exec_sql', { sql_query: sql })

      if (error) {
        this.logFile(filename, false, error.message)
        return false
      }

      this.logFile(filename, true)
      return true
    } catch (err: unknown) {
      // RPC might not exist, try raw query (requires DATABASE_URL)
      this.logFile(filename, false, String(err))
      return false
    }
  }

  async cleanup(): Promise<void> {
    console.log('\n🧹 Running cleanup...\n')
    console.log('   ⚠️  This will DELETE ALL DATA!\n')

    const success = await this.executeSQL('00_cleanup.sql')

    if (success) {
      console.log('\n   ✅ Cleanup complete\n')
    } else {
      console.log('\n   ❌ Cleanup failed\n')
    }
  }

  async createUsers(): Promise<void> {
    console.log('\n👥 Creating demo users...\n')

    for (const user of DEMO_USERS) {
      try {
        // Try to create user
        const { data: existingUsers } = await this.supabaseAdmin.auth.admin.listUsers()
        const exists = existingUsers?.users?.find((u) => u.email === user.email)

        if (exists) {
          console.log(`   ✅ ${user.email} (exists)`)

          // Update profile
          await this.supabaseAdmin
            .from('profiles')
            .update({
              role: user.role,
              tenant_id: user.tenant,
              full_name: user.name,
              phone: user.phone || null,
            })
            .eq('id', exists.id)

          continue
        }

        const { data, error } = await this.supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: { full_name: user.name },
        })

        if (error) {
          console.log(`   ❌ ${user.email}: ${error.message}`)
        } else if (data.user) {
          console.log(`   ✅ ${user.email} (created)`)

          // Update profile with correct role and tenant
          await this.supabaseAdmin
            .from('profiles')
            .update({
              role: user.role,
              tenant_id: user.tenant,
              full_name: user.name,
              phone: user.phone || null,
            })
            .eq('id', data.user.id)
        }
      } catch (err) {
        console.log(`   ❌ ${user.email}: ${err}`)
      }
    }

    console.log('\n   ✨ User creation complete\n')
  }

  async seed(env: Environment = 'dev'): Promise<void> {
    console.log(`\n🌱 Seeding data for: ${env.toUpperCase()}\n`)

    // Create users first
    await this.createUsers()

    // Execute seed files
    const seedFiles = SEED_FILES[env]

    if (seedFiles.length === 0) {
      console.log('   ℹ️  No seed files for production environment\n')
      return
    }

    console.log('   Executing seed files...\n')

    for (const file of seedFiles) {
      await this.executeSQL(file)
    }

    console.log('\n   ✨ Seeding complete\n')
  }

  async setup(env: Environment = 'dev'): Promise<void> {
    console.log(`\n🚀 Setting up database for: ${env.toUpperCase()}\n`)
    console.log('─'.repeat(60))

    // Execute schema files
    console.log('\n📦 Executing schema files...\n')

    let failed = 0
    for (const file of SCHEMA_FILES) {
      const success = await this.executeSQL(file)
      if (!success) failed++
    }

    if (failed > 0) {
      console.log(`\n   ⚠️  ${failed} file(s) failed to execute\n`)
    }

    // Seed based on environment
    if (env !== 'prod') {
      await this.seed(env)
    }

    console.log('\n✨ Database setup complete!\n')
    console.log('─'.repeat(60))
    console.log('\nTest Accounts:')
    console.log('  owner@demo.com / password123  (Pet owner - 3 pets)')
    console.log('  owner2@demo.com / password123 (Pet owner - 2 pets)')
    console.log('  vet@demo.com / password123    (Veterinarian)')
    console.log('  admin@demo.com / password123  (Admin)')
    console.log('\nURLs:')
    console.log('  http://localhost:3000/terrapet   (Veterinaria Adris)')
    console.log('  http://localhost:3000/petlife (PetLife Center)')
    console.log()
  }

  async reset(env: Environment = 'dev'): Promise<void> {
    console.log('\n⚠️  DATABASE RESET\n')
    console.log('   This will DELETE ALL DATA and recreate the schema.\n')
    console.log('   Press Ctrl+C within 5 seconds to cancel...\n')

    await new Promise((resolve) => setTimeout(resolve, 5000))

    await this.cleanup()
    await this.setup(env)
  }

  async validate(): Promise<void> {
    console.log('\n🔍 Validating database...\n')

    // Check critical tables
    console.log('   Checking tables:\n')
    const tables = [
      'tenants',
      'profiles',
      'pets',
      'vaccines',
      'appointments',
      'invoices',
      'services',
      'store_products',
    ]

    for (const table of tables) {
      try {
        const { count, error } = await this.supabaseAdmin
          .from(table)
          .select('*', { count: 'exact', head: true })

        if (error) {
          console.log(`   ❌ ${table}: ${error.message}`)
        } else {
          console.log(`   ✅ ${table} (${count} rows)`)
        }
      } catch (_error: unknown) {
        console.log(`   ❌ ${table}: Error accessing table`)
      }
    }

    // Check tenants
    console.log('\n   Checking tenants:\n')
    const { data: tenants } = await this.supabaseAdmin.from('tenants').select('id, name')
    if (tenants) {
      for (const t of tenants) {
        console.log(`   ✅ ${t.id}: ${t.name}`)
      }
    }

    // Check users
    console.log('\n   Checking users:\n')
    const { data: profiles } = await this.supabaseAdmin
      .from('profiles')
      .select('email, role, tenant_id')
      .order('role')

    if (profiles) {
      for (const p of profiles) {
        console.log(`   ✅ ${p.email} (${p.role} @ ${p.tenant_id})`)
      }
    }

    console.log('\n   ✨ Validation complete\n')
  }

  async info(): Promise<void> {
    console.log('\n📊 Database Information\n')
    console.log('─'.repeat(60))

    // Tenants
    const { data: tenants } = await this.supabaseAdmin.from('tenants').select('id, name')

    console.log('\nTenants:')
    if (tenants && tenants.length > 0) {
      for (const t of tenants) {
        const { count: petCount } = await this.supabaseAdmin
          .from('pets')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', t.id)

        const { count: userCount } = await this.supabaseAdmin
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', t.id)

        console.log(`  ${t.id}: ${t.name}`)
        console.log(`    Users: ${userCount || 0}, Pets: ${petCount || 0}`)
      }
    } else {
      console.log('  No tenants found')
    }

    // Products
    const { count: productCount } = await this.supabaseAdmin
      .from('store_products')
      .select('*', { count: 'exact', head: true })

    const { count: serviceCount } = await this.supabaseAdmin
      .from('services')
      .select('*', { count: 'exact', head: true })

    console.log(`\nStore: ${productCount || 0} products, ${serviceCount || 0} services`)

    // Appointments
    const { count: apptCount } = await this.supabaseAdmin
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .gte('start_time', new Date().toISOString())

    console.log(`Upcoming appointments: ${apptCount || 0}`)

    console.log()
  }
}

// Help text
function showHelp(): void {
  console.log(`
Database Setup Tool for Vete Platform

Usage: npx tsx web/scripts/db-setup.ts <command> [environment]

Commands:
  setup [env]     Full database setup (schema + seed)
  reset [env]     Clean and setup (DESTRUCTIVE - deletes all data)
  seed [env]      Seed data only (requires schema to exist)
  users           Create demo users only
  validate        Validate schema and data
  info            Show current database info
  help            Show this help

Environments:
  dev   (default) Development with full demo data
  test            Testing with comprehensive test data
  prod            Production (schema only, no seed data)

Examples:
  npx tsx web/scripts/db-setup.ts setup           # Setup for development
  npx tsx web/scripts/db-setup.ts reset test      # Reset for testing
  npx tsx web/scripts/db-setup.ts users           # Create users only
  npx tsx web/scripts/db-setup.ts validate        # Check database state

Demo Accounts (after setup):
  owner@demo.com   / password123  -> Pet owner with 3 pets
  owner2@demo.com  / password123  -> Pet owner with 2 pets
  vet@demo.com     / password123  -> Veterinarian
  admin@demo.com   / password123  -> Admin
  vet@petlife.com  / password123  -> PetLife vet

PREREQUISITES:
  This script requires the exec_sql RPC function to be installed first.
  Run 89_exec_sql_helper.sql in Supabase SQL Editor before using this script.

  Alternatively, run SQL files manually in Supabase SQL Editor in order.
`)
}

// Main
async function main(): Promise<void> {
  const [command, env] = process.argv.slice(2)
  const environment = (env || 'dev') as Environment

  if (!['dev', 'test', 'prod'].includes(environment)) {
    console.error(`Invalid environment: ${environment}`)
    console.error('Valid environments: dev, test, prod')
    process.exit(1)
  }

  const db = new DatabaseSetup()

  switch (command) {
    case 'setup':
      await db.setup(environment)
      break
    case 'reset':
      await db.reset(environment)
      break
    case 'seed':
      await db.seed(environment)
      break
    case 'users':
      await db.createUsers()
      break
    case 'validate':
      await db.validate()
      break
    case 'info':
      await db.info()
      break
    case 'help':
    case '--help':
    case '-h':
      showHelp()
      break
    default:
      showHelp()
  }
}

main().catch((err) => {
  console.error('❌ Error:', err)
  process.exit(1)
})
