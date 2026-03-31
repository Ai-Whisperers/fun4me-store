#!/usr/bin/env tsx
/**
 * Generate Full SQL Script
 *
 * Combines all SQL files in the correct order into a single file
 * that can be copy-pasted into Supabase SQL Editor.
 *
 * Usage:
 *   npx tsx web/scripts/generate-full-sql.ts
 *   npx tsx web/scripts/generate-full-sql.ts --seed   # Include seed data
 *   npx tsx web/scripts/generate-full-sql.ts --reset  # Include cleanup
 */

import fs from 'fs'
import path from 'path'

const DB_DIR = path.resolve(__dirname, '../db')
const OUTPUT_FILE = path.resolve(__dirname, '../db/_FULL_SETUP.sql')

// All files in execution order
const ALL_FILES = [
  // Extensions & Core Schema
  '01_extensions.sql',
  '02_schema_core.sql',
  '03_schema_pets.sql',
  '05_schema_clinical.sql', // Must come before medical (diagnosis_codes dependency)
  '04_schema_medical.sql',
  '06_schema_appointments.sql',
  '07_schema_inventory.sql',
  '08_schema_finance.sql',
  '09_schema_safety.sql',
  '10_schema_epidemiology.sql',
  // Functions & Security
  '11_indexes.sql',
  '12_functions.sql',
  '13_triggers.sql',
  '14_rls_policies.sql',
  '15_rpcs.sql',
  '16_storage.sql',
  '17_realtime.sql',
  // Extended Features
  '21_schema_invoicing.sql',
  '22_schema_reminders.sql',
  '23_schema_hospitalization.sql',
  '24_schema_lab_results.sql',
  '25_schema_consent.sql',
  '26_schema_staff.sql',
  '27_schema_messaging.sql',
  '28_schema_insurance.sql',
  // System Features
  '29_soft_deletes.sql',
  '30_enhanced_audit.sql',
  '31_materialized_views.sql',
  '32_scheduled_jobs.sql',
  // Additional Features (50+)
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
  // Fixes (80+)
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

function main() {
  const args = process.argv.slice(2)
  const includeSeed = args.includes('--seed') || args.includes('-s')
  const includeReset = args.includes('--reset') || args.includes('-r')

  console.log('\n📦 Generating full SQL setup script...\n')

  let output = `-- =============================================================================
-- FULL DATABASE SETUP SCRIPT
-- =============================================================================
-- Generated: ${new Date().toISOString()}
--
-- This file combines all SQL migrations in the correct order.
-- Copy and paste into Supabase SQL Editor to set up the database.
--
-- Options used:
--   Reset: ${includeReset ? 'YES (will delete all data!)' : 'NO'}
--   Seed:  ${includeSeed ? 'YES (demo data included)' : 'NO'}
-- =============================================================================

`

  const filesToProcess = [
    ...(includeReset ? ['00_cleanup.sql'] : []),
    ...ALL_FILES,
    ...(includeSeed ? SEED_FILES : []),
  ]

  let processed = 0
  let skipped = 0

  for (const file of filesToProcess) {
    const filePath = path.join(DB_DIR, file)

    if (!fs.existsSync(filePath)) {
      console.log(`  ⏭️  Skipping (not found): ${file}`)
      skipped++
      continue
    }

    const content = fs.readFileSync(filePath, 'utf8')

    output += `
-- =============================================================================
-- FILE: ${file}
-- =============================================================================

${content}

`
    console.log(`  ✅ ${file}`)
    processed++
  }

  // Write output
  fs.writeFileSync(OUTPUT_FILE, output)

  console.log(`\n✨ Generated: ${OUTPUT_FILE}`)
  console.log(`   Files processed: ${processed}`)
  console.log(`   Files skipped: ${skipped}`)
  console.log(`   Total size: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(1)} KB`)

  console.log(`\n📋 Next steps:`)
  console.log(`   1. Open: ${OUTPUT_FILE}`)
  console.log(`   2. Copy all content`)
  console.log(`   3. Paste into Supabase SQL Editor`)
  console.log(`   4. Click "Run"`)

  if (includeSeed) {
    console.log(`\n🔑 Demo accounts (password: password123):`)
    console.log(`   owner@demo.com  - Pet owner with 3 pets`)
    console.log(`   vet@demo.com    - Veterinarian`)
    console.log(`   admin@demo.com  - Clinic admin`)
  }

  console.log()
}

main()
