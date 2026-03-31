import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function probe() {
  console.log('Probing medical_records...')
  // Use existing tenant/pet if possible or dummy UUIDs
  const dummyUUID = '00000000-0000-0000-0000-000000000001'

  const { data, error } = await supabase
    .from('medical_records')
    .insert({
      tenant_id: 'terrapet',
      pet_id: dummyUUID,
    })
    .select('*')

  if (error) {
    console.error('Insert Error:', error)
  } else {
    console.log('Success! Columns:', Object.keys(data[0]))
  }
}

probe()
