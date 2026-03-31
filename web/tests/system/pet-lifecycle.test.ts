/**
 * System Tests: Pet Lifecycle
 *
 * Tests complete pet management workflows from creation through
 * medical records, vaccines, and appointments.
 * @tags system, pets, critical
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { getTestClient, TestContext, waitForDatabase } from '../__helpers__/db'
import { createProfile, futureDate, pastDate } from '../__helpers__/factories'
import { DEFAULT_TENANT } from '../__fixtures__/tenants'

describe('Pet Lifecycle', () => {
  const ctx = new TestContext()
  let client: ReturnType<typeof getTestClient>

  // Test entities
  let ownerId: string
  let vetId: string
  let petId: string

  beforeAll(async () => {
    await waitForDatabase()
    client = getTestClient()

    // Setup: Create owner and vet
    const owner = await createProfile({
      tenantId: DEFAULT_TENANT.id,
      role: 'owner',
      fullName: 'Lifecycle Test Owner',
    })
    ownerId = owner.id
    ctx.track('profiles', ownerId)

    const vet = await createProfile({
      tenantId: DEFAULT_TENANT.id,
      role: 'vet',
      fullName: 'Dr. Lifecycle Vet',
    })
    vetId = vet.id
    ctx.track('profiles', vetId)
  })

  afterAll(async () => {
    await ctx.cleanup()
  })

  describe('Complete Pet Registration and Medical History', () => {
    test('1. Owner registers new pet', async () => {
      const { data: pet, error } = await client
        .from('pets')
        .insert({
          owner_id: ownerId,
          tenant_id: DEFAULT_TENANT.id,
          name: 'Luna Lifecycle',
          species: 'dog',
          breed: 'Golden Retriever',
          birth_date: '2022-03-15',
          weight_kg: 28.5,
          sex: 'female',
          is_neutered: true,
          color: 'Dorado',
          temperament: 'friendly',
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(pet).toBeDefined()
      expect(pet.name).toBe('Luna Lifecycle')

      petId = pet.id
      ctx.track('pets', petId)
    })

    test('2. Pet receives first vaccination', async () => {
      const { data: vaccine, error } = await client
        .from('vaccines')
        .insert({
          pet_id: petId,
          name: 'Rabia',
          administered_date: pastDate(7),
          next_due_date: futureDate(358),
          batch_number: 'RAB-2024-LIFE-001',
          status: 'pending',
          administered_by: vetId,
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(vaccine).toBeDefined()
      expect(vaccine.status).toBe('pending')

      ctx.track('vaccines', vaccine.id)
    })

    test('3. Vet verifies vaccination', async () => {
      // Get the vaccine
      const { data: vaccines } = await client
        .from('vaccines')
        .select('*')
        .eq('pet_id', petId)
        .eq('name', 'Rabia')

      expect(vaccines).not.toBeNull()
      const vaccineId = vaccines![0].id

      // Verify it
      const { data: verified, error } = await client
        .from('vaccines')
        .update({
          status: 'verified',
          vet_signature: 'Dr. Lifecycle Vet - Digital Signature',
        })
        .eq('id', vaccineId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(verified.status).toBe('verified')
    })

    test('4. Create medical record for initial checkup', async () => {
      const { data: record, error } = await client
        .from('medical_records')
        .insert({
          pet_id: petId,
          tenant_id: DEFAULT_TENANT.id,
          performed_by: vetId,
          type: 'wellness',
          title: 'Control Inicial',
          diagnosis: 'Paciente sano',
          notes: 'Peso normal para la raza y edad. Sin anomalías detectadas.',
          vitals: {
            weight: 28.5,
            temp: 38.5,
            hr: 80,
            rr: 20,
          },
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(record).toBeDefined()
      expect(record.type).toBe('wellness')

      ctx.track('medical_records', record.id)
    })

    test('5. Schedule follow-up appointment', async () => {
      const { data: appointment, error } = await client
        .from('appointments')
        .insert({
          tenant_id: DEFAULT_TENANT.id,
          pet_id: petId,
          owner_id: ownerId,
          vet_id: vetId,
          type: 'checkup',
          date: futureDate(90),
          time: '10:00',
          duration: 30,
          status: 'confirmed',
          reason: 'Control trimestral',
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(appointment).toBeDefined()
      expect(appointment.status).toBe('confirmed')

      ctx.track('appointments', appointment.id)
    })

    test('6. Add second vaccination (Sextuple)', async () => {
      const { data: vaccine, error } = await client
        .from('vaccines')
        .insert({
          pet_id: petId,
          name: 'Sextuple',
          administered_date: pastDate(5),
          next_due_date: futureDate(360),
          batch_number: 'SEX-2024-LIFE-001',
          status: 'verified',
          administered_by: vetId,
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(vaccine).toBeDefined()

      ctx.track('vaccines', vaccine.id)
    })

    test('7. Verify complete pet profile with all records', async () => {
      // Get pet with all related data
      const { data: pet, error } = await client
        .from('pets')
        .select(
          `
          *,
          owner:profiles!pets_owner_id_fkey(id, full_name, email),
          vaccines(id, name, status, administered_date),
          medical_records(id, title, type, created_at),
          appointments(id, type, status, date)
        `
        )
        .eq('id', petId)
        .single()

      expect(error).toBeNull()
      expect(pet).toBeDefined()

      // Verify pet details
      expect(pet.name).toBe('Luna Lifecycle')
      expect(pet.species).toBe('dog')

      // Verify owner relationship
      expect(pet.owner).toBeDefined()
      expect(pet.owner.full_name).toBe('Lifecycle Test Owner')

      // Verify vaccines
      expect(pet.vaccines).toBeDefined()
      expect(pet.vaccines.length).toBe(2)
      expect(pet.vaccines.some((v: { name: string }) => v.name === 'Rabia')).toBe(true)
      expect(pet.vaccines.some((v: { name: string }) => v.name === 'Sextuple')).toBe(true)

      // Verify medical records
      expect(pet.medical_records).toBeDefined()
      expect(pet.medical_records.length).toBe(1)
      expect(pet.medical_records[0].title).toBe('Control Inicial')

      // Verify appointments
      expect(pet.appointments).toBeDefined()
      expect(pet.appointments.length).toBe(1)
      expect(pet.appointments[0].type).toBe('checkup')
    })

    test('8. Update pet weight after growth', async () => {
      const { data: updated, error } = await client
        .from('pets')
        .update({ weight_kg: 30.2 })
        .eq('id', petId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(updated.weight_kg).toBe(30.2)
    })

    test('9. Record weight in new medical record', async () => {
      const { data: record, error } = await client
        .from('medical_records')
        .insert({
          pet_id: petId,
          tenant_id: DEFAULT_TENANT.id,
          performed_by: vetId,
          type: 'wellness',
          title: 'Control de Peso',
          notes: 'Aumento de peso normal. Dieta adecuada.',
          vitals: {
            weight: 30.2,
            temp: 38.4,
            hr: 78,
            rr: 18,
          },
        })
        .select()
        .single()

      expect(error).toBeNull()
      ctx.track('medical_records', record.id)
    })

    test('10. Complete appointment and record findings', async () => {
      // Get appointment
      const { data: appointments } = await client
        .from('appointments')
        .select('*')
        .eq('pet_id', petId)
        .eq('status', 'confirmed')

      if (appointments && appointments.length > 0) {
        const appointmentId = appointments[0].id

        // Update appointment to past date and complete
        const { error } = await client
          .from('appointments')
          .update({
            status: 'completed',
            notes: 'Paciente en excelente estado de salud.',
          })
          .eq('id', appointmentId)

        expect(error).toBeNull()
      }
    })
  })

  describe('Pet Emergency Scenario', () => {
    let emergencyPetId: string

    test('1. Emergency pet registration', async () => {
      const { data: pet, error } = await client
        .from('pets')
        .insert({
          owner_id: ownerId,
          tenant_id: DEFAULT_TENANT.id,
          name: 'Rex Emergency',
          species: 'dog',
          weight_kg: 25,
          temperament: 'unknown',
          notes: 'Paciente de emergencia - información limitada',
        })
        .select()
        .single()

      expect(error).toBeNull()
      emergencyPetId = pet.id
      ctx.track('pets', emergencyPetId)
    })

    test('2. Schedule emergency appointment', async () => {
      const { data: appointment, error } = await client
        .from('appointments')
        .insert({
          tenant_id: DEFAULT_TENANT.id,
          pet_id: emergencyPetId,
          owner_id: ownerId,
          vet_id: vetId,
          type: 'emergency',
          date: new Date().toISOString().split('T')[0],
          time: new Date().toTimeString().slice(0, 5),
          duration: 60,
          status: 'confirmed',
          reason: 'Emergencia - posible intoxicación',
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(appointment.type).toBe('emergency')
      ctx.track('appointments', appointment.id)
    })

    test('3. Create emergency medical record', async () => {
      const { data: record, error } = await client
        .from('medical_records')
        .insert({
          pet_id: emergencyPetId,
          tenant_id: DEFAULT_TENANT.id,
          performed_by: vetId,
          type: 'exam',
          title: 'Evaluación de Emergencia',
          diagnosis: 'Gastritis aguda - posible ingestión de sustancia tóxica',
          notes: 'Se administró carbón activado. Paciente en observación.',
          vitals: {
            weight: 25,
            temp: 39.5,
            hr: 120,
            rr: 35,
          },
        })
        .select()
        .single()

      expect(error).toBeNull()
      ctx.track('medical_records', record.id)
    })

    test('4. Create prescription', async () => {
      const { data: prescription, error } = await client
        .from('prescriptions')
        .insert({
          pet_id: emergencyPetId,
          drug_name: 'Metoclopramida',
          dosage: '0.5 mg/kg cada 8 horas',
          instructions: 'Administrar 30 minutos antes de cada comida. Tratamiento por 5 días.',
          signed_by: vetId,
        })
        .select()
        .single()

      expect(error).toBeNull()
      ctx.track('prescriptions', prescription.id)
    })

    test('5. Schedule follow-up after emergency', async () => {
      const { data: followUp, error } = await client
        .from('appointments')
        .insert({
          tenant_id: DEFAULT_TENANT.id,
          pet_id: emergencyPetId,
          owner_id: ownerId,
          vet_id: vetId,
          type: 'checkup',
          date: futureDate(3),
          time: '09:00',
          duration: 30,
          status: 'confirmed',
          reason: 'Control post-emergencia',
        })
        .select()
        .single()

      expect(error).toBeNull()
      ctx.track('appointments', followUp.id)
    })
  })
})
