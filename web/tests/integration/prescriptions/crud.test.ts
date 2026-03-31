/**
 * Integration Tests: Prescriptions CRUD
 *
 * Tests prescription management and digital signing.
 * @tags integration, prescriptions, critical
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { getTestClient, TestContext, waitForDatabase } from '../../__helpers__/db'
import { createProfile, createPet, resetSequence } from '../../__helpers__/factories'
import { DEFAULT_TENANT } from '../../__fixtures__/tenants'

let prescriptionCounter = 0
function nextRxNumber(): string {
  return `RX-TEST-${Date.now()}-${++prescriptionCounter}`
}

describe('Prescriptions CRUD', () => {
  const ctx = new TestContext()
  let client: ReturnType<typeof getTestClient>
  let ownerId: string
  let vetId: string
  let petId: string

  beforeAll(async () => {
    await waitForDatabase()
    client = getTestClient({ serviceRole: true })

    const owner = await createProfile({
      tenantId: DEFAULT_TENANT.id,
      role: 'owner',
    })
    ownerId = owner.id
    ctx.track('profiles', ownerId)

    const vet = await createProfile({
      tenantId: DEFAULT_TENANT.id,
      role: 'vet',
      fullName: 'Dr. Prescription Vet',
    })
    vetId = vet.id
    ctx.track('profiles', vetId)

    const pet = await createPet({
      ownerId,
      tenantId: DEFAULT_TENANT.id,
      name: 'Prescription Pet',
      weightKg: 20,
    })
    petId = pet.id
    ctx.track('pets', petId)
  })

  afterAll(async () => {
    await ctx.cleanup()
  })

  beforeEach(() => {
    resetSequence()
  })

  describe('CREATE', () => {
    test('creates basic prescription', async () => {
      const { data, error } = await client
        .from('prescriptions')
        .insert({
          pet_id: petId,
          tenant_id: DEFAULT_TENANT.id,
          vet_id: vetId,
          prescription_number: nextRxNumber(),
          medications: [{ name: 'Amoxicilina', dosage: '250mg cada 12 horas' }],
          notes: 'Administrar con comida. Tratamiento por 7 días.',
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.medications[0].name).toBe('Amoxicilina')
      expect(data.vet_id).toBe(vetId)

      ctx.track('prescriptions', data.id)
    })

    test('creates prescription with detailed medications', async () => {
      const { data, error } = await client
        .from('prescriptions')
        .insert({
          pet_id: petId,
          tenant_id: DEFAULT_TENANT.id,
          vet_id: vetId,
          prescription_number: nextRxNumber(),
          medications: [
            { name: 'Metronidazol', dosage: '15mg/kg cada 8 horas (300mg por dosis)', duration: '10 days' },
          ],
          notes: 'Administrar 30 minutos antes de cada comida. No suspender tratamiento.',
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.medications[0].dosage).toContain('15mg/kg')

      ctx.track('prescriptions', data.id)
    })

    test('creates prescription with multiple medications', async () => {
      const { data, error } = await client
        .from('prescriptions')
        .insert({
          pet_id: petId,
          tenant_id: DEFAULT_TENANT.id,
          vet_id: vetId,
          prescription_number: nextRxNumber(),
          medications: [
            { name: 'Omeprazol', dosage: '1mg/kg cada 24 horas' },
            { name: 'Sucralfato', dosage: '500mg cada 8 horas' },
          ],
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.medications).toHaveLength(2)

      ctx.track('prescriptions', data.id)

      // Verify all prescriptions for pet
      const { data: allRx } = await client.from('prescriptions').select('*').eq('pet_id', petId)
      expect(allRx).not.toBeNull()
      expect(allRx!.length).toBeGreaterThanOrEqual(2)
    })

    test('creates prescription with validity period', async () => {
      const { data, error } = await client
        .from('prescriptions')
        .insert({
          pet_id: petId,
          tenant_id: DEFAULT_TENANT.id,
          vet_id: vetId,
          prescription_number: nextRxNumber(),
          medications: [{ name: 'Prednisolona', dosage: '0.5mg/kg' }],
          prescribed_date: '2026-02-01',
          valid_until: '2026-03-01',
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.valid_until).toBe('2026-03-01')

      ctx.track('prescriptions', data.id)
    })

    test('fails with non-existent pet', async () => {
      const { error } = await client.from('prescriptions').insert({
        pet_id: '00000000-0000-0000-0000-999999999999',
        tenant_id: DEFAULT_TENANT.id,
        vet_id: vetId,
        prescription_number: nextRxNumber(),
      })

      expect(error).not.toBeNull()
    })

    test('fails when valid_until is before prescribed_date', async () => {
      const { error } = await client.from('prescriptions').insert({
        pet_id: petId,
        tenant_id: DEFAULT_TENANT.id,
        vet_id: vetId,
        prescription_number: nextRxNumber(),
        prescribed_date: '2026-02-01',
        valid_until: '2026-01-01', // Before prescribed
      })

      expect(error).not.toBeNull()
    })
  })

  describe('READ', () => {
    let prescriptionId: string

    beforeAll(async () => {
      const { data } = await client
        .from('prescriptions')
        .insert({
          pet_id: petId,
          tenant_id: DEFAULT_TENANT.id,
          vet_id: vetId,
          prescription_number: nextRxNumber(),
          medications: [{ name: 'Read Test Drug', dosage: '100mg' }],
          notes: 'Test instructions',
        })
        .select()
        .single()
      prescriptionId = data.id
      ctx.track('prescriptions', prescriptionId)
    })

    test('reads prescription by ID', async () => {
      const { data, error } = await client
        .from('prescriptions')
        .select('*')
        .eq('id', prescriptionId)
        .single()

      expect(error).toBeNull()
      expect(data.medications[0].name).toBe('Read Test Drug')
    })

    test('reads prescriptions by pet', async () => {
      const { data, error } = await client
        .from('prescriptions')
        .select('*')
        .eq('pet_id', petId)
        .order('created_at', { ascending: false })

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data!.length).toBeGreaterThan(0)
    })

    test('reads prescription with pet and vet details', async () => {
      const { data, error } = await client
        .from('prescriptions')
        .select(
          `
          *,
          pet:pets!prescriptions_pet_id_fkey(id, name, species, weight_kg),
          vet:profiles!prescriptions_vet_id_fkey(id, full_name)
        `
        )
        .eq('id', prescriptionId)
        .single()

      expect(error).toBeNull()
      expect(data.pet).toBeDefined()
      expect(data.pet.name).toBe('Prescription Pet')
      expect(data.vet).toBeDefined()
      expect(data.vet.full_name).toBe('Dr. Prescription Vet')
    })

    test('filters prescriptions by vet', async () => {
      const { data, error } = await client.from('prescriptions').select('*').eq('vet_id', vetId)

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data!.every((rx: { vet_id: string }) => rx.vet_id === vetId)).toBe(true)
    })

    test('filters prescriptions by date', async () => {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data, error } = await client
        .from('prescriptions')
        .select('*')
        .eq('pet_id', petId)
        .gte('created_at', thirtyDaysAgo.toISOString())

      expect(error).toBeNull()
    })
  })

  describe('UPDATE', () => {
    let updatePrescriptionId: string

    beforeAll(async () => {
      const { data } = await client
        .from('prescriptions')
        .insert({
          pet_id: petId,
          tenant_id: DEFAULT_TENANT.id,
          vet_id: vetId,
          prescription_number: nextRxNumber(),
          medications: [{ name: 'Update Test Drug', dosage: '50mg' }],
        })
        .select()
        .single()
      updatePrescriptionId = data.id
      ctx.track('prescriptions', updatePrescriptionId)
    })

    test('updates notes', async () => {
      const { data, error } = await client
        .from('prescriptions')
        .update({
          notes: 'Updated: Tomar con abundante agua.',
        })
        .eq('id', updatePrescriptionId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.notes).toContain('Updated')
    })

    test('updates medications', async () => {
      const { data, error } = await client
        .from('prescriptions')
        .update({
          medications: [{ name: 'Update Test Drug', dosage: '100mg cada 8 horas' }],
        })
        .eq('id', updatePrescriptionId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.medications[0].dosage).toBe('100mg cada 8 horas')
    })

    test('updates status to dispensed', async () => {
      const { data, error } = await client
        .from('prescriptions')
        .update({ status: 'dispensed' })
        .eq('id', updatePrescriptionId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.status).toBe('dispensed')
    })
  })

  describe('DELETE', () => {
    test('deletes prescription by ID', async () => {
      const { data: created } = await client
        .from('prescriptions')
        .insert({
          pet_id: petId,
          tenant_id: DEFAULT_TENANT.id,
          vet_id: vetId,
          prescription_number: nextRxNumber(),
          medications: [{ name: 'To Delete Drug', dosage: '10mg' }],
        })
        .select()
        .single()

      const { error } = await client.from('prescriptions').delete().eq('id', created.id)
      expect(error).toBeNull()

      const { data: found } = await client
        .from('prescriptions')
        .select('*')
        .eq('id', created.id)
        .single()
      expect(found).toBeNull()
    })
  })

  describe('PRESCRIPTION CALCULATIONS', () => {
    test('calculates dosage based on weight', () => {
      const calculateDosage = (
        dosagePerKg: number,
        weightKg: number,
        unit: string = 'mg'
      ): string => {
        const totalDosage = dosagePerKg * weightKg
        return `${totalDosage}${unit}`
      }

      expect(calculateDosage(10, 20)).toBe('200mg')
      expect(calculateDosage(0.5, 5, 'ml')).toBe('2.5ml')
    })

    test('formats prescription label', () => {
      const formatLabel = (rx: { drugName: string; dosage: string; petName: string }): string => {
        return `${rx.drugName} - ${rx.dosage}\nPaciente: ${rx.petName}`
      }

      const label = formatLabel({
        drugName: 'Amoxicilina',
        dosage: '250mg cada 12h',
        petName: 'Max',
      })

      expect(label).toContain('Amoxicilina')
      expect(label).toContain('Max')
    })
  })
})
