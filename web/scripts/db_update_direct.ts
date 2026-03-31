import { Client } from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

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

    // Files to run from arguments or defaults
    const args = process.argv.slice(2)
    const files = args.length > 0 ? args : ['11_appointments.sql', '06_rpcs.sql']

    for (const file of files) {
      console.log(`📄 Running ${file}...`)
      const updatePath = path.isAbsolute(file)
        ? file
        : path.resolve(process.cwd(), file.startsWith('db/') ? '' : 'db', file)
      const sql = fs.readFileSync(updatePath, 'utf8')
      await client.query(sql)
      console.log(`   Done.`)
    }

    // Run seed data snippet manually since we can't exec the temp file nicely
    console.log(`🌱 Seeding appointments...`)
    const seedSql = `
        DO $$
        DECLARE
          p_firulais uuid;
          p_mishi uuid;
          vet_house uuid;
          owner_juan uuid;
        BEGIN
          SELECT id INTO owner_juan FROM auth.users WHERE email = 'owner@demo.com';
          SELECT id INTO vet_house FROM auth.users WHERE email = 'vet@demo.com';
          
          SELECT id INTO p_firulais FROM pets WHERE name = 'Firulais' LIMIT 1;
          SELECT id INTO p_mishi FROM pets WHERE name = 'Mishi' LIMIT 1;
        
          IF p_firulais IS NOT NULL AND vet_house IS NOT NULL THEN
            INSERT INTO appointments (tenant_id, pet_id, vet_id, start_time, end_time, status, reason, created_by) VALUES
            ('terrapet', p_firulais, vet_house, (now() + interval '1 day'), (now() + interval '1 day 1 hour'), 'confirmed', 'Vacunación Anual', owner_juan);
          END IF;
        
          IF p_mishi IS NOT NULL AND owner_juan IS NOT NULL THEN
            INSERT INTO appointments (tenant_id, pet_id, vet_id, start_time, end_time, status, reason, created_by) VALUES
            ('terrapet', p_mishi, null, (now() + interval '2 days'), (now() + interval '2 days 30 minutes'), 'pending', 'Revisión General', owner_juan);
          END IF;
        END $$;
        `
    await client.query(seedSql)
    console.log(`   Done.`)

    console.log('🎉 Update Complete!')
  } catch (err) {
    console.error('❌ Error during update:', err)
  } finally {
    await client.end()
  }
}

runUpdate()
