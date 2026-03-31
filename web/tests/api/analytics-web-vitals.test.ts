/**
 * @fileoverview Tests for Web Vitals analytics endpoint
 * TST-QA-001: Analytics Web Vitals Collection
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { SupabaseClient } from '@supabase/supabase-js'
import {
  setupIntegrationTest,
  cleanupIntegrationTest,
  createTestRequest,
} from '@/tests/__helpers__/integration-setup'
import { POST, OPTIONS } from '@/app/api/analytics/web-vitals/route'

describe('TST-QA-001: Analytics Web Vitals Collection', () => {
  let supabase: SupabaseClient

  beforeAll(async () => {
    supabase = await setupIntegrationTest()
  })

  afterAll(async () => {
    await cleanupIntegrationTest(supabase)
  })

  describe('POST /api/analytics/web-vitals', () => {
    it('should successfully collect valid web vitals data', async () => {
      const validPayload = {
        name: 'CLS',
        value: 0.1,
        id: 'test-metric-id-123',
        url: 'https://example.com/dashboard',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        timestamp: Date.now(),
        rating: 'good' as const
      }

      const request = createTestRequest('http://localhost:3000/api/analytics/web-vitals', {
        method: 'POST',
        body: validPayload
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ status: 'ok' })
    })

    it('should accept minimal required fields', async () => {
      const minimalPayload = {
        name: 'LCP',
        value: 2.5,
        id: 'minimal-test-id'
      }

      const request = createTestRequest('http://localhost:3000/api/analytics/web-vitals', {
        method: 'POST',
        body: minimalPayload
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ status: 'ok' })
    })

    it('should handle Core Web Vitals metrics', async () => {
      const payload = {
        name: 'LCP',
        value: 2.5,
        id: `test-lcp-${Date.now()}`,
        url: 'https://vete.example.com',
        timestamp: Date.now(),
        rating: 'needs-improvement' as const
      }

      const request = createTestRequest('http://localhost:3000/api/analytics/web-vitals', {
        method: 'POST',
        body: payload
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ status: 'ok' })
    })

    it('should reject payload missing required name field', async () => {
      const invalidPayload = {
        // name: missing
        value: 2.5,
        id: 'test-id'
      }

      const request = createTestRequest('http://localhost:3000/api/analytics/web-vitals', {
        method: 'POST',
        body: invalidPayload
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Invalid web vitals data' })
    })

    it('should reject invalid payloads', async () => {
      // Test missing required fields
      const invalidPayloads = [
        { value: 2.5, id: 'test-id' }, // missing name
        { name: 'CLS', id: 'test-id' }, // missing value
        { name: 'CLS', value: 0.1 }, // missing id
        { name: 'CLS', value: 'not-a-number', id: 'test-id' } // invalid value type
      ]

      for (const invalidPayload of invalidPayloads) {
        const request = createTestRequest('http://localhost:3000/api/analytics/web-vitals', {
          method: 'POST',
          body: invalidPayload
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data).toEqual({ error: 'Invalid web vitals data' })
      }
    })

    it('should handle OPTIONS request for CORS preflight', async () => {
      const request = createTestRequest('http://localhost:3000/api/analytics/web-vitals', {
        method: 'OPTIONS'
      })

      const response = await OPTIONS()

      expect(response.status).toBe(200)
    })
  })
})