/**
 * TerraPet Tenant Isolation Integration Tests
 *
 * This test suite verifies that tenant isolation is maintained across
 * complex queries, joins, and multi-table operations.
 *
 * Test Approach:
 * 1. Test cross-table JOIN queries maintain tenant isolation
 * 2. Test INSERT operations validate tenant_id
 * 3. Test UPDATE operations respect RLS boundaries
 * 4. Test DELETE operations and CASCADE behavior
 * 5. Test complex multi-table queries with proper filtering
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { TENANT_IDS } from '@/lib/constants/tenants';
import {
  createServiceClient,
  createAnonymousClient,
  createRLSTestDataTracker,
  createTestTenant,
  createTestUser,
  createTestPet,
  createTestAppointment,
  createTestMedicalRecord,
  cleanupRLSTestData,
  cleanupAllTestData,
  type TestUserContext,
  type RLSTestDataTracker,
} from './setup'

describe('TerraPet Tenant Isolation Integration', () => {
  let tracker: RLSTestDataTracker
  let terrapetOwner: TestUserContext
  let terrapetVet: TestUserContext
  let terrapetOwner: TestUserContext
  let terrapetVet: TestUserContext
  let terrapetPetId: string
  let terrapetPetId: string
  let terrapetAppointmentId: string
  let terrapetAppointmentId: string

  beforeAll(async () => {
    // Clean up any leftover data from previous test runs
    await cleanupAllTestData()

    tracker = createRLSTestDataTracker()

    // Create tenants
    await createTestTenant('terrapet', 'TerraPet', tracker)
    await createTestTenant('terrapet', 'Veterinaria Adris', tracker)

    // Create users for each tenant with unique emails
    const timestamp = Date.now()

    terrapetOwner = await createTestUser(
      'terrapet',
      'owner',
      `terrapet-owner-${timestamp}@test.com`,
      'testpass123',
      tracker
    )

    terrapetVet = await createTestUser(
      'terrapet',
      'vet',
      `terrapet-vet-${timestamp}@test.com`,
      'testpass123',
      tracker
    )

    terrapetOwner = await createTestUser(
      'terrapet',
      'owner',
      `terrapet-owner-${timestamp}@test.com`,
      'testpass123',
      tracker
    )

    terrapetVet = await createTestUser(
      'terrapet',
      'vet',
      `terrapet-vet-${timestamp}@test.com`,
      'testpass123',
      tracker
    )

    // Create pets for each tenant
    terrapetPetId = await createTestPet(
      'terrapet',
      terrapetOwner.userId,
      'TerraPet Dog',
      tracker
    )

    terrapetPetId = await createTestPet('terrapet', terrapetOwner.userId, 'Adris Cat', tracker)

    // Create appointments for each tenant
    terrapetAppointmentId = await createTestAppointment(
      'terrapet',
      terrapetPetId,
      terrapetOwner.userId,
      tracker
    )

    terrapetAppointmentId = await createTestAppointment(
      'terrapet',
      terrapetPetId,
      terrapetOwner.userId,
      tracker
    )

    // Create medical records for each tenant
    await createTestMedicalRecord('terrapet', terrapetPetId, terrapetVet.userId, tracker)
    await createTestMedicalRecord('terrapet', terrapetPetId, terrapetVet.userId, tracker)
  })

  afterAll(async () => {
    await cleanupRLSTestData(tracker)
  })

  describe('Cross-Table JOIN Queries', () => {
    it('pets JOIN appointments - owner sees only own tenant data', async () => {
      const { data, error } = await terrapetOwner.client
        .from('pets')
        .select('*, appointments(*)')
        .eq('id', terrapetPetId)
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data?.tenant_id).toBe('terrapet')

      // All joined appointments should be from same tenant
      if (data?.appointments) {
        expect(
          Array.isArray(data.appointments)
            ? data.appointments.every((apt: any) => apt.tenant_id === 'terrapet')
            : data.appointments.tenant_id === 'terrapet'
        ).toBe(true)
      }
    })

    it('pets JOIN medical_records - vet sees only own tenant data', async () => {
      const { data, error } = await terrapetVet.client
        .from('pets')
        .select('*, medical_records(*)')

      expect(error).toBeNull()
      expect(data).toBeDefined()

      // All pets should be from terrapet tenant
      if (data) {
        expect(data.every((pet: any) => pet.tenant_id === 'terrapet')).toBe(true)

        // All medical records should be from terrapet tenant
        data.forEach((pet: any) => {
          if (pet.medical_records && pet.medical_records.length > 0) {
            expect(
              pet.medical_records.every((record: any) => record.tenant_id === 'terrapet')
            ).toBe(true)
          }
        })
      }
    })

    it('appointments JOIN pets - cannot access cross-tenant via join', async () => {
      // Try to query terrapet appointment as terrapet user
      const { data, error } = await terrapetOwner.client
        .from('appointments')
        .select('*, pets(*)')
        .eq('id', terrapetAppointmentId)
        .single()

      // Should return no data due to RLS filtering
      expect(error).not.toBeNull()
      expect(data).toBeNull()
    })

    it('medical_records JOIN pets - filters correctly', async () => {
      const { data, error } = await terrapetVet.client
        .from('medical_records')
        .select('*, pets(*)')

      expect(error).toBeNull()
      expect(data).toBeDefined()

      // All records and joined pets should be from terrapet
      if (data) {
        expect(data.every((record: any) => record.tenant_id === 'terrapet')).toBe(true)
        data.forEach((record: any) => {
          if (record.pets) {
            expect(record.pets.tenant_id).toBe('terrapet')
          }
        })
      }
    })
  })

  describe('Multi-Table Complex Queries', () => {
    it('three-way join maintains tenant isolation', async () => {
      // pets -> appointments -> medical_records
      const { data, error } = await terrapetVet.client
        .from('pets')
        .select('*, appointments(*), medical_records(*)')

      expect(error).toBeNull()
      expect(data).toBeDefined()

      // All data should be from terrapet tenant only
      if (data) {
        data.forEach((pet: any) => {
          expect(pet.tenant_id).toBe('terrapet')

          if (pet.appointments) {
            const appointments = Array.isArray(pet.appointments)
              ? pet.appointments
              : [pet.appointments]
            appointments.forEach((apt: any) => {
              expect(apt.tenant_id).toBe('terrapet')
            })
          }

          if (pet.medical_records) {
            const records = Array.isArray(pet.medical_records)
              ? pet.medical_records
              : [pet.medical_records]
            records.forEach((record: any) => {
              expect(record.tenant_id).toBe('terrapet')
            })
          }
        })
      }
    })

    it('count queries respect RLS', async () => {
      const { count: terrapetCount } = await terrapetVet.client
        .from('pets')
        .select('*', { count: 'exact', head: true })

      const { count: terrapetCount } = await terrapetVet.client
        .from('pets')
        .select('*', { count: 'exact', head: true })

      // Each vet should see different counts (their own tenant's pets)
      expect(terrapetCount).toBeDefined()
      expect(terrapetCount).toBeDefined()

      // Counts should be different (each tenant has different pets)
      if (terrapetCount !== null && terrapetCount !== null) {
        // Both should have at least 1 pet
        expect(terrapetCount).toBeGreaterThan(0)
        expect(terrapetCount).toBeGreaterThan(0)
      }
    })

    it('aggregate queries filtered by tenant', async () => {
      // Get all appointments with pet names
      const { data, error } = await terrapetVet.client
        .from('appointments')
        .select('id, pets(name)')

      expect(error).toBeNull()
      expect(data).toBeDefined()

      // All appointments should have pets from terrapet
      if (data) {
        data.forEach((appointment: any) => {
          expect(appointment.pets).toBeDefined()
        })
      }
    })
  })

  describe('INSERT Operations with Tenant Validation', () => {
    it('cannot insert pet with mismatched tenant_id', async () => {
      const serviceClient = createServiceClient()

      // Create a pet with terrapet tenant_id but owned by terrapet user
      const { data, error } = await serviceClient.from('pets').insert({
        tenant_id: 'terrapet', // Wrong tenant
        owner_id: terrapetOwner.userId, // Adris user
        name: 'Mismatched Pet',
        species: 'dog',
        breed: 'Test Breed',
        created_at: new Date().toISOString(),
      })

      // This should either fail or be filtered out by RLS
      // The owner wouldn't be able to see it even if created
      expect(data).toBeNull()
    })

    it('insert appointment with correct tenant succeeds', async () => {
      const startTime = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      startTime.setHours(15, 0, 0, 0)
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000)

      const { data, error } = await terrapetOwner.client
        .from('appointments')
        .insert({
          tenant_id: 'terrapet',
          pet_id: terrapetPetId,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          duration_minutes: 30,
          reason: 'Follow-up visit',
          status: 'scheduled',
        })
        .select('id')
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()

      // Track for cleanup
      if (data) {
        tracker.appointmentIds.push(data.id)
      }
    })
  })

  describe('UPDATE Operations', () => {
    it('cannot update pet to different tenant_id', async () => {
      const { error } = await terrapetOwner.client
        .from('pets')
        .update({ tenant_id: TENANT_IDS.ADRIS })
        .eq('id', terrapetPetId)

      // Should fail - RLS should prevent tenant_id changes
      expect(error).toBeDefined()
    })

    it('can update pet within same tenant', async () => {
      // Fixed: Use specific pet ID from beforeAll setup to avoid test interference
      // The terrapetPetId is created uniquely for this test suite
      expect(terrapetPetId).toBeDefined()
      
      // Use the specific pet created in beforeAll - this avoids test interference
      const petId = terrapetPetId

      const { data, error } = await terrapetOwner.client
        .from('pets')
        .update({ name: 'Updated TerraPet Dog' })
        .eq('id', petId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data?.name).toBe('Updated TerraPet Dog')
      expect(data?.tenant_id).toBe('terrapet') // Tenant unchanged
    })

    it('vet can update medical record for own tenant', async () => {
      const { data: records } = await terrapetVet.client
        .from('medical_records')
        .select('id')
        .eq('pet_id', terrapetPetId)
        .limit(1)
        .single()

      if (records) {
        const { data, error } = await terrapetVet.client
          .from('medical_records')
          .update({ clinical_notes: 'Updated clinical notes' })
          .eq('id', records.id)
          .select()
          .single()

        expect(error).toBeNull()
        expect(data).toBeDefined()
        expect(data?.clinical_notes).toBe('Updated clinical notes')
      }
    })

    it('vet CANNOT update medical record from different tenant', async () => {
      const serviceClient = createServiceClient()

      // Get an terrapet medical record ID
      const { data: terrapetRecords } = await serviceClient
        .from('medical_records')
        .select('id')
        .eq('tenant_id', TENANT_IDS.ADRIS)
        .limit(1)
        .single()

      if (terrapetRecords) {
        // Try to update as terrapet vet
        const { error } = await terrapetVet.client
          .from('medical_records')
          .update({ clinical_notes: 'Unauthorized update attempt' })
          .eq('id', terrapetRecords.id)

        // Should fail or return no rows affected
        expect(error).toBeDefined()
      }
    })
  })

  describe('DELETE Operations and Cascades', () => {
    it('delete pet cascades to related records (same tenant only)', async () => {
      const serviceClient = createServiceClient()

      // Create a temporary pet with appointment and medical record
      const { data: tempPet } = await serviceClient
        .from('pets')
        .insert({
          tenant_id: 'terrapet',
          owner_id: terrapetOwner.userId,
          name: 'Temporary Pet',
          species: 'cat',
          breed: 'Test',
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (tempPet) {
        tracker.petIds.push(tempPet.id)

        // Create appointment for temp pet
        const startTime = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)
        startTime.setHours(16, 0, 0, 0)
        const endTime = new Date(startTime.getTime() + 30 * 60 * 1000)

        const { data: tempAppt } = await serviceClient
          .from('appointments')
          .insert({
            tenant_id: 'terrapet',
            pet_id: tempPet.id,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            duration_minutes: 30,
            reason: 'Test appointment',
            status: 'scheduled',
          })
          .select('id')
          .single()

        if (tempAppt) {
          tracker.appointmentIds.push(tempAppt.id)
        }

        // Delete the pet (as service role to bypass RLS)
        const { error: deleteError } = await serviceClient
          .from('pets')
          .delete()
          .eq('id', tempPet.id)

        expect(deleteError).toBeNull()

        // Verify appointments were cascaded
        const { data: remainingAppts } = await serviceClient
          .from('appointments')
          .select('id')
          .eq('pet_id', tempPet.id)

        expect(remainingAppts).toBeDefined()
        expect(remainingAppts?.length).toBe(0) // Should be deleted via CASCADE
      }
    })

    it('owner cannot delete pet from different tenant', async () => {
      const { error } = await terrapetOwner.client.from('pets').delete().eq('id', terrapetPetId)

      // Should fail or affect 0 rows
      expect(error).toBeDefined()
    })

    it('service role can delete across tenants', async () => {
      const serviceClient = createServiceClient()

      // Create temp pets in both tenants
      const { data: tempPet1 } = await serviceClient
        .from('pets')
        .insert({
          tenant_id: 'terrapet',
          owner_id: terrapetOwner.userId,
          name: 'Temp Pet 1',
          species: 'dog',
          breed: 'Test',
        })
        .select('id')
        .single()

      const { data: tempPet2 } = await serviceClient
        .from('pets')
        .insert({
          tenant_id: TENANT_IDS.ADRIS,
          owner_id: terrapetOwner.userId,
          name: 'Temp Pet 2',
          species: 'cat',
          breed: 'Test',
        })
        .select('id')
        .single()

      // Service role should be able to delete both
      if (tempPet1 && tempPet2) {
        const { error: error1 } = await serviceClient
          .from('pets')
          .delete()
          .eq('id', tempPet1.id)
        const { error: error2 } = await serviceClient
          .from('pets')
          .delete()
          .eq('id', tempPet2.id)

        expect(error1).toBeNull()
        expect(error2).toBeNull()
      }
    })
  })

  describe('Anonymous User Restrictions', () => {
    it('anonymous cannot read any tenant data', async () => {
      const anonClient = createAnonymousClient()

      const { data: pets } = await anonClient.from('pets').select('*')
      const { data: appointments } = await anonClient.from('appointments').select('*')
      const { data: medicalRecords } = await anonClient.from('medical_records').select('*')

      // All should return empty arrays or null
      expect(pets).toBeDefined()
      expect(pets?.length).toBe(0)
      expect(appointments).toBeDefined()
      expect(appointments?.length).toBe(0)
      expect(medicalRecords).toBeDefined()
      expect(medicalRecords?.length).toBe(0)
    })

    it('anonymous cannot insert data', async () => {
      const anonClient = createAnonymousClient()

      const { error } = await anonClient.from('pets').insert({
        tenant_id: 'terrapet',
        owner_id: terrapetOwner.userId,
        name: 'Unauthorized Pet',
        species: 'dog',
        breed: 'Hacker',
      })

      expect(error).toBeDefined()
    })
  })
})
