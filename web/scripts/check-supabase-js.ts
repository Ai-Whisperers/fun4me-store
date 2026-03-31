import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load env vars from .env.local
const envPath = path.resolve(__dirname, '../.env.local')
console.log('Loading env from:', envPath)
dotenv.config({ path: envPath })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('URL:', url)
console.log('Key length:', key?.length)

if (!url || !key) {
  console.error('Missing URL or Key')
  process.exit(1)
}

const supabase = createClient(url, key)

async function main() {
  console.log('Testing connection...')
  try {
    const { data, error } = await supabase
      .from('store_products')
      .select('count', { count: 'exact', head: true })
    if (error) {
      console.error('Supabase Error:', error)
    } else {
      console.log('Success! Count:', data) // data is null for head:true usually but count is in wrapper
    }

    // Try assignments query
    const { data: assignments, error: assignError } = await supabase
      .from('clinic_product_assignments')
      .select('catalog_product_id')
      .eq('tenant_id', 'terrapet')
      .eq('is_active', true)
      .limit(5)

    if (assignError) {
      console.error('Assignment Error:', assignError)
    } else {
      console.log('Assignments found:', assignments?.length)
    }
  } catch (e) {
    console.error('Exception:', e)
  }
}

main()
