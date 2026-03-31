/**
 * Factory Types - Common interfaces for builder-pattern factories
 */

export type Mode = 'test' | 'seed'

export interface FactoryResult<T> {
  data: T
  id: string
}

export interface FactoryContext {
  mode: Mode
  tenantId: string
  track: (table: string, id: string) => void
}

// Owner personas for distinct test scenarios
export type OwnerPersona =
  | 'vip' // High-value client, multiple pets, frequent visits
  | 'budget' // Price-conscious, minimal services
  | 'new' // Recently registered, little history
  | 'frequent' // Regular visitor, routine care
  | 'breeder' // Multiple pets of same breed
  | 'senior' // Owner of older pets with chronic conditions
  | 'emergency' // History of emergency visits
  | 'loyal' // Long-term client with loyalty points
  | 'inactive' // Hasn't visited in months
  | 'standard' // Average client profile

// Pet profiles for varied test data
export type PetProfile =
  | 'healthy' // No issues, routine care only
  | 'chronic' // Ongoing conditions, regular medication
  | 'senior' // Older pet, age-related care
  | 'puppy' // Young pet, frequent vaccine schedule
  | 'exotic' // Non-standard species
  | 'rescue' // Unknown history
  | 'show' // Purebred with pedigree
  | 'reactive' // History of vaccine reactions
  | 'overweight' // Weight management needed
  | 'standard' // Average pet profile

// Appointment scenarios
export type AppointmentScenario =
  | 'routine' // Regular checkup
  | 'vaccine' // Vaccination visit
  | 'emergency' // Urgent care
  | 'surgery' // Surgical procedure
  | 'followup' // Post-treatment follow-up
  | 'grooming' // Grooming service
  | 'dental' // Dental cleaning/procedure
  | 'lab' // Lab work only
  | 'consultation' // General consultation

// Store order scenarios
export type OrderScenario =
  | 'simple' // Regular products only
  | 'prescription' // Requires prescription approval
  | 'abandoned' // Cart not checked out
  | 'coupon' // With discount coupon
  | 'bulk' // Large order
  | 'mixed' // Combination of above

// Payment methods
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'points'

// Business hours configuration
export interface BusinessHours {
  startHour: number // e.g., 8
  endHour: number // e.g., 18
  workDays: number[] // 0=Sunday, 1=Monday, etc.
}

export const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  startHour: 8,
  endHour: 18,
  workDays: [1, 2, 3, 4, 5], // Monday-Friday
}

// Time range for historical data
export interface TimeRange {
  startDate: Date
  endDate: Date
}

export function getDefaultTimeRange(): TimeRange {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - 3) // 3 months ago
  return { startDate, endDate }
}
