/**
 * Functionality Tests: Pet Portal Features
 *
 * Tests pet management functionality from the user portal perspective.
 * @tags functionality, portal, pets, critical
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { getTestClient, TestContext, waitForDatabase } from '../../__helpers__/db'
import { createProfile, createPet, buildPet } from '../../__helpers__/factories'
import { DEFAULT_TENANT } from '../../__fixtures__/tenants'
import { ALL_SPECIES, ALL_TEMPERAMENTS } from '../../__fixtures__/pets'

describe('Pet Portal Functionality', () => {
  const ctx = new TestContext()
  let client: ReturnType<typeof getTestClient>
  let ownerId: string

  beforeAll(async () => {
    await waitForDatabase()
    client = getTestClient()

    const owner = await createProfile({
      tenantId: DEFAULT_TENANT.id,
      role: 'owner',
    })
    ownerId = owner.id
    ctx.track('profiles', ownerId)
  })

  afterAll(async () => {
    await ctx.cleanup()
  })

  describe('Pet Registration', () => {
    test('registers pet with minimal information', async () => {
      const { data, error } = await client
        .from('pets')
        .insert({
          owner_id: ownerId,
          tenant_id: DEFAULT_TENANT.id,
          name: 'Simple Pet',
          species: 'dog',
          weight_kg: 10,
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data!.name).toBe('Simple Pet')
      ctx.track('pets', data!.id)
    })

    test('registers pet with complete profile', async () => {
      const petData = buildPet({
        ownerId,
        tenantId: DEFAULT_TENANT.id,
        name: 'Complete Pet',
        species: 'cat',
        breed: 'Siames',
        birthDate: '2021-05-15',
        weightKg: 4.5,
        sex: 'female',
        isNeutered: true,
        color: 'Crema',
        temperament: 'friendly',
        existingConditions: 'Ninguna',
        allergies: 'Pollo',
        notes: 'Le gusta esconderse',
        dietCategory: 'Premium',
        dietNotes: 'Solo comida húmeda',
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
          diet_category: petData.dietCategory,
          diet_notes: petData.dietNotes,
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data!.name).toBe('Complete Pet')
      expect(data!.breed).toBe('Siames')
      expect(data!.allergies).toBe('Pollo')
      ctx.track('pets', data!.id)
    })

    test('supports all pet species', async () => {
      for (const species of ALL_SPECIES) {
        const { data, error } = await client
          .from('pets')
          .insert({
            owner_id: ownerId,
            tenant_id: DEFAULT_TENANT.id,
            name: `${species.charAt(0).toUpperCase()}${species.slice(1)} Pet`,
            species,
            weight_kg: 5,
          })
          .select()
          .single()

        expect(error).toBeNull()
        expect(data).not.toBeNull()
        expect(data!.species).toBe(species)
        ctx.track('pets', data!.id)
      }
    })

    test('supports all temperament types', async () => {
      for (const temperament of ALL_TEMPERAMENTS) {
        const { data, error } = await client
          .from('pets')
          .insert({
            owner_id: ownerId,
            tenant_id: DEFAULT_TENANT.id,
            name: `${temperament} Pet`,
            species: 'dog',
            weight_kg: 10,
            temperament,
          })
          .select()
          .single()

        expect(error).toBeNull()
        expect(data).not.toBeNull()
        expect(data!.temperament).toBe(temperament)
        ctx.track('pets', data!.id)
      }
    })
  })

  describe('Pet Profile Updates', () => {
    let testPetId: string

    beforeAll(async () => {
      const pet = await createPet({
        ownerId,
        tenantId: DEFAULT_TENANT.id,
        name: 'Update Test Pet',
        weightKg: 15,
      })
      testPetId = pet.id
      ctx.track('pets', testPetId)
    })

    test('updates basic information', async () => {
      const { data, error } = await client
        .from('pets')
        .update({
          name: 'Updated Name',
          breed: 'Updated Breed',
        })
        .eq('id', testPetId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data!.name).toBe('Updated Name')
      expect(data!.breed).toBe('Updated Breed')
    })

    test('updates weight tracking', async () => {
      const { data, error } = await client
        .from('pets')
        .update({ weight_kg: 16.5 })
        .eq('id', testPetId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data!.weight_kg).toBe(16.5)
    })

    test('updates medical notes', async () => {
      const { data, error } = await client
        .from('pets')
        .update({
          existing_conditions: 'Displasia de cadera leve',
          allergies: 'Polen, Pollo',
          notes: 'Requiere paseos cortos',
        })
        .eq('id', testPetId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data!.existing_conditions).toBe('Displasia de cadera leve')
      expect(data!.allergies).toBe('Polen, Pollo')
    })

    test('updates diet information', async () => {
      const { data, error } = await client
        .from('pets')
        .update({
          diet_category: 'Hipoalergénica',
          diet_notes: 'Sin pollo ni trigo. Solo cordero y arroz.',
        })
        .eq('id', testPetId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data!.diet_category).toBe('Hipoalergénica')
    })
  })

  describe('Pet Listing and Filtering', () => {
    beforeAll(async () => {
      // Create pets with different characteristics
      const pets = [
        { name: 'Filter Dog 1', species: 'dog', breed: 'Labrador' },
        { name: 'Filter Dog 2', species: 'dog', breed: 'Poodle' },
        { name: 'Filter Cat 1', species: 'cat', breed: 'Persa' },
        { name: 'Filter Cat 2', species: 'cat', breed: 'Siames' },
      ]

      for (const pet of pets) {
        const { data } = await client
          .from('pets')
          .insert({
            owner_id: ownerId,
            tenant_id: DEFAULT_TENANT.id,
            name: pet.name,
            species: pet.species,
            breed: pet.breed,
            weight_kg: 10,
          })
          .select()
          .single()
        if (data) ctx.track('pets', data.id)
      }
    })

    test('lists all pets for owner', async () => {
      const { data, error } = await client.from('pets').select('*').eq('owner_id', ownerId)

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data!.length).toBeGreaterThanOrEqual(4)
    })

    test('filters pets by species', async () => {
      const { data, error } = await client
        .from('pets')
        .select('*')
        .eq('owner_id', ownerId)
        .eq('species', 'dog')

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data!.every((p: { species: string }) => p.species === 'dog')).toBe(true)
    })

    test('searches pets by name', async () => {
      const { data, error } = await client
        .from('pets')
        .select('*')
        .eq('owner_id', ownerId)
        .ilike('name', '%Filter%')

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data!.length).toBeGreaterThanOrEqual(4)
    })

    test('orders pets by name', async () => {
      const { data, error } = await client
        .from('pets')
        .select('*')
        .eq('owner_id', ownerId)
        .order('name', { ascending: true })

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      // Verify alphabetical order
      for (let i = 1; i < data!.length; i++) {
        expect(data![i].name >= data![i - 1].name).toBe(true)
      }
    })
  })

  describe('Pet Age Calculation', () => {
    test('calculates age from birth date', () => {
      const calculateAge = (birthDate: string): { years: number; months: number } => {
        const birth = new Date(birthDate)
        const now = new Date()

        let years = now.getFullYear() - birth.getFullYear()
        let months = now.getMonth() - birth.getMonth()

        if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
          years--
          months += 12
        }

        return { years, months }
      }

      // Test with known date
      const twoYearsAgo = new Date()
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
      const age = calculateAge(twoYearsAgo.toISOString().split('T')[0])

      expect(age.years).toBe(2)
      expect(age.months).toBe(0)
    })
  })

  describe('Data Validation', () => {
    test('rejects negative weight', async () => {
      const { error } = await client.from('pets').insert({
        owner_id: ownerId,
        tenant_id: DEFAULT_TENANT.id,
        name: 'Negative Weight Pet',
        species: 'dog',
        weight_kg: -5,
      })

      expect(error).not.toBeNull()
    })

    test('rejects empty name', async () => {
      const { error } = await client.from('pets').insert({
        owner_id: ownerId,
        tenant_id: DEFAULT_TENANT.id,
        name: '',
        species: 'dog',
        weight_kg: 10,
      })

      expect(error).not.toBeNull()
    })

    test('accepts valid microchip format', async () => {
      const { data, error } = await client
        .from('pets')
        .insert({
          owner_id: ownerId,
          tenant_id: DEFAULT_TENANT.id,
          name: 'Microchip Pet',
          species: 'dog',
          weight_kg: 10,
          microchip_number: '985121004567890',
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data!.microchip_number).toBe('985121004567890')
      ctx.track('pets', data!.id)
    })
  })
})
