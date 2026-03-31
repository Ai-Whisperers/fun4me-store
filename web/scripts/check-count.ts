import { Client } from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

async function main() {
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
    const res = await client.query('SELECT count(*) FROM store_products')
    console.log('Store Products Count:', res.rows[0].count)

    const assignRes = await client.query(
      "SELECT count(*) FROM clinic_product_assignments WHERE tenant_id = 'terrapet'"
    )
    console.log('Assignments Count:', assignRes.rows[0].count)
  } catch (err) {
    console.error('Error:', err)
  } finally {
    await client.end()
  }
}

main()
