/**
 * WhatsApp Message Types
 *
 * Type definitions for the centralized WhatsApp message system.
 */

/**
 * Context that can be passed to message functions
 */
export interface MessageContext {
  brandName: string
}

/**
 * Generic message function type
 * - If T is void, it's a no-parameter function
 * - If T is defined, it's a function that takes params of type T
 */
export type MessageFunction<T = void> = T extends void ? () => string : (params: T) => string

/**
 * Generic message category structure
 */
export interface MessageCategory {
  [key: string]: MessageFunction<unknown>
}

// ============ Parameter Types for Dynamic Messages ============

/**
 * ROI Calculator message params
 */
export interface ROICalculatorParams {
  planName: string
  monthlyConsultations: number
}

/**
 * Plan interest message params
 */
export interface PlanInterestParams {
  planName: string
}

/**
 * Contact form message params
 */
export interface ContactFormParams {
  contactName: string
  clinicName: string
}

/**
 * Tier CTA message params (from pricing tier config)
 */
export interface TierCtaParams {
  message: string
}

/**
 * Appointment booking message params
 */
export interface AppointmentBookingParams {
  petName?: string
  serviceName?: string
  clinicName?: string
}

/**
 * Order inquiry message params
 */
export interface OrderInquiryParams {
  orderId?: string
  productName?: string
}

/**
 * Support ticket message params
 */
export interface SupportTicketParams {
  ticketId?: string
  issue?: string
}

/**
 * Clinic billing inquiry params
 */
export interface ClinicBillingParams {
  clinicName: string
}
