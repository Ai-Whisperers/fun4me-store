/**
 * Database Test Setup for RLS & Tenant Isolation Tests
 *
 * This module provides utilities for testing Row-Level Security (RLS) policies
 * and multi-tenant isolation at the database level.
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

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
export interface RLSTestDataTracker {
  tenantIds: string[]
  userIds: string[]
  petIds: string[]
  appointmentIds: string[]
  medicalRecordIds: string[]
}

/**
 * Test user context with auth credentials
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
 * Create a Supabase client with SERVICE ROLE (bypasses RLS)
 * Used for test setup, data cleanup, and service role tests
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
 * Used for testing unauthenticated access
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
 * Initialize test data tracker
 */
export function createRLSTestDataTracker(): RLSTestDataTracker {
  return {
    tenantIds: [],
    userIds: [],
    petIds: [],
    appointmentIds: [],
    medicalRecordIds: [],
  }
}

/**
 * Create a test tenant using service role
 */
export async function createTestTenant(
  tenantId: string,
  name: string,
  tracker: RLSTestDataTracker
): Promise<void> {
  const serviceClient = createServiceClient()

  const { error } = await serviceClient.from('tenants').upsert({
    id: tenantId,
    name,
    is_active: true,
    created_at: new Date().toISOString(),
  }, {
    onConflict: 'id', // Use existing tenant if it already exists
    ignoreDuplicates: false, // Update if exists
  })

  if (error) {
    throw new Error(`Failed to create test tenant '${tenantId}': ${error.message}`)
  }

  tracker.tenantIds.push(tenantId)
}

/**
 * Create a test user and get auth credentials
 * Returns a TestUserContext with authenticated client
 */
export async function createTestUser(
  tenantId: string,
  role: 'owner' | 'vet' | 'admin',
  email: string,
  password: string,
  tracker: RLSTestDataTracker
): Promise<TestUserContext> {
  const serviceClient = createServiceClient()

  // Step 1: Create auth user using admin API
  const {
    data: authData,
    error: authError,
  } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email for testing
  })

  if (authError || !authData.user) {
    throw new Error(`Failed to create auth user '${email}': ${authError?.message}`)
  }

  const userId = authData.user.id

  // Step 2: Create profile record with tenant and role
  // Use upsert to handle case where profile already exists (from previous failed run)
  const { error: profileError } = await serviceClient.from('profiles').upsert({
    id: userId,
    tenant_id: tenantId,
    role,
    email,
    full_name: `Test ${role} User`,
    phone: '+595981234567',
    created_at: new Date().toISOString(),
  }, {
    onConflict: 'id',
    ignoreDuplicates: false, // Update if exists
  })

  if (profileError) {
    // Cleanup auth user if profile creation fails
    await serviceClient.auth.admin.deleteUser(userId)
    throw new Error(`Failed to create profile for '${email}': ${profileError.message}`)
  }

  // Step 3: Sign in to get access token
  const anonymousClient = createAnonymousClient()
  const {
    data: signInData,
    error: signInError,
  } = await anonymousClient.auth.signInWithPassword({
    email,
    password,
  })

  if (signInError || !signInData.session) {
    throw new Error(`Failed to sign in user '${email}': ${signInError?.message}`)
  }

  const accessToken = signInData.session.access_token

  // Step 4: Create authenticated client for this user
  const userClient = createAuthenticatedClient(accessToken)

  tracker.userIds.push(userId)

  return {
    userId,
    tenantId,
    role,
    email,
    accessToken,
    client: userClient,
  }
}

/**
 * Create a test pet
 */
export async function createTestPet(
  tenantId: string,
  ownerId: string,
  name: string,
  tracker: RLSTestDataTracker
): Promise<string> {
  const serviceClient = createServiceClient()

  const { data, error } = await serviceClient
    .from('pets')
    .insert({
      tenant_id: tenantId,
      owner_id: ownerId,
      name,
      species: 'dog',
      breed: 'Mixed',
      weight_kg: 10,
      birth_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to create test pet '${name}': ${error.message}`)
  }

  tracker.petIds.push(data.id)
  return data.id
}

/**
 * Create a test appointment
 */
export async function createTestAppointment(
  tenantId: string,
  petId: string,
  clientId: string,
  tracker: RLSTestDataTracker
): Promise<string> {
  const serviceClient = createServiceClient()

  // Create appointment for tomorrow at 10:00 AM, 30 minutes duration
  const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
  startTime.setHours(10, 0, 0, 0)
  const endTime = new Date(startTime.getTime() + 30 * 60 * 1000) // +30 minutes

  const { data, error } = await serviceClient
    .from('appointments')
    .insert({
      tenant_id: tenantId,
      pet_id: petId,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      duration_minutes: 30,
      reason: 'Test appointment',
      notes: 'Test appointment for RLS testing',
      status: 'scheduled',
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to create test appointment: ${error.message}`)
  }

  tracker.appointmentIds.push(data.id)
  return data.id
}

/**
 * Create a test medical record
 */
export async function createTestMedicalRecord(
  tenantId: string,
  petId: string,
  vetId: string,
  tracker: RLSTestDataTracker
): Promise<string> {
  const serviceClient = createServiceClient()

  const { data, error } = await serviceClient
    .from('medical_records')
    .insert({
      tenant_id: tenantId,
      pet_id: petId,
      vet_id: vetId,
      record_type: 'checkup',
      visit_date: new Date().toISOString(),
      chief_complaint: 'Routine checkup',
      diagnosis_code: 'Z00.0',
      diagnosis_text: 'Routine checkup',
      assessment: 'Physical examination - all normal',
      clinical_notes: 'Test medical record for RLS testing',
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to create test medical record: ${error.message}`)
  }

  tracker.medicalRecordIds.push(data.id)
  return data.id
}

/**
 * Clean up all test data (in correct order to respect foreign keys)
 */
export async function cleanupRLSTestData(tracker: RLSTestDataTracker): Promise<void> {
  const serviceClient = createServiceClient()
  const errors: string[] = []

  // Order matters - delete children before parents

  // 1. Delete medical records
  if (tracker.medicalRecordIds.length > 0) {
    const { error } = await serviceClient
      .from('medical_records')
      .delete()
      .in('id', tracker.medicalRecordIds)
    if (error) errors.push(`Medical records: ${error.message}`)
  }

  // 2. Delete appointments
  if (tracker.appointmentIds.length > 0) {
    const { error } = await serviceClient
      .from('appointments')
      .delete()
      .in('id', tracker.appointmentIds)
    if (error) errors.push(`Appointments: ${error.message}`)
  }

  // 3. Delete pets
  if (tracker.petIds.length > 0) {
    const { error } = await serviceClient.from('pets').delete().in('id', tracker.petIds)
    if (error) errors.push(`Pets: ${error.message}`)
  }

  // 4. Delete auth users and profiles
  if (tracker.userIds.length > 0) {
    // Delete profiles first
    const { error: profileError } = await serviceClient
      .from('profiles')
      .delete()
      .in('id', tracker.userIds)
    if (profileError) errors.push(`Profiles: ${profileError.message}`)

    // Delete auth users
    for (const userId of tracker.userIds) {
      const { error: authError } = await serviceClient.auth.admin.deleteUser(userId)
      if (authError) errors.push(`Auth user ${userId}: ${authError.message}`)
    }
  }

  // 5. Delete tenants (last, as they're referenced by everything)
  if (tracker.tenantIds.length > 0) {
    const { error } = await serviceClient
      .from('tenants')
      .delete()
      .in('id', tracker.tenantIds)
    if (error) errors.push(`Tenants: ${error.message}`)
  }

  if (errors.length > 0) {
    console.warn('[RLS Test Cleanup] Cleanup errors (non-critical):', errors)
    // Don't throw - cleanup errors are expected when tests create additional data
    // Next test run will clean up via cleanupAllTestData() in beforeAll
  }
}

/**
 * Clean up ALL test data from previous runs
 * This should be called BEFORE tests start to ensure a clean state
 * 
 * Deletes data in dependency order to handle foreign key constraints
 */
export async function cleanupAllTestData(): Promise<void> {
  const serviceClient = createServiceClient()

  console.log('[Database Test Setup] Cleaning up all previous test data...')

  const testTenants = ['terrapet', 'terrapet']

  try {
    // Get all profile IDs and pet IDs for test tenants (for dependent data cleanup)
    const { data: profiles } = await serviceClient
      .from('profiles')
      .select('id')
      .in('tenant_id', testTenants)

    const { data: pets } = await serviceClient
      .from('pets')
      .select('id')
      .in('tenant_id', testTenants)

    const {data: appointments} = await serviceClient
      .from('appointments')
      .select('id')
      .in('tenant_id', testTenants)

    const { data: medicalRecords } = await serviceClient
      .from('medical_records')
      .select('id')
      .in('tenant_id', testTenants)

    const userIds = profiles?.map((p) => p.id) || []
    const petIds = pets?.map((p) => p.id) || []
    const appointmentIds = appointments?.map((a) => a.id) || []
    const medicalRecordIds = medicalRecords?.map((m) => m.id) || []

    // Delete in dependency order (children first, parents last)
    // Ignore errors - tables/data might not exist

    // 1. Delete all hospitalization-related data (depends on pets)
    if (petIds.length > 0) {
      await serviceClient.from('hospitalization_vitals').delete().in('pet_id', petIds)
      await serviceClient.from('hospitalization_treatments').delete().in('pet_id', petIds)
      await serviceClient.from('hospitalizations').delete().in('pet_id', petIds)
    }

    // 2. Delete medical record items (depends on medical_records)
    if (medicalRecordIds.length > 0) {
      await serviceClient.from('medical_record_items').delete().in('medical_record_id', medicalRecordIds)
    }

    // 3. Delete medical records (depends on pets)
    for (const tenantId of testTenants) {
      await serviceClient.from('medical_records').delete().eq('tenant_id', tenantId)
    }

    // 4. Delete appointment services (depends on appointments)
    if (appointmentIds.length > 0) {
      await serviceClient.from('appointment_services').delete().in('appointment_id', appointmentIds)
    }

    // 5. Delete appointments
    for (const tenantId of testTenants) {
      await serviceClient.from('appointments').delete().eq('tenant_id', tenantId)
    }

    // 6. Delete vaccines (depends on pets)
    for (const tenantId of testTenants) {
      await serviceClient.from('vaccines').delete().eq('tenant_id', tenantId)
    }

    // 7. Delete pets
    for (const tenantId of testTenants) {
      await serviceClient.from('pets').delete().eq('tenant_id', tenantId)
    }

    // 8. Delete profiles
    for (const tenantId of testTenants) {
      await serviceClient.from('profiles').delete().eq('tenant_id', tenantId)
    }

    // 9. Delete auth users
    for (const userId of userIds) {
      await serviceClient.auth.admin.deleteUser(userId)
    }

    // 10. Delete tenants (last, as everything else depends on them)
    for (const tenantId of testTenants) {
      await serviceClient.from('tenants').delete().eq('id', tenantId)
    }

    console.log('[Database Test Setup] All test data cleaned up successfully ✓')
  } catch (error) {
    console.warn('[Database Test Setup] Cleanup completed with some expected errors:', error)
    // Don't throw - cleanup should be non-blocking
  }
}

/**
 * Wait for a condition to be true (useful for async operations)
 */
export async function waitFor(
  condition: () => Promise<boolean>,
  options: {
    timeout?: number
    interval?: number
    errorMessage?: string
  } = {}
): Promise<void> {
  const timeout = options.timeout || 5000
  const interval = options.interval || 100
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, interval))
  }

  throw new Error(options.errorMessage || 'Condition not met within timeout')
}
