/**
 * Service Subscriptions Dashboard Utilities
 *
 * REF-006: Formatting utilities extracted from client component
 */

import { formatInTimeZone } from 'date-fns-tz'
import { es } from 'date-fns/locale'
import { STATUS_STYLES, STATUS_LABELS, FREQUENCY_MAP } from './constants'

/**
 * Format date for display
 */
export function formatDate(dateStr: string): string {
  return formatInTimeZone(new Date(dateStr), 'America/Asuncion', 'd MMM yyyy', { locale: es })
}

/**
 * Format frequency for display
 */
export function formatFrequency(freq: string): string {
  return FREQUENCY_MAP[freq] || freq
}

/**
 * Get status badge styles
 */
export function getStatusStyles(status: string): string {
  return STATUS_STYLES[status] || STATUS_STYLES.pending
}

/**
 * Get status label
 */
export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status
}

/**
 * Format price for display
 */
export function formatPrice(amount: number): string {
  return `${amount.toLocaleString('es-PY')} Gs`
}
