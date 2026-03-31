/**
 * Single source of truth for all status types and transitions
 * Consolidates duplicate status definitions across the codebase
 *
 * IMPORTANT: These values MUST match the database CHECK constraints
 * See: db/01_types/01_enums_and_domains.sql
 * See: db/40_scheduling/02_appointments.sql
 * See: db/50_finance/01_invoicing.sql
 */

// =============================================================================
// APPOINTMENT STATUSES
// =============================================================================

/**
 * Appointment lifecycle: scheduled → confirmed → checked_in → in_progress → completed
 * Terminal states: completed, cancelled, no_show
 */
export const APPOINTMENT_STATUSES = [
  'scheduled',
  'confirmed',
  'checked_in',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
] as const
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number]

// =============================================================================
// INVOICE STATUSES
// =============================================================================

/**
 * Invoice lifecycle: draft → sent → viewed → partial/paid
 * Terminal states: paid, void, refunded
 */
export const INVOICE_STATUSES = [
  'draft',
  'sent',
  'viewed',
  'partial',
  'paid',
  'overdue',
  'void',
  'refunded',
] as const
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

// =============================================================================
// HOSPITALIZATION STATUSES
// =============================================================================

export const HOSPITALIZATION_STATUSES = [
  'admitted',
  'active',
  'discharged',
  'transferred',
  'deceased',
] as const
export type HospitalizationStatus = (typeof HOSPITALIZATION_STATUSES)[number]

// =============================================================================
// LAB ORDER STATUSES
// =============================================================================

export const LAB_ORDER_STATUSES = [
  'pending',
  'collected',
  'processing',
  'completed',
  'cancelled',
] as const
export type LabOrderStatus = (typeof LAB_ORDER_STATUSES)[number]

// =============================================================================
// INSURANCE CLAIM STATUSES
// =============================================================================

export const INSURANCE_CLAIM_STATUSES = [
  'submitted',
  'under_review',
  'approved',
  'denied',
  'paid',
  'appealed',
] as const
export type InsuranceClaimStatus = (typeof INSURANCE_CLAIM_STATUSES)[number]

// =============================================================================
// MESSAGE STATUSES
// =============================================================================

export const MESSAGE_STATUSES = ['pending', 'sent', 'delivered', 'read', 'failed'] as const
export type MessageStatus = (typeof MESSAGE_STATUSES)[number]

// =============================================================================
// PAYMENT STATUSES
// =============================================================================

export const PAYMENT_STATUSES = ['pending', 'completed', 'failed', 'refunded'] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

// =============================================================================
// PRESCRIPTION STATUSES
// =============================================================================

export const PRESCRIPTION_STATUSES = ['active', 'completed', 'cancelled'] as const
export type PrescriptionStatus = (typeof PRESCRIPTION_STATUSES)[number]

// =============================================================================
// STATUS TRANSITIONS
// =============================================================================

/**
 * Valid state transitions for appointments
 * Each status maps to an array of allowed next statuses
 */
export const APPOINTMENT_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  scheduled: ['confirmed', 'cancelled'],
  confirmed: ['checked_in', 'cancelled', 'no_show'],
  checked_in: ['in_progress', 'cancelled'],
  in_progress: ['completed'],
  completed: [],
  cancelled: [],
  no_show: [],
}

/**
 * Valid state transitions for invoices
 */
export const INVOICE_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ['sent', 'void'],
  sent: ['viewed', 'paid', 'partial', 'overdue', 'void'],
  viewed: ['paid', 'partial', 'overdue', 'void'],
  partial: ['paid', 'overdue', 'void'],
  paid: ['refunded'],
  overdue: ['paid', 'partial', 'void'],
  void: [],
  refunded: [],
}

/**
 * Valid state transitions for hospitalizations
 */
export const HOSPITALIZATION_TRANSITIONS: Record<HospitalizationStatus, HospitalizationStatus[]> = {
  admitted: ['active', 'discharged', 'transferred', 'deceased'],
  active: ['discharged', 'transferred', 'deceased'],
  discharged: [],
  transferred: [],
  deceased: [],
}

/**
 * Valid state transitions for lab orders
 */
export const LAB_ORDER_TRANSITIONS: Record<LabOrderStatus, LabOrderStatus[]> = {
  pending: ['collected', 'cancelled'],
  collected: ['processing', 'cancelled'],
  processing: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}

/**
 * Valid state transitions for insurance claims
 */
export const INSURANCE_CLAIM_TRANSITIONS: Record<InsuranceClaimStatus, InsuranceClaimStatus[]> = {
  submitted: ['under_review', 'denied'],
  under_review: ['approved', 'denied'],
  approved: ['paid'],
  denied: ['appealed'],
  paid: [],
  appealed: ['under_review', 'denied'],
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if a status transition is valid
 * @param current - Current status
 * @param target - Target status
 * @param transitions - Transition map for the status type
 * @returns true if transition is allowed
 */
export function canTransitionTo<T extends string>(
  current: T,
  target: T,
  transitions: Record<T, T[]>
): boolean {
  return transitions[current]?.includes(target) ?? false
}

/**
 * Check if appointment can transition to target status
 */
export function canTransitionAppointment(
  current: AppointmentStatus,
  target: AppointmentStatus
): boolean {
  return canTransitionTo(current, target, APPOINTMENT_TRANSITIONS)
}

/**
 * Check if invoice can transition to target status
 */
export function canTransitionInvoice(current: InvoiceStatus, target: InvoiceStatus): boolean {
  return canTransitionTo(current, target, INVOICE_TRANSITIONS)
}

/**
 * Check if hospitalization can transition to target status
 */
export function canTransitionHospitalization(
  current: HospitalizationStatus,
  target: HospitalizationStatus
): boolean {
  return canTransitionTo(current, target, HOSPITALIZATION_TRANSITIONS)
}

/**
 * Check if lab order can transition to target status
 */
export function canTransitionLabOrder(current: LabOrderStatus, target: LabOrderStatus): boolean {
  return canTransitionTo(current, target, LAB_ORDER_TRANSITIONS)
}

/**
 * Check if insurance claim can transition to target status
 */
export function canTransitionInsuranceClaim(
  current: InsuranceClaimStatus,
  target: InsuranceClaimStatus
): boolean {
  return canTransitionTo(current, target, INSURANCE_CLAIM_TRANSITIONS)
}
