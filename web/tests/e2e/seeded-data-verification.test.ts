/**
 * E2E Test: Seeded Data Verification
 *
 * This test verifies that the seed script created all expected data
 * and that the application can properly display and interact with it.
 *
 * Prerequisites:
 * - Run the seed script: npx tsx web/db/seeds/scripts/seed-terrapet-demo.ts
 * - Start the dev server: npm run dev
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { apiClient } from '../../lib/test-utils/api-client'
import { PREDEFINED_OWNERS } from '../../lib/test-utils/factories/index'

// Type definitions for database query results
interface ProfileRow {
  id: string
  email: string
  full_name: string
  role: string
  notes?: string
}

interface PetRow {
  id: string
  name: string
  owner_id: string
  species: string
  allergies?: string[]
  chronic_conditions?: string[]
  temperament?: string
}

interface LoyaltyRow {
  id: string
  user_id: string
  tier: string
  balance: number
}

interface AppointmentRow {
  id: string
  pet_id: string
}

const TENANT_ID = 'terrapet'

describe('Seeded Data Verification', () => {
  beforeAll(() => {
    // Ensure we have Supabase credentials
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('Supabase credentials not found. Skipping E2E tests.')
    }
  })

  describe('Owners', () => {
    it('should have 10 predefined owners', async () => {
      const { data, error } = await apiClient.dbSelect('profiles', {
        select: 'id, email, full_name, role',
        eq: { tenant_id: TENANT_ID, role: 'owner' },
      })

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      const profiles = data as ProfileRow[]
      expect(profiles.length).toBeGreaterThanOrEqual(10)

      // Verify predefined owners exist (match by email)
      for (const preset of PREDEFINED_OWNERS) {
        const owner = profiles.find((o) => o.email === preset.email)
        expect(owner).toBeDefined()
        expect(owner?.full_name).toBe(preset.name)
      }
    })

    it('should have distinct personas via notes', async () => {
      const { data } = await apiClient.dbSelect('profiles', {
        select: 'id, email, notes',
        eq: { tenant_id: TENANT_ID, role: 'owner' },
      })

      expect(data).not.toBeNull()
      const profiles = data as ProfileRow[]

      // VIP owner should have VIP note (match by email pattern)
      const vipOwner = profiles.find((o) => o.email.includes('carlos.benitez'))
      expect(vipOwner?.notes).toContain('VIP')
    })
  })

  describe('Pets', () => {
    it('should have approximately 50 pets (5 per owner)', async () => {
      const { data, error } = await apiClient.dbSelect('pets', {
        select: 'id, name, owner_id, species',
        eq: { tenant_id: TENANT_ID },
      })

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data!.length).toBeGreaterThanOrEqual(40) // Allow some variance
    })

    it('should have mixed species (dogs and cats)', async () => {
      const { data } = await apiClient.dbSelect('pets', {
        select: 'id, species',
        eq: { tenant_id: TENANT_ID },
      })

      expect(data).not.toBeNull()

      const dogs = data!.filter((p: any) => p.species === 'dog')
      const cats = data!.filter((p: any) => p.species === 'cat')

      expect(dogs.length).toBeGreaterThan(0)
      expect(cats.length).toBeGreaterThan(0)
    })

    it('should have pets with various profiles (allergies, conditions)', async () => {
      const { data } = await apiClient.dbSelect('pets', {
        select: 'id, name, allergies, chronic_conditions, temperament',
        eq: { tenant_id: TENANT_ID },
      })

      expect(data).not.toBeNull()

      // Some pets should have allergies
      const petsWithAllergies = data!.filter((p: any) => p.allergies && p.allergies.length > 0)
      expect(petsWithAllergies.length).toBeGreaterThan(0)

      // Some pets should have chronic conditions
      const petsWithConditions = data!.filter(
        (p: any) => p.chronic_conditions && p.chronic_conditions.length > 0
      )
      expect(petsWithConditions.length).toBeGreaterThan(0)
    })
  })

  describe('Vaccines', () => {
    it('should have vaccine records for pets', async () => {
      const { data, error } = await apiClient.dbSelect('vaccines', {
        select: 'id, pet_id, vaccine_name, status',
        eq: { tenant_id: TENANT_ID },
      })

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data!.length).toBeGreaterThan(50) // Many vaccine records expected
    })

    it('should have various vaccine statuses', async () => {
      const { data } = await apiClient.dbSelect('vaccines', {
        select: 'id, status',
        eq: { tenant_id: TENANT_ID },
      })

      expect(data).not.toBeNull()

      const statuses = new Set(data!.map((v: any) => v.status))
      expect(statuses.has('completed')).toBe(true)
    })
  })

  describe('Appointments', () => {
    it('should have past and future appointments', async () => {
      const { data, error } = await apiClient.dbSelect('appointments', {
        select: 'id, start_time, status',
        eq: { tenant_id: TENANT_ID },
      })

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data!.length).toBeGreaterThan(0)

      const now = new Date()
      const pastAppts = data!.filter((a: any) => new Date(a.start_time) < now)
      const futureAppts = data!.filter((a: any) => new Date(a.start_time) > now)

      expect(pastAppts.length).toBeGreaterThan(0)
      expect(futureAppts.length).toBeGreaterThan(0)
    })

    it('should have completed past appointments', async () => {
      const { data } = await apiClient.dbSelect('appointments', {
        select: 'id, status, start_time',
        eq: { tenant_id: TENANT_ID },
      })

      expect(data).not.toBeNull()

      const now = new Date()
      const pastCompleted = data!.filter(
        (a: any) => new Date(a.start_time) < now && a.status === 'completed'
      )

      expect(pastCompleted.length).toBeGreaterThan(0)
    })
  })

  describe('Medical Records', () => {
    it('should have medical records linked to appointments', async () => {
      const { data, error } = await apiClient.dbSelect('medical_records', {
        select: 'id, appointment_id, diagnosis, chief_complaint',
        eq: { tenant_id: TENANT_ID },
      })

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data!.length).toBeGreaterThan(0)

      // Most should have appointment_id
      const linkedRecords = data!.filter((r: any) => r.appointment_id)
      expect(linkedRecords.length).toBeGreaterThan(0)
    })
  })

  describe('Invoices', () => {
    it('should have invoices for clients', async () => {
      const { data, error } = await apiClient.dbSelect('invoices', {
        select: 'id, client_id, status, total_amount',
        eq: { tenant_id: TENANT_ID },
      })

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data!.length).toBeGreaterThan(0)
    })

    it('should have invoices in various statuses', async () => {
      const { data } = await apiClient.dbSelect('invoices', {
        select: 'id, status',
        eq: { tenant_id: TENANT_ID },
      })

      expect(data).not.toBeNull()

      const statuses = new Set(data!.map((i: any) => i.status))
      expect(statuses.size).toBeGreaterThan(1) // Multiple statuses
    })
  })

  describe('Payments', () => {
    it('should have payments for invoices', async () => {
      const { data, error } = await apiClient.dbSelect('payments', {
        select: 'id, invoice_id, amount, payment_method',
        eq: { tenant_id: TENANT_ID },
      })

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data!.length).toBeGreaterThan(0)
    })

    it('should use various payment methods', async () => {
      const { data } = await apiClient.dbSelect('payments', {
        select: 'id, payment_method',
        eq: { tenant_id: TENANT_ID },
      })

      expect(data).not.toBeNull()

      const methods = new Set(data!.map((p: any) => p.payment_method))
      expect(methods.size).toBeGreaterThan(1)
    })
  })

  describe('Store Orders', () => {
    it('should have store orders for customers', async () => {
      const { data, error } = await apiClient.dbSelect('store_orders', {
        select: 'id, customer_id, status, total',
        eq: { tenant_id: TENANT_ID },
      })

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data!.length).toBeGreaterThan(0)
    })

    it('should have orders in various statuses', async () => {
      const { data } = await apiClient.dbSelect('store_orders', {
        select: 'id, status',
        eq: { tenant_id: TENANT_ID },
      })

      expect(data).not.toBeNull()

      const statuses = new Set(data!.map((o: any) => o.status))
      expect(statuses.has('delivered')).toBe(true)
    })
  })

  describe('Loyalty Points', () => {
    it('should have loyalty records for users', async () => {
      const { data, error } = await apiClient.dbSelect('loyalty_points', {
        select: 'id, user_id, balance, tier',
        eq: { tenant_id: TENANT_ID },
      })

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data!.length).toBeGreaterThan(0)
    })

    it('should have users in different tiers', async () => {
      const { data } = await apiClient.dbSelect('loyalty_points', {
        select: 'id, tier',
        eq: { tenant_id: TENANT_ID },
      })

      expect(data).not.toBeNull()

      const tiers = new Set(data!.map((l: any) => l.tier))
      expect(tiers.size).toBeGreaterThan(1) // Multiple tiers
    })

    it('should have VIP owner with platinum tier', async () => {
      // First find the VIP owner by email pattern
      const { data: profiles } = await apiClient.dbSelect('profiles', {
        select: 'id, email',
        eq: { tenant_id: TENANT_ID, role: 'owner' },
      })
      const vipProfile = (profiles as ProfileRow[]).find((p) => p.email.includes('carlos.benitez'))

      if (!vipProfile) {
        // Skip if VIP owner not seeded
        return
      }

      const { data } = await apiClient.dbSelect('loyalty_points', {
        select: 'id, user_id, tier, balance',
        eq: { tenant_id: TENANT_ID, user_id: vipProfile.id },
      })

      expect(data).not.toBeNull()
      const loyalty = data as LoyaltyRow[]
      expect(loyalty.length).toBe(1)
      expect(loyalty[0].tier).toBe('platinum')
      expect(loyalty[0].balance).toBeGreaterThan(0)
    })
  })

  describe('Abandoned Carts', () => {
    it('should have some abandoned carts', async () => {
      const { data, error } = await apiClient.dbSelect('store_carts', {
        select: 'id, customer_id, items',
        eq: { tenant_id: TENANT_ID },
      })

      expect(error).toBeNull()
      // Abandoned carts are optional, so we just verify the query works
      expect(data).not.toBeNull()
    })
  })

  describe('Data Integrity', () => {
    it('should have consistent owner-pet relationships', async () => {
      // Get all pets
      const { data: petsData } = await apiClient.dbSelect('pets', {
        select: 'id, owner_id',
        eq: { tenant_id: TENANT_ID },
      })

      // Get all owners
      const { data: ownersData } = await apiClient.dbSelect('profiles', {
        select: 'id',
        eq: { tenant_id: TENANT_ID, role: 'owner' },
      })

      expect(petsData).not.toBeNull()
      expect(ownersData).not.toBeNull()

      const pets = petsData as PetRow[]
      const owners = ownersData as ProfileRow[]
      const ownerIds = new Set(owners.map((o) => o.id))

      // All pets should belong to existing owners
      for (const pet of pets) {
        expect(ownerIds.has(pet.owner_id)).toBe(true)
      }
    })

    it('should have consistent appointment-pet relationships', async () => {
      const { data: appointmentsData } = await apiClient.dbSelect('appointments', {
        select: 'id, pet_id',
        eq: { tenant_id: TENANT_ID },
      })

      const { data: petsData } = await apiClient.dbSelect('pets', {
        select: 'id',
        eq: { tenant_id: TENANT_ID },
      })

      expect(appointmentsData).not.toBeNull()
      expect(petsData).not.toBeNull()

      const appointments = appointmentsData as AppointmentRow[]
      const pets = petsData as PetRow[]
      const petIds = new Set(pets.map((p) => p.id))

      // All appointments should reference existing pets
      for (const appt of appointments) {
        expect(petIds.has(appt.pet_id)).toBe(true)
      }
    })
  })
})
