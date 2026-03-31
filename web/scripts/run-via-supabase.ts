#!/usr/bin/env tsx
/**
 * Run SQL via Supabase REST API
 *
 * Uses the exec_sql RPC function if available, or provides instructions.
 * This is an alternative to direct database connection.
 *
 * Usage:
 *   npx tsx web/scripts/run-via-supabase.ts
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const SUPABASE_URL = 'https://okddppczckbjdotrxiev.supabase.co'
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rZGRwcGN6Y2tiamRvdHJ4aWV2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTkxODM2OCwiZXhwIjoyMDgxNDk0MzY4fQ.dYdMe_yFgwUmgslf0FXV7nrEhtLqvkOK7qPIl_rx90c'

const DB_DIR = path.resolve(__dirname, '../db')

async function main() {
  console.log('\n🚀 Supabase SQL Runner\n')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Check if exec_sql function exists
  console.log('Checking for exec_sql RPC function...')
  const { data, error } = await supabase.rpc('exec_sql', { sql_text: 'SELECT 1 as test' })

  if (error) {
    console.log('\n⚠️  The exec_sql RPC function is not available.')
    console.log('This function needs to be created first.\n')
    console.log('='.repeat(60))
    console.log('MANUAL SETUP REQUIRED')
    console.log('='.repeat(60))
    console.log('\nPlease follow these steps:\n')
    console.log('1. Open Supabase SQL Editor:')
    console.log(`   https://supabase.com/dashboard/project/okddppczckbjdotrxiev/sql/new\n`)
    console.log('2. Copy the contents of: web/db/_FULL_SETUP.sql')
    console.log(
      `   File size: ${(fs.statSync(path.join(DB_DIR, '_FULL_SETUP.sql')).size / 1024).toFixed(1)} KB\n`
    )
    console.log('3. Paste into SQL Editor and click "Run"\n')
    console.log('='.repeat(60))
    console.log('\nOnce complete, you can use these demo accounts:')
    console.log('  Email: owner@demo.com  Password: password123')
    console.log('  Email: vet@demo.com    Password: password123')
    console.log('  Email: admin@demo.com  Password: password123')
    console.log('')
    process.exit(1)
  }

  console.log('✅ exec_sql function exists!\n')

  // If we get here, exec_sql exists and we can run SQL files
  const files = [
    '00_cleanup.sql',
    // Add more files as needed
  ]

  for (const file of files) {
    const filePath = path.join(DB_DIR, file)
    if (fs.existsSync(filePath)) {
      const sql = fs.readFileSync(filePath, 'utf8')
      console.log(`Running ${file}...`)
      const { error: execError } = await supabase.rpc('exec_sql', { sql_text: sql })
      if (execError) {
        console.log(`  ❌ Error: ${execError.message}`)
      } else {
        console.log(`  ✅ Success`)
      }
    }
  }

  console.log('\n✨ Done!\n')
}

main()
