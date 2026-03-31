/**
 * Entity Types - Canonical Type Definitions
 *
 * This folder contains single-source-of-truth type definitions for core entities.
 * All derived types (summaries, form data, etc.) should be defined here using
 * Pick, Omit, and extends for type safety.
 *
 * Import from here for consistent types across the codebase:
 *
 * @example
 * ```typescript
 * import type { Pet, PetSummary, Invoice, InvoiceFormData } from '@/lib/types/entities'
 * ```
 */

// =============================================================================
// PET TYPES
// =============================================================================
export type {
  Pet,
  PetSummary,
  PetCardData,
  PetWithOwner,
  PetSummaryWithOwner,
  PetFormData,
  CreatePetInput,
  UpdatePetInput,
  PetForService,
  PetInfo,
  PetWithVaccines,
  PetWithMedicalHistory,
} from './pet'

// =============================================================================
// INVOICE TYPES
// =============================================================================
export type {
  Invoice,
  InvoiceItem,
  InvoiceItemWithDetails,
  InvoiceItemFormData,
  Payment,
  PaymentWithDetails,
  RecordPaymentInput,
  Refund,
  RefundSummary,
  InvoiceSummary,
  InvoiceWithDetails,
  InvoiceFormData,
  CreateInvoiceInput,
  InvoiceForPdf,
  InvoiceWithItems,
  RecordPaymentData,
} from './invoice'

// =============================================================================
// APPOINTMENT TYPES
// =============================================================================
export type {
  Appointment,
  AppointmentSummary,
  AppointmentCardData,
  AppointmentWithDetails,
  AppointmentCalendarEvent,
  AppointmentFormData,
  CreateAppointmentInput,
  UpdateAppointmentInput,
  RescheduleAppointmentInput,
  AppointmentSlot,
  AppointmentDisplayStatus,
  CancelAppointmentResult,
  RescheduleAppointmentResult,
} from './appointment'

export {
  APPOINTMENT_STATUS_CONFIG,
  canCancelAppointment,
  canRescheduleAppointment,
  formatAppointmentDate,
  formatAppointmentTime,
  formatAppointmentDateTime,
} from './appointment'

// =============================================================================
// PROFILE TYPES
// =============================================================================
export type {
  UserRole,
  Profile,
  ProfileSummary,
  ProfileWithAvatar,
  ClientProfile,
  StaffProfile,
  ProfileFormData,
  InviteUserInput,
  AuthProfile,
} from './profile'

export {
  isStaff,
  isAdmin,
  isOwner,
  getRoleLabel,
} from './profile'
