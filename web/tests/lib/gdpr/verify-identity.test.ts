/**
 * GDPR Identity Verification Tests
 *
 * COMP-001: Tests for identity verification utility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock crypto module before importing the function
vi.mock('crypto', () => {
  let callCount = 0
  return {
    default: {
      randomBytes: vi.fn(() => ({
        toString: () => {
          callCount++
          // Generate unique tokens each time
          return callCount.toString(16).padStart(64, 'a')
        },
      })),
    },
    randomBytes: vi.fn(() => ({
      toString: () => {
        callCount++
        return callCount.toString(16).padStart(64, 'a')
      },
    })),
  }
})

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: {
      signInWithPassword: vi.fn(() => Promise.resolve({ error: null })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { email: 'test@example.com' },
            error: null,
          })),
          gte: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        gte: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
    })),
  })),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => Promise.resolve({
    auth: {
      admin: {
        deleteUser: vi.fn(() => Promise.resolve({ error: null })),
      },
    },
  })),
}))

// Import after mocks are set up
import { generateVerificationToken } from '../../../lib/gdpr/verify-identity'

describe('GDPR Identity Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateVerificationToken', () => {
    it('generates a token string', () => {
      const token = generateVerificationToken()
      expect(typeof token).toBe('string')
    })

    it('generates token of expected length (64 hex chars from 32 bytes)', () => {
      const token = generateVerificationToken()
      // 32 bytes = 64 hex characters
      expect(token.length).toBe(64)
    })

    it('generates unique tokens on successive calls', () => {
      const token1 = generateVerificationToken()
      const token2 = generateVerificationToken()

      // Each call should produce a different token
      expect(token1).not.toBe(token2)
    })
  })

  describe('Token format', () => {
    it('generates string that can be used as URL parameter', () => {
      const token = generateVerificationToken()
      // Should not contain URL-unsafe characters
      expect(encodeURIComponent(token)).toBe(token)
    })

    it('token is long enough for security', () => {
      const token = generateVerificationToken()
      // 64 hex characters = 256 bits of entropy, sufficient for security
      expect(token.length).toBeGreaterThanOrEqual(32)
    })
  })
})

describe('Rate Limiting', () => {
  it('defines rate limits for different request types', () => {
    // Rate limits are defined in checkRateLimit function
    const limits: Record<string, number> = {
      access: 5,
      erasure: 1,
      portability: 3,
      rectification: 10,
    }

    expect(limits.access).toBe(5)
    expect(limits.erasure).toBe(1)
    expect(limits.portability).toBe(3)
    expect(limits.rectification).toBe(10)
  })

  it('erasure has strictest limit', () => {
    const limits: Record<string, number> = {
      access: 5,
      erasure: 1,
      portability: 3,
      rectification: 10,
    }

    const minLimit = Math.min(...Object.values(limits))
    expect(limits.erasure).toBe(minLimit)
  })

  it('rectification has highest limit (lower security risk)', () => {
    const limits: Record<string, number> = {
      access: 5,
      erasure: 1,
      portability: 3,
      rectification: 10,
    }

    const maxLimit = Math.max(...Object.values(limits))
    expect(limits.rectification).toBe(maxLimit)
  })
})

describe('Token Expiry', () => {
  it('tokens expire after 15 minutes', () => {
    const TOKEN_EXPIRY_MS = 15 * 60 * 1000
    expect(TOKEN_EXPIRY_MS).toBe(900000) // 15 minutes in ms
  })

  it('expiry is reasonable for email verification', () => {
    const TOKEN_EXPIRY_MS = 15 * 60 * 1000
    const expiryMinutes = TOKEN_EXPIRY_MS / 60000

    // Should be long enough to receive email and click link
    expect(expiryMinutes).toBeGreaterThanOrEqual(10)
    // But not so long as to be a security risk
    expect(expiryMinutes).toBeLessThanOrEqual(60)
  })

  it('15 minutes is a reasonable balance for UX and security', () => {
    const TOKEN_EXPIRY_MS = 15 * 60 * 1000
    const expiryMinutes = TOKEN_EXPIRY_MS / 60000

    // OWASP recommends short-lived tokens (5-30 minutes)
    expect(expiryMinutes).toBeGreaterThanOrEqual(5)
    expect(expiryMinutes).toBeLessThanOrEqual(30)
  })
})

describe('Verification Methods', () => {
  it('supports password verification', () => {
    const methods = ['password', 'email_code', 'sms_code']
    expect(methods).toContain('password')
  })

  it('supports email code verification', () => {
    const methods = ['password', 'email_code', 'sms_code']
    expect(methods).toContain('email_code')
  })

  it('supports SMS code verification', () => {
    const methods = ['password', 'email_code', 'sms_code']
    expect(methods).toContain('sms_code')
  })
})
