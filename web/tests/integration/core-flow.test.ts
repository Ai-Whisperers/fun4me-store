/**
 * Core Flow Integration Tests
 *
 * Verifies the critical path for:
 * 1. Tenant/Clinic existence
 * 2. Owner registration (Profile creation)
 * 3. Pet creation and association
 * 4. Data persistence and mapping
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { getTestClient, cleanupTestData, seedTenants } from '@/tests/__helpers__/db'
import { createProfile, createPet, buildProfile, buildPet } from '@/tests/__helpers__/factories'
import { TENANT_IDS } from '@/lib/constants/tenants'

describe('Core Entity Flow', () => {
  // Track IDs for cleanup
  const cleanupIds: Record<string, string[]> = {
    profiles: [],
    pets: [],
  }

  const client = getTestClient({ serviceRole: true })

  beforeAll(async () => {
    // Ensure tenants exist
    await seedTenants()
  })

  afterAll(async () => {
    await cleanupTestData(cleanupIds)
  })

  describe('Clinic Setup', () => {
    test('verifies default clinic (terrapet) exists', async () => {
      // Use service role to verify data existence regardless of RLS
      const adminClient = getTestClient({ serviceRole: true })
      const { data, error } = await adminClient
        .from('tenants')
        .select('id, name')
        .eq('id', TENANT_IDS.ADRIS)
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data?.id).toBe(TENANT_IDS.ADRIS)
      expect(data?.name).toBe('Veterinaria Adris')
    })
  })

  describe('Owner Registration Mapping', () => {
    test('creates owner profile correctly mapped to tenant', async () => {
      const profileData = buildProfile({
        tenantId: TENANT_IDS.ADRIS,
        role: 'owner',
        fullName: 'Integration Test Owner',
      })

      // 1. Create Profile
      const profile = await createProfile(profileData)
      cleanupIds.profiles.push(profile.id)

      expect(profile.id).toBeDefined()
      expect(profile.tenantId).toBe('terrapet')
      expect(profile.role).toBe('owner')
      expect(profile.fullName).toBe(profileData.fullName)

      // 2. Verify persistence (Using Admin Client to bypass RLS)
      const adminClient = getTestClient({ serviceRole: true })
      const { data: storedProfile, error } = await adminClient
        .from('profiles')
        .select('*')
        .eq('id', profile.id)
        .single()

      expect(error).toBeNull()
      expect(storedProfile.tenant_id).toBe(TENANT_IDS.ADRIS)
      expect(storedProfile.full_name).toBe(profileData.fullName)
    })
  })

  describe('Pet Creation & Association', () => {
    test('creates pet with full fields mapped to owner and tenant', async () => {
      // 1. Setup Owner
      const owner = await createProfile({ tenantId: TENANT_IDS.ADRIS, role: 'owner' })
      cleanupIds.profiles.push(owner.id)

      // 2. Prepare Pet Data with ALL fields
      const petData = buildPet({
        ownerId: owner.id,
        tenantId: TENANT_IDS.ADRIS,
        name: 'CoreFlow Pet',
        species: 'dog',
        breed: 'Labrador',
        weightKg: 25.5,
        sex: 'female',
        isNeutered: true,
        microchipId: 'CHIP-123456789',
        dietCategory: 'balanced',
        dietNotes: 'Sensitive stomach',
        allergies: 'Chicken',
        existingConditions: 'Arthritis',
        notes: 'Very good girl',
      })

      // 3. Create Pet
      const pet = await createPet(petData)
      cleanupIds.pets.push(pet.id)

      // 4. Verify Object Return
      expect(pet.id).toBeDefined()
      expect(pet.ownerId).toBe(owner.id)
      expect(pet.tenantId).toBe('terrapet')
      expect(pet.microchipId).toBe('CHIP-123456789')

      // 5. Verify Persistence & Field Mapping (Using Admin Client)
      const adminClient = getTestClient({ serviceRole: true })
      const { data: storedPet, error } = await adminClient
        .from('pets')
        .select('*')
        .eq('id', pet.id)
        .single()

      expect(error).toBeNull()
      // Core Foreign Keys
      expect(storedPet.owner_id).toBe(owner.id)
      expect(storedPet.tenant_id).toBe(TENANT_IDS.ADRIS)

      // Core Identify Fields
      expect(storedPet.name).toBe('CoreFlow Pet')
      expect(storedPet.species).toBe('dog')

      // Expanded Fields
      expect(storedPet.weight_kg).toBe(25.5)
      expect(storedPet.microchip_number).toBe('CHIP-123456789')
      expect(storedPet.diet_category).toBe('balanced')
      expect(storedPet.diet_notes).toBe('Sensitive stomach')
      expect(storedPet.allergies).toContain('Chicken')
      expect(storedPet.existing_conditions).toContain('Arthritis')
    })

    test('enforces RLS: anon users cannot see pets', async () => {
      // 1. Setup Owner and Pet
      const ownerA = await createProfile({ tenantId: TENANT_IDS.ADRIS })
      cleanupIds.profiles.push(ownerA.id)

      const petA = await createPet({ ownerId: ownerA.id, tenantId: TENANT_IDS.ADRIS })
      cleanupIds.pets.push(petA.id)

      // 2. Verify Admin CAN see it
      const adminClient = getTestClient({ serviceRole: true })
      const { data: adminCheck } = await adminClient
        .from('pets')
        .select('id, owner_id')
        .eq('id', petA.id)
        .single()
      expect(adminCheck).toBeDefined()

      // 3. Verify Anon CANNOT see it
      const anonClient = getTestClient()
      const { data: anonCheck, error } = await anonClient
        .from('pets')
        .select('id, owner_id')
        .eq('id', petA.id)
        .single()

      // Expect error (PGRST116: JSON object requested, multiple (or no) rows returned)
      // Or just null data
      expect(anonCheck).toBeNull()
      expect(error).toBeDefined()
    })
  })
})
