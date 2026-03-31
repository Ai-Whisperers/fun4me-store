import { Client } from 'pg'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL

async function getPet() {
  const client = new Client({ connectionString: dbUrl })
  await client.connect()

  try {
    const res = await client.query(`
            SELECT p.id, p.name, pr.full_name as owner 
            FROM pets p 
            JOIN profiles pr ON p.owner_id = pr.id 
            LIMIT 1;
        `)

    if (res.rows.length > 0) {
      const pet = res.rows[0]
      const fs = require('fs')
      const output = `ID: ${pet.id}\nName: ${pet.name}\nOwner: ${pet.owner}\nURL: http://localhost:3000/scan/${pet.id}`
      fs.writeFileSync('test_pet_id.txt', output)
      console.log(output)
    } else {
      console.log('❌ No pets found in database.')
    }
  } finally {
    await client.end()
  }
}

getPet()
