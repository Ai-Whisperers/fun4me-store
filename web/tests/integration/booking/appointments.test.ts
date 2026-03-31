/**
 * Integration Tests: Appointment Booking
 *
 * Tests appointment CRUD operations and booking workflows.
 * @tags integration, booking, appointments, critical
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { getTestClient, TestContext, waitForDatabase } from '../../__helpers__/db'
import {
  createPet,
  createProfile,
  resetSequence,
  futureDate,
} from '../../__helpers__/factories'
import { DEFAULT_TENANT } from '../../__fixtures__/tenants'
import { TENANT_IDS } from '@/lib/constants/tenants'

/**
 * Helper to build appointment start_time, end_time, duration_minutes
 * from a date string, time string, and duration in minutes.
 */
function buildAppointmentTimes(date: string, time: string, durationMinutes = 30) {
  const start = new Date(`${date}T${time}:00Z`)
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000)
  return {
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    duration_minutes: durationMinutes,
  }
}

describe('Appointment Booking', () => {
  const ctx = new TestContext()
  let testOwnerId: string
  let testPetId: string
  let testVetId: string

  beforeAll(async () => {
    await waitForDatabase()

    // Create test owner
    const owner = await createProfile({
      tenantId: DEFAULT_TENANT.id,
      role: 'owner',
    })
    testOwnerId = owner.id
    ctx.track('profiles', testOwnerId)

    // Create test vet
    const vet = await createProfile({
      tenantId: DEFAULT_TENANT.id,
      role: 'vet',
    })
    testVetId = vet.id
    ctx.track('profiles', testVetId)

    // Create test pet
    const pet = await createPet({
      ownerId: testOwnerId,
      tenantId: DEFAULT_TENANT.id,
    })
    testPetId = pet.id
    ctx.track('pets', testPetId)
  })

  afterAll(async () => {
    await ctx.cleanup()
  })

  beforeEach(() => {
    resetSequence()
  })

  describe('CREATE', () => {
    test('creates appointment with required fields', async () => {
      const client = getTestClient({ serviceRole: true })
      const times = buildAppointmentTimes(futureDate(7), '10:00')

      const { data, error } = await client
        .from('appointments')
        .insert({
          tenant_id: DEFAULT_TENANT.id,
          pet_id: testPetId,
          ...times,
          status: 'scheduled',
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.status).toBe('scheduled')
      expect(data.duration_minutes).toBe(30)

      ctx.track('appointments', data.id)
    })

    test('creates appointment with all fields', async () => {
      const client = getTestClient({ serviceRole: true })
      const times = buildAppointmentTimes(futureDate(14), '09:30', 30)

      const { data, error } = await client
        .from('appointments')
        .insert({
          tenant_id: DEFAULT_TENANT.id,
          pet_id: testPetId,
          vet_id: testVetId,
          ...times,
          status: 'confirmed',
          reason: 'Vacuna antirrábica anual',
          notes: 'Traer cartilla de vacunación',
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.status).toBe('confirmed')
      expect(data.vet_id).toBe(testVetId)
      expect(data.reason).toBe('Vacuna antirrábica anual')

      ctx.track('appointments', data.id)
    })

    test('creates appointments with different durations', async () => {
      const client = getTestClient({ serviceRole: true })
      const durations = [15, 30, 45, 60]

      for (const dur of durations) {
        const times = buildAppointmentTimes(
          futureDate(Math.floor(Math.random() * 30) + 1),
          '10:00',
          dur,
        )
        const { data, error } = await client
          .from('appointments')
          .insert({
            tenant_id: DEFAULT_TENANT.id,
            pet_id: testPetId,
            ...times,
            status: 'scheduled',
          })
          .select()
          .single()

        expect(error).toBeNull()
        expect(data.duration_minutes).toBe(dur)
        ctx.track('appointments', data.id)
      }
    })

    test('fails with invalid status', async () => {
      const client = getTestClient({ serviceRole: true })
      const times = buildAppointmentTimes(futureDate(7), '10:00')

      const { error } = await client.from('appointments').insert({
        tenant_id: DEFAULT_TENANT.id,
        pet_id: testPetId,
        ...times,
        status: 'invalid_status',
      })

      expect(error).not.toBeNull()
    })

    test('fails with end_time before start_time', async () => {
      const client = getTestClient({ serviceRole: true })
      const start = new Date(`${futureDate(7)}T10:00:00Z`)
      const end = new Date(start.getTime() - 30 * 60 * 1000) // 30 min BEFORE start

      const { error } = await client.from('appointments').insert({
        tenant_id: DEFAULT_TENANT.id,
        pet_id: testPetId,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        duration_minutes: 30,
        status: 'scheduled',
      })

      expect(error).not.toBeNull()
    })

    test('fails with non-existent pet_id', async () => {
      const client = getTestClient({ serviceRole: true })
      const times = buildAppointmentTimes(futureDate(7), '10:00')

      const { error } = await client.from('appointments').insert({
        tenant_id: DEFAULT_TENANT.id,
        pet_id: '00000000-0000-0000-0000-999999999999',
        ...times,
        status: 'scheduled',
      })

      expect(error).not.toBeNull()
    })
  })

  describe('READ', () => {
    let readTestAppointmentId: string

    beforeAll(async () => {
      const client = getTestClient({ serviceRole: true })
      const times = buildAppointmentTimes(futureDate(21), '11:00')
      const { data } = await client
        .from('appointments')
        .insert({
          tenant_id: DEFAULT_TENANT.id,
          pet_id: testPetId,
          vet_id: testVetId,
          ...times,
          status: 'confirmed',
          reason: 'Read test appointment',
        })
        .select()
        .single()
      readTestAppointmentId = data.id
      ctx.track('appointments', readTestAppointmentId)
    })

    test('reads appointment by ID', async () => {
      const client = getTestClient({ serviceRole: true })

      const { data, error } = await client
        .from('appointments')
        .select('*')
        .eq('id', readTestAppointmentId)
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.reason).toBe('Read test appointment')
    })

    test('reads appointments by pet', async () => {
      const client = getTestClient({ serviceRole: true })

      const { data, error } = await client.from('appointments').select('*').eq('pet_id', testPetId)

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(Array.isArray(data)).toBe(true)
      expect(data!.length).toBeGreaterThan(0)
    })

    test('reads appointments by vet', async () => {
      const client = getTestClient({ serviceRole: true })

      const { data, error } = await client.from('appointments').select('*').eq('vet_id', testVetId)

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data).not.toBeNull()
      expect(data!.every((a: { vet_id: string }) => a.vet_id === testVetId)).toBe(true)
    })

    test('reads appointment with pet details (join)', async () => {
      const client = getTestClient({ serviceRole: true })

      const { data, error } = await client
        .from('appointments')
        .select(
          `
          *,
          pet:pets!appointments_pet_id_fkey(id, name, species)
        `
        )
        .eq('id', readTestAppointmentId)
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.pet).toBeDefined()
    })

    test('filters appointments by status', async () => {
      const client = getTestClient({ serviceRole: true })

      const { data, error } = await client
        .from('appointments')
        .select('*')
        .eq('tenant_id', DEFAULT_TENANT.id)
        .eq('status', 'confirmed')

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data!.every((a: { status: string }) => a.status === 'confirmed')).toBe(true)
    })

    test('filters appointments by date range', async () => {
      const client = getTestClient({ serviceRole: true })
      const startDate = new Date().toISOString()
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      const { data, error } = await client
        .from('appointments')
        .select('*')
        .eq('tenant_id', DEFAULT_TENANT.id)
        .gte('start_time', startDate)
        .lte('start_time', endDate)

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    test('orders appointments by start_time', async () => {
      const client = getTestClient({ serviceRole: true })

      const { data, error } = await client
        .from('appointments')
        .select('*')
        .eq('tenant_id', DEFAULT_TENANT.id)
        .order('start_time', { ascending: true })

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })
  })

  describe('UPDATE', () => {
    let updateTestAppointmentId: string

    beforeAll(async () => {
      const client = getTestClient({ serviceRole: true })
      const times = buildAppointmentTimes(futureDate(10), '14:00')
      const { data } = await client
        .from('appointments')
        .insert({
          tenant_id: DEFAULT_TENANT.id,
          pet_id: testPetId,
          ...times,
          status: 'scheduled',
        })
        .select()
        .single()
      updateTestAppointmentId = data.id
      ctx.track('appointments', updateTestAppointmentId)
    })

    test('updates appointment status from scheduled to confirmed', async () => {
      const client = getTestClient({ serviceRole: true })

      const { data, error } = await client
        .from('appointments')
        .update({ status: 'confirmed' })
        .eq('id', updateTestAppointmentId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.status).toBe('confirmed')
    })

    test('assigns vet to appointment', async () => {
      const client = getTestClient({ serviceRole: true })

      const { data, error } = await client
        .from('appointments')
        .update({ vet_id: testVetId })
        .eq('id', updateTestAppointmentId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.vet_id).toBe(testVetId)
    })

    test('reschedules appointment', async () => {
      const client = getTestClient({ serviceRole: true })
      const newTimes = buildAppointmentTimes(futureDate(15), '16:00')

      const { data, error } = await client
        .from('appointments')
        .update(newTimes)
        .eq('id', updateTestAppointmentId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.duration_minutes).toBe(30)
    })

    test('adds notes to appointment', async () => {
      const client = getTestClient({ serviceRole: true })

      const { data, error } = await client
        .from('appointments')
        .update({ notes: 'Paciente con alergia a penicilina' })
        .eq('id', updateTestAppointmentId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.notes).toBe('Paciente con alergia a penicilina')
    })

    test('cancels appointment', async () => {
      const client = getTestClient({ serviceRole: true })

      const { data, error } = await client
        .from('appointments')
        .update({
          status: 'cancelled',
          cancellation_reason: 'Cancelado por cliente',
        })
        .eq('id', updateTestAppointmentId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.status).toBe('cancelled')
    })

    test('completes appointment', async () => {
      const client = getTestClient({ serviceRole: true })
      const times = buildAppointmentTimes(futureDate(1), '10:00')

      // Create a confirmed appointment
      const { data: newAppt } = await client
        .from('appointments')
        .insert({
          tenant_id: DEFAULT_TENANT.id,
          pet_id: testPetId,
          vet_id: testVetId,
          ...times,
          status: 'confirmed',
        })
        .select()
        .single()
      ctx.track('appointments', newAppt.id)

      // Complete it
      const { data, error } = await client
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', newAppt.id)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.status).toBe('completed')
    })
  })

  describe('DELETE', () => {
    test('deletes appointment by ID', async () => {
      const client = getTestClient({ serviceRole: true })
      const times = buildAppointmentTimes(futureDate(5), '09:00')

      // Create appointment to delete
      const { data: created } = await client
        .from('appointments')
        .insert({
          tenant_id: DEFAULT_TENANT.id,
          pet_id: testPetId,
          ...times,
          status: 'scheduled',
        })
        .select()
        .single()

      // Delete appointment
      const { error: deleteError } = await client.from('appointments').delete().eq('id', created.id)

      expect(deleteError).toBeNull()

      // Verify deleted
      const { data: found } = await client
        .from('appointments')
        .select('*')
        .eq('id', created.id)
        .single()

      expect(found).toBeNull()
    })
  })

  describe('SCHEDULING CONFLICTS', () => {
    test('allows multiple appointments at same time for different vets', async () => {
      const client = getTestClient({ serviceRole: true })
      const times = buildAppointmentTimes(futureDate(25), '10:00')

      // Create another vet
      const vet2 = await createProfile({
        tenantId: DEFAULT_TENANT.id,
        role: 'vet',
      })
      ctx.track('profiles', vet2.id)

      // Create appointment for vet 1
      const { data: appt1, error: error1 } = await client
        .from('appointments')
        .insert({
          tenant_id: DEFAULT_TENANT.id,
          pet_id: testPetId,
          vet_id: testVetId,
          ...times,
          status: 'confirmed',
        })
        .select()
        .single()

      expect(error1).toBeNull()
      ctx.track('appointments', appt1.id)

      // Create another pet for the second appointment
      const pet2 = await createPet({
        ownerId: testOwnerId,
        tenantId: DEFAULT_TENANT.id,
      })
      ctx.track('pets', pet2.id)

      // Create appointment for vet 2 at same time (should succeed)
      const { data: appt2, error: error2 } = await client
        .from('appointments')
        .insert({
          tenant_id: DEFAULT_TENANT.id,
          pet_id: pet2.id,
          vet_id: vet2.id,
          ...times,
          status: 'confirmed',
        })
        .select()
        .single()

      expect(error2).toBeNull()
      ctx.track('appointments', appt2.id)
    })
  })

  describe('MULTI-TENANT ISOLATION', () => {
    test('appointments are isolated by tenant', async () => {
      const client = getTestClient({ serviceRole: true })

      // Create profile in petlife
      const petlifeOwner = await createProfile({
        tenantId: 'petlife',
        role: 'owner',
      })
      ctx.track('profiles', petlifeOwner.id)

      // Create pet in petlife
      const petlifePet = await createPet({
        ownerId: petlifeOwner.id,
        tenantId: 'petlife',
      })
      ctx.track('pets', petlifePet.id)

      // Create appointment in terrapet
      const terrapetTimes = buildAppointmentTimes(futureDate(30), '10:00')
      const { data: terrapetAppt } = await client
        .from('appointments')
        .insert({
          tenant_id: TENANT_IDS.ADRIS,
          pet_id: testPetId,
          ...terrapetTimes,
          status: 'scheduled',
        })
        .select()
        .single()
      ctx.track('appointments', terrapetAppt.id)

      // Create appointment in petlife
      const petlifeTimes = buildAppointmentTimes(futureDate(30), '11:00')
      const { data: petlifeAppt } = await client
        .from('appointments')
        .insert({
          tenant_id: TENANT_IDS.PETLIFE,
          pet_id: petlifePet.id,
          ...petlifeTimes,
          status: 'scheduled',
        })
        .select()
        .single()
      ctx.track('appointments', petlifeAppt.id)

      // Query terrapet appointments
      const { data: terrapetAppts } = await client
        .from('appointments')
        .select('*')
        .eq('tenant_id', TENANT_IDS.ADRIS)

      // Query petlife appointments
      const { data: petlifeAppts } = await client
        .from('appointments')
        .select('*')
        .eq('tenant_id', TENANT_IDS.PETLIFE)

      // Verify isolation
      expect(terrapetAppts).not.toBeNull()
      expect(petlifeAppts).not.toBeNull()
      expect(terrapetAppts!.some((a: { id: string }) => a.id === terrapetAppt.id)).toBe(true)
      expect(terrapetAppts!.some((a: { id: string }) => a.id === petlifeAppt.id)).toBe(false)
      expect(petlifeAppts!.some((a: { id: string }) => a.id === petlifeAppt.id)).toBe(true)
      expect(petlifeAppts!.some((a: { id: string }) => a.id === terrapetAppt.id)).toBe(false)
    })
  })
})
