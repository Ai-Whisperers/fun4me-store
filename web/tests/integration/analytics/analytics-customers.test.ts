/**
 * @fileoverview Tests for Customer Analytics endpoint
 * TST-QA-002: Customer Analytics Collection
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/analytics/customers/route'
import {
  mockState,
  resetAllMocks,
  createStatefulSupabaseMock,
} from '@/lib/test-utils'

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(createStatefulSupabaseMock())),
}))

// Mock auth wrapper
vi.mock('@/lib/auth', () => ({
  withApiAuth: (handler: any, options?: { roles?: string[] }) => {
    return async (request: Request) => {
      const { mockState, createStatefulSupabaseMock } = await import('@/lib/test-utils')

      if (!mockState.user) {
        const { apiError, HTTP_STATUS } = await import('@/lib/api/errors')
        return apiError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED)
      }

      if (!mockState.profile) {
        const { apiError, HTTP_STATUS } = await import('@/lib/api/errors')
        return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
      }

      if (options?.roles && !options.roles.includes(mockState.profile.role)) {
        const { apiError, HTTP_STATUS } = await import('@/lib/api/errors')
        return apiError('INSUFFICIENT_ROLE', HTTP_STATUS.FORBIDDEN)
      }

      return handler({
        request,
        user: mockState.user,
        profile: mockState.profile,
        supabase: createStatefulSupabaseMock(),
      })
    }
  },
}))

// Mock API error helpers
vi.mock('@/lib/api/errors', () => ({
  apiError: (code: string, status: number, options?: { details?: Record<string, unknown> }) => {
    const { NextResponse } = require('next/server')
    return NextResponse.json(
      { error: code, ...options?.details },
      { status }
    )
  },
  HTTP_STATUS: {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
  },
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

describe('TST-QA-002: Customer Analytics Collection', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  describe('GET /api/analytics/customers', () => {
    it('should require authentication', async () => {
      mockState.setAuthScenario('UNAUTHENTICATED')

      const request = new NextRequest('http://localhost:3000/api/analytics/customers')
      const response = await GET(request)
      
      expect(response.status).toBe(401)
    })

    it('should require vet or admin role', async () => {
      mockState.setAuthScenario('OWNER')

      const request = new NextRequest('http://localhost:3000/api/analytics/customers')
      const response = await GET(request)
      
      expect(response.status).toBe(403)
    })

    it('should return customer analytics for valid vet user', async () => {
      mockState.setAuthScenario('VET')

      // Mock successful RPC response
      const mockRpcData = {
        summary: {
          total_customers: 100,
          active_customers: 75,
          new_customers_period: 15,
          repeat_purchase_rate: 0.6,
          avg_customer_lifetime_value: 500,
          avg_orders_per_customer: 3.2,
          avg_basket_size: 85.50,
        },
        segments: [
          { segment: 'High Value', count: 20, avg_value: 1200 },
          { segment: 'Regular', count: 55, avg_value: 450 },
        ],
        topCustomers: [
          { name: 'John Doe', total_spent: 2500, orders: 8 },
        ],
        atRiskCustomers: [
          { name: 'Jane Smith', last_order: '2024-01-01', total_spent: 300 },
        ],
      }

      // Mock the Supabase RPC call
      vi.mocked(createStatefulSupabaseMock).mockImplementation(() => {
        const mockSupabase = {
          rpc: vi.fn().mockResolvedValue({ data: mockRpcData, error: null }),
          from: vi.fn(),
          auth: { getUser: vi.fn() },
        } as any
        return mockSupabase
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/customers')
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.summary.total_customers).toBe(100)
      expect(data.summary.active_customers).toBe(75)
      expect(data.segments).toHaveLength(2)
      expect(data.topCustomers).toHaveLength(1)
      expect(data.atRiskCustomers).toHaveLength(1)
      expect(data.generatedAt).toBeTruthy()
    })

    it('should handle period parameter validation', async () => {
      mockState.setAuthScenario('ADMIN')

      const mockSupabase = createStatefulSupabaseMock()
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null })

      const request = new NextRequest('http://localhost:3000/api/analytics/customers?period=30')
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_customer_analytics', {
        p_tenant_id: mockState.profile?.tenant_id,
        p_period_days: 30,
      })
    })

    it('should clamp period parameter to valid range', async () => {
      mockState.setAuthScenario('ADMIN')

      const mockSupabase = createStatefulSupabaseMock()
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null })

      // Test with too large period (should be clamped to 365)
      const requestLarge = new NextRequest('http://localhost:3000/api/analytics/customers?period=9999')
      const responseLarge = await GET(requestLarge)
      
      expect(responseLarge.status).toBe(200)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_customer_analytics', {
        p_tenant_id: mockState.profile?.tenant_id,
        p_period_days: 365, // Clamped to max
      })

      // Test with too small period (should be clamped to 1)
      mockSupabase.rpc.mockClear()
      const requestSmall = new NextRequest('http://localhost:3000/api/analytics/customers?period=-5')
      const responseSmall = await GET(requestSmall)
      
      expect(responseSmall.status).toBe(200)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_customer_analytics', {
        p_tenant_id: mockState.profile?.tenant_id,
        p_period_days: 1, // Clamped to min
      })
    })

    it('should handle non-numeric period parameter', async () => {
      mockState.setAuthScenario('ADMIN')

      const mockSupabase = createStatefulSupabaseMock()
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null })

      const request = new NextRequest('http://localhost:3000/api/analytics/customers?period=invalid')
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      // Should default to 90 days when period is invalid
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_customer_analytics', {
        p_tenant_id: mockState.profile?.tenant_id,
        p_period_days: 90,
      })
    })

    it('should return default structure when RPC returns null', async () => {
      mockState.setAuthScenario('VET')

      const mockSupabase = createStatefulSupabaseMock()
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null })

      const request = new NextRequest('http://localhost:3000/api/analytics/customers')
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.summary.total_customers).toBe(0)
      expect(data.summary.active_customers).toBe(0)
      expect(data.summary.avg_customer_lifetime_value).toBe(0)
      expect(Array.isArray(data.segments)).toBe(true)
      expect(Array.isArray(data.topCustomers)).toBe(true)
      expect(Array.isArray(data.atRiskCustomers)).toBe(true)
      expect(data.generatedAt).toBeTruthy()
    })

    it('should handle RPC errors gracefully', async () => {
      mockState.setAuthScenario('VET')

      // Mock RPC to throw an error (this will be caught and return 500)
      vi.mocked(createStatefulSupabaseMock).mockImplementation(() => {
        const mockSupabase = {
          rpc: vi.fn().mockResolvedValue({ 
            data: null, 
            error: { message: 'Database connection failed' }
          }),
          from: vi.fn(),
          auth: { getUser: vi.fn() },
        } as any
        return mockSupabase
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/customers')
      const response = await GET(request)
      
      expect(response.status).toBe(500)
      
      const data = await response.json()
      expect(data.error).toBeDefined()
    })
  })
})