#!/usr/bin/env npx tsx
/**
 * Seed CLI v2
 *
 * New seed system with:
 * - Idempotent inserts (skip existing)
 * - Zod validation
 * - Seed variants (basic, integration, e2e, demo, reset)
 * - Proper cleanup
 *
 * Usage:
 *   npx tsx db/seeds/scripts/seed-v2.ts --variant demo --tenant terrapet
 *   npx tsx db/seeds/scripts/seed-v2.ts --variant reset --tenants terrapet,petlife
 *   npx tsx db/seeds/scripts/seed-v2.ts --variant basic --dry-run
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

import { runSeed, printHelp } from './orchestrator'
import { VariantName, getVariantNames } from './variants'

/**
 * Parse command line arguments
 */
function parseArgs(): {
  variant: VariantName
  tenants: string[]
  clear: boolean
  dryRun: boolean
  verbose: boolean
  help: boolean
} {
  const args = process.argv.slice(2)
  const result = {
    variant: 'demo' as VariantName,
    tenants: ['terrapet'],
    clear: false,
    dryRun: false,
    verbose: false,
    help: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const nextArg = args[i + 1]

    switch (arg) {
      case '--variant':
      case '-v':
        if (nextArg && !nextArg.startsWith('-')) {
          const validVariants = getVariantNames()
          if (validVariants.includes(nextArg as VariantName)) {
            result.variant = nextArg as VariantName
          } else {
            console.error(`Invalid variant: ${nextArg}. Valid: ${validVariants.join(', ')}`)
            process.exit(1)
          }
          i++
        }
        break

      case '--tenant':
      case '-t':
        if (nextArg && !nextArg.startsWith('-')) {
          result.tenants = [nextArg]
          i++
        }
        break

      case '--tenants':
        if (nextArg && !nextArg.startsWith('-')) {
          result.tenants = nextArg.split(',').map((t) => t.trim())
          i++
        }
        break

      case '--clear':
        result.clear = true
        break

      case '--dry-run':
        result.dryRun = true
        break

      case '--verbose':
        result.verbose = true
        break

      case '--help':
      case '-h':
        result.help = true
        break
    }
  }

  return result
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const args = parseArgs()

  if (args.help) {
    printHelp()
    process.exit(0)
  }

  // Validate environment
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing environment variables:')
    console.error('   NEXT_PUBLIC_SUPABASE_URL')
    console.error('   SUPABASE_SERVICE_ROLE_KEY')
    console.error('\nMake sure .env.local exists with these values.')
    process.exit(1)
  }

  try {
    const report = await runSeed({
      variant: args.variant,
      tenants: args.tenants,
      mode: 'seed',
      dryRun: args.dryRun,
      verbose: args.verbose,
      clear: args.clear,
    })

    // Exit with error code if there were errors
    if (report.summary.totalErrors > 0) {
      process.exit(1)
    }
  } catch (e) {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  }
}

// Run
main()
