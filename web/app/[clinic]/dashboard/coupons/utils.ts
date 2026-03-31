/**
 * Coupons Dashboard Utilities
 *
 * REF-006: Formatting utilities extracted from client component
 */

import type { DiscountType } from './types'

/**
 * Format discount value based on type
 */
export function formatDiscountValue(type: DiscountType, value: number): string {
  if (type === 'percentage') return `${value}%`
  if (type === 'fixed_amount') return `₲ ${value.toLocaleString('es-PY')}`
  if (type === 'free_shipping') return 'Envío Gratis'
  return String(value)
}

/**
 * Format date for display
 */
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Sin límite'
  return new Date(dateStr).toLocaleDateString('es-PY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Generate random coupon code
 */
export function generateRandomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (_error: unknown) {
    return false
  }
}
