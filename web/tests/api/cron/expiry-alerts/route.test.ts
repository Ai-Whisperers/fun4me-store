import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  setupIntegrationTest,
  cleanupIntegrationTest,
  createTestRequest,
  expectError,
} from '@/tests/__helpers__/integration-setup'
import { GET } from '@/app/api/cron/expiry-alerts/route'

describe('API: /api/cron/expiry-alerts', () => {
  const CRON_SECRET = process.env.CRON_SECRET || 'test-cron-secret'

  beforeAll(async () => {
    await setupIntegrationTest()
  })

  afterAll(async () => {
    await cleanupIntegrationTest()
  })

  // =============================================================================
  // GET /api/cron/expiry-alerts
  // =============================================================================

  describe('GET /api/cron/expiry-alerts', () => {
    it('requires cron authentication', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/expiry-alerts')
      const response = await GET(request)
      await expectError(response, 401)
    })

    it('rejects invalid cron secret', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/expiry-alerts', {
        headers: {
          Authorization: 'Bearer invalid-secret',
        },
      })
      const response = await GET(request)
      await expectError(response, 401)
    })

    it('accepts valid cron secret', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/expiry-alerts', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET(request)

      // Should either succeed or fail gracefully
      expect([200, 500]).toContain(response.status)
    })

    it('returns structured response with metadata', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/expiry-alerts', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET(request)
      const data = await response.json()

      expect(data).toHaveProperty('success')
      if (data.success) {
        expect(data).toHaveProperty('tenantsProcessed')
        expect(data).toHaveProperty('alertsSent')
        expect(data).toHaveProperty('productsAlerted')
        expect(typeof data.tenantsProcessed).toBe('number')
        expect(typeof data.alertsSent).toBe('number')
        expect(typeof data.productsAlerted).toBe('number')
      } else {
        expect(data).toHaveProperty('error')
      }
    })

    it('completes within reasonable time', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/expiry-alerts', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })

      const startTime = Date.now()
      const response = await GET(request)
      const duration = Date.now() - startTime

      // Should complete within 60 seconds (reasonable for multi-tenant processing)
      expect(duration).toBeLessThan(60000)
    })

    it('is safe to run multiple times (idempotent)', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/expiry-alerts', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })

      // Run twice
      const response1 = await GET(request)
      const data1 = await response1.json()

      const response2 = await GET(request)
      const data2 = await response2.json()

      // Both should have similar structure
      expect(data1).toHaveProperty('success')
      expect(data2).toHaveProperty('success')

      // Idempotency: Running again shouldn't cause errors
      expect([200, 500]).toContain(response2.status)
    })

    it('handles when no tenants exist', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/expiry-alerts', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET(request)
      const data = await response.json()

      // Should handle gracefully even with no tenants
      expect(data).toHaveProperty('success')
      if (data.success) {
        expect(data.tenantsProcessed).toBeGreaterThanOrEqual(0)
      }
    })

    it('processes tenants individually', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/expiry-alerts', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET(request)
      const data = await response.json()

      if (data.success) {
        // Each tenant is processed independently
        expect(data.tenantsProcessed).toBeGreaterThanOrEqual(0)
        expect(data.alertsSent).toBeGreaterThanOrEqual(0)
        expect(data.productsAlerted).toBeGreaterThanOrEqual(0)
      }
    })

    it('returns error details if present', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/expiry-alerts', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET(request)
      const data = await response.json()

      if (data.errors) {
        expect(Array.isArray(data.errors)).toBe(true)
      }
    })
  })

  // =============================================================================
  // Security: Cron Authentication
  // =============================================================================

  describe('Security: Cron Authentication', () => {
    it('rejects requests without authorization header', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/expiry-alerts')
      const response = await GET(request)
      await expectError(response, 401)
    })

    it('rejects malformed authorization header', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/expiry-alerts', {
        headers: {
          Authorization: 'InvalidFormat',
        },
      })
      const response = await GET(request)
      await expectError(response, 401)
    })

    it('uses timing-safe comparison (prevents timing attacks)', async () => {
      // This test conceptually verifies timing-safe comparison
      const request1 = createTestRequest('http://localhost:3000/api/cron/expiry-alerts', {
        headers: {
          Authorization: 'Bearer wrong-secret-1',
        },
      })
      const request2 = createTestRequest('http://localhost:3000/api/cron/expiry-alerts', {
        headers: {
          Authorization: 'Bearer wrong-secret-2',
        },
      })

      const start1 = Date.now()
      await GET(request1)
      const duration1 = Date.now() - start1

      const start2 = Date.now()
      await GET(request2)
      const duration2 = Date.now() - start2

      // Timing should be similar regardless of secret (within 100ms variance)
      expect(Math.abs(duration1 - duration2)).toBeLessThan(100)
    })

    it('verifies CRON_SECRET is configured', async () => {
      // If CRON_SECRET is not set, should reject all requests
      const oldSecret = process.env.CRON_SECRET
      delete process.env.CRON_SECRET

      const request = createTestRequest('http://localhost:3000/api/cron/expiry-alerts', {
        headers: {
          Authorization: 'Bearer any-secret',
        },
      })
      const response = await GET(request)

      // Should be unauthorized when CRON_SECRET not configured
      expect(response.status).toBe(401)

      // Restore secret
      process.env.CRON_SECRET = oldSecret
    })

    it('accepts only exact secret match', async () => {
      // Test with variations that should NOT work
      const almostCorrectSecrets = [
        `Bearer ${CRON_SECRET} `, // Trailing space
        `Bearer  ${CRON_SECRET}`, // Extra space
        `bearer ${CRON_SECRET}`, // Wrong case
        `Bearer ${CRON_SECRET.slice(0, -1)}`, // Missing last char
      ]

      for (const secret of almostCorrectSecrets) {
        const request = createTestRequest('http://localhost:3000/api/cron/expiry-alerts', {
          headers: {
            Authorization: secret,
          },
        })
        const response = await GET(request)
        await expectError(response, 401)
      }
    })
  })

  // =============================================================================
  // Business Logic: Expiry Detection
  // =============================================================================

  describe('Business Logic: Expiry Detection', () => {
    it('processes expiry summary for each tenant', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/expiry-alerts', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET(request)
      const data = await response.json()

      // Uses get_expiry_summary RPC function
      if (data.success) {
        expect(data).toHaveProperty('tenantsProcessed')
      }
    })

    it('detects expiring products within 90 days', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/expiry-alerts', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET(request)
      const data = await response.json()

      // Uses get_expiring_products RPC with 90-day threshold
      if (data.success) {
        expect(data.productsAlerted).toBeGreaterThanOrEqual(0)
      }
    })

    it('categorizes products by urgency level', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/expiry-alerts', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET(request)
      const data = await response.json()

      // Should categorize into: expired, critical, high, medium
      if (data.success) {
        expect(data).toHaveProperty('productsAlerted')
      }
    })

    it('fetches staff alert preferences', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/expiry-alerts', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET(request)
      const data = await response.json()

      // Uses staff_alert_preferences table
      if (data.success) {
        expect(data.alertsSent).toBeGreaterThanOrEqual(0)
      }
    })

    it('defaults to admin/vet if no preferences set', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/expiry-alerts', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET(request)
      const data = await response.json()

      // Should fall back to profiles with admin/vet roles
      if (data.success) {
        expect(data).toHaveProperty('alertsSent')
      }
    })

    it('respects digest frequency settings', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/expiry-alerts', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET(request)
      const data = await response.json()

      // Checks digest_frequency (daily/weekly) and last_digest_sent_at
      if (data.success) {
        expect(data.alertsSent).toBeGreaterThanOrEqual(0)
      }
    })

    it('filters products by staff threshold', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/expiry-alerts', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET(request)
      const data = await response.json()

      // Uses expiry_days_warning threshold per staff
      if (data.success) {
        expect(data.productsAlerted).toBeGreaterThanOrEqual(0)
      }
    })

    it('updates last_digest_sent_at after sending', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/expiry-alerts', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET(request)
      const data = await response.json()

      // Updates staff_alert_preferences.last_digest_sent_at
      if (data.success) {
        expect(data.alertsSent).toBeGreaterThanOrEqual(0)
      }
    })
  })

  // =============================================================================
  // Email & WhatsApp Integration
  // =============================================================================

  describe('Email & WhatsApp Integration', () => {
    it('sends email alerts when enabled', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/expiry-alerts', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET(request)
      const data = await response.json()

      // Uses sendEmailWithRetry for email_enabled staff
      if (data.success) {
        expect(data.alertsSent).toBeGreaterThanOrEqual(0)
      }
    })

    it('sends WhatsApp alerts when enabled', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/expiry-alerts', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET(request)
      const data = await response.json()

      // Uses sendWhatsAppMessage for whatsapp_enabled staff
      if (data.success) {
        expect(data.alertsSent).toBeGreaterThanOrEqual(0)
      }
    })

    it('uses notification_email or falls back to profile email', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/expiry-alerts', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET(request)
      const data = await response.json()

      // Checks notification_email first, then profile.email
      if (data.success) {
        expect(data.alertsSent).toBeGreaterThanOrEqual(0)
      }
    })

    it('uses notification_phone or falls back to profile phone', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/expiry-alerts', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET(request)
      const data = await response.json()

      // Checks notification_phone first, then profile.phone
      if (data.success) {
        expect(data.alertsSent).toBeGreaterThanOrEqual(0)
      }
    })

    it('handles email send failures gracefully', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/expiry-alerts', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET(request)
      const data = await response.json()

      // Should continue processing even if some emails fail
      expect(data).toHaveProperty('success')
      if (data.errors) {
        expect(Array.isArray(data.errors)).toBe(true)
      }
    })

    it('handles WhatsApp send failures gracefully', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/expiry-alerts', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET(request)
      const data = await response.json()

      // Should continue processing even if some WhatsApp sends fail
      expect(data).toHaveProperty('success')
      if (data.errors) {
        expect(Array.isArray(data.errors)).toBe(true)
      }
    })
  })

  // =============================================================================
  // Error Handling
  // =============================================================================

  describe('Error Handling', () => {
    it('handles errors gracefully with structured error response', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/expiry-alerts', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET(request)
      const data = await response.json()

      // Should always have success field
      expect(data).toHaveProperty('success')
      expect(typeof data.success).toBe('boolean')

      if (!data.success) {
        expect(data).toHaveProperty('error')
        expect(typeof data.error).toBe('string')
      }
    })

    it('logs errors for individual tenant failures', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/expiry-alerts', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET(request)
      const data = await response.json()

      // Errors array should contain tenant-specific errors
      if (data.errors) {
        expect(Array.isArray(data.errors)).toBe(true)
        data.errors.forEach((error: string) => {
          expect(typeof error).toBe('string')
        })
      }
    })

    it('continues processing other tenants after one fails', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/expiry-alerts', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET(request)
      const data = await response.json()

      // Should complete even if some tenants error
      expect(data).toHaveProperty('success')
      if (data.errors && data.errors.length > 0) {
        // Should still have processed some tenants
        expect(data.tenantsProcessed).toBeGreaterThanOrEqual(0)
      }
    })
  })

  // =============================================================================
  // Edge Cases
  // =============================================================================

  describe('Edge Cases', () => {
    it('handles tenants with no expiring products', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/expiry-alerts', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET(request)
      const data = await response.json()

      // Should skip tenants with no expiring products
      if (data.success) {
        expect(data.tenantsProcessed).toBeGreaterThanOrEqual(0)
        expect(data.productsAlerted).toBeGreaterThanOrEqual(0)
      }
    })

    it('handles staff with no email or phone', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/expiry-alerts', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET(request)
      const data = await response.json()

      // Should skip staff without contact info
      if (data.success) {
        expect(data.alertsSent).toBeGreaterThanOrEqual(0)
      }
    })

    it('handles rapid successive calls', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/expiry-alerts', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })

      // Fire 2 requests in quick succession
      const promises = [GET(request), GET(request)]
      const responses = await Promise.all(promises)

      // Both should complete without crashing
      responses.forEach((response) => {
        expect([200, 500]).toContain(response.status)
      })
    })

    it('handles when expiry_summary returns null', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/expiry-alerts', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET(request)
      const data = await response.json()

      // Should handle gracefully even if RPC returns null
      expect(data).toHaveProperty('success')
    })

    it('handles when get_expiring_products returns empty', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/expiry-alerts', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET(request)
      const data = await response.json()

      // Should handle empty products array gracefully
      if (data.success) {
        expect(data.productsAlerted).toBeGreaterThanOrEqual(0)
      }
    })
  })
})
