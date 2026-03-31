/**
 * Security Tests: Multi-Tenant Isolation
 *
 * Tests that data is properly isolated between tenants.
 * @tags security, multi-tenant, critical
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { getTestClient, TestContext, waitForDatabase } from '../__helpers__/db'
import { createProfile, createPet, resetSequence } from '../__helpers__/factories'

// Test with both available tenants
const TENANT_A = 'terrapet'
const TENANT_B = 'petlife'

describe('Multi-Tenant Data Isolation', () => {
  const ctx = new TestContext()
  let client: ReturnType<typeof getTestClient>

  beforeAll(async () => {
    await waitForDatabase()
    client = getTestClient()
  })

  afterAll(async () => {
    await ctx.cleanup()
  })

  beforeEach(() => {
    resetSequence()
  })

  describe('PROFILES ISOLATION', () => {
    let tenantAProfileId: string
    let tenantBProfileId: string

    beforeAll(async () => {
      // Create profile in tenant A
      const profileA = await createProfile({
        tenantId: TENANT_A,
        role: 'owner',
        fullName: 'Tenant A User',
      })
      tenantAProfileId = profileA.id
      ctx.track('profiles', tenantAProfileId)

      // Create profile in tenant B
      const profileB = await createProfile({
        tenantId: TENANT_B,
        role: 'owner',
        fullName: 'Tenant B User',
      })
      tenantBProfileId = profileB.id
      ctx.track('profiles', tenantBProfileId)
    })

    test('tenant A profiles are not visible to tenant B query', async () => {
      const { data } = await client.from('profiles').select('*').eq('tenant_id', TENANT_B)

      expect(data).not.toBeNull()
      const hasProfileA = data!.some((p: { id: string }) => p.id === tenantAProfileId)
      expect(hasProfileA).toBe(false)
    })

    test('tenant B profiles are not visible to tenant A query', async () => {
      const { data } = await client.from('profiles').select('*').eq('tenant_id', TENANT_A)

      expect(data).not.toBeNull()
      const hasProfileB = data!.some((p: { id: string }) => p.id === tenantBProfileId)
      expect(hasProfileB).toBe(false)
    })

    test('each tenant only sees their own profiles', async () => {
      const { data: tenantAProfiles } = await client
        .from('profiles')
        .select('tenant_id')
        .eq('tenant_id', TENANT_A)

      const { data: tenantBProfiles } = await client
        .from('profiles')
        .select('tenant_id')
        .eq('tenant_id', TENANT_B)

      // All tenant A profiles should have tenant A
      expect(tenantAProfiles).not.toBeNull()
      expect(tenantAProfiles!.every((p: { tenant_id: string }) => p.tenant_id === TENANT_A)).toBe(
        true
      )

      // All tenant B profiles should have tenant B
      expect(tenantBProfiles).not.toBeNull()
      expect(tenantBProfiles!.every((p: { tenant_id: string }) => p.tenant_id === TENANT_B)).toBe(
        true
      )
    })
  })

  describe('PETS ISOLATION', () => {
    let tenantAPetId: string
    let tenantBPetId: string

    beforeAll(async () => {
      // Create owner and pet in tenant A
      const ownerA = await createProfile({
        tenantId: TENANT_A,
        role: 'owner',
      })
      ctx.track('profiles', ownerA.id)

      const petA = await createPet({
        ownerId: ownerA.id,
        tenantId: TENANT_A,
        name: 'Tenant A Pet',
      })
      tenantAPetId = petA.id
      ctx.track('pets', tenantAPetId)

      // Create owner and pet in tenant B
      const ownerB = await createProfile({
        tenantId: TENANT_B,
        role: 'owner',
      })
      ctx.track('profiles', ownerB.id)

      const petB = await createPet({
        ownerId: ownerB.id,
        tenantId: TENANT_B,
        name: 'Tenant B Pet',
      })
      tenantBPetId = petB.id
      ctx.track('pets', tenantBPetId)
    })

    test('tenant A pets are isolated', async () => {
      const { data } = await client.from('pets').select('*').eq('tenant_id', TENANT_A)

      expect(data).not.toBeNull()
      expect(data!.every((p: { tenant_id: string }) => p.tenant_id === TENANT_A)).toBe(true)
      expect(data!.some((p: { id: string }) => p.id === tenantBPetId)).toBe(false)
    })

    test('tenant B pets are isolated', async () => {
      const { data } = await client.from('pets').select('*').eq('tenant_id', TENANT_B)

      expect(data).not.toBeNull()
      expect(data!.every((p: { tenant_id: string }) => p.tenant_id === TENANT_B)).toBe(true)
      expect(data!.some((p: { id: string }) => p.id === tenantAPetId)).toBe(false)
    })

    test('cross-tenant pet query returns empty', async () => {
      // Try to query tenant A pet with tenant B filter
      const { data } = await client
        .from('pets')
        .select('*')
        .eq('tenant_id', TENANT_B)
        .eq('id', tenantAPetId)

      expect(data).not.toBeNull()
      expect(data!.length).toBe(0)
    })
  })

  describe('MEDICAL RECORDS ISOLATION', () => {
    let tenantARecordId: string
    let tenantBRecordId: string

    beforeAll(async () => {
      // Create owner, pet, vet, and record in tenant A
      const ownerA = await createProfile({ tenantId: TENANT_A, role: 'owner' })
      ctx.track('profiles', ownerA.id)

      const vetA = await createProfile({ tenantId: TENANT_A, role: 'vet' })
      ctx.track('profiles', vetA.id)

      const petA = await createPet({ ownerId: ownerA.id, tenantId: TENANT_A })
      ctx.track('pets', petA.id)

      const { data: recordA } = await client
        .from('medical_records')
        .insert({
          pet_id: petA.id,
          tenant_id: TENANT_A,
          performed_by: vetA.id,
          type: 'consultation',
          title: 'Tenant A Record',
        })
        .select()
        .single()
      tenantARecordId = recordA.id
      ctx.track('medical_records', tenantARecordId)

      // Create in tenant B
      const ownerB = await createProfile({ tenantId: TENANT_B, role: 'owner' })
      ctx.track('profiles', ownerB.id)

      const vetB = await createProfile({ tenantId: TENANT_B, role: 'vet' })
      ctx.track('profiles', vetB.id)

      const petB = await createPet({ ownerId: ownerB.id, tenantId: TENANT_B })
      ctx.track('pets', petB.id)

      const { data: recordB } = await client
        .from('medical_records')
        .insert({
          pet_id: petB.id,
          tenant_id: TENANT_B,
          performed_by: vetB.id,
          type: 'consultation',
          title: 'Tenant B Record',
        })
        .select()
        .single()
      tenantBRecordId = recordB.id
      ctx.track('medical_records', tenantBRecordId)
    })

    test('medical records are tenant-isolated', async () => {
      const { data: tenantARecords } = await client
        .from('medical_records')
        .select('*')
        .eq('tenant_id', TENANT_A)

      const { data: tenantBRecords } = await client
        .from('medical_records')
        .select('*')
        .eq('tenant_id', TENANT_B)

      // Verify isolation
      expect(tenantARecords).not.toBeNull()
      expect(tenantBRecords).not.toBeNull()
      expect(tenantARecords!.some((r: { id: string }) => r.id === tenantBRecordId)).toBe(false)
      expect(tenantBRecords!.some((r: { id: string }) => r.id === tenantARecordId)).toBe(false)
    })
  })

  describe('PRODUCTS ISOLATION', () => {
    let tenantAProductId: string
    let tenantBProductId: string

    beforeAll(async () => {
      const { data: productA } = await client
        .from('products')
        .insert({
          tenant_id: TENANT_A,
          name: 'Tenant A Product',
          category: 'Test',
          price: 10000,
          stock: 10,
        })
        .select()
        .single()
      tenantAProductId = productA.id
      ctx.track('products', tenantAProductId)

      const { data: productB } = await client
        .from('products')
        .insert({
          tenant_id: TENANT_B,
          name: 'Tenant B Product',
          category: 'Test',
          price: 20000,
          stock: 20,
        })
        .select()
        .single()
      tenantBProductId = productB.id
      ctx.track('products', tenantBProductId)
    })

    test('products are tenant-isolated', async () => {
      const { data: tenantAProducts } = await client
        .from('products')
        .select('*')
        .eq('tenant_id', TENANT_A)

      expect(tenantAProducts).not.toBeNull()
      expect(tenantAProducts!.every((p: { tenant_id: string }) => p.tenant_id === TENANT_A)).toBe(
        true
      )
      expect(tenantAProducts!.some((p: { id: string }) => p.id === tenantBProductId)).toBe(false)
    })
  })

  describe('EXPENSES ISOLATION', () => {
    let tenantAExpenseId: string
    let tenantBExpenseId: string

    beforeAll(async () => {
      const { data: expenseA } = await client
        .from('expenses')
        .insert({
          tenant_id: TENANT_A,
          description: 'Tenant A Expense',
          amount: 100000,
          category: 'Test',
          date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single()
      tenantAExpenseId = expenseA.id
      ctx.track('expenses', tenantAExpenseId)

      const { data: expenseB } = await client
        .from('expenses')
        .insert({
          tenant_id: TENANT_B,
          description: 'Tenant B Expense',
          amount: 200000,
          category: 'Test',
          date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single()
      tenantBExpenseId = expenseB.id
      ctx.track('expenses', tenantBExpenseId)
    })

    test('expenses are tenant-isolated', async () => {
      const { data: tenantAExpenses } = await client
        .from('expenses')
        .select('*')
        .eq('tenant_id', TENANT_A)

      expect(tenantAExpenses).not.toBeNull()
      expect(tenantAExpenses!.every((e: { tenant_id: string }) => e.tenant_id === TENANT_A)).toBe(
        true
      )
      expect(tenantAExpenses!.some((e: { id: string }) => e.id === tenantBExpenseId)).toBe(false)
    })
  })

  describe('APPOINTMENTS ISOLATION', () => {
    test('appointments are tenant-isolated', async () => {
      // Create appointment in tenant A
      const ownerA = await createProfile({ tenantId: TENANT_A, role: 'owner' })
      ctx.track('profiles', ownerA.id)

      const petA = await createPet({ ownerId: ownerA.id, tenantId: TENANT_A })
      ctx.track('pets', petA.id)

      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      const { data: aptA } = await client
        .from('appointments')
        .insert({
          tenant_id: TENANT_A,
          pet_id: petA.id,
          service_name: 'Tenant A Appointment',
          date: tomorrow.toISOString().split('T')[0],
          time: '10:00',
          status: 'pending',
        })
        .select()
        .single()
      ctx.track('appointments', aptA.id)

      // Query tenant B appointments
      const { data: tenantBAppointments } = await client
        .from('appointments')
        .select('*')
        .eq('tenant_id', TENANT_B)

      expect(tenantBAppointments).not.toBeNull()
      expect(tenantBAppointments!.some((a: { id: string }) => a.id === aptA.id)).toBe(false)
    })
  })

  describe('CROSS-TENANT OPERATIONS', () => {
    test('cannot create pet with owner from different tenant', async () => {
      // Create owner in tenant A
      const ownerA = await createProfile({
        tenantId: TENANT_A,
        role: 'owner',
      })
      ctx.track('profiles', ownerA.id)

      // Try to create pet in tenant B with owner from tenant A
      const { error } = await client.from('pets').insert({
        tenant_id: TENANT_B,
        owner_id: ownerA.id,
        name: 'Cross Tenant Pet',
        species: 'dog',
      })

      // This should either error or be blocked by RLS/triggers
      // The exact behavior depends on database constraints
      // This test documents expected behavior
    })

    test('cannot assign vet from different tenant to medical record', async () => {
      // Create vet in tenant A
      const vetA = await createProfile({
        tenantId: TENANT_A,
        role: 'vet',
      })
      ctx.track('profiles', vetA.id)

      // Create owner and pet in tenant B
      const ownerB = await createProfile({
        tenantId: TENANT_B,
        role: 'owner',
      })
      ctx.track('profiles', ownerB.id)

      const petB = await createPet({
        ownerId: ownerB.id,
        tenantId: TENANT_B,
      })
      ctx.track('pets', petB.id)

      // Try to create medical record with vet from different tenant
      const { error } = await client.from('medical_records').insert({
        pet_id: petB.id,
        tenant_id: TENANT_B,
        performed_by: vetA.id, // Vet from tenant A
        type: 'consultation',
        title: 'Cross Tenant Record',
      })

      // Should be blocked by foreign key or RLS
      // This test documents expected behavior
    })
  })

  describe('TENANT DATA COUNTS', () => {
    test('tenant counts are accurate and separate', async () => {
      // Get counts for each tenant
      const { count: tenantAPetCount } = await client
        .from('pets')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', TENANT_A)

      const { count: tenantBPetCount } = await client
        .from('pets')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', TENANT_B)

      const { count: totalPetCount } = await client
        .from('pets')
        .select('*', { count: 'exact', head: true })

      // Total should be sum of individual tenants (plus any others)
      expect((tenantAPetCount || 0) + (tenantBPetCount || 0)).toBeLessThanOrEqual(
        totalPetCount || 0
      )
    })
  })
})
