/**
 * Base Factory - Common utilities for all factories
 */

import { randomUUID } from 'crypto'
import { BusinessHours, DEFAULT_BUSINESS_HOURS, TimeRange, getDefaultTimeRange } from './types'

// Counter for sequential IDs when UUID not needed
let sequenceCounter = 0

export function generateId(): string {
  return randomUUID()
}

export function generateSequence(prefix: string): string {
  return `${prefix}-${++sequenceCounter}`
}

export function resetSequence(): void {
  sequenceCounter = 0
}

/**
 * Generate a random date within a time range, respecting business hours
 */
export function randomBusinessDate(
  range: TimeRange = getDefaultTimeRange(),
  hours: BusinessHours = DEFAULT_BUSINESS_HOURS
): Date {
  const { startDate, endDate } = range
  const { startHour, endHour, workDays } = hours

  let attempts = 0
  const maxAttempts = 100

  while (attempts < maxAttempts) {
    // Random timestamp between start and end
    const timestamp =
      startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime())
    const date = new Date(timestamp)

    // Check if it's a work day
    const dayOfWeek = date.getDay()
    if (!workDays.includes(dayOfWeek)) {
      attempts++
      continue
    }

    // Set random hour within business hours
    const hour = startHour + Math.floor(Math.random() * (endHour - startHour))
    const minutes = Math.floor(Math.random() * 4) * 15 // 0, 15, 30, 45

    date.setHours(hour, minutes, 0, 0)
    return date
  }

  // Fallback: just return a date within range
  const timestamp = startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime())
  return new Date(timestamp)
}

/**
 * Generate a random date in the past (for historical data)
 */
export function randomPastDate(monthsBack: number = 3): Date {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - monthsBack)
  return randomBusinessDate({ startDate, endDate })
}

/**
 * Generate a random date in the future (for scheduled appointments)
 */
export function randomFutureDate(daysAhead: number = 30): Date {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() + 1) // Tomorrow
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + daysAhead)
  return randomBusinessDate({ startDate, endDate })
}

/**
 * Generate random phone number (Paraguay format)
 */
export function randomPhone(): string {
  const prefix = Math.random() > 0.5 ? '981' : '982'
  const number = Math.floor(100000 + Math.random() * 900000)
  return `+595${prefix}${number}`
}

/**
 * Generate random email
 */
export function randomEmail(name: string): string {
  const cleanName = name
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z.]/g, '')
  const domain = Math.random() > 0.5 ? 'gmail.com' : 'hotmail.com'
  const suffix = Math.floor(Math.random() * 1000)
  return `${cleanName}${suffix}@${domain}`
}

/**
 * Pick random item from array
 */
export function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

/**
 * Pick N random items from array
 */
export function pickN<T>(items: T[], n: number): T[] {
  const shuffled = [...items].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(n, items.length))
}

/**
 * Generate random weight for pet (kg)
 */
export function randomWeight(species: string, ageYears: number = 3): number {
  let baseWeight: number
  let variance: number

  switch (species) {
    case 'dog':
      baseWeight = 15 + Math.random() * 25 // 15-40 kg
      variance = 0.2
      break
    case 'cat':
      baseWeight = 3 + Math.random() * 4 // 3-7 kg
      variance = 0.15
      break
    case 'bird':
      baseWeight = 0.05 + Math.random() * 0.5 // 50g-550g
      variance = 0.1
      break
    case 'rabbit':
      baseWeight = 1 + Math.random() * 3 // 1-4 kg
      variance = 0.15
      break
    default:
      baseWeight = 5 + Math.random() * 10
      variance = 0.2
  }

  // Adjust for age
  if (ageYears < 1) {
    baseWeight *= 0.3 + ageYears * 0.7
  }

  // Add some variance
  const weight = baseWeight * (1 + (Math.random() - 0.5) * variance)
  return Math.round(weight * 10) / 10 // 1 decimal place
}

/**
 * Generate random birth date for pet
 * Ensures birth date is always in the past
 */
export function randomBirthDate(profile: 'puppy' | 'senior' | 'standard' = 'standard'): Date {
  const now = new Date()
  let daysBack: number

  switch (profile) {
    case 'puppy':
      daysBack = 30 + Math.floor(Math.random() * 335) // 1-12 months old
      break
    case 'senior':
      daysBack = 365 * 8 + Math.floor(Math.random() * 365 * 7) // 8-15 years
      break
    default:
      daysBack = 365 + Math.floor(Math.random() * 365 * 7) // 1-8 years
  }

  const birthDate = new Date(now)
  birthDate.setDate(birthDate.getDate() - daysBack)
  birthDate.setHours(0, 0, 0, 0)

  return birthDate
}

/**
 * Generate Paraguayan Guaraní amount
 */
export function randomAmount(min: number = 50000, max: number = 500000): number {
  // Round to nearest 1000 Gs
  return Math.round((min + Math.random() * (max - min)) / 1000) * 1000
}

/**
 * Paraguayan names for realistic data
 */
export const PARAGUAYAN_FIRST_NAMES = [
  'Juan',
  'María',
  'Carlos',
  'Ana',
  'Luis',
  'Rosa',
  'José',
  'Carmen',
  'Pedro',
  'Lucía',
  'Miguel',
  'Sofía',
  'Diego',
  'Valeria',
  'Andrés',
  'Gabriela',
  'Fernando',
  'Patricia',
  'Roberto',
  'Claudia',
]

export const PARAGUAYAN_LAST_NAMES = [
  'González',
  'Rodríguez',
  'López',
  'Martínez',
  'García',
  'Fernández',
  'Sánchez',
  'Pérez',
  'Ramírez',
  'Torres',
  'Acosta',
  'Benítez',
  'Villalba',
  'Giménez',
  'Romero',
  'Díaz',
  'Vera',
  'Rojas',
]

export const DOG_BREEDS = [
  'Labrador Retriever',
  'Pastor Alemán',
  'Golden Retriever',
  'Bulldog',
  'Poodle',
  'Beagle',
  'Rottweiler',
  'Yorkshire Terrier',
  'Boxer',
  'Schnauzer',
  'Chihuahua',
  'Dachshund',
  'Shih Tzu',
  'Mestizo',
]

export const CAT_BREEDS = [
  'Siamés',
  'Persa',
  'Maine Coon',
  'Ragdoll',
  'Bengala',
  'Abisinio',
  'Británico de pelo corto',
  'Mestizo',
]

export const PET_NAMES = [
  'Max',
  'Luna',
  'Rocky',
  'Bella',
  'Buddy',
  'Coco',
  'Charlie',
  'Mia',
  'Thor',
  'Lola',
  'Duke',
  'Daisy',
  'Zeus',
  'Maggie',
  'Bruno',
  'Sadie',
  'Jack',
  'Chloe',
  'Tucker',
  'Penny',
  'Rex',
  'Kiara',
  'Simba',
  'Nina',
]

export const PET_COLORS = [
  'Negro',
  'Blanco',
  'Marrón',
  'Dorado',
  'Gris',
  'Atigrado',
  'Bicolor',
  'Tricolor',
  'Crema',
  'Canela',
]
