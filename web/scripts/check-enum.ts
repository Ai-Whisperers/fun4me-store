import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkEnum() {
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: 'SELECT enum_range(NULL::appointment_status);',
  })

  if (error) {
    console.error('RPC Error:', error)
    // Fallback: Try to insert a bad status to see error message closely or just guess
    const { error: insertError } = await supabase
      .from('appointments')
      .insert({ status: 'INVALID_STATUS' })
    console.log('Insert Error:', insertError)
  } else {
    console.log('Enum Range:', data)
  }
}

checkEnum()
