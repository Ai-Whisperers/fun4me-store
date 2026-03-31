/**
 * Integration Tests: Pet CRUD Operations
 *
 * Tests the complete lifecycle of pet management through the database.
 * @tags integration, pets, critical
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { getTestClient, TestContext, waitForDatabase } from '../../__helpers__/db'
import { buildPet, createPet, createProfile, resetSequence } from '../../__helpers__/factories'
import { DEFAULT_TENANT } from '../../__fixtures__/tenants'
import { ALL_SPECIES } from '../../__fixtures__/pets'
import { TENANT_IDS } from '@/lib/constants/tenants';

describe('Pet CRUD Operations', () => {
  const ctx = new TestContext()
  let testOwnerId: string

  beforeAll(async () => {
    await waitForDatabase()

    // Create test owner for all pet tests
    const profile = await createProfile({
      tenantId: DEFAULT_TENANT.id,
      role: 'owner',
    })
    testOwnerId = profile.id
    ctx.track('profiles', testOwnerId)
  })

  afterAll(async () => {
    await ctx.cleanup()
  })

  beforeEach(() => {
    resetSequence()
  })

  describe('CREATE', () => {
    test('creates a pet with required fields only', async () => {
      const client = getTestClient({ serviceRole: true })

      const { data, error } = await client
        .from('pets')
        .insert({
          owner_id: testOwnerId,
          tenant_id: DEFAULT_TENANT.id,
          name: 'MinimalPet',
          species: 'dog',
          weight_kg: 5,
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.name).toBe('MinimalPet')
      expect(data.species).toBe('dog')

      // Cleanup
      ctx.track('pets', data.id)
    })

    test('creates a pet with all fields', async () => {
      const client = getTestClient({ serviceRole: true })
      const petData = buildPet({
        ownerId: testOwnerId,
        tenantId: DEFAULT_TENANT.id,
        name: 'FullPet',
        species: 'cat',
        breed: 'Persa',
        birthDate: '2022-06-15',
        weightKg: 4.5,
        sex: 'female',
        isNeutered: true,
        color: 'Blanco',
        temperament: 'friendly',
        existingConditions: 'None',
        allergies: ['None'],
        notes: 'Test notes',
      })

      const { data, error } = await client
        .from('pets')
        .insert({
          owner_id: petData.ownerId,
          tenant_id: petData.tenantId,
          name: petData.name,
          species: petData.species,
          breed: petData.breed,
          birth_date: petData.birthDate,
          weight_kg: petData.weightKg,
          sex: petData.sex,
          is_neutered: petData.isNeutered,
          color: petData.color,
          temperament: petData.temperament,
          existing_conditions: petData.existingConditions,
          allergies: petData.allergies,
          notes: petData.notes,
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.name).toBe('FullPet')
      expect(data.species).toBe('cat')
      expect(data.breed).toBe('Persa')
      expect(data.sex).toBe('female')
      expect(data.is_neutered).toBe(true)
      expect(data.temperament).toBe('friendly')

      ctx.track('pets', data.id)
    })

    test('fails when missing required field (name)', async () => {
      const client = getTestClient({ serviceRole: true })

      const { data, error } = await client
        .from('pets')
        .insert({
          owner_id: testOwnerId,
          tenant_id: DEFAULT_TENANT.id,
          species: 'dog',
          weight_kg: 10,
          // name is missing
        })
        .select()
        .single()

      expect(error).not.toBeNull()
      expect(data).toBeNull()
    })

    test('fails when missing required field (species)', async () => {
      const client = getTestClient({ serviceRole: true })

      const { data, error } = await client
        .from('pets')
        .insert({
          owner_id: testOwnerId,
          tenant_id: DEFAULT_TENANT.id,
          name: 'NoSpeciesPet',
          weight_kg: 10,
          // species is missing
        })
        .select()
        .single()

      expect(error).not.toBeNull()
      expect(data).toBeNull()
    })

    test('fails with invalid weight (negative)', async () => {
      const client = getTestClient({ serviceRole: true })

      const { data, error } = await client
        .from('pets')
        .insert({
          owner_id: testOwnerId,
          tenant_id: DEFAULT_TENANT.id,
          name: 'InvalidWeightPet',
          species: 'dog',
          weight_kg: -5, // Invalid
        })
        .select()
        .single()

      expect(error).not.toBeNull()
      expect(data).toBeNull()
    })

    test('fails with invalid owner_id (non-existent)', async () => {
      const client = getTestClient({ serviceRole: true })

      const { data, error } = await client
        .from('pets')
        .insert({
          owner_id: '00000000-0000-0000-0000-999999999999', // Non-existent
          tenant_id: DEFAULT_TENANT.id,
          name: 'OrphanPet',
          species: 'dog',
          weight_kg: 10,
        })
        .select()
        .single()

      expect(error).not.toBeNull()
      expect(data).toBeNull()
    })

    test('creates pets for all species types', async () => {
      const client = getTestClient({ serviceRole: true })

      for (const species of ALL_SPECIES) {
        const { data, error } = await client
          .from('pets')
          .insert({
            owner_id: testOwnerId,
            tenant_id: DEFAULT_TENANT.id,
            name: `${species}Pet`,
            species,
            weight_kg: 5,
          })
          .select()
          .single()

        expect(error).toBeNull()
        expect(data.species).toBe(species)
        ctx.track('pets', data.id)
      }
    })
  })

  describe('READ', () => {
    let readTestPetId: string

    beforeAll(async () => {
      const pet = await createPet({
        ownerId: testOwnerId,
        tenantId: DEFAULT_TENANT.id,
        name: 'ReadTestPet',
      })
      readTestPetId = pet.id
      ctx.track('pets', readTestPetId)
    })

    test('reads pet by ID', async () => {
      const client = getTestClient({ serviceRole: true })

      const { data, error } = await client.from('pets').select('*').eq('id', readTestPetId).single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.name).toBe('ReadTestPet')
    })

    test('reads pets by owner', async () => {
      const client = getTestClient({ serviceRole: true })

      const { data, error } = await client.from('pets').select('*').eq('owner_id', testOwnerId)

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(Array.isArray(data)).toBe(true)
      expect(data).not.toBeNull()
      expect(data!.length).toBeGreaterThan(0)
    })

    test('reads pets by tenant', async () => {
      const client = getTestClient({ serviceRole: true })

      const { data, error } = await client
        .from('pets')
        .select('*')
        .eq('tenant_id', DEFAULT_TENANT.id)

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(Array.isArray(data)).toBe(true)
    })

    test('reads pet with owner profile (join)', async () => {
      const client = getTestClient({ serviceRole: true })

      const { data, error } = await client
        .from('pets')
        .select(
          `
          *,
          owner:profiles!pets_owner_id_fkey(id, full_name, email)
        `
        )
        .eq('id', readTestPetId)
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.owner).toBeDefined()
    })

    test('returns null for non-existent pet', async () => {
      const client = getTestClient({ serviceRole: true })

      const { data, error } = await client
        .from('pets')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-999999999999')
        .single()

      // Supabase returns error for .single() when no rows found
      expect(data).toBeNull()
    })

    test('filters pets by species', async () => {
      const client = getTestClient({ serviceRole: true })

      const { data, error } = await client
        .from('pets')
        .select('*')
        .eq('tenant_id', DEFAULT_TENANT.id)
        .eq('species', 'dog')

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data).not.toBeNull()
      expect(data!.every((pet: { species: string }) => pet.species === 'dog')).toBe(true)
    })
  })

  describe('UPDATE', () => {
    let updateTestPetId: string

    beforeAll(async () => {
      const pet = await createPet({
        ownerId: testOwnerId,
        tenantId: DEFAULT_TENANT.id,
        name: 'UpdateTestPet',
        weightKg: 10,
      })
      updateTestPetId = pet.id
      ctx.track('pets', updateTestPetId)
    })

    test('updates pet name', async () => {
      const client = getTestClient({ serviceRole: true })

      const { data, error } = await client
        .from('pets')
        .update({ name: 'UpdatedName' })
        .eq('id', updateTestPetId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.name).toBe('UpdatedName')
    })

    test('updates pet weight', async () => {
      const client = getTestClient({ serviceRole: true })

      const { data, error } = await client
        .from('pets')
        .update({ weight_kg: 15.5 })
        .eq('id', updateTestPetId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.weight_kg).toBe(15.5)
    })

    test('updates multiple fields at once', async () => {
      const client = getTestClient({ serviceRole: true })

      const { data, error } = await client
        .from('pets')
        .update({
          breed: 'Updated Breed',
          color: 'Updated Color',
          temperament: 'shy',
          notes: 'Updated notes',
        })
        .eq('id', updateTestPetId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.breed).toBe('Updated Breed')
      expect(data.color).toBe('Updated Color')
      expect(data.temperament).toBe('shy')
      expect(data.notes).toBe('Updated notes')
    })

    test('updates updated_at timestamp automatically', async () => {
      const client = getTestClient({ serviceRole: true })

      const { data: before } = await client
        .from('pets')
        .select('updated_at')
        .eq('id', updateTestPetId)
        .single()

      // Wait a moment to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 100))

      const { data: after } = await client
        .from('pets')
        .update({ notes: 'Timestamp test' })
        .eq('id', updateTestPetId)
        .select('updated_at')
        .single()

      expect(before).not.toBeNull()
      expect(after).not.toBeNull()
      expect(new Date(after!.updated_at).getTime()).toBeGreaterThanOrEqual(
        new Date(before!.updated_at).getTime()
      )
    })

    test('fails to update with invalid weight', async () => {
      const client = getTestClient({ serviceRole: true })

      const { error } = await client
        .from('pets')
        .update({ weight_kg: -10 })
        .eq('id', updateTestPetId)

      expect(error).not.toBeNull()
    })
  })

  describe('DELETE', () => {
    test('deletes pet by ID', async () => {
      const client = getTestClient({ serviceRole: true })

      // Create pet to delete
      const { data: created } = await client
        .from('pets')
        .insert({
          owner_id: testOwnerId,
          tenant_id: DEFAULT_TENANT.id,
          name: 'ToDeletePet',
          species: 'dog',
          weight_kg: 10,
        })
        .select()
        .single()

      // Delete pet
      const { error: deleteError } = await client.from('pets').delete().eq('id', created.id)

      expect(deleteError).toBeNull()

      // Verify deleted
      const { data: found } = await client.from('pets').select('*').eq('id', created.id).single()

      expect(found).toBeNull()
    })

    test('cascades delete to vaccines', async () => {
      const client = getTestClient({ serviceRole: true })

      // Create pet with vaccine
      const { data: pet } = await client
        .from('pets')
        .insert({
          owner_id: testOwnerId,
          tenant_id: DEFAULT_TENANT.id,
          name: 'CascadeDeletePet',
          species: 'dog',
          weight_kg: 10,
        })
        .select()
        .single()

      const { data: vaccine } = await client
        .from('vaccines')
        .insert({
          pet_id: pet.id,
          name: 'Test Vaccine',
          status: 'scheduled',
          administered_date: '2026-01-01',
        })
        .select()
        .single()

      // Delete pet
      await client.from('pets').delete().eq('id', pet.id)

      // Verify vaccine is also deleted
      const { data: foundVaccine } = await client
        .from('vaccines')
        .select('*')
        .eq('id', vaccine.id)
        .single()

      expect(foundVaccine).toBeNull()
    })
  })

  describe('MULTI-TENANT ISOLATION', () => {
    let otherTenantOwnerId: string

    beforeAll(async () => {
      // Create owner in different tenant
      const profile = await createProfile({
        tenantId: 'petlife',
        role: 'owner',
      })
      otherTenantOwnerId = profile.id
      ctx.track('profiles', otherTenantOwnerId)
    })

    test('pets are isolated by tenant', async () => {
      const client = getTestClient({ serviceRole: true })

      // Create pet in terrapet
      const { data: terrapetPet } = await client
        .from('pets')
        .insert({
          owner_id: testOwnerId,
          tenant_id: TENANT_IDS.ADRIS,
          name: 'AdrisPet',
          species: 'dog',
          weight_kg: 10,
        })
        .select()
        .single()
      ctx.track('pets', terrapetPet.id)

      // Create pet in petlife
      const { data: petlifePet } = await client
        .from('pets')
        .insert({
          owner_id: otherTenantOwnerId,
          tenant_id: TENANT_IDS.PETLIFE,
          name: 'PetLifePet',
          species: 'cat',
          weight_kg: 5,
        })
        .select()
        .single()
      ctx.track('pets', petlifePet.id)

      // Query terrapet pets
      const { data: terrapetPets } = await client.from('pets').select('*').eq('tenant_id', TENANT_IDS.ADRIS)

      // Query petlife pets
      const { data: petlifePets } = await client.from('pets').select('*').eq('tenant_id', TENANT_IDS.PETLIFE)

      // Verify isolation
      expect(terrapetPets).not.toBeNull()
      expect(petlifePets).not.toBeNull()
      expect(terrapetPets!.some((p: { id: string }) => p.id === terrapetPet.id)).toBe(true)
      expect(terrapetPets!.some((p: { id: string }) => p.id === petlifePet.id)).toBe(false)
      expect(petlifePets!.some((p: { id: string }) => p.id === petlifePet.id)).toBe(true)
      expect(petlifePets!.some((p: { id: string }) => p.id === terrapetPet.id)).toBe(false)
    })
  })
})
