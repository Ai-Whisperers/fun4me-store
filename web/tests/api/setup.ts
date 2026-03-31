/**
 * API Test Setup for TerraPet Endpoint Tests
 *
 * This module provides utilities for testing API endpoints with different
 * authentication contexts (anonymous, owner, vet, admin).
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

// Test environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_ANON_KEY) {
  throw new Error(
    `Missing required environment variables:
    NEXT_PUBLIC_SUPABASE_URL: ${SUPABASE_URL ? 'SET' : 'NOT SET'}
    SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_KEY ? 'SET' : 'NOT SET'}
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY ? 'SET' : 'NOT SET'}
    
    Make sure .env.local exists in the web/ directory.`
  )
}

/**
 * Test data tracker for cleanup
 */
export interface APITestDataTracker {
  tenantIds: string[]
  userIds: string[]
  petIds: string[]
  appointmentIds: string[]
  serviceIds: string[]
}

/**
 * Test user context with auth credentials for API testing
 */
export interface TestUserContext {
  userId: string
  tenantId: string
  role: 'owner' | 'vet' | 'admin'
  email: string
  accessToken: string
  client: SupabaseClient
}

/**
 * API request helper with authentication
 */
export interface APIRequestHelper {
  get: (endpoint: string) => Promise<Response>
  post: (endpoint: string, body?: unknown) => Promise<Response>
  put: (endpoint: string, body?: unknown) => Promise<Response>
  patch: (endpoint: string, body?: unknown) => Promise<Response>
  delete: (endpoint: string) => Promise<Response>
}

/**
 * Create a Supabase client with SERVICE ROLE (bypasses RLS)
 * Used for test setup and data cleanup
 */
export function createServiceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Create an ANONYMOUS Supabase client (no auth)
 * Used for testing unauthenticated API access
 */
export function createAnonymousClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Create an AUTHENTICATED Supabase client for a specific user
 * This client respects RLS policies based on the user's auth context
 */
export function createAuthenticatedClient(accessToken: string): SupabaseClient {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })

  return client
}

/**
 * Create API request helper with authentication
 */
export function createAPIRequestHelper(accessToken?: string): APIRequestHelper {
  const baseURL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  const request = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
    const url = endpoint.startsWith('http') ? endpoint : `${baseURL}${endpoint}`
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      })
      return response
    } catch (error) {
      console.error('[APIRequestHelper] Request failed:', error)
      throw error
    }
  }

  return {
    get: (endpoint: string) => request(endpoint, { method: 'GET' }),
    post: (endpoint: string, body?: unknown) =>
      request(endpoint, {
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
      }),
    put: (endpoint: string, body?: unknown) =>
      request(endpoint, {
        method: 'PUT',
        body: body ? JSON.stringify(body) : undefined,
      }),
    patch: (endpoint: string, body?: unknown) =>
      request(endpoint, {
        method: 'PATCH',
        body: body ? JSON.stringify(body) : undefined,
      }),
    delete: (endpoint: string) => request(endpoint, { method: 'DELETE' }),
  }
}

/**
 * Create an anonymous API request helper (no authentication)
 */
export function createAnonymousAPIHelper(): APIRequestHelper {
  return createAPIRequestHelper()
}

/**
 * Create an authenticated API request helper for a test user
 */
export function createAuthenticatedAPIHelper(userContext: TestUserContext): APIRequestHelper {
  return createAPIRequestHelper(userContext.accessToken)
}

/**
 * Create a test user with the specified tenant and role
 */
export async function createTestUser(
  tenantId: string,
  role: 'owner' | 'vet' | 'admin',
  email: string,
  password: string,
  tracker: APITestDataTracker
): Promise<TestUserContext> {
  const serviceClient = createServiceClient()

  try {
    // Create user in auth system
    const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      throw new Error(`Failed to create test user: ${authError?.message}`)
    }

    const userId = authData.user.id
    tracker.userIds.push(userId)

    // Create profile
    const { error: profileError } = await serviceClient.from('profiles').insert({
      id: userId,
      tenant_id: tenantId,
      role,
      email,
      full_name: `Test ${role} User`,
    })

    if (profileError) {
      throw new Error(`Failed to create user profile: ${profileError.message}`)
    }

    // Sign in to get access token
    const { data: signInData, error: signInError } = await serviceClient.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError || !signInData.session) {
      throw new Error(`Failed to sign in test user: ${signInError?.message}`)
    }

    const accessToken = signInData.session.access_token

    return {
      userId,
      tenantId,
      role,
      email,
      accessToken,
      client: createAuthenticatedClient(accessToken),
    }
  } catch (error) {
    console.error('[createTestUser] Failed:', error)
    throw error
  }
}

/**
 * Initialize test data tracker
 */
export function createTestDataTracker(): APITestDataTracker {
  return {
    tenantIds: [],
    userIds: [],
    petIds: [],
    appointmentIds: [],
    serviceIds: [],
  }
}

/**
 * Clean up all test data created during tests
 */
export async function cleanupTestData(tracker: APITestDataTracker): Promise<void> {
  const serviceClient = createServiceClient()

  try {
    // Delete in dependency order to avoid foreign key violations

    // 1. Delete appointments first (depends on pets, services)
    if (tracker.appointmentIds.length > 0) {
      const { error: appointmentsError } = await serviceClient
        .from('appointments')
        .delete()
        .in('id', tracker.appointmentIds)

      if (appointmentsError) {
        console.error('[Cleanup] Failed to delete appointments:', appointmentsError)
      }
    }

    // 2. Delete pets (depends on profiles)
    if (tracker.petIds.length > 0) {
      const { error: petsError } = await serviceClient
        .from('pets')
        .delete()
        .in('id', tracker.petIds)

      if (petsError) {
        console.error('[Cleanup] Failed to delete pets:', petsError)
      }
    }

    // 3. Delete services
    if (tracker.serviceIds.length > 0) {
      const { error: servicesError } = await serviceClient
        .from('services')
        .delete()
        .in('id', tracker.serviceIds)

      if (servicesError) {
        console.error('[Cleanup] Failed to delete services:', servicesError)
      }
    }

    // 4. Delete profiles (depends on tenants)
    if (tracker.userIds.length > 0) {
      const { error: profilesError } = await serviceClient
        .from('profiles')
        .delete()
        .in('id', tracker.userIds)

      if (profilesError) {
        console.error('[Cleanup] Failed to delete profiles:', profilesError)
      }

      // Also delete auth users
      for (const userId of tracker.userIds) {
        try {
          await serviceClient.auth.admin.deleteUser(userId)
        } catch (error) {
          console.error(`[Cleanup] Failed to delete auth user ${userId}:`, error)
        }
      }
    }

    // 5. Delete tenants last
    if (tracker.tenantIds.length > 0) {
      const { error: tenantsError } = await serviceClient
        .from('tenants')
        .delete()
        .in('id', tracker.tenantIds)

      if (tenantsError) {
        console.error('[Cleanup] Failed to delete tenants:', tenantsError)
      }
    }

    console.log('[Cleanup] Test data cleanup completed')
  } catch (error) {
    console.error('[Cleanup] Error during cleanup:', error)
    throw error
  }
}

/**
 * Clean up ALL test data from previous runs (for beforeAll hooks)
 */
export async function cleanupAllTestData(): Promise<void> {
  const serviceClient = createServiceClient()

  try {
    // Delete all test data (identified by email pattern or tenant_id pattern)
    
    // 1. Find test users
    const { data: testProfiles } = await serviceClient
      .from('profiles')
      .select('id, tenant_id')
      .like('email', '%@test.terrapet%')

    if (testProfiles && testProfiles.length > 0) {
      const userIds = testProfiles.map((p) => p.id)
      const tenantIds = [...new Set(testProfiles.map((p) => p.tenant_id))]

      // Delete appointments
      await serviceClient.from('appointments').delete().in('tenant_id', tenantIds)

      // Delete pets
      await serviceClient.from('pets').delete().in('owner_id', userIds)

      // Delete profiles
      await serviceClient.from('profiles').delete().in('id', userIds)

      // Delete auth users
      for (const userId of userIds) {
        try {
          await serviceClient.auth.admin.deleteUser(userId)
        } catch (error) {
          // Ignore errors for users that don't exist
        }
      }

      // Delete test tenants (if they exist)
      await serviceClient
        .from('tenants')
        .delete()
        .in('id', tenantIds.filter((id) => id.includes('test')))
    }

    console.log('[CleanupAll] Previous test data cleanup completed')
  } catch (error) {
    console.error('[CleanupAll] Error during cleanup:', error)
    // Don't throw - this is best-effort cleanup
  }
}

/**
 * Create test pet for a user
 */
export async function createTestPet(
  ownerId: string,
  tenantId: string,
  tracker: APITestDataTracker
): Promise<string> {
  const serviceClient = createServiceClient()

  const petId = randomUUID()
  tracker.petIds.push(petId)

  const { error } = await serviceClient.from('pets').insert({
    id: petId,
    owner_id: ownerId,
    tenant_id: tenantId,
    name: 'Test Pet',
    species: 'dog',
    breed: 'Mixed',
    sex: 'male',
    date_of_birth: '2020-01-01',
  })

  if (error) {
    throw new Error(`Failed to create test pet: ${error.message}`)
  }

  return petId
}

/**
 * Create test appointment
 */
export async function createTestAppointment(
  petId: string,
  serviceId: string,
  tenantId: string,
  tracker: APITestDataTracker
): Promise<string> {
  const serviceClient = createServiceClient()

  const appointmentId = randomUUID()
  tracker.appointmentIds.push(appointmentId)

  const startTime = new Date()
  startTime.setHours(startTime.getHours() + 24) // Tomorrow

  const endTime = new Date(startTime)
  endTime.setMinutes(endTime.getMinutes() + 30)

  const { error } = await serviceClient.from('appointments').insert({
    id: appointmentId,
    pet_id: petId,
    service_id: serviceId,
    tenant_id: tenantId,
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    duration_minutes: 30,
    status: 'scheduled',
  })

  if (error) {
    throw new Error(`Failed to create test appointment: ${error.message}`)
  }

  return appointmentId
}
