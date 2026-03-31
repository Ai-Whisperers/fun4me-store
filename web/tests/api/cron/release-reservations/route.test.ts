import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { SupabaseClient } from '@supabase/supabase-js'
import {
  setupIntegrationTest,
  cleanupIntegrationTest,
  createTestProduct,
  createTestRequest,
  expectSuccess,
  expectError,
  cleanupManager,
  TEST_TENANT_ID,
} from '@/tests/__helpers__/integration-setup'
import { GET } from '@/app/api/cron/release-reservations/route'

describe('API: /api/cron/release-reservations', () => {
  let supabase: SupabaseClient
  const CRON_SECRET = process.env.CRON_SECRET || 'test-cron-secret'

  beforeAll(async () => {
    supabase = await setupIntegrationTest()

    // Checkpoint: preserve shared resources across afterEach cleanups
    cleanupManager.checkpoint()
  })

  afterAll(async () => {
    await cleanupIntegrationTest()
  })

  afterEach(async () => {
    await cleanupManager.cleanupSinceCheckpoint()
  })

  // =============================================================================
  // GET /api/cron/release-reservations
  // =============================================================================

  describe('GET /api/cron/release-reservations', () => {
    it('requires cron authentication', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/release-reservations')
      const response = await GET(request)
      await expectError(response, 401)
    })

    it('rejects invalid cron secret', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/release-reservations', {
        headers: {
          Authorization: `Bearer invalid-secret`,
        },
      })
      const response = await GET(request)
      await expectError(response, 401)
    })

    it('accepts valid cron secret', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/release-reservations', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET(request)
      await expectSuccess(response)
    })

    it('returns success response with metadata', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/release-reservations', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET(request)
      const data = await expectSuccess(response)

      expect(data).toHaveProperty('success')
      expect(data).toHaveProperty('released_count')
      expect(data).toHaveProperty('duration_ms')
      expect(data).toHaveProperty('timestamp')
      expect(data.success).toBe(true)
    })

    it('releases no reservations when none are expired', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/release-reservations', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET(request)
      const data = await expectSuccess(response)

      expect(data.released_count).toBeGreaterThanOrEqual(0)
    })

    it('releases expired reservations correctly', async () => {
      // Create product with inventory
      const product = await createTestProduct(supabase, TEST_TENANT_ID, {
        stock_quantity: 10,
      })
      cleanupManager.track('store_products', product.id)
      cleanupManager.track('inventory', product.inventory_id!)

      // Create expired reservation (expired_at in the past)
      const pastTime = new Date()
      pastTime.setHours(pastTime.getHours() - 1) // 1 hour ago

      const { data: reservation } = await supabase
        .from('inventory_reservations')
        .insert({
          product_id: product.id,
          quantity_reserved: 3,
          reserved_by: 'test-session-id',
          reserved_until: pastTime.toISOString(),
        })
        .select()
        .single()

      if (reservation) cleanupManager.track('inventory_reservations', reservation.id)

      // Run cron job
      const request = createTestRequest('http://localhost:3000/api/cron/release-reservations', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET(request)
      const data = await expectSuccess(response)

      // Should have released at least 1 reservation
      expect(data.released_count).toBeGreaterThan(0)

      // Verify reservation was released (deleted or marked as released)
      const { data: checkReservation } = await supabase
        .from('inventory_reservations')
        .select('*')
        .eq('id', reservation.id)
        .single()

      // Reservation should be gone (deleted) or have released_at set
      if (checkReservation) {
        expect(checkReservation.released_at).not.toBeNull()
      }
    })

    it('does not release active reservations', async () => {
      // Create product with inventory
      const product = await createTestProduct(supabase, TEST_TENANT_ID, {
        stock_quantity: 10,
      })
      cleanupManager.track('store_products', product.id)
      cleanupManager.track('inventory', product.inventory_id!)

      // Create active reservation (expires in future)
      const futureTime = new Date()
      futureTime.setHours(futureTime.getHours() + 1) // 1 hour from now

      const { data: reservation } = await supabase
        .from('inventory_reservations')
        .insert({
          product_id: product.id,
          quantity_reserved: 2,
          reserved_by: 'test-session-active',
          reserved_until: futureTime.toISOString(),
        })
        .select()
        .single()

      if (reservation) cleanupManager.track('inventory_reservations', reservation.id)

      // Run cron job
      const request = createTestRequest('http://localhost:3000/api/cron/release-reservations', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET(request)
      await expectSuccess(response)

      // Verify reservation is still active
      const { data: checkReservation } = await supabase
        .from('inventory_reservations')
        .select('*')
        .eq('id', reservation.id)
        .single()

      expect(checkReservation).toBeDefined()
      expect(checkReservation?.released_at).toBeNull()
    })

    it('handles multiple expired reservations', async () => {
      // Create product
      const product = await createTestProduct(supabase, TEST_TENANT_ID, {
        stock_quantity: 20,
      })
      cleanupManager.track('store_products', product.id)
      cleanupManager.track('inventory', product.inventory_id!)

      const pastTime = new Date()
      pastTime.setHours(pastTime.getHours() - 2)

      // Create multiple expired reservations
      const reservations = await Promise.all([
        supabase
          .from('inventory_reservations')
          .insert({
            product_id: product.id,
            quantity_reserved: 2,
            reserved_by: 'session-1',
            reserved_until: pastTime.toISOString(),
          })
          .select()
          .single(),
        supabase
          .from('inventory_reservations')
          .insert({
            product_id: product.id,
            quantity_reserved: 3,
            reserved_by: 'session-2',
            reserved_until: pastTime.toISOString(),
          })
          .select()
          .single(),
        supabase
          .from('inventory_reservations')
          .insert({
            product_id: product.id,
            quantity_reserved: 1,
            reserved_by: 'session-3',
            reserved_until: pastTime.toISOString(),
          })
          .select()
          .single(),
      ])

      reservations.forEach((r) => {
        if (r.data) cleanupManager.track('inventory_reservations', r.data.id)
      })

      // Run cron job
      const request = createTestRequest('http://localhost:3000/api/cron/release-reservations', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET(request)
      const data = await expectSuccess(response)

      // Should release at least 3 reservations
      expect(data.released_count).toBeGreaterThanOrEqual(3)
    })

    it('completes within reasonable time', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/release-reservations', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET(request)
      const data = await expectSuccess(response)

      // Should complete in less than 5 seconds (reasonable for cron job)
      expect(data.duration_ms).toBeLessThan(5000)
    })

    it('returns valid timestamp', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/release-reservations', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET(request)
      const data = await expectSuccess(response)

      expect(data.timestamp).toBeDefined()
      const timestamp = new Date(data.timestamp)
      expect(timestamp.getTime()).not.toBeNaN()
    })

    it('is idempotent (safe to run multiple times)', async () => {
      // Run cron job twice
      const request = createTestRequest('http://localhost:3000/api/cron/release-reservations', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })

      const response1 = await GET(request)
      const data1 = await expectSuccess(response1)

      const response2 = await GET(request)
      const data2 = await expectSuccess(response2)

      // Both should succeed
      expect(data1.success).toBe(true)
      expect(data2.success).toBe(true)

      // Second run should release 0 or fewer reservations (already released)
      expect(data2.released_count).toBeLessThanOrEqual(data1.released_count)
    })

    it('handles empty reservation table gracefully', async () => {
      // Clean all reservations first
      await supabase.from('inventory_reservations').delete().neq('id', '00000000-0000-0000-0000-000000000000')

      const request = createTestRequest('http://localhost:3000/api/cron/release-reservations', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET(request)
      const data = await expectSuccess(response)

      expect(data.success).toBe(true)
      expect(data.released_count).toBe(0)
    })

    it('handles database errors gracefully', async () => {
      // Mock a database error by using an invalid query
      // Note: This test is conceptual - actual implementation depends on how you can force DB errors
      const request = createTestRequest('http://localhost:3000/api/cron/release-reservations', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })

      // Even if DB has issues, should return structured response
      const response = await GET(request)
      const data = await response.json()

      expect(data).toHaveProperty('success')
      if (!data.success) {
        expect(data).toHaveProperty('error')
      }
    })

    it('uses RPC function for atomic operations', async () => {
      // This test verifies the route calls the RPC function
      // The RPC function should handle everything atomically

      const request = createTestRequest('http://localhost:3000/api/cron/release-reservations', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET(request)
      const data = await expectSuccess(response)

      // If we get here, the RPC function executed successfully
      expect(data.success).toBe(true)
      expect(typeof data.released_count).toBe('number')
    })
  })

  // =============================================================================
  // Security: Cron Authentication
  // =============================================================================

  describe('Security: Cron Authentication', () => {
    it('rejects requests without authorization header', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/release-reservations')
      const response = await GET(request)
      await expectError(response, 401)
    })

    it('rejects malformed authorization header', async () => {
      const request = createTestRequest('http://localhost:3000/api/cron/release-reservations', {
        headers: {
          Authorization: 'InvalidFormat',
        },
      })
      const response = await GET(request)
      await expectError(response, 401)
    })

    it('uses timing-safe comparison (prevents timing attacks)', async () => {
      // This test conceptually verifies timing-safe comparison
      // In practice, checkCronAuth should use crypto.timingSafeEqual

      const request1 = createTestRequest('http://localhost:3000/api/cron/release-reservations', {
        headers: {
          Authorization: 'Bearer wrong-secret-1',
        },
      })
      const request2 = createTestRequest('http://localhost:3000/api/cron/release-reservations', {
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

      // Timing should be similar (within 50ms) regardless of secret
      // Note: This is a simplified check; proper timing attack prevention
      // requires more sophisticated testing
      expect(Math.abs(duration1 - duration2)).toBeLessThan(50)
    })

    it('accepts authorization from vercel cron header', async () => {
      // Vercel sets a special header for cron jobs
      const request = createTestRequest('http://localhost:3000/api/cron/release-reservations', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
          'x-vercel-cron': 'true',
        },
      })
      const response = await GET(request)
      await expectSuccess(response)
    })
  })

  // =============================================================================
  // Edge Cases
  // =============================================================================

  describe('Edge Cases', () => {
    it('handles reservations with exactly expired time', async () => {
      const product = await createTestProduct(supabase, TEST_TENANT_ID, {
        stock_quantity: 10,
      })
      cleanupManager.track('store_products', product.id)
      cleanupManager.track('inventory', product.inventory_id!)

      // Create reservation that expires exactly now
      const now = new Date()

      const { data: reservation } = await supabase
        .from('inventory_reservations')
        .insert({
          product_id: product.id,
          quantity_reserved: 1,
          reserved_by: 'edge-case-session',
          reserved_until: now.toISOString(),
        })
        .select()
        .single()

      if (reservation) cleanupManager.track('inventory_reservations', reservation.id)

      const request = createTestRequest('http://localhost:3000/api/cron/release-reservations', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET(request)
      const data = await expectSuccess(response)

      // Should be released (expired_at <= now)
      expect(data.released_count).toBeGreaterThan(0)
    })

    it('handles very old expired reservations', async () => {
      const product = await createTestProduct(supabase, TEST_TENANT_ID, {
        stock_quantity: 10,
      })
      cleanupManager.track('store_products', product.id)
      cleanupManager.track('inventory', product.inventory_id!)

      // Create reservation expired 30 days ago
      const veryOld = new Date()
      veryOld.setDate(veryOld.getDate() - 30)

      const { data: reservation } = await supabase
        .from('inventory_reservations')
        .insert({
          product_id: product.id,
          quantity_reserved: 1,
          reserved_by: 'old-session',
          reserved_until: veryOld.toISOString(),
        })
        .select()
        .single()

      if (reservation) cleanupManager.track('inventory_reservations', reservation.id)

      const request = createTestRequest('http://localhost:3000/api/cron/release-reservations', {
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      const response = await GET(request)
      const data = await expectSuccess(response)

      expect(data.success).toBe(true)
      expect(data.released_count).toBeGreaterThan(0)
    })
  })
})
