/**
 * E2E Global Setup - Improved Version
 *
 * IMPROVEMENTS:
 * 1. Robust cleanup at start to ensure clean slate
 * 2. Better error handling and recovery for each setup step
 * 3. More resilient user creation logic
 * 4. Simplified auth state setup with better error handling
 * 5. Idempotent operations that can handle partial failures
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { chromium, FullConfig } from '@playwright/test'
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'
import * as fs from 'fs'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

// =============================================================================
// Constants
// =============================================================================

export const E2E_TEST_TENANT = 'terrapet'

export const E2E_TEST_OWNER = {
  email: 'e2e-owner@test.local',
  password: 'E2ETestPassword123!',
  fullName: 'E2E Test Owner',
}

export const E2E_TEST_VET = {
  email: 'e2e-vet@test.local',
  password: 'E2ETestPassword123!',
  fullName: 'E2E Test Vet',
}

export const E2E_TEST_ADMIN = {
  email: 'e2e-admin@test.local',
  password: 'E2ETestPassword123!',
  fullName: 'E2E Test Admin',
}

export interface E2ETestData {
  ownerId: string
  ownerProfileId: string
  vetId: string
  vetProfileId: string
  adminId: string
  adminProfileId: string
  pets: Array<{ id: string; name: string; species: string }>
  vaccines: string[]
  products: Array<{ id: string; name: string; sku: string }>
  services: Array<{ id: string; name: string }>
  loyaltyPoints: number
  appointments: string[]
  pendingBookingRequests: string[]
  invoices: string[]
  conversations: string[]
}

// =============================================================================
// Improved Supabase Client
// =============================================================================

function createServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      `[E2E Setup] Missing required environment variables:\n` +
        `  NEXT_PUBLIC_SUPABASE_URL: ${url ? 'OK' : 'MISSING'}\n` +
        `  SUPABASE_SERVICE_ROLE_KEY: ${key ? 'OK' : 'MISSING'}`
    )
  }

  return createSupabaseClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// =============================================================================
// Improved Cleanup Functions
// =============================================================================

/**
 * Robust cleanup of existing E2E test data
 */
async function cleanupExistingTestData(supabase: SupabaseClient): Promise<void> {
  console.log('[E2E Setup] Cleaning up existing test data...')

  try {
    // Find all E2E test users by email patterns
    const { data: users } = await supabase.auth.admin.listUsers()
    const testUsers = users?.users?.filter((u) =>
      u.email &&
      (u.email.includes('e2e-') || u.email.includes('@test.local'))
    ) || []

    for (const user of testUsers) {
      console.log(`[E2E Setup] Cleaning up user: ${user.email}`)
      await cleanupUserData(supabase, user.id)
    }

    // Clean up E2E test products
    await cleanupTestProducts(supabase)

    // Clean up E2E test services
    await cleanupTestServices(supabase)

    console.log('[E2E Setup] Cleanup complete')
  } catch (error) {
    console.warn('[E2E Setup] Cleanup failed (continuing anyway):', error)
    // Continue with setup even if cleanup fails
  }
}

/**
 * Clean up all data for a specific user
 */
async function cleanupUserData(supabase: SupabaseClient, userId: string): Promise<void> {
  try {
    // Get all pets for this user
    const { data: pets } = await supabase
      .from('pets')
      .select('id')
      .eq('owner_id', userId)

    const petIds = pets?.map((p) => p.id) || []

    // Clean up pet-related data
    if (petIds.length > 0) {
      await supabase.from('vaccines').delete().in('pet_id', petIds)
      await supabase.from('medical_records').delete().in('pet_id', petIds)
      await supabase.from('appointments').delete().in('pet_id', petIds)
      await supabase.from('pets').delete().in('id', petIds)
    }

    // Clean up user-related data
    await supabase.from('store_carts').delete().eq('customer_id', userId)
    await supabase.from('store_wishlist').delete().eq('user_id', userId)

    // Clean up orders
    const { data: orders } = await supabase
      .from('store_orders')
      .select('id')
      .eq('customer_id', userId)

    if (orders && orders.length > 0) {
      const orderIds = orders.map((o) => o.id)
      await supabase.from('store_order_items').delete().in('order_id', orderIds)
      await supabase.from('store_orders').delete().in('id', orderIds)
    }

    // Clean up invoices
    const { data: invoices } = await supabase
      .from('invoices')
      .select('id')
      .eq('client_id', userId)

    if (invoices && invoices.length > 0) {
      const invoiceIds = invoices.map((i) => i.id)
      await supabase.from('payments').delete().in('invoice_id', invoiceIds)
      await supabase.from('invoice_items').delete().in('invoice_id', invoiceIds)
      await supabase.from('invoices').delete().in('id', invoiceIds)
    }

    // Clean up conversations
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id')
      .eq('client_id', userId)

    if (conversations && conversations.length > 0) {
      const convIds = conversations.map((c) => c.id)
      await supabase.from('messages').delete().in('conversation_id', convIds)
      await supabase.from('conversations').delete().in('id', convIds)
    }

    // Clean up profile and auth user
    await supabase.from('profiles').delete().eq('id', userId)
    await supabase.auth.admin.deleteUser(userId)

  } catch (error) {
    console.warn(`[E2E Setup] Failed to cleanup user ${userId}:`, error)
    // Continue even if individual cleanup fails
  }
}

/**
 * Clean up E2E test products
 */
async function cleanupTestProducts(supabase: SupabaseClient): Promise<void> {
  try {
    const { data: products } = await supabase
      .from('store_products')
      .select('id')
      .eq('tenant_id', E2E_TEST_TENANT)
      .like('sku', 'E2E-%')

    if (products && products.length > 0) {
      const productIds = products.map((p) => p.id)
      await supabase.from('store_inventory').delete().in('product_id', productIds)
      await supabase.from('store_products').delete().in('id', productIds)
    }
  } catch (error) {
    console.warn('[E2E Setup] Failed to cleanup test products:', error)
  }
}

/**
 * Clean up E2E test services
 */
async function cleanupTestServices(supabase: SupabaseClient): Promise<void> {
  try {
    await supabase
      .from('services')
      .delete()
      .eq('tenant_id', E2E_TEST_TENANT)
      .like('name', 'E2E %')
  } catch (error) {
    console.warn('[E2E Setup] Failed to cleanup test services:', error)
  }
}

// =============================================================================
// Improved User Creation Functions
// =============================================================================

/**
 * Create a test user with robust error handling
 */
async function createTestUser(
  supabase: SupabaseClient,
  userConfig: { email: string; password: string; fullName: string },
  role: 'owner' | 'vet' | 'admin'
): Promise<{ userId: string; profileId: string }> {
  console.log(`[E2E Setup] Creating test ${role}: ${userConfig.email}`)

  try {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: userConfig.email,
      password: userConfig.password,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      throw new Error(`Failed to create auth user: ${authError?.message}`)
    }

    const userId = authData.user.id

    // Create profile with retry logic
    const maxRetries = 3
    let profileCreated = false

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: userId,
          tenant_id: E2E_TEST_TENANT,
          role,
          email: userConfig.email,
          full_name: userConfig.fullName,
          phone: role === 'owner' ? '+595981123456' : `+59598${role === 'vet' ? '1654321' : '1999999'}`,
        })

        if (profileError) {
          throw new Error(`Failed to create profile: ${profileError.message}`)
        }

        profileCreated = true
        break
      } catch (error) {
        console.warn(`[E2E Setup] Profile creation attempt ${attempt} failed:`, error)
        if (attempt === maxRetries) {
          throw error
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    if (!profileCreated) {
      throw new Error('Failed to create profile after all retries')
    }

    console.log(`[E2E Setup] Successfully created ${role} user`)
    return { userId, profileId: userId }

  } catch (error) {
    console.error(`[E2E Setup] Failed to create ${role} user:`, error)
    throw error
  }
}

/**
 * Create test pets with error handling
 */
async function createTestPets(
  supabase: SupabaseClient,
  ownerId: string
): Promise<E2ETestData['pets']> {
  console.log('[E2E Setup] Creating test pets...')

  const petsToCreate = [
    {
      name: 'Max E2E',
      species: 'dog',
      breed: 'Golden Retriever',
      birth_date: '2020-03-15',
      weight_kg: 28.5,
    },
    {
      name: 'Luna E2E',
      species: 'cat',
      breed: 'Siamese',
      birth_date: '2012-07-22',
      weight_kg: 4.2,
    },
  ]

  const createdPets: E2ETestData['pets'] = []

  for (const pet of petsToCreate) {
    try {
      const { data: newPet, error } = await supabase
        .from('pets')
        .insert({
          owner_id: ownerId,
          tenant_id: E2E_TEST_TENANT,
          name: pet.name,
          species: pet.species,
          breed: pet.breed,
          birth_date: pet.birth_date,
          weight_kg: pet.weight_kg,
          sex: 'male',
          is_neutered: true,
          color: pet.species === 'dog' ? 'Dorado' : 'Crema',
        })
        .select('id, name, species')
        .single()

      if (error) {
        console.warn(`[E2E Setup] Failed to create pet ${pet.name}: ${error.message}`)
        continue
      }

      createdPets.push(newPet)
    } catch (error) {
      console.warn(`[E2E Setup] Error creating pet ${pet.name}:`, error)
    }
  }

  console.log(`[E2E Setup] Created ${createdPets.length} pets`)
  return createdPets
}

/**
 * Create test products with error handling
 */
async function createTestProducts(supabase: SupabaseClient): Promise<E2ETestData['products']> {
  console.log('[E2E Setup] Creating test products...')

  const productsToCreate = [
    { name: 'E2E Alimento Premium Perro', sku: 'E2E-FOOD-DOG', price: 85000, stock: 50 },
    { name: 'E2E Antiparasitario', sku: 'E2E-ANTI-001', price: 45000, stock: 100 },
  ]

  const createdProducts: E2ETestData['products'] = []

  for (const product of productsToCreate) {
    try {
      const { data: newProduct, error: productError } = await supabase
        .from('store_products')
        .insert({
          tenant_id: E2E_TEST_TENANT,
          name: product.name,
          sku: product.sku,
          base_price: product.price,
          is_active: true,
          description: `Test product for E2E testing: ${product.name}`,
        })
        .select('id, name, sku')
        .single()

      if (productError) {
        console.warn(`[E2E Setup] Failed to create product ${product.name}: ${productError.message}`)
        continue
      }

      // Create inventory record
      await supabase.from('store_inventory').insert({
        product_id: newProduct.id,
        tenant_id: E2E_TEST_TENANT,
        stock_quantity: product.stock,
        reorder_point: 10,
      })

      createdProducts.push(newProduct)
    } catch (error) {
      console.warn(`[E2E Setup] Error creating product ${product.name}:`, error)
    }
  }

  console.log(`[E2E Setup] Created ${createdProducts.length} products`)
  return createdProducts
}

/**
 * Create test services with error handling
 */
async function createTestServices(supabase: SupabaseClient): Promise<E2ETestData['services']> {
  console.log('[E2E Setup] Creating test services...')

  const servicesToCreate = [
    { name: 'E2E Consulta General', category: 'consultation', price: 50000, duration: 30 },
    { name: 'E2E Vacunación', category: 'vaccination', price: 80000, duration: 20 },
  ]

  const createdServices: E2ETestData['services'] = []

  for (const service of servicesToCreate) {
    try {
      const { data: newService, error } = await supabase
        .from('services')
        .insert({
          tenant_id: E2E_TEST_TENANT,
          name: service.name,
          category: service.category,
          base_price: service.price,
          duration_minutes: service.duration,
          is_active: true,
        })
        .select('id, name')
        .single()

      if (error) {
        console.warn(`[E2E Setup] Failed to create service ${service.name}: ${error.message}`)
        continue
      }

      createdServices.push(newService)
    } catch (error) {
      console.warn(`[E2E Setup] Error creating service ${service.name}:`, error)
    }
  }

  console.log(`[E2E Setup] Created ${createdServices.length} services`)
  return createdServices
}

// =============================================================================
// Improved Auth State Setup
// =============================================================================

/**
 * Setup browser auth state with improved error handling
 */
async function setupAuthState(config: FullConfig): Promise<void> {
  console.log('[E2E Setup] Setting up auth state...')

  let browser
  let context
  let page

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
    
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    })
    
    page = await context.newPage()

    const baseURL = config.projects[0]?.use?.baseURL || 'http://127.0.0.1:3000'
    const loginUrl = `${baseURL}/${E2E_TEST_TENANT}/portal/login`

    console.log(`[E2E Setup] Navigating to: ${loginUrl}`)

    // Navigate to login page with retry
    const maxRetries = 3
    let loginPageLoaded = false

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await page.goto(loginUrl, { waitUntil: 'networkidle', timeout: 30000 })
        
        // Wait for login form to be visible
        await page.waitForSelector('form', { state: 'visible', timeout: 10000 })
        
        loginPageLoaded = true
        break
      } catch (error) {
        console.warn(`[E2E Setup] Login page load attempt ${attempt} failed:`, error)
        if (attempt === maxRetries) {
          throw new Error('Failed to load login page after all retries')
        }
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    if (!loginPageLoaded) {
      throw new Error('Could not load login page')
    }

    console.log('[E2E Setup] Login page loaded, filling form...')

    // Fill login form with more robust selectors
    const emailInput = page.locator('#email, input[name="email"][type="email"]').first()
    const passwordInput = page.locator('#password, input[name="password"], input[type="password"]').first()

    await emailInput.waitFor({ state: 'visible', timeout: 5000 })
    await emailInput.fill(E2E_TEST_OWNER.email)
    
    await passwordInput.waitFor({ state: 'visible', timeout: 5000 })
    await passwordInput.fill(E2E_TEST_OWNER.password)

    console.log('[E2E Setup] Form filled, submitting...')

    // Submit form
    const submitButton = page.getByRole('button', { name: /iniciar sesión|login|sign in/i })
    await submitButton.click()

    // Wait for successful login with multiple indicators
    const loginSuccess = await Promise.race([
      // URL change
      page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 }).then(() => 'url_change'),
      
      // Portal content
      page.waitForSelector('nav, main, [data-testid="portal-content"]', { state: 'visible', timeout: 15000 }).then(() => 'content'),
      
      // Dashboard heading
      page.waitForSelector('h1, h2, [role="heading"]', { state: 'visible', timeout: 15000 }).then(() => 'heading'),
    ])

    console.log(`[E2E Setup] Login successful (detected via: ${loginSuccess})`)

    // Create auth directory if it doesn't exist
    const authDir = resolve(process.cwd(), '.auth')
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true })
    }

    // Save authenticated state
    const authPath = resolve(authDir, 'owner.json')
    await context.storageState({ path: authPath })
    console.log(`[E2E Setup] Auth state saved to ${authPath}`)

  } catch (error) {
    console.error('[E2E Setup] Auth state setup failed:', error)
    throw error
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Save test data to file
 */
function saveTestData(data: E2ETestData): void {
  const dataPath = resolve(process.cwd(), '.e2e-test-data.json')
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2))
  console.log(`[E2E Setup] Test data saved to ${dataPath}`)
}

// =============================================================================
// Main Improved Setup Function
// =============================================================================

async function globalSetupImproved(config: FullConfig): Promise<void> {
  console.log('\n========================================')
  console.log('E2E GLOBAL SETUP (IMPROVED) - Starting...')
  console.log('========================================\n')

  const supabase = createServiceRoleClient()

  try {
    // 1. Clean up any existing test data first
    await cleanupExistingTestData(supabase)

    // 2. Create test users with improved error handling
    console.log('\n[E2E Setup] Creating test users...')
    const { userId: ownerId, profileId: ownerProfileId } = await createTestUser(
      supabase,
      E2E_TEST_OWNER,
      'owner'
    )

    const { userId: vetId, profileId: vetProfileId } = await createTestUser(
      supabase,
      E2E_TEST_VET,
      'vet'
    )

    const { userId: adminId, profileId: adminProfileId } = await createTestUser(
      supabase,
      E2E_TEST_ADMIN,
      'admin'
    )

    // 3. Create test data with error handling
    console.log('\n[E2E Setup] Creating test data...')
    const pets = await createTestPets(supabase, ownerId)
    const products = await createTestProducts(supabase)
    const services = await createTestServices(supabase)

    // 4. Compile test data
    const testData: E2ETestData = {
      ownerId,
      ownerProfileId,
      vetId,
      vetProfileId,
      adminId,
      adminProfileId,
      pets,
      vaccines: [], // Simplified for now
      products,
      services,
      loyaltyPoints: 0, // Simplified for now
      appointments: [],
      pendingBookingRequests: [],
      invoices: [],
      conversations: [],
    }

    // 5. Save test data
    saveTestData(testData)

    // 6. Setup auth state
    console.log('\n[E2E Setup] Setting up browser auth state...')
    await setupAuthState(config)

    console.log('\n========================================')
    console.log('E2E GLOBAL SETUP (IMPROVED) - Complete!')
    console.log('========================================\n')
    console.log('Test Data Summary:')
    console.log(`  Owner: ${E2E_TEST_OWNER.email}`)
    console.log(`  Vet: ${E2E_TEST_VET.email}`)
    console.log(`  Admin: ${E2E_TEST_ADMIN.email}`)
    console.log(`  Pets: ${pets.length}`)
    console.log(`  Products: ${products.length}`)
    console.log(`  Services: ${services.length}`)
    console.log('')
  } catch (error) {
    console.error('\n[E2E Setup] FATAL ERROR:', error)
    throw error
  }
}

export default globalSetupImproved