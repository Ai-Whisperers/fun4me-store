import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Helper for __dirname in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || ''

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: Missing environment variables')
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const USERS = [
  {
    email: 'admin@cavillpet.com',
    password: 'password123',
    name: 'Admin CavillPet',
    role: 'admin',
    tenant: 'cavillpet',
  },
  {
    email: 'vet@cavillpet.com',
    password: 'password123',
    name: 'Dr. José Villalba',
    role: 'vet',
    tenant: 'cavillpet',
  },
  {
    email: 'sofia@cavillpet.com',
    password: 'password123',
    name: 'Sofía Castro',
    role: 'vet',
    tenant: 'cavillpet',
  },
  {
    email: 'cliente@cavillpet.com',
    password: 'password123',
    name: 'Cliente Prueba',
    role: 'owner',
    tenant: 'cavillpet',
  },
]

async function createCavillPetUsers() {
  console.log('\n👥 Creating CavillPet Test Users...\n')

  for (const user of USERS) {
    try {
      // Check if user exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
      const exists = existingUsers?.users?.find((u) => u.email === user.email)

      let userId = exists?.id

      if (exists) {
        console.log(`   ✅ ${user.email} (exists, updating profile)`)
      } else {
        // Create user
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: { full_name: user.name },
        })

        if (error) {
          console.log(`   ❌ ${user.email}: ${error.message}`)
          continue
        }

        userId = data.user?.id
        console.log(`   ✅ ${user.email} (created)`)
      }

      if (userId) {
        // Update profile link
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({
            role: user.role,
            tenant_id: user.tenant,
            full_name: user.name,
          })
          .eq('id', userId)

        if (profileError) {
          // If update fails, maybe insert? Though trigger usually handles insert on auth.signup
          // Let's try upsert if update failed (though usually update is enough if trigger works)
          console.log(`      ⚠️ Profile update warning: ${profileError.message}`)
        } else {
          console.log(`      ✨ Profile linked to ${user.tenant} as ${user.role}`)
        }
      }
    } catch (err) {
      console.log(`   ❌ ${user.email}: ${err}`)
    }
  }

  console.log('\n✨ access credentials:')
  USERS.forEach((u) => {
    console.log(`   ${u.email} / ${u.password} (${u.role})`)
  })
}

createCavillPetUsers()
