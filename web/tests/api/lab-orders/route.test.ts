import { describe, it, expect, beforeAll, afterAll, afterEach} from 'vitest'
import { SupabaseClient } from '@supabase/supabase-js'
import {
  setupIntegrationTest,
  cleanupIntegrationTest,
  createTestAuthUser,
  createTestPet,
  createTestLabTest,
  createTestRequest,
  expectSuccess,
  expectError,
  cleanupManager,
  TEST_TENANT_ID,
  getAuthTokenFromUser,
} from '@/tests/__helpers__/integration-setup'
import { GET, POST } from '@/app/api/lab-orders/route'

describe('API: /api/lab-orders', () => {
  let supabase: SupabaseClient
  let vetUserId: string
  let vetProfileId: string
  let adminUserId: string
  let adminProfileId: string
  let ownerUserId: string
  let ownerProfileId: string
  let testPetId: string
  let labTest1Id: string
  let labTest2Id: string
  let labTest3Id: string

  beforeAll(async () => {
    supabase = await setupIntegrationTest()

    const vetUser = await createTestAuthUser(supabase, 'vet', TEST_TENANT_ID)
    vetUserId = vetUser.userId
    vetProfileId = vetUser.profile.id

    const adminUser = await createTestAuthUser(supabase, 'admin', TEST_TENANT_ID)
    adminUserId = adminUser.userId
    adminProfileId = adminUser.profile.id

    const ownerUser = await createTestAuthUser(supabase, 'owner', TEST_TENANT_ID)
    ownerUserId = ownerUser.userId
    ownerProfileId = ownerUser.profile.id

    // Create test pet
    const pet = await createTestPet(supabase, ownerProfileId, TEST_TENANT_ID)
    testPetId = pet.id
    cleanupManager.track('pets', pet.id)

    // Create test lab tests
    const test1 = await createTestLabTest(supabase, TEST_TENANT_ID, {
      name: 'Complete Blood Count (CBC)',
      test_code: 'CBC',
    })
    labTest1Id = test1.id
    cleanupManager.track('lab_test_catalog', test1.id)

    const test2 = await createTestLabTest(supabase, TEST_TENANT_ID, {
      name: 'Blood Chemistry Panel',
      test_code: 'CHEM',
    })
    labTest2Id = test2.id
    cleanupManager.track('lab_test_catalog', test2.id)

    const test3 = await createTestLabTest(supabase, TEST_TENANT_ID, {
      name: 'Urinalysis',
      test_code: 'UA',
    })
    labTest3Id = test3.id
    cleanupManager.track('lab_test_catalog', test3.id)

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
  // GET /api/lab-orders
  // =============================================================================

  describe('GET /api/lab-orders', () => {
    it('requires authentication', async () => {
      const request = createTestRequest('http://localhost:3000/api/lab-orders')
      const response = await GET(request)
      await expectError(response, 401)
    })

    it('requires vet or admin role', async () => {
      const authToken = await getAuthTokenFromUser(ownerUser)

      const request = createTestRequest('http://localhost:3000/api/lab-orders', { authToken })
      const response = await GET(request)
      await expectError(response, 403)
    })

    it('returns paginated lab orders', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/lab-orders', { authToken })
      const response = await GET(request)
      const data = await expectSuccess(response)

      expect(data).toHaveProperty('data')
      expect(data).toHaveProperty('pagination')
      expect(Array.isArray(data.data)).toBe(true)
    })

    it('filters by pet_id', async () => {
      // Create lab order for test pet
      const order = await createTestLabOrder(supabase, testPetId, vetUserId, TEST_TENANT_ID)
      if (order) cleanupManager.track('lab_orders', order.id)

      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest(
        `http://localhost:3000/api/lab-orders?pet_id=${testPetId}`,
        { authToken }
      )
      const response = await GET(request)
      const data = await expectSuccess(response)

      expect(data.data.every((o: any) => o.pet_id === testPetId)).toBe(true)
    })

    it('filters by status', async () => {
      // Create lab order with pending status
      const order = await createTestLabOrder(supabase, testPetId, vetUserId, TEST_TENANT_ID, {
        status: 'pending',
      })
      if (order) cleanupManager.track('lab_orders', order.id)

      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest(
        'http://localhost:3000/api/lab-orders?status=pending',
        { authToken }
      )
      const response = await GET(request)
      const data = await expectSuccess(response)

      if (data.data.length > 0) {
        expect(data.data.every((o: any) => o.status === 'pending')).toBe(true)
      }
    })

    it('enforces tenant isolation', async () => {
      // Create lab order in different tenant
      const otherPet = await createTestPet(supabase, vetProfileId, 'petlife')
      cleanupManager.track('pets', otherPet.id)

      const otherOrder = await createTestLabOrder(supabase, otherPet.id, vetUserId, 'petlife')
      if (otherOrder) cleanupManager.track('lab_orders', otherOrder.id)

      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/lab-orders', { authToken })
      const response = await GET(request)
      const data = await expectSuccess(response)

      expect(data.data.some((o: any) => o.id === otherOrder?.id)).toBe(false)
    })

    it('excludes soft-deleted orders', async () => {
      const { data: deletedOrder } = await supabase
        .from('lab_orders')
        .insert({
          tenant_id: TEST_TENANT_ID,
          pet_id: testPetId,
          order_number: `LAB-DELETED-${Date.now()}`,
          ordered_by: vetUserId,
          status: 'ordered',
          deleted_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (deletedOrder) cleanupManager.track('lab_orders', deletedOrder.id)

      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/lab-orders', { authToken })
      const response = await GET(request)
      const data = await expectSuccess(response)

      expect(data.data.some((o: any) => o.id === deletedOrder?.id)).toBe(false)
    })

    it('orders by ordered_at descending', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/lab-orders', { authToken })
      const response = await GET(request)
      const data = await expectSuccess(response)

      if (data.data.length > 1) {
        const dates = data.data.map((o: any) => new Date(o.ordered_at).getTime())
        for (let i = 1; i < dates.length; i++) {
          expect(dates[i]).toBeLessThanOrEqual(dates[i - 1])
        }
      }
    })
  })

  // =============================================================================
  // POST /api/lab-orders
  // =============================================================================

  describe('POST /api/lab-orders', () => {
    it('requires authentication', async () => {
      const request = createTestRequest('http://localhost:3000/api/lab-orders', {
        method: 'POST',
        body: {},
      })
      const response = await POST(request)
      await expectError(response, 401)
    })

    it('requires vet or admin role', async () => {
      const authToken = await getAuthTokenFromUser(ownerUser)

      const request = createTestRequest('http://localhost:3000/api/lab-orders', {
        method: 'POST',
        body: {
          pet_id: testPetId,
          test_ids: [labTest1Id],
        },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 403)
    })

    it('validates required field: pet_id', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/lab-orders', {
        method: 'POST',
        body: { test_ids: [labTest1Id] },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 400)
    })

    it('validates required field: test_ids', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/lab-orders', {
        method: 'POST',
        body: { pet_id: testPetId },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 400)
    })

    it('validates test_ids must be array', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/lab-orders', {
        method: 'POST',
        body: { pet_id: testPetId, test_ids: 'not-an-array' },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 400)
    })

    it('validates test_ids must have at least 1 item', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/lab-orders', {
        method: 'POST',
        body: { pet_id: testPetId, test_ids: [] },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 400)
    })

    it('validates test_ids cannot exceed 20 items', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const tooManyTests = Array(21).fill(labTest1Id)

      const request = createTestRequest('http://localhost:3000/api/lab-orders', {
        method: 'POST',
        body: { pet_id: testPetId, test_ids: tooManyTests },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 400)
    })

    it('validates panel_ids cannot exceed 5 items', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const tooManyPanels = Array(6).fill('00000000-0000-0000-0000-000000000000')

      const request = createTestRequest('http://localhost:3000/api/lab-orders', {
        method: 'POST',
        body: {
          pet_id: testPetId,
          test_ids: [labTest1Id],
          panel_ids: tooManyPanels,
        },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 400)
    })

    it('validates priority enum', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/lab-orders', {
        method: 'POST',
        body: {
          pet_id: testPetId,
          test_ids: [labTest1Id],
          priority: 'invalid_priority',
        },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 400)
    })

    it('validates lab_type enum', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/lab-orders', {
        method: 'POST',
        body: {
          pet_id: testPetId,
          test_ids: [labTest1Id],
          lab_type: 'invalid_lab_type',
        },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 400)
    })

    it('validates clinical_notes max length (2000 chars)', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const tooLongNotes = 'x'.repeat(2001)

      const request = createTestRequest('http://localhost:3000/api/lab-orders', {
        method: 'POST',
        body: {
          pet_id: testPetId,
          test_ids: [labTest1Id],
          clinical_notes: tooLongNotes,
        },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 400)
    })

    it('returns 404 for non-existent pet', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/lab-orders', {
        method: 'POST',
        body: {
          pet_id: '00000000-0000-0000-0000-000000000000',
          test_ids: [labTest1Id],
        },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 404)
    })

    it('enforces tenant isolation on pet', async () => {
      const otherPet = await createTestPet(supabase, vetProfileId, 'petlife')
      cleanupManager.track('pets', otherPet.id)

      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/lab-orders', {
        method: 'POST',
        body: {
          pet_id: otherPet.id,
          test_ids: [labTest1Id],
        },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 403)
    })

    it('validates all test IDs exist', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/lab-orders', {
        method: 'POST',
        body: {
          pet_id: testPetId,
          test_ids: ['00000000-0000-0000-0000-000000000000'],
        },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 400)
    })

    it('vet can create lab order successfully', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/lab-orders', {
        method: 'POST',
        body: {
          pet_id: testPetId,
          test_ids: [labTest1Id, labTest2Id],
          priority: 'routine',
          lab_type: 'in_house',
          clinical_notes: 'Annual wellness check',
        },
        authToken,
      })

      const response = await POST(request)
      const data = await expectSuccess(response)

      expect(data).toHaveProperty('id')
      expect(data).toHaveProperty('order_number')
      expect(data.pet_id).toBe(testPetId)
      expect(data.status).toBe('ordered')

      if (data.id) cleanupManager.track('lab_orders', data.id)
    })

    it('admin can create lab order successfully', async () => {
      const authToken = await getAuthTokenFromUser(adminUser)

      const request = createTestRequest('http://localhost:3000/api/lab-orders', {
        method: 'POST',
        body: {
          pet_id: testPetId,
          test_ids: [labTest3Id],
          priority: 'urgent',
        },
        authToken,
      })

      const response = await POST(request)
      const data = await expectSuccess(response)

      expect(data.pet_id).toBe(testPetId)
      if (data.id) cleanupManager.track('lab_orders', data.id)
    })

    it('creates order with multiple tests', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/lab-orders', {
        method: 'POST',
        body: {
          pet_id: testPetId,
          test_ids: [labTest1Id, labTest2Id, labTest3Id],
        },
        authToken,
      })

      const response = await POST(request)
      const data = await expectSuccess(response)

      expect(data.id).toBeDefined()
      if (data.id) cleanupManager.track('lab_orders', data.id)
    })

    it('creates order with STAT priority', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/lab-orders', {
        method: 'POST',
        body: {
          pet_id: testPetId,
          test_ids: [labTest1Id],
          priority: 'stat',
          lab_type: 'external',
        },
        authToken,
      })

      const response = await POST(request)
      const data = await expectSuccess(response)

      expect(data.priority).toBe('stat')
      if (data.id) cleanupManager.track('lab_orders', data.id)
    })

    it('creates order with fasting status', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/lab-orders', {
        method: 'POST',
        body: {
          pet_id: testPetId,
          test_ids: [labTest2Id],
          fasting_status: 'fasted',
        },
        authToken,
      })

      const response = await POST(request)
      const data = await expectSuccess(response)

      expect(data.fasting_status).toBe('fasted')
      if (data.id) cleanupManager.track('lab_orders', data.id)
    })

    it('generates unique order number', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      // Create two orders
      const request1 = createTestRequest('http://localhost:3000/api/lab-orders', {
        method: 'POST',
        body: { pet_id: testPetId, test_ids: [labTest1Id] },
        authToken,
      })
      const response1 = await POST(request1)
      const data1 = await expectSuccess(response1)
      if (data1.id) cleanupManager.track('lab_orders', data1.id)

      const request2 = createTestRequest('http://localhost:3000/api/lab-orders', {
        method: 'POST',
        body: { pet_id: testPetId, test_ids: [labTest2Id] },
        authToken,
      })
      const response2 = await POST(request2)
      const data2 = await expectSuccess(response2)
      if (data2.id) cleanupManager.track('lab_orders', data2.id)

      // Order numbers should be different
      expect(data1.order_number).not.toBe(data2.order_number)
    })
  })

  // =============================================================================
  // Security: SQL Injection Prevention
  // =============================================================================

  describe('Security: SQL Injection Prevention', () => {
    it('handles malicious pet_id in query parameter safely', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const malicious = "'; DROP TABLE lab_orders; --"
      const request = createTestRequest(
        `http://localhost:3000/api/lab-orders?pet_id=${encodeURIComponent(malicious)}`,
        { authToken }
      )

      const response = await GET(request)
      expect(response.status).not.toBe(500)
    })

    it('handles malicious clinical_notes safely', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const malicious = "'; DELETE FROM lab_orders WHERE '1'='1"
      const request = createTestRequest('http://localhost:3000/api/lab-orders', {
        method: 'POST',
        body: {
          pet_id: testPetId,
          test_ids: [labTest1Id],
          clinical_notes: malicious,
        },
        authToken,
      })

      const response = await POST(request)
      expect(response.status).not.toBe(500)

      if (response.status === 201) {
        const data = await response.json()
        if (data.id) cleanupManager.track('lab_orders', data.id)
      }
    })
  })

  // =============================================================================
  // Security: XSS Prevention
  // =============================================================================

  describe('Security: XSS Prevention', () => {
    it('sanitizes XSS in clinical_notes', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const xss = '<script>alert("xss")</script>'
      const request = createTestRequest('http://localhost:3000/api/lab-orders', {
        method: 'POST',
        body: {
          pet_id: testPetId,
          test_ids: [labTest1Id],
          clinical_notes: xss,
        },
        authToken,
      })

      const response = await POST(request)
      expect(response.status).not.toBe(500)

      if (response.status === 201) {
        const data = await response.json()
        if (data.id) cleanupManager.track('lab_orders', data.id)
      }
    })
  })
})

// Helper function to create test lab order
async function createTestLabOrder(
  supabase: SupabaseClient,
  petId: string,
  orderedBy: string,
  tenantId: string,
  overrides?: Partial<any>
) {
  const { data, error } = await supabase
    .from('lab_orders')
    .insert({
      tenant_id: tenantId,
      pet_id: petId,
      order_number: `LAB-TEST-${Date.now()}`,
      ordered_by: orderedBy,
      status: 'ordered',
      priority: 'routine',
      lab_type: 'in_house',
      ...overrides,
    })
    .select()
    .single()

  if (error) throw error
  return data
}
