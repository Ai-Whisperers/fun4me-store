import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing .env.local variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const users = [
  { email: 'admin@demo.com', pass: 'password123', name: 'Admin Adris' },
  { email: 'vet@demo.com', pass: 'password123', name: 'Dr. House' },
  { email: 'owner@demo.com', pass: 'password123', name: 'Juan Perez' },
  { email: 'owner2@demo.com', pass: 'password123', name: 'Maria Gonzalez' },
  { email: 'vet@petlife.com', pass: 'password123', name: 'Dr. PetLife' },
]

async function createUsers() {
  console.log('🚀 Step 2: Creating Accounts (API)...')

  for (const user of users) {
    process.stdout.write(`   + ${user.email}... `)

    const { data, error } = await supabase.auth.signUp({
      email: user.email,
      password: user.pass,
      options: {
        data: {
          full_name: user.name,
        },
      },
    })

    if (error) {
      // If already registered, we assume it's correct from previous run
      if (error.message.includes('already registered')) {
        console.log('✅ (Exists)')
      } else {
        console.log(`❌ Error: ${error.message}`)
      }
    } else if (data.user) {
      console.log('✅ Created')
    }
  }

  console.log('\n✨ Accounts Ready.')
}

createUsers()
