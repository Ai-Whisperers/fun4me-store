import { Client } from 'pg'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL

async function checkTables() {
  const client = new Client({ connectionString: dbUrl })
  try {
    await client.connect()
    const res = await client.query(
      "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'"
    )
    console.log('Tables:', res.rows.map((r) => r.tablename).join(', '))
  } finally {
    await client.end()
  }
}
checkTables()
