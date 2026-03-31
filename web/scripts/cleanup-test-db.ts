/**
 * Test Database Cleanup Script
 * 
 * Removes all test data from the database to ensure clean test runs.
 * Safe to run before/after test suites in CI/CD or locally.
 * 
 * Usage:
 *   npx tsx scripts/cleanup-test-db.ts
 *   npx tsx scripts/cleanup-test-db.ts --dry-run
 *   npx tsx scripts/cleanup-test-db.ts --verbose
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })

interface CleanupStats {
  profiles: number
  pets: number
  appointments: number
  vaccines: number
  prescriptions: number
  lab_orders: number
  invoices: number
  orphanedProfiles: number
  authUsers: number
}

interface CleanupOptions {
  dryRun: boolean
  verbose: boolean
}

/**
 * Parse command line arguments
 */
function parseArgs(): CleanupOptions {
  const args = process.argv.slice(2)
  return {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose') || args.includes('-v'),
  }
}

/**
 * Create Supabase admin client
 */
function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'Missing required environment variables:\n' +
        `  NEXT_PUBLIC_SUPABASE_URL: ${url ? 'OK' : 'MISSING'}\n` +
        `  SUPABASE_SERVICE_ROLE_KEY: ${key ? 'OK' : 'MISSING'}\n\n` +
        'Check that .env.local exists and contains these variables.'
    )
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Clean up test database
 */
async function cleanupDatabase(options: CleanupOptions): Promise<CleanupStats> {
  const supabase = createAdminClient()
  const stats: CleanupStats = {
    profiles: 0,
    pets: 0,
    appointments: 0,
    vaccines: 0,
    prescriptions: 0,
    lab_orders: 0,
    invoices: 0,
    orphanedProfiles: 0,
    authUsers: 0,
  }

  console.log('\n🧹 Starting database cleanup...')
  if (options.dryRun) {
    console.log('   [DRY RUN MODE - No changes will be made]\n')
  }

  // Step 1: Find all test profiles (email like %@test.local%)
  console.log('📋 Step 1: Finding test profiles...')
  const { data: testProfiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, tenant_id')
    .like('email', '%@test.local%')

  if (profilesError) {
    throw new Error(`Failed to query profiles: ${profilesError.message}`)
  }

  console.log(`   Found ${testProfiles?.length || 0} test profiles`)

  if (options.verbose && testProfiles && testProfiles.length > 0) {
    testProfiles.slice(0, 5).forEach((p) => {
      console.log(`     • ${p.email} (${p.id})`)
    })
    if (testProfiles.length > 5) {
      console.log(`     ... and ${testProfiles.length - 5} more`)
    }
  }

  stats.profiles = testProfiles?.length || 0

  // Step 2: Delete auth users (this cascades to profiles via FK)
  if (testProfiles && testProfiles.length > 0 && !options.dryRun) {
    console.log('\n🗑️  Step 2: Deleting auth users and related data...')

    for (const profile of testProfiles) {
      try {
        const { error } = await supabase.auth.admin.deleteUser(profile.id)
        if (error) {
          console.error(`   ⚠️  Error deleting user ${profile.email}: ${error.message}`)
        } else {
          stats.authUsers++
          if (options.verbose) {
            console.log(`   ✅ Deleted ${profile.email}`)
          }
        }
      } catch (error: unknown) {
        console.error(`   ⚠️  Exception deleting ${profile.email}:`, error)
      }
    }

    console.log(`   Deleted ${stats.authUsers}/${testProfiles.length} auth users`)
  }

  // Step 3: Clean orphaned profiles (profiles without auth users)
  console.log('\n📋 Step 3: Finding orphaned profiles...')

  const { data: allProfiles } = await supabase.from('profiles').select('id, email')

  const {
    data: { users },
  } = await supabase.auth.admin.listUsers()
  const userIds = new Set(users.map((u) => u.id))

  const orphaned = allProfiles?.filter((p) => !userIds.has(p.id)) || []

  console.log(`   Found ${orphaned.length} orphaned profiles`)

  if (options.verbose && orphaned.length > 0) {
    orphaned.slice(0, 5).forEach((p) => {
      console.log(`     • ${p.email || 'No email'} (${p.id})`)
    })
    if (orphaned.length > 5) {
      console.log(`     ... and ${orphaned.length - 5} more`)
    }
  }

  stats.orphanedProfiles = orphaned.length

  if (orphaned.length > 0 && !options.dryRun) {
    console.log('\n🗑️  Step 4: Deleting orphaned profiles...')

    for (const profile of orphaned) {
      const { error } = await supabase.from('profiles').delete().eq('id', profile.id)
      if (error) {
        console.error(`   ⚠️  Error deleting profile ${profile.id}: ${error.message}`)
      } else {
        if (options.verbose) {
          console.log(`   ✅ Deleted orphaned profile ${profile.id}`)
        }
      }
    }

    console.log(`   Deleted ${orphaned.length} orphaned profiles`)
  }

  return stats
}

/**
 * Main execution
 */
async function main() {
  const options = parseArgs()

  try {
    const startTime = Date.now()
    const stats = await cleanupDatabase(options)
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    console.log('\n✨ Cleanup complete!')
    console.log('\n📊 Summary:')
    console.log(`   Auth users deleted: ${stats.authUsers}`)
    console.log(`   Test profiles: ${stats.profiles}`)
    console.log(`   Orphaned profiles deleted: ${stats.orphanedProfiles}`)
    console.log(`   Duration: ${duration}s`)

    if (options.dryRun) {
      console.log('\n⚠️  DRY RUN - No changes were made to the database')
      console.log('   Run without --dry-run to actually delete data')
    }

    console.log('\n✅ Done!\n')
    process.exit(0)
  } catch (error: unknown) {
    console.error('\n❌ Cleanup failed:', error)
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

export { cleanupDatabase, CleanupOptions, CleanupStats }
