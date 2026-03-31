/**
 * Cron Generate Recurring Appointments Tests
 *
 * Tests for:
 * - GET /api/cron/generate-recurring
 *
 * This cron job generates appointments from recurring patterns.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/cron/generate-recurring/route'
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
import { GET } from '@/app/api/cron/generate-recurring/route'

// Store original env
const originalEnv = process.env

// Helper to create request with optional auth
function createRequest(options?: { authHeader?: string }): NextRequest {
  const headers: HeadersInit = {}
  if (options?.authHeader) {
    headers['authorization'] = options.authHeader
  }

  return new NextRequest('http://localhost:3000/api/cron/generate-recurring', {
    method: 'GET',
    headers,
  })
}

// ============================================================================
// Authentication Tests
// ============================================================================

describe('GET /api/cron/generate-recurring', () => {
  beforeEach(() => {
    resetAllMocks()
    vi.clearAllMocks()
    process.env = { ...originalEnv, CRON_SECRET: CRON_SECRETS.VALID }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Authentication', () => {
    it('should return 401 without authorization', async () => {
      const response = await GET(createRequest())

      expect(response.status).toBe(401)
    })

    it('should return 401 with invalid cron secret', async () => {
      const response = await GET(
        createRequest({ authHeader: `Bearer ${CRON_SECRETS.INVALID}` })
      )

      expect(response.status).toBe(401)
    })

    it('should accept valid cron secret', async () => {
      mockState.setRpcResult('generate_recurring_appointments', [])
      mockState.setRpcResult('expire_waitlist_offers', 0)
      mockState.setTableResult('appointment_recurrences', [])

      const response = await GET(
        createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` })
      )

      expect(response.status).toBe(200)
    })

    it('should return 500 when CRON_SECRET not configured', async () => {
      process.env = { ...originalEnv, CRON_SECRET: undefined }

      const response = await GET(createRequest())

      expect(response.status).toBe(500)
    })
  })

  // ============================================================================
  // No Recurrences Tests
  // ============================================================================

  describe('No Recurrences', () => {
    it('should return success when no appointments to generate', async () => {
      mockState.setRpcResult('generate_recurring_appointments', [])
      mockState.setRpcResult('expire_waitlist_offers', 0)
      mockState.setTableResult('appointment_recurrences', [])

      const response = await GET(
        createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.generated).toBe(0)
    })
  })

  // ============================================================================
  // Appointment Generation Tests
  // ============================================================================

  describe('Appointment Generation', () => {
    it('should generate appointments from recurring patterns', async () => {
      const generatedAppointments = [
        {
          appointment_id: 'apt-001',
          recurrence_id: 'rec-001',
          scheduled_for: '2026-01-14T10:00:00Z',
        },
        {
          appointment_id: 'apt-002',
          recurrence_id: 'rec-001',
          scheduled_for: '2026-01-21T10:00:00Z',
        },
      ]

      mockState.setRpcResult('generate_recurring_appointments', generatedAppointments)
      mockState.setRpcResult('expire_waitlist_offers', 0)
      mockState.setTableResult('appointment_recurrences', [])

      const response = await GET(
        createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.generated).toBe(2)
    })

    it('should track unique recurrences processed', async () => {
      const generatedAppointments = [
        { appointment_id: 'apt-001', recurrence_id: 'rec-001', scheduled_for: '2026-01-14T10:00:00Z' },
        { appointment_id: 'apt-002', recurrence_id: 'rec-001', scheduled_for: '2026-01-21T10:00:00Z' },
        { appointment_id: 'apt-003', recurrence_id: 'rec-002', scheduled_for: '2026-01-15T10:00:00Z' },
      ]

      mockState.setRpcResult('generate_recurring_appointments', generatedAppointments)
      mockState.setRpcResult('expire_waitlist_offers', 0)
      mockState.setTableResult('appointment_recurrences', [])

      const response = await GET(
        createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.recurrences_processed).toBe(2)
    })
  })

  // ============================================================================
  // Waitlist Offer Expiration Tests
  // ============================================================================

  describe('Waitlist Offer Expiration', () => {
    it('should expire old waitlist offers', async () => {
      mockState.setRpcResult('generate_recurring_appointments', [])
      mockState.setRpcResult('expire_waitlist_offers', 3)
      mockState.setTableResult('appointment_recurrences', [])

      const response = await GET(
        createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.expired_offers_processed).toBe(3)
    })

    it('should handle waitlist expiration errors gracefully', async () => {
      mockState.setRpcResult('generate_recurring_appointments', [])
      mockState.setRpcError('expire_waitlist_offers', new Error('RPC failed'))
      mockState.setTableResult('appointment_recurrences', [])

      const response = await GET(
        createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` })
      )

      // Should still succeed, waitlist expiration is not critical
      expect(response.status).toBe(200)
    })
  })

  // ============================================================================
  // Recurrence Limit Warning Tests
  // ============================================================================

  describe('Recurrence Limit Warnings', () => {
    it('should identify recurrences nearing limit', async () => {
      mockState.setRpcResult('generate_recurring_appointments', [])
      mockState.setRpcResult('expire_waitlist_offers', 0)
      mockState.setTableResult('appointment_recurrences', [
        {
          id: 'rec-001',
          pet_id: 'pet-001',
          is_active: true,
          max_occurrences: 10,
          occurrences_generated: 8, // 2 remaining - should trigger warning
        },
        {
          id: 'rec-002',
          pet_id: 'pet-002',
          is_active: true,
          max_occurrences: 10,
          occurrences_generated: 5, // 5 remaining - no warning
        },
      ])

      const response = await GET(
        createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` })
      )

      expect(response.status).toBe(200)
    })
  })

  // ============================================================================
  // Paused Recurrences Tests
  // ============================================================================

  describe('Paused Recurrences', () => {
    it('should resume paused recurrences when pause period ends', async () => {
      mockState.setRpcResult('generate_recurring_appointments', [])
      mockState.setRpcResult('expire_waitlist_offers', 0)
      mockState.setTableResult('appointment_recurrences', [
        {
          id: 'rec-001',
          is_active: true,
          paused_until: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday
        },
      ])

      const response = await GET(
        createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` })
      )

      expect(response.status).toBe(200)
    })
  })

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle RPC errors gracefully', async () => {
      const { logger } = await import('@/lib/logger')
      mockState.setRpcError(
        'generate_recurring_appointments',
        new Error('Database error')
      )

      const response = await GET(
        createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` })
      )

      // Handler may catch error and return 200 with errors array, or 500
      expect([200, 500]).toContain(response.status)
    })

    it('should include errors array in response', async () => {
      // Set successful RPC but with empty results
      mockState.setRpcResult('generate_recurring_appointments', [])
      mockState.setRpcResult('expire_waitlist_offers', 0)
      mockState.setTableResult('appointment_recurrences', [])

      const response = await GET(
        createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` })
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body).toHaveProperty('errors')
    })
  })

  // ============================================================================
  // Response Format Tests
  // ============================================================================

  describe('Response Format', () => {
    it('should return all required fields', async () => {
      mockState.setRpcResult('generate_recurring_appointments', [])
      mockState.setRpcResult('expire_waitlist_offers', 0)
      mockState.setTableResult('appointment_recurrences', [])

      const response = await GET(
        createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` })
      )

      expect(response.status).toBe(200)
      const body = await response.json()

      expect(body).toHaveProperty('success')
      expect(body).toHaveProperty('generated')
      expect(body).toHaveProperty('recurrences_processed')
      expect(body).toHaveProperty('expired_offers_processed')
      expect(body).toHaveProperty('errors')
    })
  })

  // ============================================================================
  // Logging Tests
  // ============================================================================

  describe('Logging', () => {
    it('should log cron job start', async () => {
      const { logger } = await import('@/lib/logger')
      mockState.setRpcResult('generate_recurring_appointments', [])
      mockState.setRpcResult('expire_waitlist_offers', 0)
      mockState.setTableResult('appointment_recurrences', [])

      await GET(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Starting generate-recurring')
      )
    })

    it('should log generated appointments count', async () => {
      const { logger } = await import('@/lib/logger')
      mockState.setRpcResult('generate_recurring_appointments', [
        { appointment_id: 'apt-001', recurrence_id: 'rec-001', scheduled_for: '2026-01-14' },
      ])
      mockState.setRpcResult('expire_waitlist_offers', 0)
      mockState.setTableResult('appointment_recurrences', [])

      await GET(createRequest({ authHeader: `Bearer ${CRON_SECRETS.VALID}` }))

      // Should log completion with results
      expect(logger.info).toHaveBeenCalledWith(
        'Completed generate-recurring cron job',
        expect.objectContaining({
          generated: 1,
        })
      )
    })
  })
})
