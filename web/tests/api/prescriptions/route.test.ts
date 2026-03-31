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
import { GET, POST, PUT, DELETE } from '@/app/api/prescriptions/route'

describe('API: /api/prescriptions', () => {
  let supabase: SupabaseClient
  let vetUserId: string
  let vetProfileId: string
  let adminUserId: string
  let adminProfileId: string
  let ownerUserId: string
  let ownerProfileId: string

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
  // GET /api/prescriptions
  // =============================================================================

  describe('GET /api/prescriptions', () => {
    it('requires authentication', async () => {
      const request = createTestRequest('http://localhost:3000/api/prescriptions')
      const response = await GET(request)
      await expectError(response, 401)
    })

    it('returns prescriptions for vet (all clinic prescriptions)', async () => {
      const pet = await createTestPet(supabase, ownerProfileId, TEST_TENANT_ID)
      cleanupManager.track('pets', pet.id)

      const { data: prescription } = await supabase
        .from('prescriptions')
        .insert({
          pet_id: pet.id,
          vet_id: vetUserId,
          drugs: [
            {
              name: 'Amoxicilina',
              dosage: '500mg',
              frequency: 'cada 8 horas',
              duration: '7 días',
            },
          ],
        })
        .select()
        .single()

      if (prescription) cleanupManager.track('prescriptions', prescription.id)

      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/prescriptions', { authToken })
      const response = await GET(request)
      const data = await expectSuccess(response)

      expect(Array.isArray(data)).toBe(true)
      expect(data.some((p: any) => p.id === prescription?.id)).toBe(true)
    })

    it('returns prescriptions for owner (only their pets)', async () => {
      const ownerPet = await createTestPet(supabase, ownerProfileId, TEST_TENANT_ID)
      cleanupManager.track('pets', ownerPet.id)

      const otherOwnerUser = await createTestAuthUser(supabase, 'owner', TEST_TENANT_ID)
      const otherPet = await createTestPet(supabase, otherOwnerUser.profile.id, TEST_TENANT_ID)
      cleanupManager.track('pets', otherPet.id)

      const { data: ownPrescription } = await supabase
        .from('prescriptions')
        .insert({
          pet_id: ownerPet.id,
          vet_id: vetUserId,
          drugs: [{ name: 'Drug A', dosage: '10mg', frequency: 'daily', duration: '5 days' }],
        })
        .select()
        .single()

      const { data: otherPrescription } = await supabase
        .from('prescriptions')
        .insert({
          pet_id: otherPet.id,
          vet_id: vetUserId,
          drugs: [{ name: 'Drug B', dosage: '20mg', frequency: 'daily', duration: '5 days' }],
        })
        .select()
        .single()

      if (ownPrescription) cleanupManager.track('prescriptions', ownPrescription.id)
      if (otherPrescription) cleanupManager.track('prescriptions', otherPrescription.id)

      const authToken = await getAuthTokenFromUser(ownerUser)

      const request = createTestRequest('http://localhost:3000/api/prescriptions', { authToken })
      const response = await GET(request)
      const data = await expectSuccess(response)

      expect(Array.isArray(data)).toBe(true)
      expect(data.some((p: any) => p.id === ownPrescription?.id)).toBe(true)
      expect(data.some((p: any) => p.id === otherPrescription?.id)).toBe(false)
    })

    it('filters by pet_id', async () => {
      const pet1 = await createTestPet(supabase, ownerProfileId, TEST_TENANT_ID)
      const pet2 = await createTestPet(supabase, ownerProfileId, TEST_TENANT_ID)
      cleanupManager.track('pets', pet1.id)
      cleanupManager.track('pets', pet2.id)

      const { data: prescription1 } = await supabase
        .from('prescriptions')
        .insert({
          pet_id: pet1.id,
          vet_id: vetUserId,
          drugs: [{ name: 'Drug A', dosage: '10mg', frequency: 'daily', duration: '5 days' }],
        })
        .select()
        .single()

      const { data: prescription2 } = await supabase
        .from('prescriptions')
        .insert({
          pet_id: pet2.id,
          vet_id: vetUserId,
          drugs: [{ name: 'Drug B', dosage: '20mg', frequency: 'daily', duration: '5 days' }],
        })
        .select()
        .single()

      if (prescription1) cleanupManager.track('prescriptions', prescription1.id)
      if (prescription2) cleanupManager.track('prescriptions', prescription2.id)

      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest(
        `http://localhost:3000/api/prescriptions?pet_id=${pet1.id}`,
        { authToken }
      )
      const response = await GET(request)
      const data = await expectSuccess(response)

      expect(data.every((p: any) => p.pet_id === pet1.id)).toBe(true)
    })

    it('enforces tenant isolation', async () => {
      const otherPet = await createTestPet(supabase, vetProfileId, 'petlife')
      cleanupManager.track('pets', otherPet.id)

      const { data: otherPrescription } = await supabase
        .from('prescriptions')
        .insert({
          pet_id: otherPet.id,
          vet_id: vetUserId,
          drugs: [{ name: 'Drug C', dosage: '30mg', frequency: 'daily', duration: '5 days' }],
        })
        .select()
        .single()

      if (otherPrescription) cleanupManager.track('prescriptions', otherPrescription.id)

      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/prescriptions', { authToken })
      const response = await GET(request)
      const data = await expectSuccess(response)

      expect(data.some((p: any) => p.id === otherPrescription?.id)).toBe(false)
    })

    it('excludes soft-deleted prescriptions', async () => {
      const pet = await createTestPet(supabase, ownerProfileId, TEST_TENANT_ID)
      cleanupManager.track('pets', pet.id)

      const { data: prescription } = await supabase
        .from('prescriptions')
        .insert({
          pet_id: pet.id,
          vet_id: vetUserId,
          drugs: [{ name: 'Drug D', dosage: '40mg', frequency: 'daily', duration: '5 days' }],
          deleted_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (prescription) cleanupManager.track('prescriptions', prescription.id)

      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/prescriptions', { authToken })
      const response = await GET(request)
      const data = await expectSuccess(response)

      expect(data.some((p: any) => p.id === prescription?.id)).toBe(false)
    })
  })

  // =============================================================================
  // POST /api/prescriptions
  // =============================================================================

  describe('POST /api/prescriptions', () => {
    it('requires authentication', async () => {
      const request = createTestRequest('http://localhost:3000/api/prescriptions', {
        method: 'POST',
        body: {},
      })
      const response = await POST(request)
      await expectError(response, 401)
    })

    it('requires vet or admin role', async () => {
      const authToken = await getAuthTokenFromUser(ownerUser)

      const pet = await createTestPet(supabase, ownerProfileId, TEST_TENANT_ID)
      cleanupManager.track('pets', pet.id)

      const request = createTestRequest('http://localhost:3000/api/prescriptions', {
        method: 'POST',
        body: {
          pet_id: pet.id,
          drugs: [{ name: 'Drug A', dosage: '10mg', frequency: 'daily', duration: '5 days' }],
        },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 403)
    })

    it('validates required fields', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/prescriptions', {
        method: 'POST',
        body: {},
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 400)
    })

    it('validates pet_id UUID format', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/prescriptions', {
        method: 'POST',
        body: {
          pet_id: 'invalid-uuid',
          drugs: [{ name: 'Drug A', dosage: '10mg', frequency: 'daily', duration: '5 days' }],
        },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 400)
    })

    it('validates drugs array structure', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const pet = await createTestPet(supabase, ownerProfileId, TEST_TENANT_ID)
      cleanupManager.track('pets', pet.id)

      const request = createTestRequest('http://localhost:3000/api/prescriptions', {
        method: 'POST',
        body: {
          pet_id: pet.id,
          drugs: 'not-an-array',
        },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 400)
    })

    it('validates drug object fields', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const pet = await createTestPet(supabase, ownerProfileId, TEST_TENANT_ID)
      cleanupManager.track('pets', pet.id)

      const request = createTestRequest('http://localhost:3000/api/prescriptions', {
        method: 'POST',
        body: {
          pet_id: pet.id,
          drugs: [{ name: 'Drug A' }], // Missing required fields
        },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 400)
    })

    it('returns 404 for non-existent pet', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/prescriptions', {
        method: 'POST',
        body: {
          pet_id: '00000000-0000-0000-0000-000000000000',
          drugs: [{ name: 'Drug A', dosage: '10mg', frequency: 'daily', duration: '5 days' }],
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

      const request = createTestRequest('http://localhost:3000/api/prescriptions', {
        method: 'POST',
        body: {
          pet_id: otherPet.id,
          drugs: [{ name: 'Drug A', dosage: '10mg', frequency: 'daily', duration: '5 days' }],
        },
        authToken,
      })

      const response = await POST(request)
      await expectError(response, 403)
    })

    it('vet can create prescription successfully', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const pet = await createTestPet(supabase, ownerProfileId, TEST_TENANT_ID)
      cleanupManager.track('pets', pet.id)

      const prescriptionData = {
        pet_id: pet.id,
        drugs: [
          {
            name: 'Amoxicilina',
            dosage: '500mg',
            frequency: 'cada 8 horas',
            duration: '7 días',
            instructions: 'Tomar con comida',
          },
        ],
        notes: 'Prescripción de prueba',
      }

      const request = createTestRequest('http://localhost:3000/api/prescriptions', {
        method: 'POST',
        body: prescriptionData,
        authToken,
      })

      const response = await POST(request)
      const data = await expectSuccess(response)

      expect(data.pet_id).toBe(pet.id)
      expect(data.vet_id).toBe(vetUserId)
      expect(data.drugs).toEqual(prescriptionData.drugs)
      expect(data.notes).toBe(prescriptionData.notes)

      if (data.id) cleanupManager.track('prescriptions', data.id)
    })

    it('admin can create prescription successfully', async () => {
      const authToken = await getAuthTokenFromUser(adminUser)

      const pet = await createTestPet(supabase, ownerProfileId, TEST_TENANT_ID)
      cleanupManager.track('pets', pet.id)

      const request = createTestRequest('http://localhost:3000/api/prescriptions', {
        method: 'POST',
        body: {
          pet_id: pet.id,
          drugs: [{ name: 'Drug B', dosage: '20mg', frequency: 'twice daily', duration: '10 days' }],
        },
        authToken,
      })

      const response = await POST(request)
      const data = await expectSuccess(response)

      expect(data.pet_id).toBe(pet.id)
      expect(data.vet_id).toBe(adminUserId)

      if (data.id) cleanupManager.track('prescriptions', data.id)
    })

    it('creates prescription with digital signature', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const pet = await createTestPet(supabase, ownerProfileId, TEST_TENANT_ID)
      cleanupManager.track('pets', pet.id)

      const request = createTestRequest('http://localhost:3000/api/prescriptions', {
        method: 'POST',
        body: {
          pet_id: pet.id,
          drugs: [{ name: 'Drug C', dosage: '30mg', frequency: 'daily', duration: '5 days' }],
          signature_hash: 'abc123hash',
          qr_code_url: 'https://example.com/qr/abc123',
        },
        authToken,
      })

      const response = await POST(request)
      const data = await expectSuccess(response)

      expect(data.digital_signature_hash).toBe('abc123hash')
      expect(data.qr_code_url).toBe('https://example.com/qr/abc123')

      if (data.id) cleanupManager.track('prescriptions', data.id)
    })
  })

  // =============================================================================
  // PUT /api/prescriptions
  // =============================================================================

  describe('PUT /api/prescriptions', () => {
    it('requires authentication', async () => {
      const request = createTestRequest('http://localhost:3000/api/prescriptions', {
        method: 'PUT',
        body: {},
      })
      const response = await PUT(request)
      await expectError(response, 401)
    })

    it('requires vet or admin role', async () => {
      const authToken = await getAuthTokenFromUser(ownerUser)

      const request = createTestRequest('http://localhost:3000/api/prescriptions', {
        method: 'PUT',
        body: {
          id: '00000000-0000-0000-0000-000000000000',
          drugs: [{ name: 'Drug A', dosage: '10mg', frequency: 'daily', duration: '5 days' }],
        },
        authToken,
      })

      const response = await PUT(request)
      await expectError(response, 403)
    })

    it('validates required id field', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/prescriptions', {
        method: 'PUT',
        body: {
          drugs: [{ name: 'Drug A', dosage: '10mg', frequency: 'daily', duration: '5 days' }],
        },
        authToken,
      })

      const response = await PUT(request)
      await expectError(response, 400)
    })

    it('returns 404 for non-existent prescription', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/prescriptions', {
        method: 'PUT',
        body: {
          id: '00000000-0000-0000-0000-000000000000',
          drugs: [{ name: 'Drug A', dosage: '10mg', frequency: 'daily', duration: '5 days' }],
        },
        authToken,
      })

      const response = await PUT(request)
      await expectError(response, 404)
    })

    it('enforces tenant isolation on update', async () => {
      const otherPet = await createTestPet(supabase, vetProfileId, 'petlife')
      cleanupManager.track('pets', otherPet.id)

      const { data: otherPrescription } = await supabase
        .from('prescriptions')
        .insert({
          pet_id: otherPet.id,
          vet_id: vetUserId,
          drugs: [{ name: 'Drug D', dosage: '40mg', frequency: 'daily', duration: '5 days' }],
        })
        .select()
        .single()

      if (otherPrescription) cleanupManager.track('prescriptions', otherPrescription.id)

      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest('http://localhost:3000/api/prescriptions', {
        method: 'PUT',
        body: {
          id: otherPrescription?.id,
          drugs: [{ name: 'Drug E', dosage: '50mg', frequency: 'daily', duration: '5 days' }],
        },
        authToken,
      })

      const response = await PUT(request)
      await expectError(response, 403)
    })

    it('updates prescription drugs successfully', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const pet = await createTestPet(supabase, ownerProfileId, TEST_TENANT_ID)
      cleanupManager.track('pets', pet.id)

      const { data: prescription } = await supabase
        .from('prescriptions')
        .insert({
          pet_id: pet.id,
          vet_id: vetUserId,
          drugs: [{ name: 'Drug F', dosage: '60mg', frequency: 'daily', duration: '5 days' }],
        })
        .select()
        .single()

      if (prescription) cleanupManager.track('prescriptions', prescription.id)

      const updatedDrugs = [
        { name: 'Drug F Updated', dosage: '70mg', frequency: 'twice daily', duration: '7 days' },
      ]

      const request = createTestRequest('http://localhost:3000/api/prescriptions', {
        method: 'PUT',
        body: {
          id: prescription?.id,
          drugs: updatedDrugs,
        },
        authToken,
      })

      const response = await PUT(request)
      const data = await expectSuccess(response)

      expect(data.drugs).toEqual(updatedDrugs)
    })

    it('updates prescription notes successfully', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const pet = await createTestPet(supabase, ownerProfileId, TEST_TENANT_ID)
      cleanupManager.track('pets', pet.id)

      const { data: prescription } = await supabase
        .from('prescriptions')
        .insert({
          pet_id: pet.id,
          vet_id: vetUserId,
          drugs: [{ name: 'Drug G', dosage: '80mg', frequency: 'daily', duration: '5 days' }],
          notes: 'Original notes',
        })
        .select()
        .single()

      if (prescription) cleanupManager.track('prescriptions', prescription.id)

      const request = createTestRequest('http://localhost:3000/api/prescriptions', {
        method: 'PUT',
        body: {
          id: prescription?.id,
          notes: 'Updated notes',
        },
        authToken,
      })

      const response = await PUT(request)
      const data = await expectSuccess(response)

      expect(data.notes).toBe('Updated notes')
    })

    it('updates prescription status successfully', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const pet = await createTestPet(supabase, ownerProfileId, TEST_TENANT_ID)
      cleanupManager.track('pets', pet.id)

      const { data: prescription } = await supabase
        .from('prescriptions')
        .insert({
          pet_id: pet.id,
          vet_id: vetUserId,
          drugs: [{ name: 'Drug H', dosage: '90mg', frequency: 'daily', duration: '5 days' }],
          status: 'active',
        })
        .select()
        .single()

      if (prescription) cleanupManager.track('prescriptions', prescription.id)

      const request = createTestRequest('http://localhost:3000/api/prescriptions', {
        method: 'PUT',
        body: {
          id: prescription?.id,
          status: 'completed',
        },
        authToken,
      })

      const response = await PUT(request)
      const data = await expectSuccess(response)

      expect(data.status).toBe('completed')
    })
  })

  // =============================================================================
  // DELETE /api/prescriptions
  // =============================================================================

  describe('DELETE /api/prescriptions', () => {
    it('requires authentication', async () => {
      const request = createTestRequest(
        'http://localhost:3000/api/prescriptions?id=00000000-0000-0000-0000-000000000000',
        { method: 'DELETE' }
      )
      const response = await DELETE(request)
      await expectError(response, 401)
    })

    it('requires admin role', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const request = createTestRequest(
        'http://localhost:3000/api/prescriptions?id=00000000-0000-0000-0000-000000000000',
        { method: 'DELETE', authToken }
      )

      const response = await DELETE(request)
      await expectError(response, 403)
    })

    it('validates required id parameter', async () => {
      const authToken = await getAuthTokenFromUser(adminUser)

      const request = createTestRequest('http://localhost:3000/api/prescriptions', {
        method: 'DELETE',
        authToken,
      })

      const response = await DELETE(request)
      await expectError(response, 400)
    })

    it('returns 404 for non-existent prescription', async () => {
      const authToken = await getAuthTokenFromUser(adminUser)

      const request = createTestRequest(
        'http://localhost:3000/api/prescriptions?id=00000000-0000-0000-0000-000000000000',
        { method: 'DELETE', authToken }
      )

      const response = await DELETE(request)
      await expectError(response, 404)
    })

    it('enforces tenant isolation on delete', async () => {
      const otherPet = await createTestPet(supabase, vetProfileId, 'petlife')
      cleanupManager.track('pets', otherPet.id)

      const { data: otherPrescription } = await supabase
        .from('prescriptions')
        .insert({
          pet_id: otherPet.id,
          vet_id: vetUserId,
          drugs: [{ name: 'Drug I', dosage: '100mg', frequency: 'daily', duration: '5 days' }],
        })
        .select()
        .single()

      if (otherPrescription) cleanupManager.track('prescriptions', otherPrescription.id)

      const authToken = await getAuthTokenFromUser(adminUser)

      const request = createTestRequest(
        `http://localhost:3000/api/prescriptions?id=${otherPrescription?.id}`,
        { method: 'DELETE', authToken }
      )

      const response = await DELETE(request)
      await expectError(response, 403)
    })

    it('admin can delete prescription successfully', async () => {
      const authToken = await getAuthTokenFromUser(adminUser)

      const pet = await createTestPet(supabase, ownerProfileId, TEST_TENANT_ID)
      cleanupManager.track('pets', pet.id)

      const { data: prescription } = await supabase
        .from('prescriptions')
        .insert({
          pet_id: pet.id,
          vet_id: vetUserId,
          drugs: [{ name: 'Drug J', dosage: '110mg', frequency: 'daily', duration: '5 days' }],
        })
        .select()
        .single()

      if (prescription) cleanupManager.track('prescriptions', prescription.id)

      const request = createTestRequest(
        `http://localhost:3000/api/prescriptions?id=${prescription?.id}`,
        { method: 'DELETE', authToken }
      )

      const response = await DELETE(request)
      expect(response.status).toBe(204)

      // Verify deletion
      const { data: deleted } = await supabase
        .from('prescriptions')
        .select('id')
        .eq('id', prescription?.id)
        .single()

      expect(deleted).toBeNull()
    })
  })

  // =============================================================================
  // Security: SQL Injection Prevention
  // =============================================================================

  describe('Security: SQL Injection Prevention', () => {
    it('handles malicious pet_id in query parameter safely', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const malicious = "'; DROP TABLE prescriptions; --"
      const request = createTestRequest(
        `http://localhost:3000/api/prescriptions?pet_id=${encodeURIComponent(malicious)}`,
        { authToken }
      )

      const response = await GET(request)
      expect(response.status).not.toBe(500)
    })

    it('handles malicious content in POST body safely', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const pet = await createTestPet(supabase, ownerProfileId, TEST_TENANT_ID)
      cleanupManager.track('pets', pet.id)

      const malicious = "'; DROP TABLE prescriptions; --"
      const request = createTestRequest('http://localhost:3000/api/prescriptions', {
        method: 'POST',
        body: {
          pet_id: pet.id,
          drugs: [
            {
              name: malicious,
              dosage: malicious,
              frequency: malicious,
              duration: malicious,
            },
          ],
          notes: malicious,
        },
        authToken,
      })

      const response = await POST(request)
      expect(response.status).not.toBe(500)

      if (response.status === 201) {
        const data = await response.json()
        if (data.id) cleanupManager.track('prescriptions', data.id)
      }
    })

    it('handles malicious id in DELETE parameter safely', async () => {
      const authToken = await getAuthTokenFromUser(adminUser)

      const malicious = "' OR '1'='1"
      const request = createTestRequest(
        `http://localhost:3000/api/prescriptions?id=${encodeURIComponent(malicious)}`,
        { method: 'DELETE', authToken }
      )

      const response = await DELETE(request)
      expect(response.status).not.toBe(500)
    })
  })

  // =============================================================================
  // Security: XSS Prevention
  // =============================================================================

  describe('Security: XSS Prevention', () => {
    it('sanitizes XSS in drug names and notes', async () => {
      const authToken = await getAuthTokenFromUser(vetUser)

      const pet = await createTestPet(supabase, ownerProfileId, TEST_TENANT_ID)
      cleanupManager.track('pets', pet.id)

      const xss = '<script>alert("xss")</script>'
      const request = createTestRequest('http://localhost:3000/api/prescriptions', {
        method: 'POST',
        body: {
          pet_id: pet.id,
          drugs: [
            {
              name: xss,
              dosage: '10mg',
              frequency: 'daily',
              duration: '5 days',
              instructions: xss,
            },
          ],
          notes: xss,
        },
        authToken,
      })

      const response = await POST(request)
      expect(response.status).not.toBe(500)

      if (response.status === 201) {
        const data = await response.json()
        if (data.id) cleanupManager.track('prescriptions', data.id)
      }
    })
  })
})
