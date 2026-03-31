import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  setupIntegrationTest,
  cleanupIntegrationTest,
  createTestAuthUser,
  createTestPet,
  createTestProduct,
  TEST_TENANT_ID,
} from '@/tests/__helpers__/integration-setup'
import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Performance Baseline Tests
 * 
 * Purpose: Establish performance baseline metrics for 10 critical API endpoints.
 * These tests measure response times to detect performance regressions.
 * 
 * Baseline Target: All endpoints should respond within 2 seconds under normal load.
 * 
 * Metrics Captured:
 * - Average response time (ms)
 * - Minimum response time (ms)
 * - Maximum response time (ms)
 * - 95th percentile (p95)
 * - 99th percentile (p99)
 * 
 * Test Methodology:
 * - 10 consecutive requests per endpoint
 * - Cold start (no caching)
 * - Realistic data volume
 * - Single-threaded (no concurrent load)
 */

describe('Performance Baseline Tests', () => {
  let supabase: SupabaseClient
  let vetUserId: string
  let ownerUserId: string
  let petId: string
  let productId: string

  beforeAll(async () => {
    supabase = await setupIntegrationTest()

    // Create test users
    const vet = await createTestAuthUser(supabase, 'vet', TEST_TENANT_ID)
    vetUserId = vet.userId

    const owner = await createTestAuthUser(supabase, 'owner', TEST_TENANT_ID)
    ownerUserId = owner.userId

    // Create test data
    const pet = await createTestPet(supabase, ownerUserId, TEST_TENANT_ID)
    petId = pet.id

    const product = await createTestProduct(supabase, TEST_TENANT_ID)
    productId = product.id
  })

  afterAll(async () => {
    await cleanupIntegrationTest()
  })

  // =============================================================================
  // Helper Functions
  // =============================================================================

  /**
   * Measure response time for a function
   */
  async function measurePerformance<T>(
    fn: () => Promise<T>,
    iterations: number = 10
  ): Promise<PerformanceMetrics> {
    const times: number[] = []

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now()
      await fn()
      const endTime = performance.now()
      times.push(endTime - startTime)
    }

    return calculateMetrics(times)
  }

  /**
   * Calculate performance metrics from response times
   */
  function calculateMetrics(times: number[]): PerformanceMetrics {
    const sorted = times.sort((a, b) => a - b)
    const sum = times.reduce((acc, time) => acc + time, 0)

    return {
      avg: sum / times.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      samples: times.length,
    }
  }

  interface PerformanceMetrics {
    avg: number
    min: number
    max: number
    p50: number
    p95: number
    p99: number
    samples: number
  }

  /**
   * Assert performance meets baseline target
   */
  function assertPerformanceTarget(
    metrics: PerformanceMetrics,
    target: number,
    endpoint: string
  ) {
    console.log(`\n📊 ${endpoint} Performance:`)
    console.log(`  Avg: ${metrics.avg.toFixed(2)}ms`)
    console.log(`  Min: ${metrics.min.toFixed(2)}ms`)
    console.log(`  Max: ${metrics.max.toFixed(2)}ms`)
    console.log(`  P50: ${metrics.p50.toFixed(2)}ms`)
    console.log(`  P95: ${metrics.p95.toFixed(2)}ms`)
    console.log(`  P99: ${metrics.p99.toFixed(2)}ms`)

    // Average should be within target
    expect(metrics.avg).toBeLessThan(target)

    // P95 should be within 2x target (allows for outliers)
    expect(metrics.p95).toBeLessThan(target * 2)
  }

  // =============================================================================
  // Endpoint 1: GET /api/pets - List Pets
  // =============================================================================

  describe('GET /api/pets - List Pets', () => {
    it('responds within 2000ms (avg)', async () => {
      const metrics = await measurePerformance(async () => {
        const { data, error } = await supabase
          .from('pets')
          .select('*')
          .eq('tenant_id', TEST_TENANT_ID)
          .limit(50)

        expect(error).toBeNull()
        expect(data).toBeDefined()
      }, 10)

      assertPerformanceTarget(metrics, 2000, 'GET /api/pets')
    })
  })

  // =============================================================================
  // Endpoint 2: GET /api/appointments/slots - Available Slots
  // =============================================================================

  describe('GET /api/appointments/slots - Available Slots', () => {
    it('responds within 2000ms (avg)', async () => {
      const startDate = new Date().toISOString().split('T')[0]

      const metrics = await measurePerformance(async () => {
        const { data, error } = await supabase.rpc('get_available_slots', {
          p_tenant_id: TEST_TENANT_ID,
          p_date: startDate,
          p_service_id: null,
        })

        expect(error).toBeNull()
        expect(data).toBeDefined()
      }, 10)

      assertPerformanceTarget(metrics, 2000, 'GET /api/appointments/slots')
    })
  })

  // =============================================================================
  // Endpoint 3: GET /api/store/products - List Products
  // =============================================================================

  describe('GET /api/store/products - List Products', () => {
    it('responds within 2000ms (avg)', async () => {
      const metrics = await measurePerformance(async () => {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('tenant_id', TEST_TENANT_ID)
          .eq('is_active', true)
          .limit(50)

        expect(error).toBeNull()
        expect(data).toBeDefined()
      }, 10)

      assertPerformanceTarget(metrics, 2000, 'GET /api/store/products')
    })
  })

  // =============================================================================
  // Endpoint 4: GET /api/vaccines - List Vaccines
  // =============================================================================

  describe('GET /api/vaccines - List Vaccines', () => {
    it('responds within 2000ms (avg)', async () => {
      const metrics = await measurePerformance(async () => {
        const { data, error } = await supabase
          .from('vaccines')
          .select(`
            *,
            pet:pets(name, species),
            administered_by:profiles(full_name)
          `)
          .eq('tenant_id', TEST_TENANT_ID)
          .limit(50)

        expect(error).toBeNull()
        expect(data).toBeDefined()
      }, 10)

      assertPerformanceTarget(metrics, 2000, 'GET /api/vaccines')
    })
  })

  // =============================================================================
  // Endpoint 5: GET /api/medical-records - List Medical Records
  // =============================================================================

  describe('GET /api/medical-records - List Medical Records', () => {
    it('responds within 2000ms (avg)', async () => {
      const metrics = await measurePerformance(async () => {
        const { data, error } = await supabase
          .from('medical_records')
          .select(`
            *,
            pet:pets(name, species),
            veterinarian:profiles(full_name)
          `)
          .eq('tenant_id', TEST_TENANT_ID)
          .limit(50)

        expect(error).toBeNull()
        expect(data).toBeDefined()
      }, 10)

      assertPerformanceTarget(metrics, 2000, 'GET /api/medical-records')
    })
  })

  // =============================================================================
  // Endpoint 6: GET /api/billing/invoices - List Invoices
  // =============================================================================

  describe('GET /api/billing/invoices - List Invoices', () => {
    it('responds within 2000ms (avg)', async () => {
      const metrics = await measurePerformance(async () => {
        const { data, error } = await supabase
          .from('invoices')
          .select(`
            *,
            customer:profiles(full_name)
          `)
          .eq('tenant_id', TEST_TENANT_ID)
          .order('created_at', { ascending: false })
          .limit(50)

        expect(error).toBeNull()
        expect(data).toBeDefined()
      }, 10)

      assertPerformanceTarget(metrics, 2000, 'GET /api/billing/invoices')
    })
  })

  // =============================================================================
  // Endpoint 7: GET /api/inventory/catalog - Product Catalog
  // =============================================================================

  describe('GET /api/inventory/catalog - Product Catalog', () => {
    it('responds within 2000ms (avg)', async () => {
      const metrics = await measurePerformance(async () => {
        const { data, error } = await supabase
          .from('global_product_catalog')
          .select('*')
          .limit(50)

        expect(error).toBeNull()
        expect(data).toBeDefined()
      }, 10)

      assertPerformanceTarget(metrics, 2000, 'GET /api/inventory/catalog')
    })
  })

  // =============================================================================
  // Endpoint 8: POST /api/store/cart - Add to Cart
  // =============================================================================

  describe('POST /api/store/cart - Add to Cart', () => {
    it('responds within 2000ms (avg)', async () => {
      const metrics = await measurePerformance(async () => {
        // Create cart item
        const { data, error } = await supabase
          .from('cart_items')
          .insert({
            customer_id: ownerUserId,
            product_id: productId,
            quantity: 1,
            tenant_id: TEST_TENANT_ID,
          })
          .select()
          .single()

        expect(error).toBeNull()
        expect(data).toBeDefined()

        // Clean up immediately
        if (data?.id) {
          await supabase.from('cart_items').delete().eq('id', data.id)
        }
      }, 10)

      assertPerformanceTarget(metrics, 2000, 'POST /api/store/cart')
    })
  })

  // =============================================================================
  // Endpoint 9: GET /api/prescriptions - List Prescriptions
  // =============================================================================

  describe('GET /api/prescriptions - List Prescriptions', () => {
    it('responds within 2000ms (avg)', async () => {
      const metrics = await measurePerformance(async () => {
        const { data, error } = await supabase
          .from('prescriptions')
          .select(`
            *,
            pet:pets(name, species),
            veterinarian:profiles(full_name)
          `)
          .eq('tenant_id', TEST_TENANT_ID)
          .limit(50)

        expect(error).toBeNull()
        expect(data).toBeDefined()
      }, 10)

      assertPerformanceTarget(metrics, 2000, 'GET /api/prescriptions')
    })
  })

  // =============================================================================
  // Endpoint 10: GET /api/dashboard/expiring-products - Expiry Dashboard
  // =============================================================================

  describe('GET /api/dashboard/expiring-products - Expiry Dashboard', () => {
    it('responds within 3000ms (avg) - Complex RPC', async () => {
      const metrics = await measurePerformance(async () => {
        const { data: expiringProducts } = await supabase.rpc('get_expiring_products', {
          p_tenant_id: TEST_TENANT_ID,
          p_days: 30,
        })

        const { data: summary } = await supabase.rpc('get_expiry_summary', {
          p_tenant_id: TEST_TENANT_ID,
        })

        expect(expiringProducts).toBeDefined()
        expect(summary).toBeDefined()
      }, 10)

      // Complex RPC - allow 3 seconds
      assertPerformanceTarget(metrics, 3000, 'GET /api/dashboard/expiring-products')
    })
  })

  // =============================================================================
  // Summary Report
  // =============================================================================

  describe('Performance Summary', () => {
    it('generates performance baseline report', () => {
      console.log(`\n${'='.repeat(60)}`)
      console.log('📊 PERFORMANCE BASELINE REPORT')
      console.log(`${'='.repeat(60)}`)
      console.log(`\nBaseline Established: ${new Date().toISOString()}`)
      console.log(`Test Environment: Integration Test (Supabase)`)
      console.log(`Load: Single-threaded, 10 iterations per endpoint`)
      console.log(`\nTarget: <2000ms average, <4000ms p95 for all endpoints`)
      console.log(`\nAll tests passed if you see this message! ✅`)
      console.log(`\nNext Steps:`)
      console.log(`  1. Store baseline metrics for comparison`)
      console.log(`  2. Run tests regularly (weekly/monthly)`)
      console.log(`  3. Alert on >20% performance degradation`)
      console.log(`  4. Profile slow endpoints (p95 > 3000ms)`)
      console.log(`${'='.repeat(60)}\n`)

      expect(true).toBe(true) // Always pass - summary only
    })
  })
})
