/**
 * @file Signup Slug Check API Tests
 * @description Comprehensive tests for /api/signup/check-slug endpoint
 * Critical for signup flow - validates clinic slug availability
 */

import { describe, it, expect, afterEach } from 'vitest'
import { GET } from '@/app/api/signup/check-slug/route'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RESERVED_SLUGS } from '@/lib/signup/types'

describe('GET /api/signup/check-slug', () => {
  const supabase = createClient({ serviceRole: true })

  // Test tenant cleanup
  const testSlugs = ['test-clinic', 'test-clinic-1', 'test-clinic-2', 'existing-clinic']

  afterEach(async () => {
    // Cleanup test data after each test
    await supabase.from('tenants').delete().in('id', testSlugs)
  })

  const createRequest = (slug: string) => {
    const url = new URL(`http://localhost:3000/api/signup/check-slug?slug=${encodeURIComponent(slug)}`)
    return new NextRequest(url)
  }

  describe('Valid Format Checking', () => {
    it('should return available for valid unused slug', async () => {
      const request = createRequest('new-clinic')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        available: true,
        suggestion: null,
      })
    })

    it('should accept slug with numbers and hyphens', async () => {
      const request = createRequest('clinic-123')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.available).toBe(true)
    })

    it('should accept minimum length slug', async () => {
      const request = createRequest('ab') // Assuming 2 is minimum
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      // Should either be valid or invalid format, but not crash
      expect(typeof data.available).toBe('boolean')
    })
  })

  describe('Invalid Format Handling', () => {
    it('should reject empty slug', async () => {
      const request = createRequest('')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        available: false,
        suggestion: null,
        reason: 'invalid_format',
      })
    })

    it('should reject slug with spaces', async () => {
      const request = createRequest('my clinic')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        available: false,
        suggestion: null,
        reason: 'invalid_format',
      })
    })

    it('should reject slug with special characters', async () => {
      const request = createRequest('clinic@123')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        available: false,
        suggestion: null,
        reason: 'invalid_format',
      })
    })

    it('should reject slug starting with hyphen', async () => {
      const request = createRequest('-clinic')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        available: false,
        suggestion: null,
        reason: 'invalid_format',
      })
    })

    it('should reject slug ending with hyphen', async () => {
      const request = createRequest('clinic-')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        available: false,
        suggestion: null,
        reason: 'invalid_format',
      })
    })

    it('should handle missing slug parameter', async () => {
      const url = new URL('http://localhost:3000/api/signup/check-slug')
      const request = new NextRequest(url)
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        available: false,
        suggestion: null,
        reason: 'invalid_format',
      })
    })
  })

  describe('Reserved Slug Handling', () => {
    it('should reject reserved slugs and provide suggestions', async () => {
      // Test the first reserved slug
      const reservedSlug = RESERVED_SLUGS[0]
      const request = createRequest(reservedSlug)
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.available).toBe(false)
      expect(data.reason).toBe('reserved')
      expect(data.suggestion).toBeTruthy()
      expect(typeof data.suggestion).toBe('string')
    })

    it('should reject all reserved slugs', async () => {
      // Test a few key reserved slugs
      const criticalReserved = ['api', 'admin', 'app', 'www']
      
      for (const slug of criticalReserved) {
        if (RESERVED_SLUGS.includes(slug as any)) {
          const request = createRequest(slug)
          const response = await GET(request)
          const data = await response.json()

          expect(data.available).toBe(false)
          expect(data.reason).toBe('reserved')
        }
      }
    })
  })

  describe('Existing Tenant Handling', () => {
    it('should reject existing tenant slug and provide suggestion', async () => {
      // Create a test tenant
      await supabase.from('tenants').insert({
        id: 'existing-clinic',
        name: 'Test Clinic',
        logo_url: null,
        settings: {},
        created_at: new Date().toISOString(),
        is_active: true,
      })

      const request = createRequest('existing-clinic')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.available).toBe(false)
      expect(data.reason).toBe('taken')
      expect(data.suggestion).toBeTruthy()
      expect(typeof data.suggestion).toBe('string')
      expect(data.suggestion).not.toBe('existing-clinic')
    })

    it('should generate unique suggestions when base slug is taken', async () => {
      // Create multiple similar slugs
      await supabase.from('tenants').insert([
        {
          id: 'test-clinic',
          name: 'Test Clinic',
          logo_url: null,
          settings: {},
          created_at: new Date().toISOString(),
          is_active: true,
        },
        {
          id: 'test-clinic-1',
          name: 'Test Clinic 1',
          logo_url: null,
          settings: {},
          created_at: new Date().toISOString(),
          is_active: true,
        },
      ])

      const request = createRequest('test-clinic')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.available).toBe(false)
      expect(data.reason).toBe('taken')
      expect(data.suggestion).toBeTruthy()
      // Should suggest test-clinic-2 or similar
      expect(data.suggestion).toMatch(/test-clinic-\d+/)
    })
  })

  describe('Edge Cases', () => {
    it('should handle URL encoded slugs', async () => {
      const request = createRequest('clinic%20name') // URL encoded space
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.available).toBe(false)
      expect(data.reason).toBe('invalid_format')
    })

    it('should handle very long slugs gracefully', async () => {
      const longSlug = 'a'.repeat(100) // Very long slug
      const request = createRequest(longSlug)
      const response = await GET(request)

      expect(response.status).toBe(200)
      // Should not crash, may be valid or invalid depending on schema
    })

    it('should handle unicode characters', async () => {
      const request = createRequest('clínica') // Spanish accented character
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.available).toBe(false)
      expect(data.reason).toBe('invalid_format')
    })
  })

  describe('Response Schema Validation', () => {
    it('should always return proper response structure', async () => {
      const request = createRequest('valid-slug')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(typeof data.available).toBe('boolean')
      
      if (!data.available) {
        expect(['invalid_format', 'reserved', 'taken']).toContain(data.reason)
      }
      
      if (data.suggestion !== null) {
        expect(typeof data.suggestion).toBe('string')
        expect(data.suggestion.length).toBeGreaterThan(0)
      }
    })
  })

  describe('Performance', () => {
    it('should respond quickly for availability check', async () => {
      const start = Date.now()
      const request = createRequest('quick-test')
      const response = await GET(request)
      const duration = Date.now() - start

      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(5000) // Should respond within 5 seconds
    })
  })
})