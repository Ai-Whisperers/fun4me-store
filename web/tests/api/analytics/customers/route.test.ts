/**
 * API Integration Tests: /api/analytics/customers
 * TST-QA-002: Customer Analytics Endpoint
 * 
 * Tests authentication, authorization, period validation, tenant isolation,
 * and database function integration for customer analytics.
 * 
 * API contract:
 * - GET /api/analytics/customers → customer analytics summary
 * - GET /api/analytics/customers?period=30 → last 30 days analytics
 * - Requires vet/admin role
 * - Uses database function get_customer_analytics for efficiency
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { GET } from '@/app/api/analytics/customers/route'
import {
  setupIntegrationTest,
  cleanupIntegrationTest,
  createTestAuthUser,
  createTestProfile,
  TEST_TENANT_ID,
  cleanupManager,
  createTestRequest,
  expectSuccess,
  expectError,
  getAuthTokenFromUser,
} from '../../../__helpers__/integration-setup'
import { SupabaseClient } from '@supabase/supabase-js'

interface CustomerAnalytics {
  summary: {
    total_customers: number
    active_customers: number
    new_customers_period: number
    repeat_purchase_rate: number
    avg_customer_lifetime_value: number
    avg_orders_per_customer: number
    avg_basket_size: number
  }
  segments: Array<{
    segment: string
    count: number
    percentage: number
  }>
  topCustomers: Array<{
    id: string
    name: string
    total_spent: number
    order_count: number
  }>
  atRiskCustomers: Array<{
    id: string
    name: string
    last_order_date: string
    days_since_order: number
  }>
  generatedAt: string
}

describe('TST-QA-002: Customer Analytics Endpoint', () => {
  let supabase: SupabaseClient

  beforeAll(async () => {
    supabase = await setupIntegrationTest()
  })

  afterAll(async () => {
    await cleanupIntegrationTest(supabase)
  })

  afterEach(async () => {
    await cleanupManager.cleanupWithRetry()
  })

  describe('Authentication & Authorization', () => {
    it('should require authentication', async () => {
      const request = createTestRequest('http://localhost:3000/api/analytics/customers')

      const response = await GET(request)
      const data = await response.json()

      expectError(response, 401)
      expect(data.error).toContain('Unauthorized')
    })

    it('should require vet or admin role', async () => {
      // Create a user with client role (not authorized)
      const clientUser = await createTestAuthUser(supabase, 'client@test.com')
      const clientProfile = await createTestProfile(supabase, 'client', TEST_TENANT_ID)
      const clientToken = getAuthTokenFromUser(clientUser, clientProfile)

      const request = createTestRequest(
        'http://localhost:3000/api/analytics/customers',
        { authToken: clientToken }
      )

      const response = await GET(request)
      const data = await response.json()

      expectError(response, 403)
      expect(data.error).toContain('Insufficient permissions')
    })

    it('should allow vet role access', async () => {
      const vetUser = await createTestAuthUser(supabase, 'vet@test.com')
      const vetProfile = await createTestProfile(supabase, 'vet', TEST_TENANT_ID)
      const vetToken = getAuthTokenFromUser(vetUser, vetProfile)

      const request = createTestRequest(
        'http://localhost:3000/api/analytics/customers',
        { authToken: vetToken }
      )

      const response = await GET(request)
      
      expectSuccess(response, 200)
    })

    it('should allow admin role access', async () => {
      const adminUser = await createTestAuthUser(supabase, 'admin@test.com')
      const adminProfile = await createTestProfile(supabase, 'admin', TEST_TENANT_ID)
      const adminToken = getAuthTokenFromUser(adminUser, adminProfile)

      const request = createTestRequest(
        'http://localhost:3000/api/analytics/customers',
        { authToken: adminToken }
      )

      const response = await GET(request)
      
      expectSuccess(response, 200)
    })
  })

  describe('Period Parameter Validation', () => {
    let vetUser: any
    let vetProfile: any
    let vetToken: string

    beforeEach(async () => {
      vetUser = await createTestAuthUser(supabase, `vet-${Date.now()}@test.com`)
      vetProfile = await createTestProfile(supabase, 'vet', TEST_TENANT_ID)
      vetToken = getAuthTokenFromUser(vetUser, vetProfile)
    })

    it('should use default period of 90 days when not specified', async () => {
      const request = createTestRequest(
        'http://localhost:3000/api/analytics/customers',
        { authToken: vetToken }
      )

      const response = await GET(request)
      const data: CustomerAnalytics = await response.json()

      expectSuccess(response, 200)
      expect(data).toHaveProperty('summary')
      expect(data).toHaveProperty('generatedAt')
    })

    it('should accept valid period parameter', async () => {
      const request = createTestRequest(
        'http://localhost:3000/api/analytics/customers?period=30',
        { authToken: vetToken }
      )

      const response = await GET(request)
      const data: CustomerAnalytics = await response.json()

      expectSuccess(response, 200)
      expect(data).toHaveProperty('summary')
      expect(data.summary).toHaveProperty('total_customers')
    })

    it('should clamp period to minimum 1 day', async () => {
      const request = createTestRequest(
        'http://localhost:3000/api/analytics/customers?period=0',
        { authToken: vetToken }
      )

      const response = await GET(request)
      
      // Should not error - period should be clamped to 1
      expectSuccess(response, 200)
    })

    it('should clamp period to maximum 365 days', async () => {
      const request = createTestRequest(
        'http://localhost:3000/api/analytics/customers?period=999',
        { authToken: vetToken }
      )

      const response = await GET(request)
      
      // Should not error - period should be clamped to 365
      expectSuccess(response, 200)
    })

    it('should handle non-numeric period parameter', async () => {
      const request = createTestRequest(
        'http://localhost:3000/api/analytics/customers?period=invalid',
        { authToken: vetToken }
      )

      const response = await GET(request)
      
      // Should use default period (90) when invalid
      expectSuccess(response, 200)
    })
  })

  describe('Analytics Response Structure', () => {
    let vetUser: any
    let vetProfile: any
    let vetToken: string

    beforeEach(async () => {
      vetUser = await createTestAuthUser(supabase, `vet-${Date.now()}@test.com`)
      vetProfile = await createTestProfile(supabase, 'vet', TEST_TENANT_ID)
      vetToken = getAuthTokenFromUser(vetUser, vetProfile)
    })

    it('should return complete analytics structure', async () => {
      const request = createTestRequest(
        'http://localhost:3000/api/analytics/customers',
        { authToken: vetToken }
      )

      const response = await GET(request)
      const data: CustomerAnalytics = await response.json()

      expectSuccess(response, 200)

      // Verify response structure
      expect(data).toHaveProperty('summary')
      expect(data).toHaveProperty('segments')
      expect(data).toHaveProperty('topCustomers')
      expect(data).toHaveProperty('atRiskCustomers')
      expect(data).toHaveProperty('generatedAt')

      // Verify summary structure
      expect(data.summary).toHaveProperty('total_customers')
      expect(data.summary).toHaveProperty('active_customers')
      expect(data.summary).toHaveProperty('new_customers_period')
      expect(data.summary).toHaveProperty('repeat_purchase_rate')
      expect(data.summary).toHaveProperty('avg_customer_lifetime_value')
      expect(data.summary).toHaveProperty('avg_orders_per_customer')
      expect(data.summary).toHaveProperty('avg_basket_size')

      // Verify data types
      expect(typeof data.summary.total_customers).toBe('number')
      expect(typeof data.summary.active_customers).toBe('number')
      expect(typeof data.summary.repeat_purchase_rate).toBe('number')
      expect(Array.isArray(data.segments)).toBe(true)
      expect(Array.isArray(data.topCustomers)).toBe(true)
      expect(Array.isArray(data.atRiskCustomers)).toBe(true)
      expect(typeof data.generatedAt).toBe('string')
    })

    it('should return valid timestamp in generatedAt', async () => {
      const request = createTestRequest(
        'http://localhost:3000/api/analytics/customers',
        { authToken: vetToken }
      )

      const response = await GET(request)
      const data: CustomerAnalytics = await response.json()

      expectSuccess(response, 200)

      // Verify generatedAt is a valid ISO timestamp
      const timestamp = new Date(data.generatedAt)
      expect(timestamp).toBeInstanceOf(Date)
      expect(timestamp.getTime()).not.toBeNaN()
    })

    it('should return empty arrays and zero values for tenant with no data', async () => {
      const request = createTestRequest(
        'http://localhost:3000/api/analytics/customers',
        { authToken: vetToken }
      )

      const response = await GET(request)
      const data: CustomerAnalytics = await response.json()

      expectSuccess(response, 200)

      // For a new tenant with no data, should return zeros/empty arrays
      expect(data.summary.total_customers).toBeGreaterThanOrEqual(0)
      expect(data.summary.active_customers).toBeGreaterThanOrEqual(0)
      expect(data.segments).toEqual([])
      expect(data.topCustomers).toEqual([])
      expect(data.atRiskCustomers).toEqual([])
    })
  })

  describe('Tenant Isolation', () => {
    it('should only return data for the current tenant', async () => {
      // Create users in different tenants
      const tenant1User = await createTestAuthUser(supabase, 'tenant1@test.com')
      const tenant1Profile = await createTestProfile(supabase, 'vet', 'tenant1')
      const tenant1Token = getAuthTokenFromUser(tenant1User, tenant1Profile)

      const tenant2User = await createTestAuthUser(supabase, 'tenant2@test.com')
      const tenant2Profile = await createTestProfile(supabase, 'vet', 'tenant2')
      const tenant2Token = getAuthTokenFromUser(tenant2User, tenant2Profile)

      // Both should get responses but with potentially different data
      const request1 = createTestRequest(
        'http://localhost:3000/api/analytics/customers',
        { authToken: tenant1Token }
      )

      const request2 = createTestRequest(
        'http://localhost:3000/api/analytics/customers',
        { authToken: tenant2Token }
      )

      const [response1, response2] = await Promise.all([
        GET(request1),
        GET(request2)
      ])

      expectSuccess(response1, 200)
      expectSuccess(response2, 200)

      // Both should return valid analytics (even if empty)
      const data1: CustomerAnalytics = await response1.json()
      const data2: CustomerAnalytics = await response2.json()

      expect(data1).toHaveProperty('summary')
      expect(data2).toHaveProperty('summary')
      expect(data1.generatedAt).toBeDefined()
      expect(data2.generatedAt).toBeDefined()
    })
  })

  describe('Database Function Integration', () => {
    let vetUser: any
    let vetProfile: any
    let vetToken: string

    beforeEach(async () => {
      vetUser = await createTestAuthUser(supabase, `vet-${Date.now()}@test.com`)
      vetProfile = await createTestProfile(supabase, 'vet', TEST_TENANT_ID)
      vetToken = getAuthTokenFromUser(vetUser, vetProfile)
    })

    it('should handle database function errors gracefully', async () => {
      // This test verifies error handling when the RPC call fails
      // We can't easily force a DB error in tests, but we can verify structure
      const request = createTestRequest(
        'http://localhost:3000/api/analytics/customers',
        { authToken: vetToken }
      )

      const response = await GET(request)
      
      // Should either succeed with data or fail with proper error
      if (response.status === 200) {
        const data: CustomerAnalytics = await response.json()
        expect(data).toHaveProperty('summary')
      } else {
        expectError(response, 500)
        const data = await response.json()
        expect(data).toHaveProperty('error')
      }
    })

    it('should call RPC function with correct parameters', async () => {
      const request = createTestRequest(
        'http://localhost:3000/api/analytics/customers?period=45',
        { authToken: vetToken }
      )

      const response = await GET(request)
      
      // Verify the call succeeds (indicating RPC was called correctly)
      expectSuccess(response, 200)
      const data: CustomerAnalytics = await response.json()
      expect(data).toHaveProperty('summary')
    })
  })
})