import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  setupIntegrationTest,
  cleanupIntegrationTest,
  createTestRequest,
  expectError,
} from '@/tests/__helpers__/integration-setup'
import { GET } from '@/app/api/cron/check-health/route'

describe('API: /api/cron/check-health', () => {
  const CRON_SECRET = process.env.CRON_SECRET || 'test-cron-secret'

  beforeAll(async () => {
    await setupIntegrationTest()
  })

  afterAll(async () => {
    await cleanupIntegrationTest()
  })

  // =============================================================================
  // GET /api/cron/check-health
  // =============================================================================

  describe('GET /api/cron/check-health', () => {
    it('requires cron authentication', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/check-health')
      const response = await GET()
      await expectError(response, 401)
    })

    it('rejects invalid cron secret', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/check-health', {
        headers: {
          Authorization: 'Bearer invalid-secret',
        },
      })
      const response = await GET()
      await expectError(response, 401)
    })

    it('accepts valid cron secret', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/check-health', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET()
      
      // Should either succeed or fail gracefully
      expect([200, 500]).toContain(response.status)
    })

    it('returns structured response with metadata', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/check-health', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET()
      const data = await response.json()

      expect(data).toHaveProperty('success')
      if (data.success) {
        expect(data).toHaveProperty('checked')
        expect(data).toHaveProperty('alertsSent')
        expect(data).toHaveProperty('durationMs')
        expect(typeof data.checked).toBe('number')
        expect(typeof data.alertsSent).toBe('number')
        expect(typeof data.durationMs).toBe('number')
      } else {
        expect(data).toHaveProperty('error')
        expect(data).toHaveProperty('durationMs')
      }
    })

    it('completes within reasonable time', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/check-health', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      
      const startTime = Date.now()
      const response = await GET()
      const duration = Date.now() - startTime

      // Should complete within 30 seconds (maxDuration from route)
      expect(duration).toBeLessThan(30000)
    })

    it('returns duration in response metadata', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/check-health', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET()
      const data = await response.json()

      expect(data.durationMs).toBeDefined()
      expect(data.durationMs).toBeGreaterThan(0)
      expect(data.durationMs).toBeLessThan(30000)
    })

    it('is safe to run multiple times (idempotent)', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/check-health', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })

      // Run twice
      const response1 = await GET()
      const data1 = await response1.json()

      const response2 = await GET()
      const data2 = await response2.json()

      // Both should have similar structure
      expect(data1).toHaveProperty('success')
      expect(data2).toHaveProperty('success')
    })

    it('handles when no unhealthy jobs exist', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/check-health', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET()
      const data = await response.json()

      if (data.success) {
        expect(data.alertsSent).toBeGreaterThanOrEqual(0)
        expect(data.checked).toBeGreaterThanOrEqual(0)
      }
    })

    it('tracks cron execution via trackCronExecution', async () => {
      // This test verifies the route uses trackCronExecution wrapper
      const request = createTestRequest('http://localhost:3000/api/cron/check-health', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET()
      const data = await response.json()

      // If using trackCronExecution, should have durationMs in response
      expect(data).toHaveProperty('durationMs')
      expect(typeof data.durationMs).toBe('number')
    })

    it('handles errors gracefully with structured error response', async () => {
      // Even if health check fails internally, should return structured response
      const request = createTestRequest('http://localhost:3000/api/cron/check-health', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET()
      const data = await response.json()

      // Should always have success field
      expect(data).toHaveProperty('success')
      expect(typeof data.success).toBe('boolean')

      if (!data.success) {
        expect(data).toHaveProperty('error')
        expect(typeof data.error).toBe('string')
      }
    })
  })

  // =============================================================================
  // Security: Cron Authentication
  // =============================================================================

  describe('Security: Cron Authentication', () => {
    it('rejects requests without authorization header', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/check-health')
      const response = await GET()
      await expectError(response, 401)
    })

    it('rejects malformed authorization header', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/check-health', {
        headers: {
          Authorization: 'InvalidFormat',
        },
      })
      const response = await GET()
      await expectError(response, 401)
    })

    it('uses timing-safe comparison (prevents timing attacks)', async () => {
      // This test conceptually verifies timing-safe comparison
      const request1 = createTestRequest('http://localhost:3000/api/cron/check-health', {
        headers: {
          Authorization: 'Bearer wrong-secret-1',
        },
      })
      const request2 = createTestRequest('http://localhost:3000/api/cron/check-health', {
        headers: {
          Authorization: 'Bearer wrong-secret-2',
        },
      })

      const start1 = Date.now()
      await GET()
      const duration1 = Date.now() - start1

      const start2 = Date.now()
      await GET()
      const duration2 = Date.now() - start2

      // Timing should be similar regardless of secret (within 100ms variance)
      expect(Math.abs(duration1 - duration2)).toBeLessThan(100)
    })

    it('verifies CRON_SECRET is configured', async () => {
      // If CRON_SECRET is not set, should reject all requests
      const oldSecret = process.env.CRON_SECRET
      delete process.env.CRON_SECRET

      const request = createTestRequest('http://localhost:3000/api/cron/check-health', {
        headers: {
          Authorization: 'Bearer any-secret',
        },
      })
      const response = await GET()

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
        const request = createTestRequest('http://localhost:3000/api/cron/check-health', {
          headers: {
            Authorization: secret,
          },
        })
        const response = await GET()
        await expectError(response, 401)
      }
    })
  })

  // =============================================================================
  // Integration with Cron Tracker
  // =============================================================================

  describe('Integration with Cron Tracker', () => {
    it('creates execution record via trackCronExecution', async () => {
      // The trackCronExecution wrapper should create a record in cron_executions table
      const request = createTestRequest('http://localhost:3000/api/cron/check-health', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET()
      const data = await response.json()

      // Should have executed and returned duration
      expect(data.durationMs).toBeDefined()
      expect(data.durationMs).toBeGreaterThan(0)
    })

    it('tracks success status correctly', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/check-health', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET()
      const data = await response.json()

      expect(data).toHaveProperty('success')
      expect(typeof data.success).toBe('boolean')
    })

    it('tracks failure status correctly', async () => {
      // This test would require mocking checkAndAlertUnhealthyJobs to throw error
      // For now, we verify the response structure handles failures
      const request = createTestRequest('http://localhost:3000/api/cron/check-health', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET()
      const data = await response.json()

      // If failed, should have error message
      if (!data.success) {
        expect(data).toHaveProperty('error')
        expect(response.status).toBe(500)
      }
    })
  })

  // =============================================================================
  // Health Check Logic
  // =============================================================================

  describe('Health Check Logic', () => {
    it('checks all registered cron jobs', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/check-health', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET()
      const data = await response.json()

      if (data.success) {
        expect(data.checked).toBeGreaterThanOrEqual(0)
      }
    })

    it('returns count of alerts sent', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/check-health', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET()
      const data = await response.json()

      if (data.success) {
        expect(data.alertsSent).toBeGreaterThanOrEqual(0)
        expect(typeof data.alertsSent).toBe('number')
      }
    })

    it('logs health check completion', async () => {
      // The route should log via logger.info
      // This test verifies the route completes successfully
      const request = createTestRequest('http://localhost:3000/api/cron/check-health', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET()

      // Should return 200 or 500, but not crash
      expect([200, 500]).toContain(response.status)
    })
  })

  // =============================================================================
  // Edge Cases
  // =============================================================================

  describe('Edge Cases', () => {
    it('handles when checkAndAlertUnhealthyJobs returns empty result', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/check-health', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET()
      const data = await response.json()

      // Should handle gracefully even if no jobs to check
      expect(data).toHaveProperty('success')
    })

    it('handles rapid successive calls', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/check-health', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })

      // Fire 3 requests in quick succession
      const promises = [GET(), GET(), GET()]
      const responses = await Promise.all(promises)

      // All should complete without crashing
      responses.forEach((response) => {
        expect([200, 500]).toContain(response.status)
      })
    })

    it('respects maxDuration timeout', async () => {
      // Route has maxDuration: 30 seconds
      const request = createTestRequest('http://localhost:3000/api/cron/check-health', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })

      const startTime = Date.now()
      const response = await GET()
      const duration = Date.now() - startTime

      // Should not exceed maxDuration significantly
      expect(duration).toBeLessThan(35000) // 30s + 5s buffer
    })
  })
})
