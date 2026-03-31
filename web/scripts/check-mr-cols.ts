import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkColumns() {
  const { data, error } = await supabase.from('medical_records').select('*').limit(1)

  if (error) {
    console.error('Select Error:', error)
  } else {
    if (data.length > 0) {
      console.log('Columns:', Object.keys(data[0]))
    } else {
      // Try to insert getting error about columns? NO, that's hard.
      // Just try to get schema via exec_sql if possible?
      console.log('No rows found. Attempting RPC if available.')
      try {
        const { data: schema } = await supabase.rpc('exec_sql', {
          sql: "SELECT column_name FROM information_schema.columns WHERE table_name = 'medical_records';",
        })
        console.log('Schema info:', schema)
      } catch (e) {
        console.log(e)
      }
    }
  }
}

checkColumns()
