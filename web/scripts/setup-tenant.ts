#!/usr/bin/env tsx
/**
 * Tenant Setup Script
 *
 * Creates a new tenant with all default data using the setup_new_tenant function.
 *
 * Usage:
 *   npx tsx web/scripts/setup-tenant.ts <tenant_id> <tenant_name>
 *
 * Example:
 *   npx tsx web/scripts/setup-tenant.ts "myclinic" "My Veterinary Clinic"
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || ''

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: Missing environment variables')
  console.error(
    '   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY)'
  )
  console.error('   Check your .env.local file')
  process.exit(1)
}

async function setupTenant(tenantId: string, tenantName: string) {
  console.log(`\n🏥 Setting up tenant: ${tenantName} (${tenantId})`)
  console.log('─'.repeat(60))

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  try {
    // Check if tenant already exists
    const { data: existing, error: checkError } = await supabase.rpc('tenant_exists', {
      p_tenant_id: tenantId,
    })

    if (checkError) {
      console.error('❌ Error checking tenant:', checkError.message)
      process.exit(1)
    }

    if (existing) {
      console.log('⚠️  Tenant already exists')
      console.log('   Fetching current tenant info...\n')

      const { data: info, error: infoError } = await supabase.rpc('get_tenant_info', {
        p_tenant_id: tenantId,
      })

      if (infoError) {
        console.error('❌ Error fetching tenant info:', infoError.message)
        process.exit(1)
      }

      if (info && info.length > 0) {
        const tenant = info[0]
        console.log('📊 Current Tenant Info:')
        console.log(`   Name: ${tenant.tenant_name}`)
        console.log(`   Payment Methods: ${tenant.payment_methods_count}`)
        console.log(`   Services: ${tenant.services_count}`)
        console.log(`   Categories: ${tenant.categories_count}`)
        console.log(`   Users: ${tenant.users_count}`)
        console.log(`   Pets: ${tenant.pets_count}`)
        console.log(`   Created: ${new Date(tenant.created_at).toLocaleString()}`)
      }

      process.exit(0)
    }

    // Create new tenant
    console.log('✨ Creating new tenant with default data...\n')

    const { error: setupError } = await supabase.rpc('setup_new_tenant', {
      p_tenant_id: tenantId,
      p_tenant_name: tenantName,
    })

    if (setupError) {
      console.error('❌ Error setting up tenant:', setupError.message)
      process.exit(1)
    }

    console.log('✅ Tenant created successfully!\n')

    // Fetch and display tenant info
    const { data: info, error: infoError } = await supabase.rpc('get_tenant_info', {
      p_tenant_id: tenantId,
    })

    if (infoError) {
      console.error('⚠️  Warning: Could not fetch tenant info:', infoError.message)
    } else if (info && info.length > 0) {
      const tenant = info[0]
      console.log('📊 Tenant Setup Summary:')
      console.log(`   Name: ${tenant.tenant_name}`)
      console.log(`   Payment Methods: ${tenant.payment_methods_count}`)
      console.log(`   Services: ${tenant.services_count}`)
      console.log(`   Categories: ${tenant.categories_count}`)
      console.log(`   Users: ${tenant.users_count}`)
      console.log(`   Pets: ${tenant.pets_count}`)
      console.log()
    }

    console.log('📝 Next Steps:')
    console.log(`   1. Create .content_data/${tenantId}/ folder`)
    console.log(`   2. Copy JSON files from .content_data/_TEMPLATE/`)
    console.log(`   3. Customize config.json and theme.json`)
    console.log(`   4. Create admin user with: npx tsx web/scripts/create-admin.ts`)
    console.log()
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

// Main
const args = process.argv.slice(2)

if (args.length < 2) {
  console.log('\n📋 Usage: npx tsx web/scripts/setup-tenant.ts <tenant_id> <tenant_name>')
  console.log('\n📝 Examples:')
  console.log('   npx tsx web/scripts/setup-tenant.ts "myclinic" "My Veterinary Clinic"')
  console.log('   npx tsx web/scripts/setup-tenant.ts "petcare" "PetCare Center"')
  console.log()
  process.exit(1)
}

const [tenantId, ...nameParts] = args
const tenantName = nameParts.join(' ')

setupTenant(tenantId, tenantName)
