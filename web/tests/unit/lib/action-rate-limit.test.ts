import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  checkActionRateLimit,
  clearActionRateLimits,
  ACTION_RATE_LIMITS,
} from '@/lib/auth/action-rate-limit'

// Mock next/headers
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({
    get: vi.fn((name: string) => {
      if (name === 'x-forwarded-for') return '192.168.1.100'
      if (name === 'x-real-ip') return '192.168.1.100'
      return null
    }),
  })),
}))

describe('Action Rate Limiting', () => {
  beforeEach(() => {
    clearActionRateLimits()
  })

  afterEach(() => {
    clearActionRateLimits()
  })

  describe('checkActionRateLimit', () => {
    it('should allow requests under the limit', async () => {
      const result = await checkActionRateLimit('auth')
      expect(result.success).toBe(true)
      expect(result.remaining).toBeGreaterThan(0)
    })

    it('should block requests over the limit', async () => {
      // Auth limit is 5 per minute
      for (let i = 0; i < 5; i++) {
        const result = await checkActionRateLimit('auth')
        expect(result.success).toBe(true)
      }

      // 6th request should be blocked
      const blocked = await checkActionRateLimit('auth')
      expect(blocked.success).toBe(false)
      expect(blocked.message).toContain('Demasiadas solicitudes')
      expect(blocked.retryAfter).toBeGreaterThan(0)
    })

    it('should return decreasing remaining count', async () => {
      const first = await checkActionRateLimit('auth')
      const second = await checkActionRateLimit('auth')

      expect(second.remaining).toBeLessThan(first.remaining)
    })

    it('should track different rate limit types separately', async () => {
      // Fill up auth limit
      for (let i = 0; i < 5; i++) {
        await checkActionRateLimit('auth')
      }
      const authBlocked = await checkActionRateLimit('auth')
      expect(authBlocked.success).toBe(false)

      // search limit should still be available (30 per minute)
      const searchAllowed = await checkActionRateLimit('search')
      expect(searchAllowed.success).toBe(true)
    })

    it('should return Spanish error message when blocked', async () => {
      // Fill up limit
      for (let i = 0; i < 5; i++) {
        await checkActionRateLimit('auth')
      }

      const result = await checkActionRateLimit('auth')
      expect(result.success).toBe(false)
      expect(result.message).toMatch(/segundos/)
    })

    it('should track different identifiers separately', async () => {
      // Use custom identifier
      for (let i = 0; i < 5; i++) {
        await checkActionRateLimit('auth', 'user:test-user-1')
      }

      // First user should be blocked
      const blocked = await checkActionRateLimit('auth', 'user:test-user-1')
      expect(blocked.success).toBe(false)

      // Different user should be allowed
      const allowed = await checkActionRateLimit('auth', 'user:test-user-2')
      expect(allowed.success).toBe(true)
    })
  })

  describe('ACTION_RATE_LIMITS presets', () => {
    it('should have contactForm preset', () => {
      expect(ACTION_RATE_LIMITS.contactForm).toBeDefined()
      expect(ACTION_RATE_LIMITS.contactForm.type).toBe('auth')
    })

    it('should have foundPetReport preset', () => {
      expect(ACTION_RATE_LIMITS.foundPetReport).toBeDefined()
      expect(ACTION_RATE_LIMITS.foundPetReport.type).toBe('refund')
    })
  })

  describe('rate limit types', () => {
    it('should apply auth limit (5/min) for contact forms', async () => {
      const type = ACTION_RATE_LIMITS.contactForm.type

      // 5 requests should succeed
      for (let i = 0; i < 5; i++) {
        const result = await checkActionRateLimit(type, `test-contact-${i}`)
        expect(result.success).toBe(true)
      }
    })

    it('should apply refund limit (5/hour) for found pet reports', async () => {
      const type = ACTION_RATE_LIMITS.foundPetReport.type

      // 5 requests should succeed
      for (let i = 0; i < 5; i++) {
        const result = await checkActionRateLimit(type, `test-pet-${i}`)
        expect(result.success).toBe(true)
      }
    })

    it('should handle default rate limit type', async () => {
      const result = await checkActionRateLimit('default')
      expect(result.success).toBe(true)
      expect(result.remaining).toBeGreaterThan(0)
    })

    it('should handle write rate limit type', async () => {
      const result = await checkActionRateLimit('write')
      expect(result.success).toBe(true)
      expect(result.remaining).toBeGreaterThan(0)
    })
  })

  describe('clearActionRateLimits', () => {
    it('should clear all rate limit data', async () => {
      // Fill up limit
      for (let i = 0; i < 5; i++) {
        await checkActionRateLimit('auth')
      }
      const blocked = await checkActionRateLimit('auth')
      expect(blocked.success).toBe(false)

      // Clear limits
      clearActionRateLimits()

      // Should be allowed again
      const allowed = await checkActionRateLimit('auth')
      expect(allowed.success).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle rapid consecutive requests', async () => {
      const results = await Promise.all([
        checkActionRateLimit('auth', 'rapid-test'),
        checkActionRateLimit('auth', 'rapid-test'),
        checkActionRateLimit('auth', 'rapid-test'),
      ])

      const successCount = results.filter((r) => r.success).length
      expect(successCount).toBe(3) // All should succeed as under limit
    })

    it('should return positive retryAfter when blocked', async () => {
      // Fill limit
      for (let i = 0; i < 5; i++) {
        await checkActionRateLimit('auth', 'retry-test')
      }

      const result = await checkActionRateLimit('auth', 'retry-test')
      expect(result.success).toBe(false)
      expect(result.retryAfter).toBeGreaterThan(0)
      expect(result.retryAfter).toBeLessThanOrEqual(60) // Should be within 60 seconds for 1min window
    })
  })
})
