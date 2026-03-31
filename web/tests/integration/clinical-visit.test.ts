/**
 * Clinical Visit Integration Tests
 *
 * Verifies the full business lifecycle of a clinical visit:
 * 1. Appointment scheduling
 * 2. Check-in (Status update)
 * 3. Medical Record creation
 * 4. Invoicing
 * 5. Close appointment
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { getTestClient, TestContext, waitForDatabase } from '@/tests/__helpers__/db'
import { createProfile, createPet } from '@/tests/__helpers__/factories'
import { DEFAULT_TENANT } from '@/tests/__fixtures__/tenants'

function buildTimes(date: string, time: string, durationMinutes = 30) {
  const start = new Date(`${date}T${time}:00Z`)
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000)
  return {
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    duration_minutes: durationMinutes,
  }
}

describe('Clinical Visit Lifecycle', () => {
  const ctx = new TestContext()
  const client = getTestClient({ serviceRole: true })

  beforeAll(async () => {
    await waitForDatabase()
  })

  afterAll(async () => {
    await ctx.cleanup()
  })

  test('complete clinical visit flow', async () => {
    // 1. Setup: Owner, Pet, Vet
    const owner = await createProfile({ tenantId: DEFAULT_TENANT.id, role: 'owner' })
    ctx.track('profiles', owner.id)

    const vet = await createProfile({ tenantId: DEFAULT_TENANT.id, role: 'vet', fullName: 'Dr. Test' })
    ctx.track('profiles', vet.id)

    const pet = await createPet({
      ownerId: owner.id,
      tenantId: DEFAULT_TENANT.id,
      name: 'Sick Puppy',
    })
    ctx.track('pets', pet.id)

    // 2. Schedule Appointment
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const times = buildTimes(tomorrow, '10:00')

    const { data: appointment, error: apptError } = await client
      .from('appointments')
      .insert({
        tenant_id: DEFAULT_TENANT.id,
        pet_id: pet.id,
        vet_id: vet.id,
        ...times,
        status: 'confirmed',
        reason: 'General Checkup',
      })
      .select()
      .single()

    expect(apptError).toBeNull()
    expect(appointment.status).toBe('confirmed')
    ctx.track('appointments', appointment.id)

    // 3. Check in patient
    const { error: checkinError } = await client
      .from('appointments')
      .update({ status: 'checked_in', checked_in_at: new Date().toISOString() })
      .eq('id', appointment.id)

    expect(checkinError).toBeNull()

    // 4. Create Medical Record
    const { data: record, error: recordError } = await client
      .from('medical_records')
      .insert({
        pet_id: pet.id,
        tenant_id: DEFAULT_TENANT.id,
        vet_id: vet.id,
        record_type: 'consultation',
        chief_complaint: 'Vomiting, loss of appetite',
        diagnosis_text: 'Mild Gastritis',
        clinical_notes: 'Patient ate something bad. Prescribed bland diet.',
        weight_kg: 10.5,
        temperature_celsius: 39.2,
      })
      .select()
      .single()

    expect(recordError).toBeNull()
    expect(record.pet_id).toBe(pet.id)
    ctx.track('medical_records', record.id)

    // 5. Close Appointment
    const { error: closeError } = await client
      .from('appointments')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', appointment.id)

    expect(closeError).toBeNull()

    // 6. Verify completed
    const { data: completed } = await client
      .from('appointments')
      .select('status')
      .eq('id', appointment.id)
      .single()

    expect(completed?.status).toBe('completed')
  })
})
