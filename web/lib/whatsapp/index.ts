/**
 * WhatsApp Module
 *
 * Centralized WhatsApp integration for Vetic.
 * - Phone number configuration
 * - URL generation
 * - Message templates
 *
 * @example
 * ```tsx
 * import { getWhatsAppUrl, landingMessages } from '@/lib/whatsapp'
 *
 * <a href={getWhatsAppUrl(landingMessages.startFree())}>
 *   Empezar Gratis
 * </a>
 * ```
 */

import { brandConfig } from '../branding/config'

// ============ Configuration ============

/**
 * WhatsApp phone number (without +)
 */
export const WHATSAPP_NUMBER = brandConfig.whatsapp.number

/**
 * Formatted display number
 */
export const WHATSAPP_DISPLAY_NUMBER = brandConfig.whatsapp.displayNumber

// ============ URL Generation ============

/**
 * Generate a WhatsApp URL with an optional pre-filled message.
 *
 * @param message - Optional message to pre-fill (will be URL encoded)
 * @returns WhatsApp URL (wa.me format)
 *
 * @example
 * ```tsx
 * // Without message
 * getWhatsAppUrl()
 * // => "https://wa.me/595981324569"
 *
 * // With message
 * getWhatsAppUrl('Hola! Quiero info')
 * // => "https://wa.me/595981324569?text=Hola!%20Quiero%20info"
 *
 * // With message function
 * getWhatsAppUrl(landingMessages.startFree())
 * // => "https://wa.me/595981324569?text=Hola!%20Quiero%20empezar%20con%20Vetic%20gratis"
 * ```
 */
export function getWhatsAppUrl(message?: string): string {
  const baseUrl = `https://wa.me/${WHATSAPP_NUMBER}`
  if (message) {
    return `${baseUrl}?text=${encodeURIComponent(message)}`
  }
  return baseUrl
}

/**
 * Get the display number for showing to users
 */
export function getWhatsAppDisplayNumber(): string {
  return WHATSAPP_DISPLAY_NUMBER
}

/**
 * Get tel: URL for phone calls
 */
export function getPhoneUrl(): string {
  return `tel:+${WHATSAPP_NUMBER}`
}

// ============ Re-export Messages ============

export * from './messages'

// ============ Re-export Types ============

export type {
  MessageContext,
  MessageFunction,
  MessageCategory,
  ROICalculatorParams,
  PlanInterestParams,
  ContactFormParams,
  TierCtaParams,
  AppointmentBookingParams,
  OrderInquiryParams,
  SupportTicketParams,
} from './types'
