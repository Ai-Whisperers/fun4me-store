/**
 * Application Constants
 *
 * Centralized constants for the multi-tenant veterinary platform.
 * These constants are used across the application for validation, limits, and enums.
 *
 * NOTE: Status types (APPOINTMENT_STATUSES, INVOICE_STATUSES, etc.) are defined in
 * lib/types/status.ts as the single source of truth. This file re-exports them
 * with labels and colors for UI rendering.
 */

// Re-export status constants from canonical source
export {
  // Appointment
  APPOINTMENT_STATUSES,
  type AppointmentStatus,
  APPOINTMENT_TRANSITIONS,
  canTransitionAppointment,
  // Invoice
  INVOICE_STATUSES,
  type InvoiceStatus,
  INVOICE_TRANSITIONS,
  canTransitionInvoice,
  // Hospitalization
  HOSPITALIZATION_STATUSES,
  type HospitalizationStatus,
  HOSPITALIZATION_TRANSITIONS,
  canTransitionHospitalization,
  // Lab Orders
  LAB_ORDER_STATUSES,
  type LabOrderStatus,
  LAB_ORDER_TRANSITIONS,
  canTransitionLabOrder,
  // Insurance Claims
  INSURANCE_CLAIM_STATUSES,
  type InsuranceClaimStatus,
  INSURANCE_CLAIM_TRANSITIONS,
  canTransitionInsuranceClaim,
  // Messages
  MESSAGE_STATUSES,
  type MessageStatus,
  // Payments
  PAYMENT_STATUSES,
  type PaymentStatus,
  // Prescriptions
  PRESCRIPTION_STATUSES,
  type PrescriptionStatus,
  // Generic transition helper
  canTransitionTo,
} from '@/lib/types/status'

import type { AppointmentStatus, InvoiceStatus } from '@/lib/types/status'

// =============================================================================
// PAGINATION & LIMITS
// =============================================================================

export const LIMITS = {
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  // File sizes - Generic
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_DOCUMENT_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_VIDEO_SIZE: 50 * 1024 * 1024, // 50MB

  // File sizes - Specific use cases (TECH-005)
  MAX_LOGO_SIZE: 2 * 1024 * 1024, // 2MB - Logo upload during signup
  MAX_PET_DOCUMENT_SIZE: 20 * 1024 * 1024, // 20MB - Pet documents (vaccines, records)
  MAX_IMPORT_FILE_SIZE: 5 * 1024 * 1024, // 5MB - Excel/CSV imports
  MAX_PRESCRIPTION_SIZE: 5 * 1024 * 1024, // 5MB - Prescription uploads
  MAX_ATTACHMENT_SIZE: 10 * 1024 * 1024, // 10MB - Message attachments
  MAX_IMPORT_ROWS: 1000, // Max rows in Excel/CSV import

  // Cart/Store limits
  MAX_QUANTITY_PER_ITEM: 99,
  MAX_CART_ITEMS: 50,

  // Text lengths
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_NOTES_LENGTH: 5000,

  // Entity limits
  MAX_PETS_PER_OWNER: 20,
  MAX_VACCINE_REACTIONS: 10,
  MAX_ATTACHMENTS_PER_RECORD: 5,

  // Appointment settings
  APPOINTMENT_BUFFER_MINUTES: 15,
  APPOINTMENT_SLOT_DURATION_MINUTES: 30,
} as const

/**
 * Format bytes to human-readable string (e.g., "5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Get standardized file size error message in Spanish
 */
export function getFileSizeError(limit: number): string {
  return `El archivo excede el tamaño máximo de ${formatFileSize(limit)}`
}

// =============================================================================
// USER ROLES
// =============================================================================

export const USER_ROLES = ['owner', 'vet', 'admin'] as const
export type UserRole = (typeof USER_ROLES)[number]

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Dueño de Mascota',
  vet: 'Veterinario',
  admin: 'Administrador',
}

// =============================================================================
// PET SPECIES
// =============================================================================

export const SPECIES = [
  'dog',
  'cat',
  'bird',
  'rabbit',
  'hamster',
  'guinea_pig',
  'reptile',
  'fish',
  'other',
] as const
export type Species = (typeof SPECIES)[number]

export const SPECIES_LABELS: Record<Species, string> = {
  dog: 'Perro',
  cat: 'Gato',
  bird: 'Ave',
  rabbit: 'Conejo',
  hamster: 'Hámster',
  guinea_pig: 'Cobayo',
  reptile: 'Reptil',
  fish: 'Pez',
  other: 'Otro',
}

// Store species (Spanish naming convention for e-commerce)
export const STORE_SPECIES = [
  'perro',
  'gato',
  'ave',
  'reptil',
  'pez',
  'roedor',
  'conejo',
  'otro',
] as const
export type StoreSpecies = (typeof STORE_SPECIES)[number]

export const STORE_SPECIES_LABELS: Record<StoreSpecies, string> = {
  perro: 'Perro',
  gato: 'Gato',
  ave: 'Ave',
  reptil: 'Reptil',
  pez: 'Pez',
  roedor: 'Roedor',
  conejo: 'Conejo',
  otro: 'Otro',
}

// =============================================================================
// PET SIZES
// =============================================================================

export const PET_SIZES = ['mini', 'pequeño', 'mediano', 'grande', 'gigante'] as const
export type PetSize = (typeof PET_SIZES)[number]

export const PET_SIZE_LABELS: Record<PetSize, string> = {
  mini: 'Mini (0-5 kg)',
  pequeño: 'Pequeño (5-10 kg)',
  mediano: 'Mediano (10-25 kg)',
  grande: 'Grande (25-40 kg)',
  gigante: 'Gigante (40+ kg)',
}

// =============================================================================
// GENDERS
// =============================================================================

export const GENDERS = ['male', 'female', 'unknown'] as const
export type Gender = (typeof GENDERS)[number]

export const GENDER_LABELS: Record<Gender, string> = {
  male: 'Macho',
  female: 'Hembra',
  unknown: 'Desconocido',
}

// =============================================================================
// PAYMENT METHODS
// =============================================================================

export const PAYMENT_METHODS = [
  'cash',
  'card',
  'transfer',
  'qr',
  'check',
  'credit',
  'other',
] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  qr: 'Código QR',
  check: 'Cheque',
  credit: 'Crédito',
  other: 'Otro',
}

// =============================================================================
// APPOINTMENT STATUS LABELS & COLORS
// =============================================================================

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: 'Programado',
  confirmed: 'Confirmado',
  checked_in: 'Registrado',
  in_progress: 'En Progreso',
  completed: 'Completado',
  cancelled: 'Cancelado',
  no_show: 'No Asistió',
}

export const APPOINTMENT_STATUS_COLORS: Record<AppointmentStatus, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  checked_in: 'bg-teal-100 text-teal-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-orange-100 text-orange-700',
}

// =============================================================================
// INVOICE STATUS LABELS & COLORS
// =============================================================================

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Borrador',
  sent: 'Enviado',
  viewed: 'Visto',
  partial: 'Pago Parcial',
  paid: 'Pagado',
  overdue: 'Vencido',
  void: 'Anulado',
  refunded: 'Reembolsado',
}

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-indigo-100 text-indigo-700',
  partial: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  void: 'bg-gray-300 text-gray-600',
  refunded: 'bg-purple-100 text-purple-700',
}

// =============================================================================
// VACCINE STATUSES
// =============================================================================

export const VACCINE_STATUSES = ['pending', 'administered', 'overdue', 'waived'] as const
export type VaccineStatus = (typeof VACCINE_STATUSES)[number]

export const VACCINE_STATUS_LABELS: Record<VaccineStatus, string> = {
  pending: 'Pendiente',
  administered: 'Administrada',
  overdue: 'Vencida',
  waived: 'Dispensada',
}

// =============================================================================
// FILE TYPES
// =============================================================================

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
export const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'] as const

export const FILE_TYPE_LABELS: Record<string, string> = {
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
  'image/gif': 'GIF',
  'application/pdf': 'PDF',
  'video/mp4': 'MP4',
  'video/webm': 'WebM',
  'video/quicktime': 'QuickTime',
}

// =============================================================================
// MEDICAL RECORD TYPES
// =============================================================================

export const RECORD_TYPES = [
  'consultation',
  'surgery',
  'vaccination',
  'diagnostic',
  'hospitalization',
  'emergency',
  'follow_up',
  'other',
] as const
export type RecordType = (typeof RECORD_TYPES)[number]

export const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  consultation: 'Consulta',
  surgery: 'Cirugía',
  vaccination: 'Vacunación',
  diagnostic: 'Diagnóstico',
  hospitalization: 'Hospitalización',
  emergency: 'Emergencia',
  follow_up: 'Seguimiento',
  other: 'Otro',
}

// =============================================================================
// PRIORITY LEVELS
// =============================================================================

export const PRIORITY_LEVELS = ['low', 'medium', 'high', 'urgent'] as const
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number]

export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
}

export const PRIORITY_COLORS: Record<PriorityLevel, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
}

// =============================================================================
// VALIDATION PATTERNS
// =============================================================================

export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_PY: /^(\+595|0)?[9][0-9]{8}$/,
  PHONE_INTERNATIONAL: /^\+?[1-9]\d{1,14}$/,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  URL: /^https?:\/\/.+/,
} as const

// =============================================================================
// DATE/TIME CONSTANTS
// =============================================================================

export const TIME_ZONES = {
  PARAGUAY: 'America/Asuncion',
} as const

export const BUSINESS_HOURS = {
  DEFAULT_OPEN: '08:00',
  DEFAULT_CLOSE: '18:00',
  WEEKEND_OPEN: '09:00',
  WEEKEND_CLOSE: '13:00',
} as const

// =============================================================================
// NOTIFICATION CHANNELS
// =============================================================================

export const NOTIFICATION_CHANNELS = ['email', 'sms', 'whatsapp', 'in_app'] as const
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number]

export const NOTIFICATION_CHANNEL_LABELS: Record<NotificationChannel, string> = {
  email: 'Correo Electrónico',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  in_app: 'Notificación en la App',
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a value is a valid enum member
 */
export function isValidEnum<T extends readonly string[]>(
  value: string,
  enumArray: T
): value is T[number] {
  return enumArray.includes(value as T[number])
}

/**
 * Get label for enum value with fallback
 */
export function getEnumLabel<T extends string>(
  value: T,
  labels: Record<T, string>,
  fallback = 'Desconocido'
): string {
  return labels[value] || fallback
}

// =============================================================================
// RE-EXPORTS FROM SPECIALIZED MODULES
// =============================================================================

// Error messages (Spanish)
export {
  AUTH_MESSAGES,
  AUTHZ_MESSAGES,
  VALIDATION_MESSAGES,
  RESOURCE_MESSAGES,
  PET_MESSAGES,
  APPOINTMENT_MESSAGES,
  INVOICE_MESSAGES,
  STORE_MESSAGES,
  FILE_MESSAGES,
  NETWORK_MESSAGES,
  SUCCESS_MESSAGES,
  ERROR_MESSAGES,
  zodMsg,
  type ErrorMessageKey,
} from './messages'

// Time constants (TTL, rate limits, durations)
export {
  MS,
  SECONDS,
  CACHE_TTL,
  RATE_LIMITS,
  SESSION,
  DATABASE,
  INTERVALS,
  DURATIONS,
  CRON_SCHEDULES,
  TIMEOUTS,
} from './time'

// Pagination utilities
export {
  PAGINATION,
  PAGINATION_CONTEXTS,
  clampPageSize,
  parsePage,
  calculateOffset,
  calculateRange,
  parsePagination,
  buildPaginationMeta,
  type PaginatedResponse,
  type CursorPaginatedResponse,
  type PageSizeOption,
  type PaginationContext,
} from './pagination'
