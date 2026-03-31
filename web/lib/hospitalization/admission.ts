/**
 * Hospitalization Admission
 *
 * Pure functions for hospitalization admission workflow including:
 * - Hospitalization number generation
 * - Status transitions
 * - Kennel state management
 * - Business rules validation
 */

// Types

export type HospitalizationType = 'surgery' | 'observation' | 'treatment' | 'emergency' | 'boarding'

export type HospitalizationStatus = 'active' | 'discharged' | 'deceased' | 'transferred'

export type KennelStatus = 'available' | 'occupied' | 'maintenance' | 'reserved'

export type AcuityLevel = 'routine' | 'low' | 'medium' | 'high' | 'critical'

export interface StatusTransitions {
  active: HospitalizationStatus[]
  discharged: HospitalizationStatus[]
  deceased: HospitalizationStatus[]
  transferred: HospitalizationStatus[]
}

export interface HospitalizationScenario {
  hospitalization_type: HospitalizationType
  acuity_level: AcuityLevel
  typical_duration_hours?: number
  typical_duration_days?: number
  required_monitoring: string[]
}

// Constants

export const VALID_HOSPITALIZATION_TYPES: HospitalizationType[] = [
  'surgery',
  'observation',
  'treatment',
  'emergency',
  'boarding',
]

export const VALID_ACUITY_LEVELS: AcuityLevel[] = [
  'routine',
  'low',
  'medium',
  'high',
  'critical',
]

export const VALID_KENNEL_STATUSES: KennelStatus[] = [
  'available',
  'occupied',
  'maintenance',
  'reserved',
]

export const VALID_STATUS_TRANSITIONS: StatusTransitions = {
  active: ['discharged', 'deceased', 'transferred'],
  discharged: [], // Terminal state
  deceased: [], // Terminal state
  transferred: [], // Terminal state
}

// Hospitalization Number Generation

/**
 * Generates a hospitalization number in format H-YYYY-NNNN
 * @param existingCount - The count of existing hospitalizations for the current year
 */
export function generateHospitalizationNumber(existingCount: number): string {
  const year = new Date().getFullYear()
  const sequence = String(existingCount + 1).padStart(4, '0')
  return `H-${year}-${sequence}`
}

/**
 * Validates hospitalization number format
 */
export function isValidHospitalizationNumber(number: string): boolean {
  const pattern = /^H-\d{4}-\d{4,}$/
  return pattern.test(number)
}

// Kennel State Management

/**
 * Checks if a kennel is available for admission
 */
export function canAdmitToKennel(kennelStatus: KennelStatus): boolean {
  return kennelStatus === 'available'
}

/**
 * Validates kennel status
 */
export function isValidKennelStatus(status: string): status is KennelStatus {
  return VALID_KENNEL_STATUSES.includes(status as KennelStatus)
}

// Status Transitions

/**
 * Gets valid transitions from a given status
 */
export function getValidTransitionsFrom(status: HospitalizationStatus): HospitalizationStatus[] {
  return VALID_STATUS_TRANSITIONS[status] || []
}

/**
 * Checks if a status transition is valid
 */
export function isValidStatusTransition(
  fromStatus: HospitalizationStatus,
  toStatus: HospitalizationStatus
): boolean {
  const validTransitions = getValidTransitionsFrom(fromStatus)
  return validTransitions.includes(toStatus)
}

/**
 * Checks if a status is terminal (no further transitions allowed)
 */
export function isTerminalStatus(status: HospitalizationStatus): boolean {
  return getValidTransitionsFrom(status).length === 0
}

// Type Validation

/**
 * Validates hospitalization type
 */
export function isValidHospitalizationType(type: string): type is HospitalizationType {
  return VALID_HOSPITALIZATION_TYPES.includes(type as HospitalizationType)
}

/**
 * Validates acuity level
 */
export function isValidAcuityLevel(level: string): level is AcuityLevel {
  return VALID_ACUITY_LEVELS.includes(level as AcuityLevel)
}

// Typical Scenarios

export const POST_SURGERY_SCENARIO: HospitalizationScenario = {
  hospitalization_type: 'surgery',
  acuity_level: 'medium',
  typical_duration_hours: 24,
  required_monitoring: ['vitals', 'pain', 'wound'],
}

export const EMERGENCY_CRITICAL_SCENARIO: HospitalizationScenario = {
  hospitalization_type: 'emergency',
  acuity_level: 'critical',
  typical_duration_hours: 72,
  required_monitoring: ['vitals', 'labs', 'continuous'],
}

export const BOARDING_SCENARIO: HospitalizationScenario = {
  hospitalization_type: 'boarding',
  acuity_level: 'routine',
  typical_duration_days: 7,
  required_monitoring: ['feeding', 'behavior'],
}

/**
 * Gets suggested monitoring requirements for a scenario
 */
export function getSuggestedMonitoring(
  type: HospitalizationType,
  acuity: AcuityLevel
): string[] {
  if (acuity === 'critical') {
    return ['vitals', 'labs', 'continuous']
  }

  if (type === 'surgery') {
    return ['vitals', 'pain', 'wound']
  }

  if (type === 'boarding') {
    return ['feeding', 'behavior']
  }

  if (acuity === 'high') {
    return ['vitals', 'pain']
  }

  return ['vitals']
}

// Authorization

/**
 * Checks if a role can admit patients
 */
export function canAdmitPatients(role: string): boolean {
  return ['vet', 'admin'].includes(role)
}

/**
 * Checks if a role can discharge patients
 */
export function canDischargePatients(role: string): boolean {
  return ['vet', 'admin'].includes(role)
}
