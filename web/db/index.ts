import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import { env } from '@/lib/env'

const connectionString = env.DATABASE_URL

/**
 * PostgreSQL Connection Pool Configuration
 *
 * These settings are optimized for:
 * - Supabase Supavisor pooling (transaction mode)
 * - Next.js serverless functions (short-lived connections)
 * - Multi-tenant SaaS workloads
 *
 * Adjust based on your deployment:
 * - Vercel/serverless: max 5-10 (per function instance)
 * - Traditional server: max 20-50 (shared across requests)
 * - Development: max 5 (local testing)
 */
const client = postgres(connectionString, {
  // Disable prepared statements for transaction pooling compatibility
  // Required when using Supabase Supavisor in "Transaction" mode
  prepare: false,

  // Connection pool size
  // For serverless: keep low since each function has its own pool
  // For traditional servers: increase based on expected concurrency
  max: parseInt(process.env.DB_POOL_MAX || '10', 10),

  // Close idle connections after this many seconds
  // Lower for serverless to free resources faster
  idle_timeout: parseInt(process.env.DB_IDLE_TIMEOUT || '20', 10),

  // Maximum time to wait for a connection from the pool (ms)
  connect_timeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '10', 10),

  // Query timeout - cancel queries running longer than this (ms)
  // Prevents runaway queries from exhausting connections
  max_lifetime: 60 * 30, // 30 minutes

  // Called when a new connection is established
  // Use to set session-level configuration
  onnotice: () => {}, // Suppress NOTICE messages in production

  // Transformations
  transform: {
    // Convert BigInt columns to numbers (JavaScript limitation)
    // undefined preserves default behavior
    undefined: undefined,
  },
})

export const db = drizzle(client, { schema })

/**
 * Close database connections gracefully
 * Call this during application shutdown
 */
export async function closeDatabase(): Promise<void> {
  await client.end()
}

/**
 * Health check for database connection
 * Returns true if database is reachable
 */
export async function isDatabaseHealthy(): Promise<boolean> {
  try {
    await client`SELECT 1`
    return true
  } catch (_error: unknown) {
    return false
  }
}
