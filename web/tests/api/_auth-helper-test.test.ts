/**
 * Test to verify the new auth helper functions work correctly.
 * 
 * This test demonstrates the NEW PATTERN for API tests with authentication.
 * All other API tests should be updated to follow this pattern.
 */

import { describe, it, expect, beforeAll, afterAll} from 'vitest'
import { SupabaseClient } from '@supabase/supabase-js'
import {
  setupIntegrationTest,
  cleanupIntegrationTest,
  createTestAuthUser,
  getAuthTokenFromUser,
  createTestRequest,
  TEST_TENANT_ID,
} from '../__helpers__/integration-setup'

describe('Auth Helper Test - New Pattern', () => {
  let supabase: SupabaseClient
  let adminUser: Awaited<ReturnType<typeof createTestAuthUser>>
  let vetUser: Awaited<ReturnType<typeof createTestAuthUser>>
  let ownerUser: Awaited<ReturnType<typeof createTestAuthUser>>

  beforeAll(async () => {
    supabase = await setupIntegrationTest()

    // Create test users with different roles
    adminUser = await createTestAuthUser(supabase, 'admin', TEST_TENANT_ID)
    vetUser = await createTestAuthUser(supabase, 'vet', TEST_TENANT_ID)
    ownerUser = await createTestAuthUser(supabase, 'owner', TEST_TENANT_ID)
  })

  afterAll(async () => {
    await cleanupIntegrationTest()
  })

  it('should create users with email and password', () => {
    expect(adminUser.email).toBeDefined()
    expect(adminUser.password).toBe('test-password-123')
    expect(adminUser.profile.role).toBe('admin')

    expect(vetUser.email).toBeDefined()
    expect(vetUser.password).toBe('test-password-123')
    expect(vetUser.profile.role).toBe('vet')

    expect(ownerUser.email).toBeDefined()
    expect(ownerUser.password).toBe('test-password-123')
    expect(ownerUser.profile.role).toBe('owner')
  })

  it('should get auth token from admin user', async () => {
    const token = await getAuthTokenFromUser(adminUser)
    expect(token).toBeTruthy()
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(50) // JWT tokens are long
  })

  it('should get auth token from vet user', async () => {
    const token = await getAuthTokenFromUser(vetUser)
    expect(token).toBeTruthy()
    expect(typeof token).toBe('string')
  })

  it('should get auth token from owner user', async () => {
    const token = await getAuthTokenFromUser(ownerUser)
    expect(token).toBeTruthy()
    expect(typeof token).toBe('string')
  })

  it('should create authenticated request with token', async () => {
    const token = await getAuthTokenFromUser(adminUser)

    const request = createTestRequest('http://localhost:3000/api/test', {
      method: 'POST',
      body: { test: 'data' },
      authToken: token,
    })

    // Verify Authorization header was set
    expect(request.headers.get('Authorization')).toBe(`Bearer ${token}`)
    expect(request.headers.get('Content-Type')).toBe('application/json')
  })

  it('should create request without auth token when not provided', () => {
    const request = createTestRequest('http://localhost:3000/api/test', {
      method: 'GET',
    })

    // Should NOT have Authorization header
    expect(request.headers.get('Authorization')).toBeNull()
  })
})
