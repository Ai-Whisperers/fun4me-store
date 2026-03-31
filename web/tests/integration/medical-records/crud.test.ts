/**
 * Integration Tests: Medical Records CRUD
 *
 * Tests medical record management operations.
 * @tags integration, medical-records, critical
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { getTestClient, TestContext, waitForDatabase } from '../../__helpers__/db'
import { createProfile, createPet, resetSequence } from '../../__helpers__/factories'
import { DEFAULT_TENANT } from '../../__fixtures__/tenants'

describe('Medical Records CRUD', () => {
  const ctx = new TestContext()
  let client: ReturnType<typeof getTestClient>
  let ownerId: string
  let vetId: string
  let petId: string

  beforeAll(async () => {
    await waitForDatabase()
    client = getTestClient({ serviceRole: true })

    const owner = await createProfile({
      tenantId: DEFAULT_TENANT.id,
      role: 'owner',
    })
    ownerId = owner.id
    ctx.track('profiles', ownerId)

    const vet = await createProfile({
      tenantId: DEFAULT_TENANT.id,
      role: 'vet',
      fullName: 'Dr. Medical Records',
    })
    vetId = vet.id
    ctx.track('profiles', vetId)

    const pet = await createPet({
      ownerId,
      tenantId: DEFAULT_TENANT.id,
      name: 'Medical Records Pet',
    })
    petId = pet.id
    ctx.track('pets', petId)
  })

  afterAll(async () => {
    await ctx.cleanup()
  })

  beforeEach(() => {
    resetSequence()
  })

  describe('CREATE', () => {
    test('creates consultation record', async () => {
      const { data, error } = await client
        .from('medical_records')
        .insert({
          pet_id: petId,
          tenant_id: DEFAULT_TENANT.id,
          vet_id: vetId,
          record_type: 'consultation',
          chief_complaint: 'Consulta General',
          diagnosis_text: 'Paciente sano',
          clinical_notes: 'Sin anomalías detectadas.',
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.record_type).toBe('consultation')
      expect(data.chief_complaint).toBe('Consulta General')

      ctx.track('medical_records', data.id)
    })

    test('creates checkup record with vitals', async () => {
      const { data, error } = await client
        .from('medical_records')
        .insert({
          pet_id: petId,
          tenant_id: DEFAULT_TENANT.id,
          vet_id: vetId,
          record_type: 'checkup',
          chief_complaint: 'Examen Físico Completo',
          diagnosis_text: 'Estado general bueno',
          weight_kg: 25.5,
          temperature_celsius: 38.5,
          heart_rate_bpm: 80,
          respiratory_rate_rpm: 20,
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.weight_kg).toBe(25.5)
      expect(data.temperature_celsius).toBe(38.5)
      expect(data.heart_rate_bpm).toBe(80)
      expect(data.respiratory_rate_rpm).toBe(20)

      ctx.track('medical_records', data.id)
    })

    test('creates surgery record', async () => {
      const { data, error } = await client
        .from('medical_records')
        .insert({
          pet_id: petId,
          tenant_id: DEFAULT_TENANT.id,
          vet_id: vetId,
          record_type: 'surgery',
          chief_complaint: 'Castración',
          diagnosis_text: 'Procedimiento exitoso',
          clinical_notes: 'Paciente toleró bien la anestesia. Sin complicaciones.',
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.record_type).toBe('surgery')

      ctx.track('medical_records', data.id)
    })

    test('creates emergency record', async () => {
      const { data, error } = await client
        .from('medical_records')
        .insert({
          pet_id: petId,
          tenant_id: DEFAULT_TENANT.id,
          vet_id: vetId,
          record_type: 'emergency',
          chief_complaint: 'Emergencia por intoxicación',
          diagnosis_text: 'Gastritis aguda',
          is_emergency: true,
          clinical_notes: 'Paciente en observación 24 horas.',
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.record_type).toBe('emergency')
      expect(data.is_emergency).toBe(true)

      ctx.track('medical_records', data.id)
    })

    test('creates follow-up record', async () => {
      const { data, error } = await client
        .from('medical_records')
        .insert({
          pet_id: petId,
          tenant_id: DEFAULT_TENANT.id,
          vet_id: vetId,
          record_type: 'follow_up',
          chief_complaint: 'Control post-cirugía',
          diagnosis_text: 'Recuperación satisfactoria',
          weight_kg: 26.0,
          temperature_celsius: 38.3,
          heart_rate_bpm: 75,
          respiratory_rate_rpm: 18,
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.record_type).toBe('follow_up')

      ctx.track('medical_records', data.id)
    })

    test('creates record with attachments', async () => {
      const { data, error } = await client
        .from('medical_records')
        .insert({
          pet_id: petId,
          tenant_id: DEFAULT_TENANT.id,
          vet_id: vetId,
          record_type: 'imaging',
          chief_complaint: 'Radiografía de Tórax',
          diagnosis_text: 'Sin alteraciones',
          attachments: [
            'https://storage.example.com/xray-001.jpg',
            'https://storage.example.com/xray-002.jpg',
          ],
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.attachments).toHaveLength(2)

      ctx.track('medical_records', data.id)
    })

    test('fails with invalid record type', async () => {
      const { error } = await client.from('medical_records').insert({
        pet_id: petId,
        tenant_id: DEFAULT_TENANT.id,
        record_type: 'invalid_type',
      })

      expect(error).not.toBeNull()
    })

    test('fails with non-existent pet', async () => {
      const { error } = await client.from('medical_records').insert({
        pet_id: '00000000-0000-0000-0000-999999999999',
        tenant_id: DEFAULT_TENANT.id,
        record_type: 'consultation',
      })

      expect(error).not.toBeNull()
    })
  })

  describe('READ', () => {
    let recordId: string

    beforeAll(async () => {
      const { data } = await client
        .from('medical_records')
        .insert({
          pet_id: petId,
          tenant_id: DEFAULT_TENANT.id,
          vet_id: vetId,
          record_type: 'consultation',
          chief_complaint: 'Read Test Record',
          diagnosis_text: 'Test diagnosis',
          weight_kg: 20,
          temperature_celsius: 38.5,
          heart_rate_bpm: 70,
          respiratory_rate_rpm: 15,
        })
        .select()
        .single()
      recordId = data.id
      ctx.track('medical_records', recordId)
    })

    test('reads record by ID', async () => {
      const { data, error } = await client
        .from('medical_records')
        .select('*')
        .eq('id', recordId)
        .single()

      expect(error).toBeNull()
      expect(data.chief_complaint).toBe('Read Test Record')
    })

    test('reads records by pet', async () => {
      const { data, error } = await client
        .from('medical_records')
        .select('*')
        .eq('pet_id', petId)
        .order('created_at', { ascending: false })

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data!.length).toBeGreaterThan(0)
    })

    test('reads record with vet details', async () => {
      const { data, error } = await client
        .from('medical_records')
        .select(
          `
          *,
          vet:profiles!medical_records_vet_id_fkey(id, full_name)
        `
        )
        .eq('id', recordId)
        .single()

      expect(error).toBeNull()
      expect(data.vet).toBeDefined()
      expect(data.vet.full_name).toBe('Dr. Medical Records')
    })

    test('filters records by type', async () => {
      const { data, error } = await client
        .from('medical_records')
        .select('*')
        .eq('pet_id', petId)
        .eq('record_type', 'consultation')

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data!.every((r: { record_type: string }) => r.record_type === 'consultation')).toBe(true)
    })

    test('filters records by date range', async () => {
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 1)

      const { data, error } = await client
        .from('medical_records')
        .select('*')
        .eq('pet_id', petId)
        .gte('created_at', startDate.toISOString())

      expect(error).toBeNull()
    })
  })

  describe('UPDATE', () => {
    let updateRecordId: string

    beforeAll(async () => {
      const { data } = await client
        .from('medical_records')
        .insert({
          pet_id: petId,
          tenant_id: DEFAULT_TENANT.id,
          vet_id: vetId,
          record_type: 'consultation',
          chief_complaint: 'Update Test Record',
        })
        .select()
        .single()
      updateRecordId = data.id
      ctx.track('medical_records', updateRecordId)
    })

    test('updates diagnosis', async () => {
      const { data, error } = await client
        .from('medical_records')
        .update({ diagnosis_text: 'Updated diagnosis' })
        .eq('id', updateRecordId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.diagnosis_text).toBe('Updated diagnosis')
    })

    test('updates notes', async () => {
      const { data, error } = await client
        .from('medical_records')
        .update({ clinical_notes: 'Updated notes with more details.' })
        .eq('id', updateRecordId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.clinical_notes).toBe('Updated notes with more details.')
    })

    test('updates vitals', async () => {
      const { data, error } = await client
        .from('medical_records')
        .update({
          weight_kg: 22,
          temperature_celsius: 38.0,
          heart_rate_bpm: 72,
          respiratory_rate_rpm: 16,
        })
        .eq('id', updateRecordId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.weight_kg).toBe(22)
      expect(data.temperature_celsius).toBe(38)
    })

    test('adds attachments', async () => {
      const { data, error } = await client
        .from('medical_records')
        .update({
          attachments: ['https://storage.example.com/new-attachment.jpg'],
        })
        .eq('id', updateRecordId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.attachments).toHaveLength(1)
    })
  })

  describe('DELETE', () => {
    test('deletes record by ID', async () => {
      const { data: created } = await client
        .from('medical_records')
        .insert({
          pet_id: petId,
          tenant_id: DEFAULT_TENANT.id,
          record_type: 'consultation',
          chief_complaint: 'To Delete',
        })
        .select()
        .single()

      const { error } = await client.from('medical_records').delete().eq('id', created.id)

      expect(error).toBeNull()

      const { data: found } = await client
        .from('medical_records')
        .select('*')
        .eq('id', created.id)
        .single()

      expect(found).toBeNull()
    })
  })

  describe('MEDICAL HISTORY TIMELINE', () => {
    test('gets complete medical history for pet', async () => {
      const { data, error } = await client
        .from('medical_records')
        .select(
          `
          *,
          vet:profiles!medical_records_vet_id_fkey(full_name)
        `
        )
        .eq('pet_id', petId)
        .order('created_at', { ascending: false })

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })

    test('calculates record statistics', async () => {
      const { data, error } = await client
        .from('medical_records')
        .select('record_type')
        .eq('pet_id', petId)

      expect(error).toBeNull()
      expect(data).not.toBeNull()

      const stats = data!.reduce((acc: Record<string, number>, record: { record_type: string }) => {
        acc[record.record_type] = (acc[record.record_type] || 0) + 1
        return acc
      }, {})

      expect(typeof stats).toBe('object')
    })
  })
})
