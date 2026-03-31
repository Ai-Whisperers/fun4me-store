import { Client } from 'pg'
import dotenv from 'dotenv'
import path from 'path'

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

async function main() {
  console.log('Fixing vet@demo.com role using SQL...')

  const databaseUrl = process.env.DATABASE_URL
  const dbPassword = process.env.DB_PASSWORD
  const dbHost = process.env.DB_HOST || 'db.okddppczckbjdotrxiev.supabase.co'
  const dbUser = process.env.DB_USER || 'postgres'
  const dbName = process.env.DB_NAME || 'postgres'

  if (!databaseUrl && !dbPassword) {
    console.log(
      'No credentials found. Setting default password for demo env based on run-db-setup.ts info.'
    )
    // Fallback if env vars missing, purely for this fix based on knowledge base
    // But better to rely on what's in .env.local if loaded
  }

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
    console.log('Connected to DB')

    const res = await client.query(`
        UPDATE profiles 
        SET role = 'vet' 
        WHERE email = 'vet@demo.com'
        RETURNING *;
    `)

    if (res.rowCount && res.rowCount > 0) {
      console.log('✅ Updated role to "vet" for:', res.rows[0].email)
    } else {
      console.log('❓ User vet@demo.com not found in profiles.')
    }
  } catch (err) {
    console.error('Error executing query', err)
  } finally {
    await client.end()
  }
}

main()
