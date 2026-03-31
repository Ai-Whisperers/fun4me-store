import { Client } from 'pg'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL

async function seedData() {
  console.log('🌱 Seeding Safety Data...')
  const client = new Client({ connectionString: dbUrl })
  await client.connect()

  try {
    // 1. Get a test pet
    const res = await client.query(`
            SELECT p.id, p.name FROM pets p LIMIT 1;
        `)

    if (res.rows.length === 0) {
      console.error('❌ No pets found.')
      return
    }

    const pet = res.rows[0]
    console.log(`🐶 Selected Pet: ${pet.name} (${pet.id})`)

    // 2. Insert dummy Active QR Code
    // (We imitate the payload structure, url doesn't matter for RLS test)
    const qrData = JSON.stringify({
      petId: pet.id,
      petName: pet.name,
      scanUrl: `http://localhost:3000/scan/${pet.id}`,
    })

    await client.query(
      `
            INSERT INTO pet_qr_codes (pet_id, qr_code_url, qr_data, is_active)
            VALUES ($1, $2, $3, true)
            ON CONFLICT (pet_id, is_active) DO NOTHING;
        `,
      [pet.id, 'http://dummy-url.png', qrData]
    )

    console.log(`✅ Active QR Code inserted for pet ${pet.id}`)
  } finally {
    await client.end()
  }
}

seedData()
