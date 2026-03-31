/**
 * E2E Global Teardown
 *
 * Cleans up test data after all E2E tests have run.
 * Uses FK-aware deletion order to prevent constraint violations.
 *
 * Note: By default, this script preserves test data between runs
 * to speed up subsequent test runs. Set E2E_CLEANUP=true to force cleanup.
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import { E2ETestData, E2E_TEST_OWNER, E2E_TEST_TENANT } from './global-setup'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

// =============================================================================
// Configuration
// =============================================================================

/**
 * Set to true to clean up all test data after tests.
 * Default is false to preserve data between runs for faster iteration.
 */
const FORCE_CLEANUP = process.env.E2E_CLEANUP === 'true'

/**
 * Tables to clean up in FK-safe order (children before parents)
 */
const CLEANUP_ORDER = [
  // Store-related
  'store_cart_items',
  'store_carts',
  'store_wishlist',
  'store_order_items',
  'store_orders',
  'store_inventory',
  'store_products',

  // Appointments
  'appointments',

  // Clinical
  'vaccine_reactions',
  'vaccines',
  'prescriptions',
  'medical_records',

  // Loyalty
  'loyalty_transactions',
  'loyalty_points',

  // Messages
  'message_attachments',
  'messages',
  'conversations',

  // Invoices
  'invoice_items',
  'payments',
  'invoices',

  // Pets
  'pets',

  // Services (don't delete - might be shared)
  // 'services',

  // Profile and auth handled separately
]

// =============================================================================
// Supabase Client
// =============================================================================

function createServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('[E2E Teardown] Missing required environment variables')
  }

  return createSupabaseClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// =============================================================================
// Cleanup Functions
// =============================================================================

/**
 * Loads test data from file
 */
function loadTestData(): E2ETestData | null {
  const dataPath = resolve(process.cwd(), '.e2e-test-data.json')

  if (!fs.existsSync(dataPath)) {
    console.log('[E2E Teardown] No test data file found')
    return null
  }

  try {
    const content = fs.readFileSync(dataPath, 'utf-8')
    return JSON.parse(content) as E2ETestData
  } catch (error) {
    console.warn('[E2E Teardown] Failed to parse test data file:', error)
    return null
  }
}

/**
 * Cleans up E2E test data by owner ID
 */
async function cleanupByOwner(supabase: SupabaseClient, ownerId: string): Promise<void> {
  console.log(`[E2E Teardown] Cleaning up data for owner: ${ownerId}`)

  // Get all pets for this owner
  const { data: pets } = await supabase
    .from('pets')
    .select('id')
    .eq('owner_id', ownerId)

  const petIds = pets?.map((p) => p.id) || []

  if (petIds.length > 0) {
    // Delete vaccines for these pets
    await supabase.from('vaccines').delete().in('pet_id', petIds)
    console.log('[E2E Teardown] Deleted vaccines')

    // Delete medical records for these pets
    await supabase.from('medical_records').delete().in('pet_id', petIds)
    console.log('[E2E Teardown] Deleted medical records')

    // Delete pets
    await supabase.from('pets').delete().in('id', petIds)
    console.log('[E2E Teardown] Deleted pets')
  }

  // Delete loyalty data
  await supabase.from('loyalty_transactions').delete().eq('user_id', ownerId)
  await supabase.from('loyalty_points').delete().eq('user_id', ownerId)
  console.log('[E2E Teardown] Deleted loyalty data')

  // Delete conversations and messages
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id')
    .eq('client_id', ownerId)

  if (conversations && conversations.length > 0) {
    const convIds = conversations.map((c) => c.id)
    await supabase.from('messages').delete().in('conversation_id', convIds)
    await supabase.from('conversations').delete().in('id', convIds)
    console.log('[E2E Teardown] Deleted conversations')
  }

  // Delete store carts
  await supabase.from('store_carts').delete().eq('customer_id', ownerId)
  console.log('[E2E Teardown] Deleted carts')

  // Delete wishlist
  await supabase.from('store_wishlist').delete().eq('user_id', ownerId)
  console.log('[E2E Teardown] Deleted wishlist')

  // Delete store orders
  const { data: orders } = await supabase
    .from('store_orders')
    .select('id')
    .eq('customer_id', ownerId)

  if (orders && orders.length > 0) {
    const orderIds = orders.map((o) => o.id)
    await supabase.from('store_order_items').delete().in('order_id', orderIds)
    await supabase.from('store_orders').delete().in('id', orderIds)
    console.log('[E2E Teardown] Deleted orders')
  }

  // Delete invoices
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id')
    .eq('client_id', ownerId)

  if (invoices && invoices.length > 0) {
    const invoiceIds = invoices.map((i) => i.id)
    await supabase.from('payments').delete().in('invoice_id', invoiceIds)
    await supabase.from('invoice_items').delete().in('invoice_id', invoiceIds)
    await supabase.from('invoices').delete().in('id', invoiceIds)
    console.log('[E2E Teardown] Deleted invoices')
  }

  // Delete appointments
  await supabase.from('appointments').delete().eq('created_by', ownerId)
  console.log('[E2E Teardown] Deleted appointments')
}

/**
 * Cleans up E2E test products
 */
async function cleanupTestProducts(supabase: SupabaseClient): Promise<void> {
  console.log('[E2E Teardown] Cleaning up test products...')

  // Find E2E test products by SKU prefix
  const { data: products } = await supabase
    .from('store_products')
    .select('id')
    .eq('tenant_id', E2E_TEST_TENANT)
    .like('sku', 'E2E-%')

  if (products && products.length > 0) {
    const productIds = products.map((p) => p.id)

    // Delete inventory first
    await supabase.from('store_inventory').delete().in('product_id', productIds)

    // Delete products
    await supabase.from('store_products').delete().in('id', productIds)

    console.log(`[E2E Teardown] Deleted ${products.length} test products`)
  }
}

/**
 * Cleans up E2E test services
 */
async function cleanupTestServices(supabase: SupabaseClient): Promise<void> {
  console.log('[E2E Teardown] Cleaning up test services...')

  // Delete services with E2E prefix
  const { error } = await supabase
    .from('services')
    .delete()
    .eq('tenant_id', E2E_TEST_TENANT)
    .like('name', 'E2E %')

  if (!error) {
    console.log('[E2E Teardown] Deleted test services')
  }
}

/**
 * Cleans up auth user
 */
async function cleanupAuthUser(supabase: SupabaseClient, userId: string): Promise<void> {
  console.log('[E2E Teardown] Cleaning up auth user...')

  // Delete profile first
  await supabase.from('profiles').delete().eq('id', userId)

  // Delete auth user
  const { error } = await supabase.auth.admin.deleteUser(userId)

  if (error) {
    console.warn(`[E2E Teardown] Failed to delete auth user: ${error.message}`)
  } else {
    console.log('[E2E Teardown] Deleted auth user')
  }
}

/**
 * Removes test data file
 */
function removeTestDataFile(): void {
  const dataPath = resolve(process.cwd(), '.e2e-test-data.json')

  if (fs.existsSync(dataPath)) {
    fs.unlinkSync(dataPath)
    console.log('[E2E Teardown] Removed test data file')
  }
}

/**
 * Removes auth state file
 */
function removeAuthStateFile(): void {
  const authPath = resolve(process.cwd(), '.auth', 'owner.json')

  if (fs.existsSync(authPath)) {
    fs.unlinkSync(authPath)
    console.log('[E2E Teardown] Removed auth state file')
  }
}

// =============================================================================
// Main Teardown Function
// =============================================================================

async function globalTeardown(): Promise<void> {
  console.log('\n========================================')
  console.log('E2E GLOBAL TEARDOWN - Starting...')
  console.log('========================================\n')

  if (!FORCE_CLEANUP) {
    console.log('[E2E Teardown] Cleanup skipped (set E2E_CLEANUP=true to force)')
    console.log('[E2E Teardown] Test data preserved for next run')
    console.log('')
    return
  }

  const supabase = createServiceRoleClient()
  const testData = loadTestData()

  try {
    if (testData) {
      // Clean up by owner ID
      await cleanupByOwner(supabase, testData.ownerId)

      // Clean up products
      await cleanupTestProducts(supabase)

      // Clean up services
      await cleanupTestServices(supabase)

      // Clean up auth user
      await cleanupAuthUser(supabase, testData.ownerId)
    } else {
      // Fallback: find and clean up by email
      const { data: users } = await supabase.auth.admin.listUsers()
      const testUser = users?.users?.find((u) => u.email === E2E_TEST_OWNER.email)

      if (testUser) {
        await cleanupByOwner(supabase, testUser.id)
        await cleanupTestProducts(supabase)
        await cleanupTestServices(supabase)
        await cleanupAuthUser(supabase, testUser.id)
      }
    }

    // Remove data files
    removeTestDataFile()
    removeAuthStateFile()

    console.log('\n========================================')
    console.log('E2E GLOBAL TEARDOWN - Complete!')
    console.log('========================================\n')
  } catch (error) {
    console.error('[E2E Teardown] Error during cleanup:', error)
    // Don't throw - let tests complete even if cleanup fails
  }
}

export default globalTeardown
