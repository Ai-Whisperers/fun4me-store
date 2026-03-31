import { Client } from 'pg'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL

async function checkColumns() {
  const client = new Client({ connectionString: dbUrl })
  await client.connect()

  try {
    const tables = ['pets', 'profiles', 'diagnosis_codes']
    for (const table of tables) {
      console.log(`\nTable: ${table}`)
      const res = await client.query(
        `
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = $1
                ORDER BY ordinal_position;
            `,
        [table]
      )

      res.rows.forEach((row) => {
        console.log(` - ${row.column_name} (${row.data_type})`)
      })
    }
  } finally {
    await client.end()
  }
}

checkColumns()
