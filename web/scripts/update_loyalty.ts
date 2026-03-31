import { Client } from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL

if (!dbUrl) {
  console.error('❌ Missing DATABASE_URL or SUPABASE_DB_URL in .env.local')
  process.exit(1)
}

async function runUpdate() {
  const client = new Client({
    connectionString: dbUrl,
  })

  try {
    await client.connect()
    console.log('✅ Connected to Database')

    const files = ['25_loyalty.sql']

    for (const file of files) {
      console.log(`📄 Running ${file}...`)
      const updatePath = path.resolve(__dirname, '../db', file)
      const sql = fs.readFileSync(updatePath, 'utf8')
      await client.query(sql)
      console.log(`   Done.`)
    }

    console.log('🎉 Loyalty System Update Complete!')
  } catch (err) {
    console.error('❌ Error during update:', err)
  } finally {
    await client.end()
  }
}

runUpdate()
