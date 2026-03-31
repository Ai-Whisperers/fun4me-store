/**
 * Number Formatting Utilities
 *
 * Centralized number formatting for the multi-tenant veterinary platform.
 * All numbers formatted in Spanish (es-PY locale).
 */

/**
 * Format number with locale-specific thousands separators
 *
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted number string
 *
 * @example
 * formatNumber(1500) // "1.500"
 * formatNumber(1500.567, 2) // "1.500,57"
 */
export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('es-PY', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/**
 * Format percentage
 *
 * @param value - Decimal value (e.g., 0.15 for 15%)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 *
 * @example
 * formatPercentage(0.15) // "15,0%"
 * formatPercentage(0.1567, 2) // "15,67%"
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${formatNumber(value * 100, decimals)}%`
}

/**
 * Format file size in bytes to human-readable format
 *
 * @param bytes - File size in bytes
 * @returns Formatted size string (e.g., "2,5 MB")
 *
 * @example
 * formatBytes(0) // "0 B"
 * formatBytes(1024) // "1 KB"
 * formatBytes(1536000) // "1,5 MB"
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * Format weight (kilograms or grams for small animals)
 *
 * @param kg - Weight in kilograms
 * @returns Formatted weight string (e.g., "2,5 kg", "500 g")
 *
 * @example
 * formatWeight(2.5) // "2,5 kg"
 * formatWeight(0.5) // "500 g"
 * formatWeight(0.025) // "25 g"
 */
export function formatWeight(kg: number): string {
  if (kg < 1) {
    return `${Math.round(kg * 1000)} g`
  }
  return `${formatNumber(kg, 1)} kg`
}

/**
 * Format temperature in Celsius
 *
 * @param celsius - Temperature in degrees Celsius
 * @returns Formatted temperature string (e.g., "38,5°C")
 *
 * @example
 * formatTemperature(38.5) // "38,5°C"
 * formatTemperature(39) // "39,0°C"
 */
export function formatTemperature(celsius: number): string {
  return `${formatNumber(celsius, 1)}°C`
}

/**
 * Format heart rate in beats per minute
 *
 * @param bpm - Beats per minute
 * @returns Formatted heart rate string (e.g., "120 bpm")
 *
 * @example
 * formatHeartRate(120) // "120 bpm"
 */
export function formatHeartRate(bpm: number): string {
  return `${formatNumber(bpm, 0)} bpm`
}

/**
 * Format respiratory rate in breaths per minute
 *
 * @param rpm - Respirations per minute
 * @returns Formatted respiratory rate string (e.g., "30 rpm")
 *
 * @example
 * formatRespiratoryRate(30) // "30 rpm"
 */
export function formatRespiratoryRate(rpm: number): string {
  return `${formatNumber(rpm, 0)} rpm`
}

/**
 * Format dosage (medication amount)
 *
 * @param amount - Dosage amount
 * @param unit - Unit of measurement (e.g., "mg", "ml", "mg/kg")
 * @returns Formatted dosage string (e.g., "250 mg", "2,5 ml")
 *
 * @example
 * formatDosage(250, 'mg') // "250 mg"
 * formatDosage(2.5, 'ml') // "2,5 ml"
 */
export function formatDosage(amount: number, unit: string): string {
  const decimals = amount < 10 ? 1 : 0
  return `${formatNumber(amount, decimals)} ${unit}`
}

/**
 * Format volume (for fluids, medications)
 *
 * @param ml - Volume in milliliters
 * @returns Formatted volume string (e.g., "250 ml", "1,5 L")
 *
 * @example
 * formatVolume(250) // "250 ml"
 * formatVolume(1500) // "1,5 L"
 */
export function formatVolume(ml: number): string {
  if (ml >= 1000) {
    return `${formatNumber(ml / 1000, 1)} L`
  }
  return `${formatNumber(ml, 0)} ml`
}

/**
 * Format phone number for Paraguay (country code +595)
 *
 * @param phone - Phone number string
 * @returns Formatted phone number (e.g., "+595 981 123 456")
 *
 * @example
 * formatPhoneNumber("595981123456") // "+595 981 123 456"
 * formatPhoneNumber("0981123456") // "+595 981 123 456"
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '')

  // Handle Paraguay format
  if (digits.startsWith('595')) {
    const withoutCountry = digits.slice(3)
    return `+595 ${withoutCountry.slice(0, 3)} ${withoutCountry.slice(3, 6)} ${withoutCountry.slice(6)}`
  }

  if (digits.startsWith('0')) {
    const withoutZero = digits.slice(1)
    return `+595 ${withoutZero.slice(0, 3)} ${withoutZero.slice(3, 6)} ${withoutZero.slice(6)}`
  }

  return `+595 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
}

/**
 * Parse formatted number string to number
 *
 * @param value - Formatted number string (e.g., "1.500,50")
 * @returns Numeric value
 *
 * @example
 * parseNumber("1.500,50") // 1500.50
 * parseNumber("1.500") // 1500
 */
export function parseNumber(value: string): number {
  // Replace thousands separator (.) and decimal separator (,)
  const normalized = value.replace(/\./g, '').replace(',', '.')
  return parseFloat(normalized) || 0
}

/**
 * Format compact number (e.g., 1.2K, 1.5M)
 *
 * @param value - Number to format
 * @returns Compact formatted string
 *
 * @example
 * formatCompactNumber(1200) // "1,2K"
 * formatCompactNumber(1500000) // "1,5M"
 */
export function formatCompactNumber(value: number): string {
  if (value >= 1000000) {
    return `${formatNumber(value / 1000000, 1)}M`
  }
  if (value >= 1000) {
    return `${formatNumber(value / 1000, 1)}K`
  }
  return formatNumber(value, 0)
}
