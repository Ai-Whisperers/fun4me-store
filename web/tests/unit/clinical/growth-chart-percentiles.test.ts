/**
 * Growth Chart Percentile Tests
 *
 * Tests for the growth standards API and percentile calculations.
 * Growth charts are used to track pet development and identify
 * malnutrition, obesity, or underlying health conditions.
 *
 * Tests cover:
 * - API endpoint behavior
 * - Percentile calculation accuracy
 * - Breed category standards
 * - Age interpolation
 * - Gender-specific standards
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET } from '@/app/api/growth_standards/route'

// Import REAL functions from lib module - this is the key fix!
import {
  interpolatePercentile,
  classifyWeight,
  isSeverelyUnderweight,
  isUnderweight,
  isNormalWeight,
  isOverweight,
  isObese,
  assessWeight,
  calculateGrowthVelocity,
  assessGrowthVelocity,
  getExpectedAdultWeightRange,
  isWeightAppropriateForBreed,
  getMaleToFemaleRatio,
  adjustWeightForGender,
  type BreedCategory,
  type Gender,
  type GrowthStandard,
} from '@/lib/clinical/growth'

// Mock response type helper
interface MockResponse {
  status: number
  json: () => Promise<unknown>
  headers?: { get: (key: string) => string | null }
}

// Mock growth standards data
const mockGrowthStandards = [
  // Toy breed, female
  { age_weeks: 8, weight_kg: 0.5, percentile: 50, breed_category: 'toy', gender: 'female' },
  { age_weeks: 12, weight_kg: 0.8, percentile: 50, breed_category: 'toy', gender: 'female' },
  { age_weeks: 16, weight_kg: 1.2, percentile: 50, breed_category: 'toy', gender: 'female' },
  { age_weeks: 24, weight_kg: 1.8, percentile: 50, breed_category: 'toy', gender: 'female' },
  { age_weeks: 52, weight_kg: 2.5, percentile: 50, breed_category: 'toy', gender: 'female' },

  // Large breed, male
  { age_weeks: 8, weight_kg: 5.0, percentile: 50, breed_category: 'large', gender: 'male' },
  { age_weeks: 12, weight_kg: 10.0, percentile: 50, breed_category: 'large', gender: 'male' },
  { age_weeks: 16, weight_kg: 15.0, percentile: 50, breed_category: 'large', gender: 'male' },
  { age_weeks: 24, weight_kg: 22.0, percentile: 50, breed_category: 'large', gender: 'male' },
  { age_weeks: 52, weight_kg: 30.0, percentile: 50, breed_category: 'large', gender: 'male' },

  // Multiple percentiles for medium breed
  { age_weeks: 16, weight_kg: 4.5, percentile: 10, breed_category: 'medium', gender: 'male' },
  { age_weeks: 16, weight_kg: 5.5, percentile: 25, breed_category: 'medium', gender: 'male' },
  { age_weeks: 16, weight_kg: 6.5, percentile: 50, breed_category: 'medium', gender: 'male' },
  { age_weeks: 16, weight_kg: 7.5, percentile: 75, breed_category: 'medium', gender: 'male' },
  { age_weeks: 16, weight_kg: 8.5, percentile: 90, breed_category: 'medium', gender: 'male' },
]

// Create mock Supabase
const createMockSupabase = (data: typeof mockGrowthStandards = mockGrowthStandards) => ({
  from: vi.fn().mockImplementation(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({
      data,
      error: null,
    }),
  })),
})

// Mock modules
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/monitoring/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('Growth Standards API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/growth_standards', () => {
    describe('Parameter Validation', () => {
      it('should require breed_category parameter', async () => {
        const { createClient } = await import('@/lib/supabase/server')
        vi.mocked(createClient).mockResolvedValue(createMockSupabase() as any)

        const request = new Request('http://localhost/api/growth_standards?gender=male')
        const response = (await GET(request)) as MockResponse

        expect(response.status).toBe(400)
        const json = await response.json()
        expect(json).toHaveProperty('error')
      })

      it('should require gender parameter', async () => {
        const { createClient } = await import('@/lib/supabase/server')
        vi.mocked(createClient).mockResolvedValue(createMockSupabase() as any)

        const request = new Request('http://localhost/api/growth_standards?breed_category=medium')
        const response = (await GET(request)) as MockResponse

        expect(response.status).toBe(400)
        const json = await response.json()
        expect(json).toHaveProperty('error')
      })

      it('should accept valid breed_category and gender', async () => {
        const { createClient } = await import('@/lib/supabase/server')
        vi.mocked(createClient).mockResolvedValue(createMockSupabase() as any)

        const request = new Request(
          'http://localhost/api/growth_standards?breed_category=medium&gender=male'
        )
        const response = (await GET(request)) as MockResponse

        expect(response.status).toBe(200)
      })
    })

    describe('Data Retrieval', () => {
      it('should return growth standards data', async () => {
        const { createClient } = await import('@/lib/supabase/server')
        vi.mocked(createClient).mockResolvedValue(createMockSupabase() as any)

        const request = new Request(
          'http://localhost/api/growth_standards?breed_category=large&gender=male'
        )
        const response = (await GET(request)) as MockResponse

        expect(response.status).toBe(200)
        const json = (await response.json()) as typeof mockGrowthStandards
        expect(Array.isArray(json)).toBe(true)
      })

      it('should return empty array for missing table gracefully', async () => {
        const { createClient } = await import('@/lib/supabase/server')
        vi.mocked(createClient).mockResolvedValue({
          from: vi.fn().mockImplementation(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { code: '42P01', message: 'relation does not exist' },
            }),
          })),
        } as any)

        const request = new Request(
          'http://localhost/api/growth_standards?breed_category=medium&gender=male'
        )
        const response = (await GET(request)) as MockResponse

        expect(response.status).toBe(200)
        const json = await response.json()
        expect(json).toEqual([])
      })

      it('should handle database errors', async () => {
        const { createClient } = await import('@/lib/supabase/server')
        vi.mocked(createClient).mockResolvedValue({
          from: vi.fn().mockImplementation(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'OTHER', message: 'Connection failed' },
            }),
          })),
        } as any)

        const request = new Request(
          'http://localhost/api/growth_standards?breed_category=medium&gender=male'
        )
        const response = (await GET(request)) as MockResponse

        expect(response.status).toBe(500)
      })
    })
  })
})

describe('Growth Chart Percentile Calculations', () => {
  /**
   * These tests document expected percentile calculations and serve as
   * verification for the growth chart feature.
   * Now using REAL functions from lib/clinical/growth.ts
   */

  describe('Percentile Interpolation', () => {
    // Using imported interpolatePercentile from @/lib/clinical/growth

    // Convert mock data to GrowthStandard format for the lib function
    const mediumMaleStandards: GrowthStandard[] = mockGrowthStandards
      .filter((s) => s.breed_category === 'medium' && s.gender === 'male')
      .map((s) => ({
        age_weeks: s.age_weeks,
        weight_kg: s.weight_kg,
        percentile: s.percentile,
        breed_category: s.breed_category as BreedCategory,
        gender: s.gender as Gender,
      }))

    it('should return P50 for median weight', () => {
      const percentile = interpolatePercentile(6.5, 16, mediumMaleStandards)
      expect(percentile).toBe(50)
    })

    it('should return P10 for underweight pet', () => {
      const percentile = interpolatePercentile(4.5, 16, mediumMaleStandards)
      expect(percentile).toBe(10)
    })

    it('should return P90 for overweight pet', () => {
      const percentile = interpolatePercentile(8.5, 16, mediumMaleStandards)
      expect(percentile).toBe(90)
    })

    it('should interpolate between percentile points', () => {
      const percentile = interpolatePercentile(6.0, 16, mediumMaleStandards)
      // Between P25 (5.5kg) and P50 (6.5kg)
      expect(percentile).toBeGreaterThan(25)
      expect(percentile).toBeLessThan(50)
    })

    it('should return lowest percentile for very underweight', () => {
      const percentile = interpolatePercentile(3.0, 16, mediumMaleStandards)
      expect(percentile).toBe(10) // Returns minimum
    })

    it('should return highest percentile for very overweight', () => {
      const percentile = interpolatePercentile(12.0, 16, mediumMaleStandards)
      expect(percentile).toBe(90) // Returns maximum
    })
  })

  describe('Breed Category Standards', () => {
    describe('Toy Breeds', () => {
      it('should have appropriate standards for toy breeds', () => {
        const toyStandards = mockGrowthStandards.filter((s) => s.breed_category === 'toy')

        // Toy breeds should have small weights
        const maxWeight = Math.max(...toyStandards.map((s) => s.weight_kg))
        expect(maxWeight).toBeLessThan(5) // Under 5kg at adult
      })

      it('should show proper growth curve for toy breeds', () => {
        const toyFemale = mockGrowthStandards
          .filter((s) => s.breed_category === 'toy' && s.gender === 'female')
          .sort((a, b) => a.age_weeks - b.age_weeks)

        // Weight should increase with age
        for (let i = 1; i < toyFemale.length; i++) {
          expect(toyFemale[i].weight_kg).toBeGreaterThan(toyFemale[i - 1].weight_kg)
        }
      })
    })

    describe('Large Breeds', () => {
      it('should have appropriate standards for large breeds', () => {
        const largeStandards = mockGrowthStandards.filter((s) => s.breed_category === 'large')

        // Large breeds should have substantial weights
        const adultWeight = largeStandards.find((s) => s.age_weeks === 52)?.weight_kg
        expect(adultWeight).toBeGreaterThan(25) // Over 25kg at adult
      })

      it('should show rapid early growth for large breeds', () => {
        const largeMale = mockGrowthStandards
          .filter((s) => s.breed_category === 'large' && s.gender === 'male')
          .sort((a, b) => a.age_weeks - b.age_weeks)

        // Early growth should be rapid
        const week8 = largeMale.find((s) => s.age_weeks === 8)!
        const week16 = largeMale.find((s) => s.age_weeks === 16)!

        const growthRate = (week16.weight_kg - week8.weight_kg) / 8
        expect(growthRate).toBeGreaterThan(1) // Over 1kg per week early on
      })
    })
  })

  describe('Gender Differences', () => {
    it('should document that males typically weigh more', () => {
      // This is a documentation test - actual standards would show this
      const maleAdult = 30 // kg (example)
      const femaleAdult = 26 // kg (example)

      expect(maleAdult).toBeGreaterThan(femaleAdult)
    })
  })

  describe('Clinical Interpretation', () => {
    // Using imported classification functions from @/lib/clinical/growth

    describe('Weight Classification Function', () => {
      it('should classify percentiles correctly', () => {
        expect(classifyWeight(3)).toBe('severely_underweight')
        expect(classifyWeight(10)).toBe('underweight')
        expect(classifyWeight(50)).toBe('normal')
        expect(classifyWeight(88)).toBe('overweight')
        expect(classifyWeight(97)).toBe('obese')
      })
    })

    describe('Underweight Classification', () => {
      it('should identify severely underweight (<P5)', () => {
        expect(isSeverelyUnderweight(3)).toBe(true)
        expect(isSeverelyUnderweight(5)).toBe(false)
        // Clinical action: Investigate malnutrition, parasites, illness
      })

      it('should identify underweight (P5-P15)', () => {
        expect(isUnderweight(10)).toBe(true)
        expect(isUnderweight(3)).toBe(false) // Too low
        expect(isUnderweight(20)).toBe(false) // Too high
        // Clinical action: Monitor closely, may need dietary adjustment
      })
    })

    describe('Normal Weight Classification', () => {
      it('should identify normal weight (P15-P85)', () => {
        expect(isNormalWeight(50)).toBe(true)
        expect(isNormalWeight(15)).toBe(true) // Lower bound
        expect(isNormalWeight(85)).toBe(true) // Upper bound
        expect(isNormalWeight(10)).toBe(false) // Underweight
        expect(isNormalWeight(90)).toBe(false) // Overweight
        // Clinical action: Continue normal care
      })
    })

    describe('Overweight Classification', () => {
      it('should identify overweight (P85-P95)', () => {
        expect(isOverweight(88)).toBe(true)
        expect(isOverweight(95)).toBe(true) // Upper bound
        expect(isOverweight(85)).toBe(false) // Normal
        expect(isOverweight(97)).toBe(false) // Obese
        // Clinical action: Dietary counseling, increased exercise
      })

      it('should identify obese (>P95)', () => {
        expect(isObese(97)).toBe(true)
        expect(isObese(99)).toBe(true)
        expect(isObese(95)).toBe(false) // Just overweight
        // Clinical action: Weight management program, rule out endocrine issues
      })
    })

    describe('Full Weight Assessment', () => {
      // Using imported assessWeight from @/lib/clinical/growth
      it('should provide complete assessment with clinical action', () => {
        const assessment = assessWeight(3)
        expect(assessment.percentile).toBe(3)
        expect(assessment.classification).toBe('severely_underweight')
        expect(assessment.clinicalAction).toContain('malnutrición')
      })

      it('should recommend normal care for healthy weight', () => {
        const assessment = assessWeight(50)
        expect(assessment.classification).toBe('normal')
        expect(assessment.clinicalAction).toContain('normal')
      })

      it('should recommend weight management for obesity', () => {
        const assessment = assessWeight(97)
        expect(assessment.classification).toBe('obese')
        expect(assessment.clinicalAction).toContain('manejo de peso')
      })
    })
  })

  describe('Growth Velocity', () => {
    // Using imported calculateGrowthVelocity and assessGrowthVelocity from @/lib/clinical/growth

    it('should calculate expected growth velocity', () => {
      const week8Weight = 5.0
      const week12Weight = 10.0
      const velocity = calculateGrowthVelocity(week8Weight, week12Weight, 4)

      expect(velocity).toBe(1.25) // 1.25 kg per week
    })

    it('should handle zero week difference', () => {
      const velocity = calculateGrowthVelocity(5.0, 5.0, 0)
      expect(velocity).toBe(0) // Safe handling of division by zero
    })

    it('should assess slow growth', () => {
      const expectedVelocity = 1.25 // kg/week for large breed puppy
      const actualVelocity = 0.5 // kg/week

      const assessment = assessGrowthVelocity(actualVelocity, expectedVelocity)

      expect(assessment.isNormal).toBe(false)
      expect(assessment.classification).toBe('slow')
      expect(assessment.message).toContain('lento')
      // Clinical action: Investigate poor growth
    })

    it('should assess excessive growth', () => {
      const expectedVelocity = 1.25 // kg/week
      const actualVelocity = 2.0 // kg/week

      const assessment = assessGrowthVelocity(actualVelocity, expectedVelocity)

      expect(assessment.isNormal).toBe(false)
      expect(assessment.classification).toBe('excessive')
      expect(assessment.message).toContain('excesivo')
      // Clinical action: Risk of developmental orthopedic disease in large breeds
    })

    it('should assess normal growth', () => {
      const expectedVelocity = 1.25 // kg/week
      const actualVelocity = 1.2 // kg/week - within normal range

      const assessment = assessGrowthVelocity(actualVelocity, expectedVelocity)

      expect(assessment.isNormal).toBe(true)
      expect(assessment.classification).toBe('normal')
    })
  })

  describe('Breed Category Helpers', () => {
    // Using imported getExpectedAdultWeightRange, isWeightAppropriateForBreed from @/lib/clinical/growth

    it('should get expected adult weight ranges by breed category', () => {
      expect(getExpectedAdultWeightRange('toy')).toEqual({ min: 1, max: 5 })
      expect(getExpectedAdultWeightRange('small')).toEqual({ min: 5, max: 10 })
      expect(getExpectedAdultWeightRange('medium')).toEqual({ min: 10, max: 25 })
      expect(getExpectedAdultWeightRange('large')).toEqual({ min: 25, max: 45 })
      expect(getExpectedAdultWeightRange('giant')).toEqual({ min: 45, max: 90 })
    })

    it('should validate adult weight for breed category', () => {
      // Adult dog (52 weeks)
      expect(isWeightAppropriateForBreed(3, 52, 'toy')).toBe(true)
      expect(isWeightAppropriateForBreed(30, 52, 'toy')).toBe(false) // Too heavy for toy

      expect(isWeightAppropriateForBreed(35, 52, 'large')).toBe(true)
      expect(isWeightAppropriateForBreed(5, 52, 'large')).toBe(false) // Too light for large
    })

    it('should use proportional expectations for puppies', () => {
      // Young puppy (16 weeks) - more lenient expectations
      expect(isWeightAppropriateForBreed(8, 16, 'medium')).toBe(true)
    })
  })

  describe('Gender Differences', () => {
    // Using imported getMaleToFemaleRatio, adjustWeightForGender from @/lib/clinical/growth

    it('should document that males typically weigh more', () => {
      // All ratios should be > 1 (male heavier)
      expect(getMaleToFemaleRatio('toy')).toBeGreaterThan(1)
      expect(getMaleToFemaleRatio('large')).toBeGreaterThan(1)
    })

    it('should have larger ratio for larger breeds', () => {
      // Giant breeds have larger gender weight difference
      expect(getMaleToFemaleRatio('giant')).toBeGreaterThan(getMaleToFemaleRatio('toy'))
    })

    it('should adjust base weight for gender', () => {
      const baseWeight = 10 // kg

      const maleWeight = adjustWeightForGender(baseWeight, 'male', 'medium')
      const femaleWeight = adjustWeightForGender(baseWeight, 'female', 'medium')

      expect(maleWeight).toBeGreaterThan(baseWeight)
      expect(femaleWeight).toBeLessThan(baseWeight)
    })
  })
})
