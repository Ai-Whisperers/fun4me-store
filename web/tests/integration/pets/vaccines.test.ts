/**
 * Integration Tests: Vaccine Management
 *
 * Tests vaccine CRUD operations and relationships with pets.
 * @tags integration, vaccines, pets, critical
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { getTestClient, TestContext, waitForDatabase } from '../../__helpers__/db'
import {
  createPet,
  createProfile,
  resetSequence,
  futureDate,
  pastDate,
} from '../../__helpers__/factories'
import { DEFAULT_TENANT } from '../../__fixtures__/tenants'
import { VACCINE_NAMES } from '../../__fixtures__/vaccines'

describe('Vaccine Management', () => {
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
    test('creates vaccine with required fields', async () => {
      const client = getTestClient({ serviceRole: true })

      const { data, error } = await client
        .from('vaccines')
        .insert({
          pet_id: testPetId,
          name: 'Rabia',
          status: 'scheduled',
          administered_date: pastDate(10),
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.name).toBe('Rabia')
      expect(data.status).toBe('scheduled')

      ctx.track('vaccines', data.id)
    })

    test('creates vaccine with all fields', async () => {
      const client = getTestClient({ serviceRole: true })
      const adminDate = pastDate(30)
      const nextDue = futureDate(335)

      const { data, error } = await client
        .from('vaccines')
        .insert({
          pet_id: testPetId,
          name: 'Sextuple',
          administered_date: adminDate,
          next_due_date: nextDue,
          batch_number: 'BATCH-001',
          status: 'completed',
          administered_by: testVetId,
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.name).toBe('Sextuple')
      expect(data.administered_date).toBe(adminDate)
      expect(data.next_due_date).toBe(nextDue)
      expect(data.batch_number).toBe('BATCH-001')
      expect(data.status).toBe('completed')
      expect(data.administered_by).toBe(testVetId)

      ctx.track('vaccines', data.id)
    })

    test('creates vaccines for all common vaccine types', async () => {
      const client = getTestClient({ serviceRole: true })

      for (const vaccineName of VACCINE_NAMES.dog.slice(0, 3)) {
        const { data, error } = await client
          .from('vaccines')
          .insert({
            pet_id: testPetId,
            name: vaccineName,
            status: 'scheduled',
            administered_date: pastDate(10),
          })
          .select()
          .single()

        expect(error).toBeNull()
        expect(data.name).toBe(vaccineName)
        ctx.track('vaccines', data.id)
      }
    })

    test('fails with invalid status', async () => {
      const client = getTestClient({ serviceRole: true })

      const { error } = await client.from('vaccines').insert({
        pet_id: testPetId,
        name: 'InvalidStatus',
        status: 'invalid_status', // Invalid
        administered_date: '2026-01-01',
      })

      expect(error).not.toBeNull()
    })

    test('fails when next_due_date is before administered_date', async () => {
      const client = getTestClient({ serviceRole: true })

      const { error } = await client.from('vaccines').insert({
        pet_id: testPetId,
        name: 'InvalidDates',
        administered_date: '2024-06-01',
        next_due_date: '2024-01-01', // Before administered
        status: 'scheduled',
      })

      expect(error).not.toBeNull()
    })

    test('fails with non-existent pet_id', async () => {
      const client = getTestClient({ serviceRole: true })

      const { error } = await client.from('vaccines').insert({
        pet_id: '00000000-0000-0000-0000-999999999999', // Non-existent
        name: 'OrphanVaccine',
        status: 'scheduled',
        administered_date: '2026-01-01',
      })

      expect(error).not.toBeNull()
    })
  })

  describe('READ', () => {
    let readTestVaccineId: string

    beforeAll(async () => {
      const client = getTestClient({ serviceRole: true })
      const { data } = await client
        .from('vaccines')
        .insert({
          pet_id: testPetId,
          name: 'ReadTestVaccine',
          administered_date: pastDate(60),
          next_due_date: futureDate(305),
          batch_number: 'READ-001',
          status: 'completed',
        })
        .select()
        .single()
      readTestVaccineId = data.id
      ctx.track('vaccines', readTestVaccineId)
    })

    test('reads vaccine by ID', async () => {
      const client = getTestClient({ serviceRole: true })

      const { data, error } = await client
        .from('vaccines')
        .select('*')
        .eq('id', readTestVaccineId)
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.name).toBe('ReadTestVaccine')
    })

    test('reads vaccines by pet', async () => {
      const client = getTestClient({ serviceRole: true })

      const { data, error } = await client.from('vaccines').select('*').eq('pet_id', testPetId)

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(Array.isArray(data)).toBe(true)
      expect(data).not.toBeNull()
      expect(data!.length).toBeGreaterThan(0)
    })

    test('reads vaccine with pet details (join)', async () => {
      const client = getTestClient({ serviceRole: true })

      const { data, error } = await client
        .from('vaccines')
        .select(
          `
          *,
          pet:pets(id, name, species)
        `
        )
        .eq('id', readTestVaccineId)
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.pet).toBeDefined()
      expect(data.pet.id).toBe(testPetId)
    })

    test('filters vaccines by status', async () => {
      const client = getTestClient({ serviceRole: true })

      const { data, error } = await client
        .from('vaccines')
        .select('*')
        .eq('pet_id', testPetId)
        .eq('status', 'completed')

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data).not.toBeNull()
      expect(data!.every((v: { status: string }) => v.status === 'completed')).toBe(true)
    })

    test('filters upcoming vaccines by due date', async () => {
      const client = getTestClient({ serviceRole: true })
      const thirtyDaysFromNow = futureDate(30)

      const { data, error } = await client
        .from('vaccines')
        .select('*')
        .eq('pet_id', testPetId)
        .lte('next_due_date', thirtyDaysFromNow)
        .gte('next_due_date', new Date().toISOString().split('T')[0])

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })
  })

  describe('UPDATE', () => {
    let updateTestVaccineId: string

    beforeAll(async () => {
      const client = getTestClient({ serviceRole: true })
      const { data } = await client
        .from('vaccines')
        .insert({
          pet_id: testPetId,
          name: 'UpdateTestVaccine',
          status: 'scheduled',
          administered_date: pastDate(10),
        })
        .select()
        .single()
      updateTestVaccineId = data.id
      ctx.track('vaccines', updateTestVaccineId)
    })

    test('updates vaccine status from scheduled to completed', async () => {
      const client = getTestClient({ serviceRole: true })

      const { data, error } = await client
        .from('vaccines')
        .update({ status: 'completed' })
        .eq('id', updateTestVaccineId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.status).toBe('completed')
    })

    test('updates vaccine dates', async () => {
      const client = getTestClient({ serviceRole: true })
      const newAdminDate = pastDate(10)
      const newDueDate = futureDate(355)

      const { data, error } = await client
        .from('vaccines')
        .update({
          administered_date: newAdminDate,
          next_due_date: newDueDate,
        })
        .eq('id', updateTestVaccineId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.administered_date).toBe(newAdminDate)
      expect(data.next_due_date).toBe(newDueDate)
    })

    test('updates administered_by (vet)', async () => {
      const client = getTestClient({ serviceRole: true })

      const { data, error } = await client
        .from('vaccines')
        .update({ administered_by: testVetId })
        .eq('id', updateTestVaccineId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.administered_by).toBe(testVetId)
    })

    test('updates batch number', async () => {
      const client = getTestClient({ serviceRole: true })

      const { data, error } = await client
        .from('vaccines')
        .update({ batch_number: 'UPDATED-BATCH-001' })
        .eq('id', updateTestVaccineId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.batch_number).toBe('UPDATED-BATCH-001')
    })

    test('fails to update to invalid status', async () => {
      const client = getTestClient({ serviceRole: true })

      const { error } = await client
        .from('vaccines')
        .update({ status: 'invalid' })
        .eq('id', updateTestVaccineId)

      expect(error).not.toBeNull()
    })
  })

  describe('DELETE', () => {
    test('deletes vaccine by ID', async () => {
      const client = getTestClient({ serviceRole: true })

      // Create vaccine to delete
      const { data: created } = await client
        .from('vaccines')
        .insert({
          pet_id: testPetId,
          name: 'ToDeleteVaccine',
          status: 'scheduled',
          administered_date: pastDate(5),
        })
        .select()
        .single()

      // Delete vaccine
      const { error: deleteError } = await client.from('vaccines').delete().eq('id', created.id)

      expect(deleteError).toBeNull()

      // Verify deleted
      const { data: found } = await client
        .from('vaccines')
        .select('*')
        .eq('id', created.id)
        .single()

      expect(found).toBeNull()
    })
  })

  describe('VACCINE REACTIONS', () => {
    let reactionTestVaccineId: string

    beforeAll(async () => {
      const client = getTestClient({ serviceRole: true })
      const { data } = await client
        .from('vaccines')
        .insert({
          pet_id: testPetId,
          name: 'ReactionTestVaccine',
          administered_date: pastDate(5),
          status: 'completed',
        })
        .select()
        .single()
      reactionTestVaccineId = data.id
      ctx.track('vaccines', reactionTestVaccineId)
    })

    test('creates vaccine reaction', async () => {
      const client = getTestClient({ serviceRole: true })

      const { data, error } = await client
        .from('vaccine_reactions')
        .insert({
          pet_id: testPetId,
          vaccine_id: reactionTestVaccineId,
          vaccine_name: 'ReactionTestVaccine',
          severity: 'low',
          notes: 'Mild swelling at injection site',
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.notes).toBe('Mild swelling at injection site')

      ctx.track('vaccine_reactions', data.id)
    })

    test('reads vaccine with reactions (join)', async () => {
      const client = getTestClient({ serviceRole: true })

      const { data, error } = await client
        .from('vaccines')
        .select(
          `
          *,
          reactions:vaccine_reactions(*)
        `
        )
        .eq('id', reactionTestVaccineId)
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.reactions).toBeDefined()
    })
  })
})
