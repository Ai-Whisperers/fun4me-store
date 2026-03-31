/**
 * Growth Chart Calculations
 *
 * Functions for pet growth tracking and percentile calculations.
 * Growth charts help identify malnutrition, obesity, or underlying
 * health conditions through weight monitoring.
 *
 * Functions cover:
 * - Percentile interpolation
 * - Clinical weight classification
 * - Growth velocity calculations
 * - Breed category standards
 */

// Types

export type BreedCategory = 'toy' | 'small' | 'medium' | 'large' | 'giant'

export type Gender = 'male' | 'female'

export type WeightClassification =
  | 'severely_underweight'
  | 'underweight'
  | 'normal'
  | 'overweight'
  | 'obese'

export interface GrowthStandard {
  age_weeks: number
  weight_kg: number
  percentile: number
  breed_category: BreedCategory
  gender: Gender
}

export interface GrowthVelocity {
  kgPerWeek: number
  isNormal: boolean
  classification: 'slow' | 'normal' | 'excessive'
  message?: string
}

export interface WeightAssessment {
  percentile: number
  classification: WeightClassification
  clinicalAction: string
}

// Percentile Interpolation

/**
 * Interpolates weight percentile based on age and reference data
 * Returns -1 if age is not in standards
 */
export function interpolatePercentile(
  currentWeight: number,
  ageWeeks: number,
  standards: GrowthStandard[]
): number {
  // Filter standards for the exact age
  const atAge = standards.filter((s) => s.age_weeks === ageWeeks)

  if (atAge.length === 0) {
    return -1 // Age not in standards
  }

  // Sort by weight
  const sorted = [...atAge].sort((a, b) => a.weight_kg - b.weight_kg)

  // Find where current weight falls
  if (currentWeight <= sorted[0].weight_kg) {
    return sorted[0].percentile
  }
  if (currentWeight >= sorted[sorted.length - 1].weight_kg) {
    return sorted[sorted.length - 1].percentile
  }

  // Linear interpolation between two percentile points
  for (let i = 0; i < sorted.length - 1; i++) {
    if (currentWeight >= sorted[i].weight_kg && currentWeight <= sorted[i + 1].weight_kg) {
      const ratio =
        (currentWeight - sorted[i].weight_kg) /
        (sorted[i + 1].weight_kg - sorted[i].weight_kg)
      return Math.round(
        sorted[i].percentile + ratio * (sorted[i + 1].percentile - sorted[i].percentile)
      )
    }
  }

  return 50 // Default to median
}

// Weight Classification

/**
 * Classifies weight status based on percentile
 */
export function classifyWeight(percentile: number): WeightClassification {
  if (percentile < 5) return 'severely_underweight'
  if (percentile < 15) return 'underweight'
  if (percentile <= 85) return 'normal'
  if (percentile <= 95) return 'overweight'
  return 'obese'
}

/**
 * Checks if a pet is severely underweight (<P5)
 */
export function isSeverelyUnderweight(percentile: number): boolean {
  return percentile < 5
}

/**
 * Checks if a pet is underweight (P5-P15)
 */
export function isUnderweight(percentile: number): boolean {
  return percentile >= 5 && percentile < 15
}

/**
 * Checks if a pet is normal weight (P15-P85)
 */
export function isNormalWeight(percentile: number): boolean {
  return percentile >= 15 && percentile <= 85
}

/**
 * Checks if a pet is overweight (P85-P95)
 */
export function isOverweight(percentile: number): boolean {
  return percentile > 85 && percentile <= 95
}

/**
 * Checks if a pet is obese (>P95)
 */
export function isObese(percentile: number): boolean {
  return percentile > 95
}

/**
 * Gets full weight assessment with clinical recommendations
 */
export function assessWeight(percentile: number): WeightAssessment {
  const classification = classifyWeight(percentile)

  const clinicalActions: Record<WeightClassification, string> = {
    severely_underweight: 'Investigar malnutrición, parásitos, enfermedad subyacente',
    underweight: 'Monitorear de cerca, posible ajuste dietético',
    normal: 'Continuar cuidado normal',
    overweight: 'Asesoramiento dietético, aumentar ejercicio',
    obese: 'Programa de manejo de peso, descartar problemas endocrinos',
  }

  return {
    percentile,
    classification,
    clinicalAction: clinicalActions[classification],
  }
}

// Growth Velocity

/**
 * Calculates growth velocity in kg per week
 */
export function calculateGrowthVelocity(
  weight1: number,
  weight2: number,
  weeks: number
): number {
  if (weeks === 0) return 0
  return (weight2 - weight1) / weeks
}

/**
 * Assesses if growth velocity is appropriate
 * @param actualVelocity - Actual growth in kg/week
 * @param expectedVelocity - Expected growth in kg/week for breed/age
 */
export function assessGrowthVelocity(
  actualVelocity: number,
  expectedVelocity: number
): GrowthVelocity {
  const slowThreshold = expectedVelocity * 0.7
  const excessiveThreshold = expectedVelocity * 1.3

  if (actualVelocity < slowThreshold) {
    return {
      kgPerWeek: actualVelocity,
      isNormal: false,
      classification: 'slow',
      message: 'Crecimiento lento - investigar causa subyacente',
    }
  }

  if (actualVelocity > excessiveThreshold) {
    return {
      kgPerWeek: actualVelocity,
      isNormal: false,
      classification: 'excessive',
      message: 'Crecimiento excesivo - riesgo de enfermedad ortopédica del desarrollo',
    }
  }

  return {
    kgPerWeek: actualVelocity,
    isNormal: true,
    classification: 'normal',
  }
}

// Breed Category Helpers

/**
 * Gets expected adult weight range for breed category
 */
export function getExpectedAdultWeightRange(
  breedCategory: BreedCategory
): { min: number; max: number } {
  const ranges: Record<BreedCategory, { min: number; max: number }> = {
    toy: { min: 1, max: 5 },
    small: { min: 5, max: 10 },
    medium: { min: 10, max: 25 },
    large: { min: 25, max: 45 },
    giant: { min: 45, max: 90 },
  }
  return ranges[breedCategory]
}

/**
 * Validates that a weight is appropriate for breed category at given age
 */
export function isWeightAppropriateForBreed(
  weightKg: number,
  ageWeeks: number,
  breedCategory: BreedCategory
): boolean {
  const adultRange = getExpectedAdultWeightRange(breedCategory)

  // At 52 weeks (adult), weight should be in range
  if (ageWeeks >= 52) {
    return weightKg >= adultRange.min && weightKg <= adultRange.max
  }

  // For puppies, use proportional expectation
  const ageRatio = Math.min(ageWeeks / 52, 1)
  const expectedMin = adultRange.min * ageRatio * 0.5
  const expectedMax = adultRange.max * ageRatio * 1.5

  return weightKg >= expectedMin && weightKg <= expectedMax
}

// Gender Differences

/**
 * Gets typical male to female weight ratio for breed
 * Males typically weigh 10-15% more than females
 */
export function getMaleToFemaleRatio(breedCategory: BreedCategory): number {
  const ratios: Record<BreedCategory, number> = {
    toy: 1.05, // 5% difference
    small: 1.08,
    medium: 1.10,
    large: 1.12,
    giant: 1.15, // 15% difference
  }
  return ratios[breedCategory]
}

/**
 * Adjusts expected weight based on gender
 */
export function adjustWeightForGender(
  baseWeight: number,
  gender: Gender,
  breedCategory: BreedCategory
): number {
  const ratio = getMaleToFemaleRatio(breedCategory)

  if (gender === 'male') {
    return baseWeight * ratio
  }

  return baseWeight / ratio
}
