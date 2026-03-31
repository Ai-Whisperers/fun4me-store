/**
 * Functionality Tests: Drug Dosages
 *
 * Tests drug dosage calculation and management features.
 * @tags functionality, clinical, drug-dosages
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { getTestClient, TestContext, waitForDatabase } from '../../__helpers__/db'

describe('Drug Dosages Functionality', () => {
  const ctx = new TestContext()
  let client: ReturnType<typeof getTestClient>

  beforeAll(async () => {
    await waitForDatabase()
    client = getTestClient()
  })

  afterAll(async () => {
    await ctx.cleanup()
  })

  describe('Drug Dosage Records', () => {
    test('creates drug dosage record', async () => {
      const { data, error } = await client
        .from('drug_dosages')
        .insert({
          drug_name: 'Amoxicilina',
          dosage_per_kg: 10,
          unit: 'mg',
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data).not.toBeNull()
      expect(data!.drug_name).toBe('Amoxicilina')
      expect(data!.dosage_per_kg).toBe(10)
      expect(data!.unit).toBe('mg')

      ctx.track('drug_dosages', data!.id)
    })

    test('retrieves all drug dosages', async () => {
      const { data, error } = await client
        .from('drug_dosages')
        .select('*')
        .order('drug_name', { ascending: true })

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(Array.isArray(data)).toBe(true)
    })

    test('searches drug by name', async () => {
      // First ensure we have the drug
      await client
        .from('drug_dosages')
        .insert({
          drug_name: 'Metronidazol',
          dosage_per_kg: 15,
          unit: 'mg',
        })
        .select()
        .single()
        .then(({ data }) => {
          if (data) ctx.track('drug_dosages', data.id)
        })

      const { data, error } = await client
        .from('drug_dosages')
        .select('*')
        .ilike('drug_name', '%Metro%')

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data).not.toBeNull()
      expect(data!.some((d: { drug_name: string }) => d.drug_name === 'Metronidazol')).toBe(true)
    })
  })

  describe('Dosage Calculations', () => {
    test('calculates dosage for given weight', () => {
      // Business logic test (pure function)
      const calculateDosage = (dosagePerKg: number, weightKg: number): number => {
        return dosagePerKg * weightKg
      }

      // 10 mg/kg for a 25 kg dog = 250 mg
      expect(calculateDosage(10, 25)).toBe(250)

      // 15 mg/kg for a 4.5 kg cat = 67.5 mg
      expect(calculateDosage(15, 4.5)).toBe(67.5)

      // Edge case: very small animal
      expect(calculateDosage(10, 0.5)).toBe(5)
    })

    test('calculates dosage with frequency', () => {
      const calculateDailyDosage = (
        dosagePerKg: number,
        weightKg: number,
        timesPerDay: number
      ): { perDose: number; perDay: number } => {
        const perDose = dosagePerKg * weightKg
        return {
          perDose,
          perDay: perDose * timesPerDay,
        }
      }

      // 10 mg/kg, 25 kg dog, 3 times daily
      const result = calculateDailyDosage(10, 25, 3)
      expect(result.perDose).toBe(250)
      expect(result.perDay).toBe(750)
    })

    test('handles maximum dosage limits', () => {
      const calculateSafeDosage = (
        dosagePerKg: number,
        weightKg: number,
        maxDose: number
      ): number => {
        const calculated = dosagePerKg * weightKg
        return Math.min(calculated, maxDose)
      }

      // Max 500mg for a drug, but calculated would be 600
      expect(calculateSafeDosage(10, 60, 500)).toBe(500)

      // Under max, use calculated
      expect(calculateSafeDosage(10, 30, 500)).toBe(300)
    })
  })

  describe('Drug Units', () => {
    test('supports various dosage units', async () => {
      const units = ['mg', 'ml', 'IU', 'mcg', 'g']

      for (const unit of units) {
        const { data, error } = await client
          .from('drug_dosages')
          .insert({
            drug_name: `TestDrug-${unit}`,
            dosage_per_kg: 1,
            unit,
          })
          .select()
          .single()

        expect(error).toBeNull()
        expect(data).not.toBeNull()
        expect(data!.unit).toBe(unit)
        ctx.track('drug_dosages', data!.id)
      }
    })
  })
})
