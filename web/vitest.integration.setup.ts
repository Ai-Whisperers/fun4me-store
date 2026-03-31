import '@testing-library/jest-dom'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '.env.local') })
// Fallback to .env if needed
dotenv.config({ path: path.resolve(__dirname, '.env') })

console.log('Integration Test Setup: Environment variables loaded.')
