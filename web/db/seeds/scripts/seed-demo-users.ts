/**
 * Seed Demo Users in Supabase Auth
 *
 * This script creates demo user accounts in Supabase Auth.
 * The demo_accounts table already has the tenant/role mappings,
 * so the handle_new_user trigger will auto-assign them.
 *
 * Usage:
 *   npx tsx db/seeds/scripts/seed-demo-users.ts
 *
 * Requires:
 *   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  console.error('   Make sure .env.local has these variables set')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

interface DemoUser {
  email: string
  password: string
  full_name: string
}

const DEMO_USERS: DemoUser[] = [
  // Adris Clinic
  { email: 'admin@terrapet.demo', password: 'demo123', full_name: 'Maria Garcia (Admin)' },
  { email: 'vet@terrapet.demo', password: 'demo123', full_name: 'Dr. Carlos Rodriguez' },
  { email: 'owner@terrapet.demo', password: 'demo123', full_name: 'Juan Perez (Cliente)' },
  // PetLife Clinic
  { email: 'admin@petlife.demo', password: 'demo123', full_name: 'Ana Martinez (Admin)' },
  { email: 'vet@petlife.demo', password: 'demo123', full_name: 'Dra. Laura Gonzalez' },
  { email: 'owner@petlife.demo', password: 'demo123', full_name: 'Sofia Benitez (Cliente)' },
]

async function seedDemoUsers(): Promise<void> {
  console.log('🌱 Seeding demo users...\n')

  for (const user of DEMO_USERS) {
    console.log(`  Creating ${user.email}...`)

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const exists = existingUsers?.users?.some((u) => u.email === user.email)

    if (exists) {
      console.log(`    ⏭️  Already exists, skipping`)
      continue
    }

    // Create user
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: user.full_name,
      },
    })

    if (error) {
      console.error(`    ❌ Error: ${error.message}`)
    } else {
      console.log(`    ✅ Created (ID: ${data.user?.id})`)
    }
  }

  console.log('\n✅ Demo users seeded successfully!')
  console.log('\nYou can now log in with:')
  console.log('  Email: owner@terrapet.demo')
  console.log('  Password: demo123')
}

seedDemoUsers().catch(console.error)
