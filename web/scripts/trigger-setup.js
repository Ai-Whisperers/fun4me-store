const dotenv = require('dotenv')
const path = require('path')
const { execSync } = require('child_process')

// Load .env.local
const envPath = path.resolve(__dirname, '../.env.local')
const result = dotenv.config({ path: envPath })

if (result.error) {
  console.error('Error loading .env.local:', result.error)
  process.exit(1)
}

console.log('Loaded env vars from .env.local')
// Verify usage
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is missing in .env.local')
} else {
  // console.log('Database URL found:', process.env.DATABASE_URL); // Don't print secrets
}

try {
  console.log('Running DB Setup...')
  // Force use of local env vars by passing them explicitly or letting child process inherit
  execSync('npx tsx scripts/run-db-setup.ts --reset', {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'), // Run from web root
    env: { ...process.env },
  })
} catch (error) {
  console.error('Setup failed:', error.message)
  process.exit(1)
}
