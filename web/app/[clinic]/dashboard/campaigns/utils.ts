/**
 * Campaigns Dashboard Utilities
 *
 * REF-006: Formatting utilities extracted from client component
 */

import type { DiscountType, CampaignType } from './types'
import { CAMPAIGN_TYPE_OPTIONS, type CampaignTypeOption } from './constants'

/**
 * Format discount value based on type
 */
export function formatDiscountValue(type: DiscountType, value: number): string {
  if (type === 'percentage') return `${value}%`
  return `₲ ${value.toLocaleString('es-PY')}`
}

/**
 * Format date for display
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-PY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Format date short (no year)
 */
export function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-PY', {
    day: '2-digit',
    month: 'short',
  })
}

/**
 * Get campaign type info
 */
export function getCampaignTypeInfo(
  type: CampaignType
): CampaignTypeOption {
  const typeOpt = CAMPAIGN_TYPE_OPTIONS.find((t) => t.value === type)
  return typeOpt || { value: 'sale', label: type, iconName: 'Tag', color: 'gray' as const }
}
