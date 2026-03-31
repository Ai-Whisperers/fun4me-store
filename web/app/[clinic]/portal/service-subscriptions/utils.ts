/**
 * Portal Service Subscriptions Utilities
 *
 * REF-006: Utility functions extracted from client component
 */

import { formatInTimeZone } from 'date-fns-tz'
import { es } from 'date-fns/locale'
import { FREQUENCY_MAP, DAY_NAMES, TIME_SLOTS, STATUS_STYLES, STATUS_LABELS } from './constants'
import type { Plan } from './types'

export function formatDate(dateStr: string): string {
  return formatInTimeZone(new Date(dateStr), 'America/Asuncion', 'd MMM yyyy', { locale: es })
}

export function formatFrequency(freq: string): string {
  return FREQUENCY_MAP[freq] || freq
}

export function getDayName(day: number): string {
  return DAY_NAMES[day] || ''
}

export function getTimeSlotLabel(slot: string): string {
  return TIME_SLOTS[slot] || slot
}

export function getStatusStyles(status: string): string {
  return STATUS_STYLES[status] || STATUS_STYLES.pending
}

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status
}

export function formatPrice(price: number): string {
  return `${price.toLocaleString('es-PY')} Gs`
}

export function calculatePrice(
  plan: Plan,
  wantsPickup: boolean,
  wantsDelivery: boolean
): number {
  let price = plan.price_per_period
  if (plan.first_month_discount > 0) {
    price = price * (1 - plan.first_month_discount / 100)
  }
  if (wantsPickup && plan.includes_pickup) {
    price += plan.pickup_fee
  }
  if (wantsDelivery && plan.includes_delivery) {
    price += plan.delivery_fee
  }
  return price
}
