import type { Config } from 'drizzle-kit'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

// Validate DATABASE_URL exists
const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  throw new Error('[Drizzle Config] Missing required DATABASE_URL environment variable')
}

export { DATABASE_URL }

export default {
  schema: './db/schema/index.ts',
  out: './db/migrations',
  connectionString: DATABASE_URL,
  tablesFilter: ['tenants', 'profiles', 'vete_*'],
} satisfies Config
