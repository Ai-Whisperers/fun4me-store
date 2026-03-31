import { Client } from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

async function main() {
  console.log('Disabling RLS on store tables...')

  const databaseUrl = process.env.DATABASE_URL
  const dbPassword = process.env.DB_PASSWORD
  const dbHost = process.env.DB_HOST || 'db.okddppczckbjdotrxiev.supabase.co'
  const dbUser = process.env.DB_USER || 'postgres'
  const dbName = process.env.DB_NAME || 'postgres'

  const client = dbPassword
    ? new Client({
        host: dbHost,
        port: 5432,
        user: dbUser,
        password: dbPassword,
        database: dbName,
        ssl: { rejectUnauthorized: false },
      })
    : new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } })

  try {
    await client.connect()

    // Disable RLS on store tables
    const tables = [
      'store_products',
      'store_categories',
      'store_brands',
      'clinic_product_assignments',
      'store_inventory',
      'store_inventory_transactions',
    ]

    for (const table of tables) {
      try {
        await client.query(`ALTER TABLE public.${table} DISABLE ROW LEVEL SECURITY;`)
        console.log(`✅ RLS disabled for ${table}`)
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e)
        console.log(`⚠️  Could not disable RLS for ${table}: ${message}`)
      }
    }
  } catch (err) {
    console.error('Error:', err)
  } finally {
    await client.end()
  }
}

main()
