/**
 * Database Test Helpers
 *
 * Utilities for managing test database state, seeding data,
 * and cleaning up after tests.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { TENANT_IDS } from '@/lib/constants/tenants';

// Create test client
let testClient: SupabaseClient | null = null

/**
 * Get or create Supabase test client
 */
export function getTestClient(options: { serviceRole?: boolean } = {}): SupabaseClient {
  if (options.serviceRole) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase service role environment variables')
    }

    return createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }

  if (!testClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables')
    }

    testClient = createClient(supabaseUrl, supabaseKey)
  }
  return testClient
}

/**
 * Tables in order of dependency (for cleanup)
 */
const TABLE_ORDER = [
  'invoice_items',
  'invoices',
  'vaccine_reactions',
  'vaccines',
  'medical_records',
  'prescriptions',
  'appointments',
  'euthanasia_assessments',
  'reproductive_cycles',
  'loyalty_points',
  'qr_tags',
  'pets',
  'products',
  'clinic_invites',
  'profiles',
  // 'tenants' - Don't delete tenants, they're seeded
]

/**
 * Clean up test data created during tests
 * @param testIds - Object mapping table names to arrays of IDs to delete
 */
export async function cleanupTestData(testIds: Partial<Record<string, string[]>>): Promise<void> {
  const client = getTestClient({ serviceRole: true })

  for (const table of TABLE_ORDER) {
    const ids = testIds[table]
    if (ids && ids.length > 0) {
      const { error } = await client.from(table).delete().in('id', ids)
      if (error) {
        console.warn(`Failed to cleanup ${table}:`, error.message)
      }
    }
  }
}

/**
 * Clean all test data for a specific tenant
 * Use with caution - only in isolated test environments
 */
export async function cleanupTenantData(tenantId: string): Promise<void> {
  const client = getTestClient({ serviceRole: true })

  // Delete in dependency order
  for (const table of TABLE_ORDER) {
    try {
      // Skip tables without tenant_id
      if (['vaccine_reactions', 'loyalty_points'].includes(table)) {
        continue
      }

      const { error } = await client.from(table).delete().eq('tenant_id', tenantId)
      if (error && !error.message.includes('column "tenant_id"')) {
        console.warn(`Failed to cleanup ${table} for tenant ${tenantId}:`, error.message)
      }
    } catch (_error: unknown) {
      // Some tables might not have tenant_id
    }
  }
}

/**
 * Seed tenants
 */
export async function seedTenants(): Promise<void> {
  const client = getTestClient({ serviceRole: true })

  const { error } = await client.from('tenants').upsert([
    { id: 'terrapet', name: 'Veterinaria Adris' },
    { id: 'petlife', name: 'PetLife Center' },
  ])

  if (error) throw new Error(`Failed to seed tenants: ${error.message}`)
}

/**
 * Seed minimal test data
 */
export async function seedTestData(): Promise<{
  profileId: string
  petId: string
}> {
  const client = getTestClient({ serviceRole: true })

  // Create test profile
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .insert({
      id: crypto.randomUUID(),
      tenant_id: TENANT_IDS.ADRIS,
      full_name: 'Test User',
      email: `test-${Date.now()}@test.local`,
      phone: '+595981000000',
      role: 'owner',
    })
    .select()
    .single()

  if (profileError) throw profileError

  // Create test pet
  const { data: pet, error: petError } = await client
    .from('pets')
    .insert({
      id: crypto.randomUUID(),
      owner_id: profile.id,
      tenant_id: TENANT_IDS.ADRIS,
      name: 'Test Pet',
      species: 'dog',
      weight_kg: 10,
    })
    .select()
    .single()

  if (petError) throw petError

  return {
    profileId: profile.id,
    petId: pet.id,
  }
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const client = getTestClient()
    const { error } = await client.from('tenants').select('id').limit(1)
    return !error
  } catch (_error: unknown) {
    return false
  }
}

/**
 * Wait for database to be ready
 */
export async function waitForDatabase(
  maxAttempts: number = 5,
  delayMs: number = 1000
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    if (await testConnection()) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }
  throw new Error('Database not ready after maximum attempts')
}

/**
 * Create a unique test identifier
 * Useful for creating unique test data that can be easily identified and cleaned up
 */
export function createTestId(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`
}

/**
 * Test context for tracking created resources
 */
export class TestContext {
  private createdIds: Map<string, string[]> = new Map()

  /**
   * Track a created resource for cleanup
   */
  track(table: string, id: string): void {
    const ids = this.createdIds.get(table) || []
    ids.push(id)
    this.createdIds.set(table, ids)
  }

  /**
   * Get all tracked IDs
   */
  getTracked(): Record<string, string[]> {
    const result: Record<string, string[]> = {}
    this.createdIds.forEach((ids, table) => {
      result[table] = ids
    })
    return result
  }

  /**
   * Clean up all tracked resources
   */
  async cleanup(): Promise<void> {
    await cleanupTestData(this.getTracked())
    this.createdIds.clear()
  }
}

/**
 * Execute raw SQL (for test setup only)
 * Requires service_role key
 */
export async function executeSQL(sql: string): Promise<void> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!serviceKey || !supabaseUrl) {
    throw new Error('Missing service role key for SQL execution')
  }

  const adminClient = createClient(supabaseUrl, serviceKey)

  const { error } = await adminClient.rpc('exec_sql', { sql })
  if (error) {
    throw new Error(`SQL execution failed: ${error.message}`)
  }
}
