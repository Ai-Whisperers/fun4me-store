#!/usr/bin/env npx tsx
/**
 * Seed Demo Data
 *
 * Standalone script to generate comprehensive demo data for visual testing.
 * Run after the main seed to populate realistic clinical history.
 *
 * Usage:
 *   npx tsx db/seeds/scripts/seed-demo-data.ts
 *   npx tsx db/seeds/scripts/seed-demo-data.ts --tenant terrapet
 *   npx tsx db/seeds/scripts/seed-demo-data.ts --tenants terrapet,petlife --verbose
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import { seedDemoData } from './seeders/demo-data-seeder'

async function main() {
  const args = process.argv.slice(2)
  let tenants = ['terrapet']
  let verbose = false

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--tenant' && args[i + 1]) {
      tenants = [args[i + 1]]
      i++
    } else if (args[i] === '--tenants' && args[i + 1]) {
      tenants = args[i + 1].split(',').map((t) => t.trim())
      i++
    } else if (args[i] === '--verbose') {
      verbose = true
    } else if (args[i] === '--help') {
      console.log(`
Seed Demo Data - Generate comprehensive demo data for visual testing

Usage:
  npx tsx db/seeds/scripts/seed-demo-data.ts [options]

Options:
  --tenant <name>       Seed single tenant (default: terrapet)
  --tenants <list>      Seed multiple tenants (comma-separated)
  --verbose             Show detailed progress
  --help                Show this help

Examples:
  npx tsx db/seeds/scripts/seed-demo-data.ts
  npx tsx db/seeds/scripts/seed-demo-data.ts --tenant petlife
  npx tsx db/seeds/scripts/seed-demo-data.ts --tenants terrapet,petlife --verbose
      `)
      process.exit(0)
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      'Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    )
    process.exit(1)
  }

  const client = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  })

  console.log('🌱 Seeding Demo Data')
  console.log('==================')
  console.log(`Tenants: ${tenants.join(', ')}`)
  console.log('')

  const allCounts: Record<string, Record<string, number>> = {}
  let allSuccess = true

  for (const tenant of tenants) {
    console.log(`\n📦 Processing tenant: ${tenant}`)
    console.log('-'.repeat(40))

    const { success, counts } = await seedDemoData(client, tenant, verbose)

    if (!success) {
      console.error(`❌ Failed to seed demo data for ${tenant}`)
      allSuccess = false
      continue
    }

    allCounts[tenant] = counts

    // Print summary
    console.log('\nData created:')
    for (const [table, count] of Object.entries(counts)) {
      if (count > 0) {
        console.log(`  ✅ ${table}: ${count}`)
      }
    }
  }

  console.log('\n==================')
  console.log(allSuccess ? '✅ Demo data seeding complete!' : '⚠️ Some tenants had errors')

  // Print totals
  console.log('\nTotal records created:')
  const totals: Record<string, number> = {}
  for (const counts of Object.values(allCounts)) {
    for (const [table, count] of Object.entries(counts)) {
      totals[table] = (totals[table] || 0) + count
    }
  }
  for (const [table, count] of Object.entries(totals).sort((a, b) => b[1] - a[1])) {
    if (count > 0) {
      console.log(`  ${table}: ${count}`)
    }
  }

  process.exit(allSuccess ? 0 : 1)
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
