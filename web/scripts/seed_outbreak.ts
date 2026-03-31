import { Client } from 'pg'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL

async function seedOutbreak() {
  console.log('🦠 Seeding Outbreak Data...')
  const client = new Client({ connectionString: dbUrl })
  await client.connect()

  try {
    // 1. Get a Diagnosis Code (parvovirus or distemper)
    const res = await client.query(
      "SELECT id FROM diagnosis_codes WHERE code IN ('CPV', 'CDV') LIMIT 1"
    )
    let diagnosisId = res.rows[0]?.id

    if (!diagnosisId) {
      // Create dummy code if not exists
      const insert = await client.query(`
                INSERT INTO diagnosis_codes (code, term, standard, category)
                VALUES ('CPV', 'Parvovirus Canino', 'ICD-11', 'Infectious')
                RETURNING id;
            `)
      diagnosisId = insert.rows[0].id
    }

    // 2. Insert Reports
    const locations = ['Asunción Centro', 'Villa Morra', 'San Lorenzo', 'Luque']
    const severities = ['mild', 'moderate', 'severe']

    for (let i = 0; i < 20; i++) {
      const loc = locations[Math.floor(Math.random() * locations.length)]
      const sev = severities[Math.floor(Math.random() * severities.length)]
      const daysAgo = Math.floor(Math.random() * 30)

      await client.query(
        `
                INSERT INTO disease_reports (
                    tenant_id, diagnosis_code_id, species, reported_date, location_zone, severity, age_months, is_vaccinated
                ) VALUES (
                    'terrapet', $1, 'dog', CURRENT_DATE - $2::INTEGER, $3, $4, 12, false
                );
            `,
        [diagnosisId, daysAgo, loc, sev]
      )
    }

    console.log('✅ Created 20 dummy disease reports.')
  } finally {
    await client.end()
  }
}

seedOutbreak()
