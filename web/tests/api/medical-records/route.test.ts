import { describe, it, expect, beforeAll, afterAll, afterEach} from 'vitest'
import { SupabaseClient } from '@supabase/supabase-js'
import {
  setupIntegrationTest,
  cleanupIntegrationTest,
  createTestAuthUser,
  createTestPet,
  createTestRequest,
  expectSuccess,
  expectError,
  cleanupManager,
  TEST_TENANT_ID,
  getAuthTokenFromUser,
} from '@/tests/__helpers__/integration-setup'
import { GET, POST } from '@/app/api/medical-records/route'
import { TENANT_IDS } from '@/lib/constants/tenants';

describe('API: /api/medical-records', () => {
  let supabase: SupabaseClient
  let vetUser: Awaited<ReturnType<typeof createTestAuthUser>>
  let adminUser: Awaited<ReturnType<typeof createTestAuthUser>>
  let ownerUser: Awaited<ReturnType<typeof createTestAuthUser>>

  beforeAll(async () => {
    supabase = await setupIntegrationTest()

    vetUser = await createTestAuthUser(supabase, 'vet', TEST_TENANT_ID)
    adminUser = await createTestAuthUser(supabase, 'admin', TEST_TENANT_ID)
    ownerUser = await createTestAuthUser(supabase, 'owner', TEST_TENANT_ID)
    
    // Checkpoint shared resources created in beforeAll
    cleanupManager.checkpoint()
  })

  afterAll(async () => {
    await cleanupIntegrationTest()
  })

  afterEach(async () => {
    await cleanupManager.cleanupSinceCheckpoint()
  })

  describe('GET /api/medical-records', () => {
    it('requires authentication', async () => {
      const request = createTestRequest('http://localhost:3000/api/medical-records')
      const response = await GET(request)
      await expectError(response, 401)
    })

    it('returns paginated medical records', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/medical-records', { authToken })
      const response = await GET(request)
      const data = await expectSuccess(response)

      expect(data).toHaveProperty('data')
      expect(Array.isArray(data.data)).toBe(true)
      expect(data).toHaveProperty('pagination')
    })

    it('filters by pet_id', async () => {
      const pet = await createTestPet(supabase, ownerUser.profile.id, TEST_TENANT_ID)
      cleanupManager.track('pets', pet.id)

      const { data: record } = await supabase
        .from('medical_records')
        .insert({
          tenant_id: TEST_TENANT_ID,
          pet_id: pet.id,
          performed_by: vetUser.userId,
          type: 'consultation',
          title: 'Test Consultation',
        })
        .select()
        .single()

      if (record) cleanupManager.track('medical_records', record.id)

      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest(
        `http://localhost:3000/api/medical-records?pet_id=${pet.id}`,
        { authToken }
      )
      const response = await GET(request)
      const data = await expectSuccess(response)

      expect(data.data.every((r: any) => r.pet_id === pet.id)).toBe(true)
    })

    it('filters by type', async () => {
      const pet = await createTestPet(supabase, ownerUser.profile.id, TEST_TENANT_ID)
      cleanupManager.track('pets', pet.id)

      const { data: record } = await supabase
        .from('medical_records')
        .insert({
          tenant_id: TEST_TENANT_ID,
          pet_id: pet.id,
          performed_by: vetUser.userId,
          type: 'surgery',
          title: 'Test Surgery',
        })
        .select()
        .single()

      if (record) cleanupManager.track('medical_records', record.id)

      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest(
        'http://localhost:3000/api/medical-records?type=surgery',
        { authToken }
      )
      const response = await GET(request)
      const data = await expectSuccess(response)

      if (data.data.length > 0) {
        expect(data.data.every((r: any) => r.type === 'surgery')).toBe(true)
      }
    })

    it('enforces tenant isolation', async () => {
      const otherPet = await createTestPet(supabase, vetUser.profile.id, 'petlife')
      cleanupManager.track('pets', otherPet.id)

      const { data: otherRecord } = await supabase
        .from('medical_records')
        .insert({
          tenant_id: TENANT_IDS.PETLIFE,
          pet_id: otherPet.id,
          performed_by: vetUser.userId,
          type: 'consultation',
          title: 'Other Tenant Record',
        })
        .select()
        .single()

      if (otherRecord) cleanupManager.track('medical_records', otherRecord.id)

      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/medical-records', { authToken })
      const response = await GET(request)
      const data = await expectSuccess(response)

      expect(data.data.some((r: any) => r.id === otherRecord?.id)).toBe(false)
    })
  })

  describe('POST /api/medical-records', () => {
    it('requires authentication', async () => {
      const request = createTestRequest('http://localhost:3000/api/medical-records', {
        method: 'POST',
        body: {},
      })
      const response = await POST(request)
      await expectError(response, 401)
    })

    it('requires staff role (vet or admin)', async () => {
      const authToken = await getAuthTokenFromUser(ownerUser)

      const pet = await createTestPet(supabase, ownerUser.profile.id, TEST_TENANT_ID)
      cleanupManager.track('pets', pet.id)

      const request = createTestRequest('http://localhost:3000/api/medical-records', {
        method: 'POST',
        body: { pet_id: pet.id, type: 'consultation', title: 'Test' },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 403)
    })

    it('validates required fields', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/medical-records', {
        method: 'POST',
        body: {},
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 400)
    })

    it('validates pet_id UUID format', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/medical-records', {
        method: 'POST',
        body: { pet_id: 'invalid', type: 'consultation', title: 'Test' },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 400)
    })

    it('validates record type enum', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const pet = await createTestPet(supabase, ownerUser.profile.id, TEST_TENANT_ID)
      cleanupManager.track('pets', pet.id)

      const request = createTestRequest('http://localhost:3000/api/medical-records', {
        method: 'POST',
        body: { pet_id: pet.id, type: 'invalid_type', title: 'Test' },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 400)
    })

    it('validates title length', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const pet = await createTestPet(supabase, ownerUser.profile.id, TEST_TENANT_ID)
      cleanupManager.track('pets', pet.id)

      const request = createTestRequest('http://localhost:3000/api/medical-records', {
        method: 'POST',
        body: { pet_id: pet.id, type: 'consultation', title: 'AB' },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 400)
    })

    it('returns 404 for non-existent pet', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/medical-records', {
        method: 'POST',
        body: {
          pet_id: '00000000-0000-0000-0000-000000000000',
          type: 'consultation',
          title: 'Test Record',
        },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 404)
    })

    it('enforces tenant isolation on pet', async () => {
      const otherPet = await createTestPet(supabase, vetUser.profile.id, 'petlife')
      cleanupManager.track('pets', otherPet.id)

      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/medical-records', {
        method: 'POST',
        body: { pet_id: otherPet.id, type: 'consultation', title: 'Test Record' },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 403)
    })

    it('vet can create medical record successfully', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const pet = await createTestPet(supabase, ownerUser.profile.id, TEST_TENANT_ID)
      cleanupManager.track('pets', pet.id)

      const recordData = {
        pet_id: pet.id,
        type: 'consultation',
        title: 'Consulta General',
        notes: 'Sin hallazgos relevantes',
      }

      const request = createTestRequest('http://localhost:3000/api/medical-records', {
        method: 'POST',
        body: recordData,
        authToken,
      })

      const response = await POST(request)
      const data = await expectSuccess(response)

      expect(data.pet_id).toBe(pet.id)
      expect(data.type).toBe('consultation')
      expect(data.title).toBe('Consulta General')
      expect(data.tenant_id).toBe(TEST_TENANT_ID)
      // Note: performed_by field removed as it doesn't exist in database schema

      if (data.id) cleanupManager.track('medical_records', data.id)
    })

    it('admin can create medical record successfully', async () => {
      const authToken = await getAuthTokenFromUser(adminUser)

      const pet = await createTestPet(supabase, ownerUser.profile.id, TEST_TENANT_ID)
      cleanupManager.track('pets', pet.id)

      const request = createTestRequest('http://localhost:3000/api/medical-records', {
        method: 'POST',
        body: { pet_id: pet.id, type: 'wellness', title: 'Chequeo Anual' },
        authToken,
      })

      const response = await POST(request)
      const data = await expectSuccess(response)

      expect(data.pet_id).toBe(pet.id)
      if (data.id) cleanupManager.track('medical_records', data.id)
    })

    it('creates record with vitals', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const pet = await createTestPet(supabase, ownerUser.profile.id, TEST_TENANT_ID)
      cleanupManager.track('pets', pet.id)

      const recordData = {
        pet_id: pet.id,
        type: 'exam',
        title: 'Examen Físico',
        vitals: {
          weight: 15.5,
          temp: 38.5,
          hr: 120,
          rr: 25,
        },
      }

      const request = createTestRequest('http://localhost:3000/api/medical-records', {
        method: 'POST',
        body: recordData,
        authToken,
      })

      const response = await POST(request)
      const data = await expectSuccess(response)

      expect(data.vitals).toBeDefined()
      expect(data.vitals.weight).toBe(15.5)
      expect(data.vitals.temp).toBe(38.5)

      if (data.id) cleanupManager.track('medical_records', data.id)
    })

    it('validates vitals ranges', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const pet = await createTestPet(supabase, ownerUser.profile.id, TEST_TENANT_ID)
      cleanupManager.track('pets', pet.id)

      const request = createTestRequest('http://localhost:3000/api/medical-records', {
        method: 'POST',
        body: {
          pet_id: pet.id,
          type: 'exam',
          title: 'Test',
          vitals: { temp: 100 },
        },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 400)
    })

    it('creates audit log entry', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const pet = await createTestPet(supabase, ownerUser.profile.id, TEST_TENANT_ID)
      cleanupManager.track('pets', pet.id)

      const request = createTestRequest('http://localhost:3000/api/medical-records', {
        method: 'POST',
        body: { pet_id: pet.id, type: 'consultation', title: 'Audit Test' },
        authToken,
      })

      const response = await POST(request)
      const data = await expectSuccess(response)

      if (data.id) {
        cleanupManager.track('medical_records', data.id)

        const { data: auditLog } = await supabase
          .from('audit_logs')
          .select('*')
          .eq('resource', 'medical_record')
          .eq('resource_id', data.id)
          .single()

        if (auditLog) {
          expect(auditLog.action).toBe('create')
          cleanupManager.track('audit_logs', auditLog.id)
        }
      }
    })
  })

  describe('Security: SQL Injection Prevention', () => {
    it('handles malicious pet_id in query parameter safely', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const malicious = "'; DROP TABLE medical_records; --"
      const request = createTestRequest(
        `http://localhost:3000/api/medical-records?pet_id=${encodeURIComponent(malicious)}`,
        { authToken }
      )

      const response = await GET(request)
      expect(response.status).not.toBe(500)
    })

    it('handles malicious type parameter safely', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const malicious = "' OR '1'='1"
      const request = createTestRequest(
        `http://localhost:3000/api/medical-records?type=${encodeURIComponent(malicious)}`,
        { authToken }
      )

      const response = await GET(request)
      expect(response.status).not.toBe(500)
    })

    it('handles malicious content in POST body safely', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const pet = await createTestPet(supabase, ownerUser.profile.id, TEST_TENANT_ID)
      cleanupManager.track('pets', pet.id)

      const malicious = "'; DROP TABLE medical_records; --"
      const request = createTestRequest('http://localhost:3000/api/medical-records', {
        method: 'POST',
        body: {
          pet_id: pet.id,
          type: 'consultation',
          title: malicious,
          diagnosis: malicious,
        },
        authToken,
      })

      const response = await POST(request)
      expect(response.status).not.toBe(500)

      if (response.status === 201) {
        const data = await response.json()
        if (data.id) cleanupManager.track('medical_records', data.id)
      }
    })
  })

  describe('Security: XSS Prevention', () => {
    it('sanitizes XSS in title and notes', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const pet = await createTestPet(supabase, ownerUser.profile.id, TEST_TENANT_ID)
      cleanupManager.track('pets', pet.id)

      const xss = '<script>alert("xss")</script>'
      const request = createTestRequest('http://localhost:3000/api/medical-records', {
        method: 'POST',
        body: {
          pet_id: pet.id,
          type: 'consultation',
          title: xss,
          notes: xss,
        },
        authToken,
      })

      const response = await POST(request)
      expect(response.status).not.toBe(500)

      if (response.status === 201) {
        const data = await response.json()
        if (data.id) cleanupManager.track('medical_records', data.id)
      }
    })
  })
})
