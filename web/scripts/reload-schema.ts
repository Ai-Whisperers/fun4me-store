import { Client } from 'pg'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function reloadSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // Required for Supabase sometimes
  })

  try {
    await client.connect()
    console.log('Connected to DB. Reloading schema...')
    await client.query("NOTIFY pgrst, 'reload schema';")
    console.log('Reload signal sent.')
  } catch (err) {
    console.error('Error reloading schema:', err)
  } finally {
    await client.end()
  }
}

reloadSchema()
