/**
 * Vitals Recording
 *
 * Pure functions for hospitalization vitals management including:
 * - Normal vital ranges by species
 * - Pain score interpretation
 * - Clinical interpretations (CRT, mucous membrane color)
 * - Critical value detection
 * - Monitoring frequency calculation
 * - Data validation
 */

// Types

export type Species = 'dog' | 'cat'

export type PainLevel = 'no_pain' | 'mild' | 'moderate' | 'severe' | 'extreme'

export type CRTInterpretation = 'normal' | 'delayed' | 'severely_delayed'

export type Severity = 'normal' | 'warning' | 'critical' | 'unknown'

export type AcuityLevel = 'critical' | 'high' | 'medium' | 'low' | 'routine'

export interface VitalRange {
  min: number
  max: number
}

export interface SpeciesVitalRanges {
  temperature: VitalRange
  heart_rate: VitalRange
  respiratory_rate: VitalRange
}

export interface CriticalRange {
  low: number
  high: number
}

export interface SpeciesCriticalRanges {
  temperature: CriticalRange
  heart_rate: CriticalRange
  respiratory_rate: CriticalRange
}

export interface MMInterpretation {
  severity: Severity
  possibleCause: string
}

// Constants

export const DOG_VITAL_RANGES: SpeciesVitalRanges = {
  temperature: { min: 38.0, max: 39.2 },
  heart_rate: { min: 60, max: 140 },
  respiratory_rate: { min: 10, max: 30 },
}

export const CAT_VITAL_RANGES: SpeciesVitalRanges = {
  temperature: { min: 38.0, max: 39.4 },
  heart_rate: { min: 120, max: 220 },
  respiratory_rate: { min: 20, max: 40 },
}

export const VITAL_RANGES: Record<Species, SpeciesVitalRanges> = {
  dog: DOG_VITAL_RANGES,
  cat: CAT_VITAL_RANGES,
}

export const CRITICAL_RANGES: Record<Species, SpeciesCriticalRanges> = {
  dog: {
    temperature: { low: 36.5, high: 41.0 },
    heart_rate: { low: 40, high: 180 },
    respiratory_rate: { low: 5, high: 60 },
  },
  cat: {
    temperature: { low: 36.5, high: 41.0 },
    heart_rate: { low: 100, high: 260 },
    respiratory_rate: { low: 10, high: 80 },
  },
}

export const MONITORING_INTERVALS: Record<AcuityLevel, number> = {
  critical: 1,
  high: 2,
  medium: 4,
  low: 8,
  routine: 12,
}

export const MM_INTERPRETATIONS: Record<string, MMInterpretation> = {
  pink: { severity: 'normal', possibleCause: 'None - healthy' },
  pale: { severity: 'warning', possibleCause: 'Anemia, blood loss, shock' },
  white: { severity: 'critical', possibleCause: 'Severe anemia, shock' },
  cyanotic: { severity: 'critical', possibleCause: 'Hypoxia, respiratory failure' },
  yellow: { severity: 'warning', possibleCause: 'Liver disease, hemolysis' },
  brick_red: { severity: 'warning', possibleCause: 'Sepsis, heat stroke, toxicity' },
  muddy: { severity: 'critical', possibleCause: 'Septic shock, severe illness' },
}

// Pain Score Interpretation

/**
 * Interprets a pain score (0-10) into a clinical pain level
 */
export function interpretPainScore(score: number): PainLevel {
  if (score === 0) return 'no_pain'
  if (score <= 3) return 'mild'
  if (score <= 6) return 'moderate'
  if (score <= 9) return 'severe'
  return 'extreme'
}

// Capillary Refill Time (CRT) Interpretation

/**
 * Interprets capillary refill time in seconds
 */
export function interpretCRT(seconds: number): CRTInterpretation {
  if (seconds <= 2) return 'normal'
  if (seconds <= 4) return 'delayed'
  return 'severely_delayed'
}

// Mucous Membrane Color Interpretation

/**
 * Interprets mucous membrane color for clinical assessment
 */
export function interpretMMColor(color: string): MMInterpretation {
  return MM_INTERPRETATIONS[color] || { severity: 'unknown', possibleCause: 'Unknown' }
}

// Temperature Assessment

/**
 * Checks if a dog has a fever
 */
export function isDogFever(temp: number): boolean {
  return temp > 39.2
}

/**
 * Checks if a dog has hypothermia
 */
export function isDogHypothermia(temp: number): boolean {
  return temp < 37.5
}

// Critical Value Detection

/**
 * Checks if a vital sign value is in the critical range for a species
 */
export function isCritical(
  vital: 'temperature' | 'heart_rate' | 'respiratory_rate',
  value: number,
  species: Species
): boolean {
  const range = CRITICAL_RANGES[species]?.[vital]
  if (!range) return false
  return value < range.low || value > range.high
}

// Monitoring Frequency

/**
 * Gets the monitoring interval in hours based on patient acuity level
 */
export function getMonitoringIntervalHours(acuity: string): number {
  return MONITORING_INTERVALS[acuity as AcuityLevel] || 12
}

// Overdue Detection

/**
 * Checks if vitals recording is overdue
 */
export function isVitalsOverdue(
  lastRecordedAt: Date,
  intervalHours: number,
  now: Date = new Date()
): boolean {
  const hoursSinceLastReading = (now.getTime() - lastRecordedAt.getTime()) / (1000 * 60 * 60)
  return hoursSinceLastReading > intervalHours
}

// Data Validation

/**
 * Validates temperature is within possible range
 */
export function isValidTemperature(temp: number): boolean {
  return temp >= 35 && temp <= 43
}

/**
 * Validates heart rate is within possible range
 */
export function isValidHeartRate(hr: number): boolean {
  return hr >= 20 && hr <= 300
}

/**
 * Validates respiratory rate is within possible range
 */
export function isValidRespiratoryRate(rr: number): boolean {
  return rr >= 5 && rr <= 100
}

/**
 * Validates pain score is valid (0-10 integer)
 */
export function isValidPainScore(score: number): boolean {
  return score >= 0 && score <= 10 && Number.isInteger(score)
}

// Authorization

/**
 * Checks if a role can record vitals
 */
export function canRecordVitals(role: string): boolean {
  return ['vet', 'admin'].includes(role)
}

// Trending Analysis

/**
 * Checks if an array of readings is increasing
 */
export function isIncreasingTrend(readings: number[]): boolean {
  return readings.every((val, i) => i === 0 || val > readings[i - 1])
}

/**
 * Checks if an array of readings is decreasing (stabilizing)
 */
export function isDecreasingTrend(readings: number[]): boolean {
  return readings.every((val, i) => i === 0 || val <= readings[i - 1])
}

/**
 * Calculates average of readings
 */
export function calculateAverageReading(readings: number[]): number {
  if (readings.length === 0) return 0
  return readings.reduce((a, b) => a + b, 0) / readings.length
}
