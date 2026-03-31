/**
 * Vitest Setup for Database Tests
 * 
 * This file runs before all database tests to configure the test environment.
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.test (for database tests)
config({ path: resolve(process.cwd(), '.env.test') })

// Log test environment info (but not secrets)
console.log('[Database Test Setup] Environment loaded')
console.log(`[Database Test Setup] Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30)}...`)
console.log(`[Database Test Setup] Service Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET'}`)
console.log(`[Database Test Setup] Anon Key: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET'}`)

// Verify required environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set in .env.test')
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set in .env.test')
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set in .env.test')
}

console.log('[Database Test Setup] All required environment variables present ✓')
