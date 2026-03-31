/**
 * Cron Release Reservations API Tests
 *
 * Tests for:
 * - GET /api/cron/release-reservations
 *
 * This cron job releases expired stock reservations from abandoned carts.
 * Critical for inventory accuracy when carts are abandoned.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/cron/release-reservations/route'
import {
  mockState,
  CRON_SECRETS,
  resetAllMocks,
  createStatefulSupabaseMock,
} from '@/lib/test-utils'

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(createStatefulSupabaseMock())),
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

// Import routes AFTER mocks
import { GET } from '@/app/api/cron/release-reservations/route'

// Store original env
const originalEnv = process.env

// Helper to create request with optional auth
function createRequest(options?: {
  authHeader?: string
  cronSecretHeader?: string
}): NextRequest {
  const headers: HeadersInit = {}
  if (options?.authHeader) {
    headers['authorization'] = options.authHeader
  }
  if (options?.cronSecretHeader) {
    headers['x-cron-secret'] = options.cronSecretHeader
  }

  return new NextRequest('http://localhost:3000/api/cron/release-reservations', {
    method: 'GET',
    headers,
  })
}

// Sample RPC response for release_expired_reservations
const SAMPLE_RELEASE_RESULT = {
  released_count: 5,
  expired_carts_cleared: 3,
  items_released: 5,
  processed_at: new Date().toISOString(),
}

// ============================================================================
// Authentication Tests
// ============================================================================

describe('GET /api/cron/release-reservations', () => {
  beforeEach(() => {
    resetAllMocks()
    vi.clearAllMocks()
    process.env = { ...originalEnv, CRON_SECRET: CRON_SECRETS.VALID }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Authentication', () => {
    it('should return 401 without authorization header when CRON_SECRET is set', async () => {
      const response = await GET(createRequest())

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
    })

    it('should return 401 with invalid cron secret', async () => {
      const response = await GET(createRequest({ authHeader: `Bearer ${CRON_SECRETS.INVALID}` }))

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
    })

    it('should accept x-cron-secret header (Vercel Cron style)', async () => {
      mockState.setRpcResult('release_expired_reservations', SAMPLE_RELEASE_RESULT)

      const response = await GET(createRequest({ cronSecretHeader: CRON_SECRETS.VALID }))

      expect(response.status).toBe(200)
    })

    it('should accept Bearer token authorization', async () => {
      mockState.setRpcResult('release_expired_reservations', SAMPLE_RELEASE_RESULT)

      const response = await GET(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(response.status).toBe(200)
    })

    it('should return 500 when CRON_SECRET not configured', async () => {
      process.env = { ...originalEnv, CRON_SECRET: undefined }

      const response = await GET(createRequest())

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Server configuration error')
    })
  })

  // ============================================================================
  // Happy Path Tests
  // ============================================================================

  describe('Successful Reservation Release', () => {
    it('should call release_expired_reservations RPC', async () => {
      mockState.setRpcResult('release_expired_reservations', SAMPLE_RELEASE_RESULT)

      const response = await GET(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
    })

    it('should return released count in response', async () => {
      mockState.setRpcResult('release_expired_reservations', { released_count: 10 })

      const response = await GET(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.released_count).toBe(10)
    })

    it('should return duration in response', async () => {
      mockState.setRpcResult('release_expired_reservations', SAMPLE_RELEASE_RESULT)

      const response = await GET(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.duration_ms).toBeDefined()
      expect(typeof body.duration_ms).toBe('number')
    })

    it('should return timestamp in response', async () => {
      mockState.setRpcResult('release_expired_reservations', SAMPLE_RELEASE_RESULT)

      const response = await GET(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.timestamp).toBeDefined()
      // Should be valid ISO string
      expect(() => new Date(body.timestamp)).not.toThrow()
    })
  })

  // ============================================================================
  // No Expired Reservations Tests
  // ============================================================================

  describe('No Expired Reservations', () => {
    it('should return success when no reservations to release', async () => {
      mockState.setRpcResult('release_expired_reservations', { released_count: 0 })

      const response = await GET(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.released_count).toBe(0)
    })

    it('should log info when no reservations to release', async () => {
      const { logger } = await import('@/lib/logger')
      mockState.setRpcResult('release_expired_reservations', { released_count: 0 })

      await GET(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(logger.info).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    it('should return 500 on RPC error', async () => {
      mockState.setRpcError('release_expired_reservations', new Error('Database connection failed'))

      const response = await GET(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.success).toBe(false)
      expect(body.error).toBeDefined()
    })

    it('should log error on RPC failure', async () => {
      const { logger } = await import('@/lib/logger')
      mockState.setRpcError('release_expired_reservations', new Error('RPC failed'))

      await GET(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(logger.error).toHaveBeenCalled()
    })

    it('should handle null RPC result', async () => {
      mockState.setRpcResult('release_expired_reservations', null)

      const response = await GET(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.released_count).toBe(0)
    })

    it('should handle exception during processing', async () => {
      // Simulate an exception by setting an error that will be thrown
      mockState.setRpcError('release_expired_reservations', new Error('Unexpected error'))

      const response = await GET(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(response.status).toBe(500)
    })
  })

  // ============================================================================
  // Logging Tests
  // ============================================================================

  describe('Logging', () => {
    it('should log info on successful release', async () => {
      const { logger } = await import('@/lib/logger')
      mockState.setRpcResult('release_expired_reservations', { released_count: 5 })

      await GET(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(logger.info).toHaveBeenCalledWith(
        'Released expired reservations',
        expect.objectContaining({
          releasedCount: 5,
        })
      )
    })

    it('should include duration in log', async () => {
      const { logger } = await import('@/lib/logger')
      mockState.setRpcResult('release_expired_reservations', { released_count: 3 })

      await GET(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(logger.info).toHaveBeenCalledWith(
        'Released expired reservations',
        expect.objectContaining({
          durationMs: expect.any(Number),
        })
      )
    })

    it('should log error on unauthorized attempt', async () => {
      const { logger } = await import('@/lib/logger')

      await GET(createRequest({ authHeader: `Bearer ${CRON_SECRETS.INVALID}` }))

      expect(logger.error).toHaveBeenCalledWith(
        'Unauthorized cron attempt',
        expect.objectContaining({
          endpoint: expect.stringContaining('release-reservations'),
        })
      )
    })
  })

  // ============================================================================
  // Response Format Tests
  // ============================================================================

  describe('Response Format', () => {
    it('should return all required fields on success', async () => {
      mockState.setRpcResult('release_expired_reservations', SAMPLE_RELEASE_RESULT)

      const response = await GET(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(response.status).toBe(200)
      const body = await response.json()

      expect(body).toHaveProperty('success', true)
      expect(body).toHaveProperty('released_count')
      expect(body).toHaveProperty('duration_ms')
      expect(body).toHaveProperty('timestamp')
    })

    it('should return all required fields on error', async () => {
      mockState.setRpcError('release_expired_reservations', new Error('Failed'))

      const response = await GET(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(response.status).toBe(500)
      const body = await response.json()

      expect(body).toHaveProperty('success', false)
      expect(body).toHaveProperty('error')
    })
  })

  // ============================================================================
  // Idempotency Tests
  // ============================================================================

  describe('Idempotency', () => {
    it('should be safe to call multiple times', async () => {
      // First call releases some reservations
      mockState.setRpcResult('release_expired_reservations', { released_count: 5 })
      const response1 = await GET(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))
      expect(response1.status).toBe(200)

      // Second call finds nothing to release
      mockState.setRpcResult('release_expired_reservations', { released_count: 0 })
      const response2 = await GET(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))
      expect(response2.status).toBe(200)

      // Both should succeed
      const body1 = await response1.json()
      const body2 = await response2.json()
      expect(body1.success).toBe(true)
      expect(body2.success).toBe(true)
    })

    it('should not fail if reservations already released', async () => {
      mockState.setRpcResult('release_expired_reservations', { released_count: 0 })

      const response = await GET(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
    })
  })

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle very large release count', async () => {
      mockState.setRpcResult('release_expired_reservations', { released_count: 10000 })

      const response = await GET(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.released_count).toBe(10000)
    })

    it('should handle negative release count gracefully', async () => {
      // Shouldn't happen, but handle gracefully
      mockState.setRpcResult('release_expired_reservations', { released_count: -1 })

      const response = await GET(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(response.status).toBe(200)
    })

    it('should handle missing released_count in RPC result', async () => {
      mockState.setRpcResult('release_expired_reservations', {})

      const response = await GET(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.released_count).toBe(0) // Default to 0
    })
  })
})
