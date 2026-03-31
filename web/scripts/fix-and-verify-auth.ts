import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// 1. Load Environment Variables
const envPath = path.resolve(__dirname, '../.env.local')
let env: Record<string, string> = {}

try {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach((line) => {
    const parts = line.split('=')
    if (parts.length >= 2) {
      const key = parts[0].trim()
      const val = parts.slice(1).join('=').trim().replace(/^"|"$/g, '')
      env[key] = val
    }
  })
} catch (e) {
  console.error('Could not read .env.local')
  process.exit(1)
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing public credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log(`\n🔌 Connecting to: ${supabaseUrl}`)

// 2. Define Test Users
const users = [
  { email: 'admin@demo.com', password: 'password123', name: 'Admin Adris' },
  { email: 'vet@demo.com', password: 'password123', name: 'Dr. House' },
  { email: 'owner@demo.com', password: 'password123', name: 'Juan Perez' },
  { email: 'owner2@demo.com', password: 'password123', name: 'Maria Gonzalez' },
  { email: 'vet@petlife.com', password: 'password123', name: 'Dr. PetLife' },
]

// 3. Test Function
async function seedOrLogin(user: { email: string; password: string; name: string }) {
  console.log(`\n🔍 Checking: ${user.email}`)

  // A. Attempt Login
  let { data, error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  })

  if (!error && data.user) {
    console.log(`✅ Login Success! (ID: ${data.user.id})`)
    return
  }

  console.log(`⚠️  Login Failed. Attempting to Re-Seed (Sign Up)...`)

  // B. Attempt Sign Up (Seeding)
  // Note: This relies on the user NOT existing in auth.users (delete first!)
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: user.email,
    password: user.password,
    options: {
      data: {
        full_name: user.name,
        // We let the trigger handle role/tenant assignment based on email or defaults
      },
    },
  })

  if (signUpError) {
    console.error(`❌ Re-Seed Failed: ${signUpError.message}`)
    console.error(`   (Tip: Run 'web/db/delete_demo_users.sql' first!)`)
  } else if (signUpData.user) {
    console.log(`🌱 Re-Seed Success! Created User: ${signUpData.user.id}`)
  }
}

async function main() {
  console.log('🚀 Starting Smart Auth Verification...')
  for (const user of users) {
    await seedOrLogin(user)
  }
}

main()
