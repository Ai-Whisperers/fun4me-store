/**
 * Date Formatting Utilities
 *
 * Centralized date/time formatting for the multi-tenant veterinary platform.
 * All dates formatted in Spanish (es-PY locale) for Paraguay market.
 */

import {
  format,
  formatDistanceToNow,
  isToday,
  isYesterday,
  parseISO,
  differenceInYears,
  differenceInMonths,
  differenceInDays,
} from 'date-fns'
import { es } from 'date-fns/locale'

/**
 * Normalize date input to Date object
 *
 * @param date - Date string, Date object, or null
 * @returns Date object or null
 */
function normalizeDate(date: Date | string | null | undefined): Date | null {
  if (!date) return null
  return typeof date === 'string' ? parseISO(date) : date
}

/**
 * Format date with custom pattern
 *
 * @param date - Date to format
 * @param pattern - date-fns format pattern (defaults to dd/MM/yyyy)
 * @returns Formatted date string in Spanish
 *
 * @example
 * formatDate(new Date('2024-12-19')) // "19/12/2024"
 * formatDate('2024-12-19', 'dd MMM yyyy') // "19 dic 2024"
 */
export function formatDate(date: Date | string | null | undefined, pattern = 'dd/MM/yyyy'): string {
  const d = normalizeDate(date)
  if (!d) return ''
  return format(d, pattern, { locale: es })
}

/**
 * Format date with time (most common use case)
 *
 * @param date - Date to format
 * @returns Formatted datetime string (e.g., "19/12/2024 a las 14:30")
 *
 * @example
 * formatDateTime('2024-12-19T14:30:00') // "19/12/2024 a las 14:30"
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  return formatDate(date, "dd/MM/yyyy 'a las' HH:mm")
}

/**
 * Format time only
 *
 * @param date - Date to format
 * @returns Time string (e.g., "14:30")
 *
 * @example
 * formatTime('2024-12-19T14:30:00') // "14:30"
 */
export function formatTime(date: Date | string | null | undefined): string {
  return formatDate(date, 'HH:mm')
}

/**
 * Format date relative to now (e.g., "Hoy a las 14:30", "hace 2 días")
 *
 * @param date - Date to format
 * @returns Relative date string in Spanish
 *
 * @example
 * formatRelative(new Date()) // "Hoy a las 14:30"
 * formatRelative(yesterday) // "Ayer a las 10:15"
 * formatRelative(twoDaysAgo) // "hace 2 días"
 */
export function formatRelative(date: Date | string | null | undefined): string {
  const d = normalizeDate(date)
  if (!d) return ''

  if (isToday(d)) return `Hoy a las ${format(d, 'HH:mm', { locale: es })}`
  if (isYesterday(d)) return `Ayer a las ${format(d, 'HH:mm', { locale: es })}`

  return formatDistanceToNow(d, { addSuffix: true, locale: es })
}

/**
 * Format date range
 *
 * @param start - Start date
 * @param end - End date
 * @returns Formatted range (same day shows time range, different days show full datetimes)
 *
 * @example
 * formatDateRange('2024-12-19T10:00', '2024-12-19T12:00') // "19/12/2024 10:00 - 12:00"
 * formatDateRange('2024-12-19T10:00', '2024-12-20T12:00') // "19/12/2024 a las 10:00 - 20/12/2024 a las 12:00"
 */
export function formatDateRange(start: Date | string, end: Date | string): string {
  const s = typeof start === 'string' ? parseISO(start) : start
  const e = typeof end === 'string' ? parseISO(end) : end

  if (format(s, 'yyyy-MM-dd') === format(e, 'yyyy-MM-dd')) {
    return `${format(s, 'dd/MM/yyyy')} ${format(s, 'HH:mm')} - ${format(e, 'HH:mm')}`
  }

  return `${formatDateTime(s)} - ${formatDateTime(e)}`
}

/**
 * Format pet/patient age from birth date
 *
 * @param birthDate - Birth date
 * @returns Human-readable age in Spanish (e.g., "2 años, 3 meses", "5 meses", "1 año")
 *
 * @example
 * formatAge('2022-06-15') // "2 años, 6 meses"
 * formatAge('2024-08-01') // "4 meses"
 */
export function formatAge(birthDate: Date | string | null | undefined): string {
  const d = normalizeDate(birthDate)
  if (!d) return ''

  const years = differenceInYears(new Date(), d)
  const months = differenceInMonths(new Date(), d) % 12

  if (years === 0) {
    return months === 1 ? '1 mes' : `${months} meses`
  }
  if (months === 0) {
    return years === 1 ? '1 año' : `${years} años`
  }
  return `${years} año${years > 1 ? 's' : ''}, ${months} mes${months > 1 ? 'es' : ''}`
}

/**
 * Format age in days for very young pets (puppies/kittens)
 *
 * @param birthDate - Birth date
 * @returns Age in days if less than 60 days, otherwise returns formatted age
 *
 * @example
 * formatAgeInDays('2024-12-01') // "18 días"
 * formatAgeInDays('2022-01-01') // "2 años, 11 meses"
 */
export function formatAgeInDays(birthDate: Date | string | null | undefined): string {
  const d = normalizeDate(birthDate)
  if (!d) return ''

  const days = differenceInDays(new Date(), d)

  if (days < 60) {
    return days === 1 ? '1 día' : `${days} días`
  }

  return formatAge(d)
}

/**
 * Format date for input value (YYYY-MM-DD) using local timezone
 *
 * @param date - Date to format
 * @returns ISO date string for HTML date inputs
 *
 * @example
 * getLocalDateString(new Date('2024-12-19')) // "2024-12-19"
 */
export function getLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Format date in short format (e.g., "19 dic")
 *
 * @param date - Date to format
 * @returns Short date string
 *
 * @example
 * formatDateShort('2024-12-19') // "19 dic"
 */
export function formatDateShort(date: Date | string | null | undefined): string {
  return formatDate(date, 'dd MMM')
}

/**
 * Format date in long format (e.g., "19 de diciembre de 2024")
 *
 * @param date - Date to format
 * @returns Long date string in Spanish
 *
 * @example
 * formatDateLong('2024-12-19') // "19 de diciembre de 2024"
 */
export function formatDateLong(date: Date | string | null | undefined): string {
  return formatDate(date, "dd 'de' MMMM 'de' yyyy")
}
