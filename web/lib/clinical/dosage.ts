/**
 * Drug Dosage Calculations
 *
 * CRITICAL: These functions calculate drug dosages for patient safety.
 * Incorrect dosages can cause serious harm or death to animals.
 *
 * Functions cover:
 * - Weight-based dose calculations
 * - Species-specific adjustments
 * - Dose limits and boundaries
 * - Age considerations (pediatric/geriatric)
 * - Drug interaction detection
 */

// Types

export type Species = 'dog' | 'cat' | 'all'

export interface DrugDosage {
  id: string
  name: string
  species: Species
  dose_mg_per_kg: number
  route: string
  frequency: string
  contraindications?: string
  notes?: string
}

export interface DoseCalculation {
  drugName: string
  patientWeightKg: number
  doseMgPerKg: number
  calculatedDoseMg: number
  frequency: string
  route: string
  warnings: string[]
}

export interface DrugInteraction {
  detected: boolean
  drugs: string[]
  severity: 'low' | 'moderate' | 'high' | 'critical'
  message: string
}

// Constants

export const NSAIDS = ['Meloxicam', 'Carprofen', 'Rimadyl', 'Metacam', 'Previcox', 'Deracoxib']

export const CORTICOSTEROIDS = ['Prednisona', 'Prednisolona', 'Dexametasona', 'Triamcinolona']

// Common drug reference doses (mg/kg)
export const COMMON_DOSES: Record<string, Record<Species, number>> = {
  amoxicilina: { dog: 22, cat: 10, all: 15 },
  meloxicam: { dog: 0.2, cat: 0.05, all: 0.1 },
  metronidazol: { dog: 15, cat: 15, all: 15 },
  epinephrine: { dog: 0.01, cat: 0.01, all: 0.01 },
}

// Maximum safe daily doses (mg total)
export const MAX_DAILY_DOSES: Record<string, Record<Species, number>> = {
  meloxicam: { dog: 10, cat: 1, all: 10 },
  amoxicilina: { dog: 2000, cat: 500, all: 2000 },
}

// Dose Calculations

/**
 * Calculates the dose based on weight and mg/kg
 * Returns the dose in mg, rounded to 2 decimal places
 */
export function calculateDose(weightKg: number, doseMgPerKg: number): number {
  return Math.round(weightKg * doseMgPerKg * 100) / 100
}

/**
 * Calculates a full treatment course dose
 */
export function calculateTreatmentCourse(
  weightKg: number,
  doseMgPerKg: number,
  administrationsPerDay: number,
  days: number
): { dosePerAdmin: number; dailyDose: number; totalDose: number } {
  const dosePerAdmin = calculateDose(weightKg, doseMgPerKg)
  const dailyDose = dosePerAdmin * administrationsPerDay
  const totalDose = dailyDose * days

  return { dosePerAdmin, dailyDose, totalDose }
}

/**
 * Checks if calculated dose exceeds maximum safe dose
 */
export function exceedsMaxDose(
  calculatedDoseMg: number,
  drugName: string,
  species: Species
): boolean {
  const maxDose = MAX_DAILY_DOSES[drugName.toLowerCase()]
  if (!maxDose) return false

  const speciesMax = maxDose[species] || maxDose.all
  return calculatedDoseMg > speciesMax
}

/**
 * Gets species-specific dose for a drug
 */
export function getSpeciesDose(drugName: string, species: Species): number | null {
  const doses = COMMON_DOSES[drugName.toLowerCase()]
  if (!doses) return null

  return doses[species] || doses.all || null
}

// Age Considerations

/**
 * Determines if a patient is pediatric based on age in weeks
 */
export function isPediatric(ageWeeks: number): boolean {
  return ageWeeks < 12
}

/**
 * Determines if a dog is geriatric based on age in years
 */
export function isGeriatricDog(ageYears: number): boolean {
  return ageYears > 7
}

/**
 * Determines if a cat is geriatric based on age in years
 */
export function isGeriatricCat(ageYears: number): boolean {
  return ageYears > 10
}

/**
 * Gets age-based dosing adjustment factor
 */
export function getAgeAdjustmentFactor(
  species: 'dog' | 'cat',
  ageWeeks?: number,
  ageYears?: number
): { factor: number; reason?: string } {
  if (ageWeeks !== undefined && isPediatric(ageWeeks)) {
    return { factor: 0.75, reason: 'Paciente pediátrico - dosis reducida' }
  }

  if (ageYears !== undefined) {
    const isGeriatric = species === 'dog' ? isGeriatricDog(ageYears) : isGeriatricCat(ageYears)
    if (isGeriatric) {
      return { factor: 0.85, reason: 'Paciente geriátrico - considerar reducción de dosis' }
    }
  }

  return { factor: 1.0 }
}

// Drug Interactions

/**
 * Checks for concurrent NSAID use (dangerous)
 */
export function detectConcurrentNSAIDs(currentMedications: string[]): DrugInteraction {
  const nsaidMatches = currentMedications.filter((med) =>
    NSAIDS.some((nsaid) => med.toLowerCase().includes(nsaid.toLowerCase()))
  )

  if (nsaidMatches.length > 1) {
    return {
      detected: true,
      drugs: nsaidMatches,
      severity: 'critical',
      message: 'PELIGRO: Múltiples AINEs. Riesgo severo de ulceración GI y daño renal.',
    }
  }

  return { detected: false, drugs: [], severity: 'low', message: '' }
}

/**
 * Checks for NSAID + Corticosteroid interaction (dangerous)
 */
export function detectNSAIDSteroidInteraction(currentMedications: string[]): DrugInteraction {
  const hasNSAID = currentMedications.some((med) =>
    NSAIDS.some((nsaid) => med.toLowerCase().includes(nsaid.toLowerCase()))
  )

  const hasSteroid = currentMedications.some((med) =>
    CORTICOSTEROIDS.some((steroid) => med.toLowerCase().includes(steroid.toLowerCase()))
  )

  if (hasNSAID && hasSteroid) {
    return {
      detected: true,
      drugs: currentMedications.filter(
        (med) =>
          NSAIDS.some((n) => med.toLowerCase().includes(n.toLowerCase())) ||
          CORTICOSTEROIDS.some((s) => med.toLowerCase().includes(s.toLowerCase()))
      ),
      severity: 'critical',
      message: 'PELIGRO: AINE + Corticosteroide. Riesgo extremo de ulceración GI.',
    }
  }

  return { detected: false, drugs: [], severity: 'low', message: '' }
}

/**
 * Checks all drug interactions
 */
export function checkDrugInteractions(currentMedications: string[]): DrugInteraction[] {
  const interactions: DrugInteraction[] = []

  const nsaidInteraction = detectConcurrentNSAIDs(currentMedications)
  if (nsaidInteraction.detected) {
    interactions.push(nsaidInteraction)
  }

  const steroidInteraction = detectNSAIDSteroidInteraction(currentMedications)
  if (steroidInteraction.detected) {
    interactions.push(steroidInteraction)
  }

  return interactions
}

// Contraindication Checks

/**
 * Checks if NSAID is contraindicated for renal patients
 */
export function isNSAIDContraindicatedForRenal(patientConditions: string[]): boolean {
  return patientConditions.some((condition) => condition.toLowerCase().includes('renal'))
}

// Authorization

/**
 * Checks if a role can access drug dosage information
 */
export function canAccessDrugDosages(role: string): boolean {
  return ['vet', 'admin'].includes(role)
}

// Species Safety Margins

/**
 * Gets the safety ratio between dog and cat doses for a drug
 * Higher ratios indicate drugs where cat dosing is much lower (more dangerous for cats)
 */
export function getSpeciesSafetyRatio(drugName: string): number | null {
  const doses = COMMON_DOSES[drugName.toLowerCase()]
  if (!doses || !doses.dog || !doses.cat) return null

  return doses.dog / doses.cat
}
