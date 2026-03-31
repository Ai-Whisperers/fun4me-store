import { Client } from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL

async function runUpdate() {
  console.log('🚀 Starting V2 Deployment...')
  const client = new Client({ connectionString: dbUrl })

  try {
    await client.connect()

    const files = ['35_safety_features.sql', '36_epidemiology.sql', '37_storage_qr_codes.sql']

    for (const file of files) {
      console.log(`\n----------------------------------------`)
      console.log(`📄 Executing ${file}`)
      const updatePath = path.resolve(__dirname, '../db', file)
      const sql = fs.readFileSync(updatePath, 'utf8')

      try {
        await client.query(sql)
        console.log(`✅ Success: ${file}`)
      } catch (e) {
        // TICKET-TYPE-004: Proper error handling for PostgreSQL errors
        const pgError = e as { message?: string; code?: string; position?: string }
        console.error(`❌ Failed: ${file}`)
        console.error(`   Error: ${pgError.message || 'Unknown error'}`)
        console.error(`   Code: ${pgError.code || 'Unknown'}`)
        if (pgError.position) {
          console.error(`   Position: ${pgError.position}`)
          const pos = parseInt(pgError.position, 10)
          const start = Math.max(0, pos - 100)
          const end = Math.min(sql.length, pos + 100)
          console.error(`   Context: ...${sql.substring(start, end)}...`)
        }
        throw e
      }
    }
  } catch (err) {
    console.error('💥 Deployment BOOM')
  } finally {
    await client.end()
  }
}

runUpdate()
