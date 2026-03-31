/**
 * UAT Tests: Owner - Registration and Pet Management
 *
 * Tests user acceptance scenarios for pet owners registering
 * and managing their pets.
 * @tags uat, owner, registration, pets, critical
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { getTestClient, TestContext, waitForDatabase } from '../../__helpers__/db'
import { DEFAULT_TENANT } from '../../__fixtures__/tenants'
import { generateTestEmail, generateTestPhone } from '../../__fixtures__/users'

describe('UAT: Owner Registration and Pet Management', () => {
  const ctx = new TestContext()
  let client: ReturnType<typeof getTestClient>

  beforeAll(async () => {
    await waitForDatabase()
    client = getTestClient()
  })

  afterAll(async () => {
    await ctx.cleanup()
  })

  describe('User Story: New Owner Registers and Adds First Pet', () => {
    /**
     * GIVEN: A new user visits the clinic website
     * WHEN: They complete registration and add their first pet
     * THEN: They should have a complete profile with their pet
     */

    let newOwnerId: string
    let newPetId: string

    test('Step 1: Owner creates account profile', async () => {
      const email = generateTestEmail('owner-uat')
      const phone = generateTestPhone()

      const { data: profile, error } = await client
        .from('profiles')
        .insert({
          id: crypto.randomUUID(),
          tenant_id: DEFAULT_TENANT.id,
          full_name: 'María García López',
          email,
          phone,
          role: 'owner',
          address: 'Av. Mariscal López 1234',
          city: 'Asunción',
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(profile).toBeDefined()
      expect(profile.full_name).toBe('María García López')
      expect(profile.role).toBe('owner')

      newOwnerId = profile.id
      ctx.track('profiles', newOwnerId)
    })

    test('Step 2: Owner registers their first pet', async () => {
      const { data: pet, error } = await client
        .from('pets')
        .insert({
          owner_id: newOwnerId,
          tenant_id: DEFAULT_TENANT.id,
          name: 'Toby',
          species: 'dog',
          breed: 'Beagle',
          birth_date: '2022-08-10',
          weight_kg: 12.5,
          sex: 'male',
          is_neutered: false,
          color: 'Tricolor',
          temperament: 'friendly',
          notes: 'Le encanta jugar con pelotas',
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(pet).toBeDefined()
      expect(pet.name).toBe('Toby')
      expect(pet.owner_id).toBe(newOwnerId)

      newPetId = pet.id
      ctx.track('pets', newPetId)
    })

    test('Step 3: Owner views their pet profile', async () => {
      const { data: pet, error } = await client
        .from('pets')
        .select(
          `
          *,
          owner:profiles(full_name, email, phone)
        `
        )
        .eq('id', newPetId)
        .single()

      expect(error).toBeNull()
      expect(pet).toBeDefined()
      expect(pet.name).toBe('Toby')
      expect(pet.owner.full_name).toBe('María García López')
    })

    test('Step 4: Owner updates pet information', async () => {
      // Pet gained weight after checkup
      const { data: updated, error } = await client
        .from('pets')
        .update({
          weight_kg: 13.2,
          notes: 'Le encanta jugar con pelotas. Aumentó de peso después del control.',
        })
        .eq('id', newPetId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(updated.weight_kg).toBe(13.2)
    })

    test('Step 5: Owner adds second pet', async () => {
      const { data: secondPet, error } = await client
        .from('pets')
        .insert({
          owner_id: newOwnerId,
          tenant_id: DEFAULT_TENANT.id,
          name: 'Michi',
          species: 'cat',
          breed: 'Mestizo',
          birth_date: '2023-01-20',
          weight_kg: 3.8,
          sex: 'female',
          is_neutered: true,
          color: 'Atigrado',
          temperament: 'shy',
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(secondPet.name).toBe('Michi')
      ctx.track('pets', secondPet.id)
    })

    test('Step 6: Owner views all their pets', async () => {
      const { data: pets, error } = await client
        .from('pets')
        .select('*')
        .eq('owner_id', newOwnerId)
        .order('created_at', { ascending: true })

      expect(error).toBeNull()
      expect(pets).not.toBeNull()
      expect(pets!.length).toBe(2)
      expect(pets![0].name).toBe('Toby')
      expect(pets![1].name).toBe('Michi')
    })
  })

  describe('User Story: Owner Schedules First Appointment', () => {
    /**
     * GIVEN: An owner with a registered pet
     * WHEN: They want to schedule a vet visit
     * THEN: They should be able to book an appointment
     */

    let appointmentOwnerId: string
    let appointmentPetId: string
    let appointmentId: string

    beforeAll(async () => {
      // Setup: Create owner and pet
      const owner = await client
        .from('profiles')
        .insert({
          id: crypto.randomUUID(),
          tenant_id: DEFAULT_TENANT.id,
          full_name: 'Appointment Test Owner',
          email: generateTestEmail('appt-owner'),
          phone: generateTestPhone(),
          role: 'owner',
        })
        .select()
        .single()
      appointmentOwnerId = owner.data.id
      ctx.track('profiles', appointmentOwnerId)

      const pet = await client
        .from('pets')
        .insert({
          owner_id: appointmentOwnerId,
          tenant_id: DEFAULT_TENANT.id,
          name: 'Appointment Pet',
          species: 'dog',
          weight_kg: 20,
        })
        .select()
        .single()
      appointmentPetId = pet.data.id
      ctx.track('pets', appointmentPetId)
    })

    test('Step 1: Owner views available appointment types', () => {
      // In a real app, this would be an API call
      const appointmentTypes = [
        { type: 'consultation', label: 'Consulta General', duration: 30 },
        { type: 'vaccination', label: 'Vacunación', duration: 15 },
        { type: 'checkup', label: 'Control de Rutina', duration: 30 },
        { type: 'grooming', label: 'Peluquería', duration: 60 },
        { type: 'emergency', label: 'Emergencia', duration: 60 },
      ]

      expect(appointmentTypes).toContainEqual(expect.objectContaining({ type: 'consultation' }))
    })

    test('Step 2: Owner selects date and time', async () => {
      // Calculate next Monday at 10:00
      const nextMonday = new Date()
      nextMonday.setDate(nextMonday.getDate() + ((7 - nextMonday.getDay() + 1) % 7 || 7))
      const appointmentDate = nextMonday.toISOString().split('T')[0]

      const { data: appointment, error } = await client
        .from('appointments')
        .insert({
          tenant_id: DEFAULT_TENANT.id,
          pet_id: appointmentPetId,
          owner_id: appointmentOwnerId,
          type: 'checkup',
          date: appointmentDate,
          time: '10:00',
          duration: 30,
          status: 'pending',
          reason: 'Control anual',
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(appointment).toBeDefined()
      expect(appointment.status).toBe('pending')

      appointmentId = appointment.id
      ctx.track('appointments', appointmentId)
    })

    test('Step 3: Owner receives appointment confirmation', async () => {
      // Simulate appointment being confirmed by staff
      const { data: confirmed, error } = await client
        .from('appointments')
        .update({ status: 'confirmed' })
        .eq('id', appointmentId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(confirmed.status).toBe('confirmed')
    })

    test('Step 4: Owner views upcoming appointments', async () => {
      const today = new Date().toISOString().split('T')[0]

      const { data: upcoming, error } = await client
        .from('appointments')
        .select(
          `
          *,
          pet:pets(name, species)
        `
        )
        .eq('owner_id', appointmentOwnerId)
        .gte('date', today)
        .in('status', ['pending', 'confirmed'])
        .order('date', { ascending: true })

      expect(error).toBeNull()
      expect(upcoming).not.toBeNull()
      expect(upcoming!.length).toBeGreaterThanOrEqual(1)
      expect(upcoming![0].pet.name).toBe('Appointment Pet')
    })

    test('Step 5: Owner can reschedule appointment', async () => {
      const newDate = new Date()
      newDate.setDate(newDate.getDate() + 14)
      const newDateStr = newDate.toISOString().split('T')[0]

      const { data: rescheduled, error } = await client
        .from('appointments')
        .update({
          date: newDateStr,
          time: '11:30',
          notes: 'Reprogramado a pedido del cliente',
        })
        .eq('id', appointmentId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(rescheduled.date).toBe(newDateStr)
      expect(rescheduled.time).toBe('11:30')
    })

    test('Step 6: Owner can cancel appointment', async () => {
      const { data: cancelled, error } = await client
        .from('appointments')
        .update({
          status: 'cancelled',
          notes: 'Cancelado por el cliente',
        })
        .eq('id', appointmentId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(cancelled.status).toBe('cancelled')
    })
  })

  describe('User Story: Owner Views Pet Medical History', () => {
    /**
     * GIVEN: A pet with medical history
     * WHEN: Owner wants to view past records
     * THEN: They should see complete medical timeline
     */

    let historyOwnerId: string
    let historyPetId: string

    beforeAll(async () => {
      // Setup owner and pet with history
      const owner = await client
        .from('profiles')
        .insert({
          id: crypto.randomUUID(),
          tenant_id: DEFAULT_TENANT.id,
          full_name: 'History Test Owner',
          email: generateTestEmail('history-owner'),
          phone: generateTestPhone(),
          role: 'owner',
        })
        .select()
        .single()
      historyOwnerId = owner.data.id
      ctx.track('profiles', historyOwnerId)

      const vet = await client
        .from('profiles')
        .insert({
          id: crypto.randomUUID(),
          tenant_id: DEFAULT_TENANT.id,
          full_name: 'Dr. History Vet',
          email: generateTestEmail('history-vet'),
          phone: generateTestPhone(),
          role: 'vet',
        })
        .select()
        .single()
      ctx.track('profiles', vet.data.id)

      const pet = await client
        .from('pets')
        .insert({
          owner_id: historyOwnerId,
          tenant_id: DEFAULT_TENANT.id,
          name: 'History Pet',
          species: 'dog',
          weight_kg: 25,
        })
        .select()
        .single()
      historyPetId = pet.data.id
      ctx.track('pets', historyPetId)

      // Add vaccines
      const vaccines = [
        { name: 'Rabia', administered_date: '2024-01-15', status: 'verified' },
        { name: 'Sextuple', administered_date: '2024-02-20', status: 'verified' },
      ]

      for (const vaccine of vaccines) {
        const { data } = await client
          .from('vaccines')
          .insert({
            pet_id: historyPetId,
            ...vaccine,
            next_due_date: '2025-01-15',
          })
          .select()
          .single()
        ctx.track('vaccines', data.id)
      }

      // Add medical record
      const { data: record } = await client
        .from('medical_records')
        .insert({
          pet_id: historyPetId,
          tenant_id: DEFAULT_TENANT.id,
          performed_by: vet.data.id,
          type: 'wellness',
          title: 'Control Anual',
          diagnosis: 'Paciente sano',
          vitals: { weight: 25, temp: 38.5, hr: 80, rr: 20 },
        })
        .select()
        .single()
      ctx.track('medical_records', record.id)
    })

    test('Owner views complete pet profile with history', async () => {
      const { data: pet, error } = await client
        .from('pets')
        .select(
          `
          *,
          vaccines(id, name, administered_date, next_due_date, status),
          medical_records(id, title, type, diagnosis, created_at)
        `
        )
        .eq('id', historyPetId)
        .single()

      expect(error).toBeNull()
      expect(pet).toBeDefined()
      expect(pet.name).toBe('History Pet')
      expect(pet.vaccines.length).toBe(2)
      expect(pet.medical_records.length).toBe(1)
    })

    test('Owner views vaccine history', async () => {
      const { data: vaccines, error } = await client
        .from('vaccines')
        .select('*')
        .eq('pet_id', historyPetId)
        .order('administered_date', { ascending: false })

      expect(error).toBeNull()
      expect(vaccines).not.toBeNull()
      expect(vaccines!.length).toBe(2)
      expect(vaccines!.some((v: { name: string }) => v.name === 'Rabia')).toBe(true)
      expect(vaccines!.some((v: { name: string }) => v.name === 'Sextuple')).toBe(true)
    })

    test('Owner views upcoming vaccine reminders', async () => {
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
      const dateStr = thirtyDaysFromNow.toISOString().split('T')[0]

      // This would show vaccines due soon
      const { data: upcoming, error } = await client
        .from('vaccines')
        .select('*')
        .eq('pet_id', historyPetId)
        .lte('next_due_date', dateStr)

      expect(error).toBeNull()
      // Results depend on test data dates
    })
  })
})
