/**
 * Settings and configuration types for clinic management
 *
 * Note: ClinicSettings (from config.json) is defined in clinic-config.ts
 * This file contains operational settings stored in the database.
 */

/**
 * Operational clinic settings (database-stored)
 * This is different from ClinicSettings in clinic-config.ts which comes from JSON
 */
export interface ClinicOperationalSettings {
  general: GeneralSettings
  appointments: AppointmentSettings
  invoicing: InvoicingSettings
  notifications: NotificationSettings
  integrations: IntegrationSettings
}

export interface GeneralSettings {
  clinic_name: string
  phone: string
  email: string
  address: string
  timezone: string
  currency: string
  logo_url?: string
  business_hours: BusinessHours
}

export interface BusinessHours {
  monday: DayHours | null
  tuesday: DayHours | null
  wednesday: DayHours | null
  thursday: DayHours | null
  friday: DayHours | null
  saturday: DayHours | null
  sunday: DayHours | null
}

export interface DayHours {
  open: string // HH:mm
  close: string // HH:mm
  break_start?: string
  break_end?: string
}

export interface AppointmentSettings {
  slot_duration_minutes: number
  buffer_between_appointments: number
  max_advance_booking_days: number
  allow_online_booking: boolean
  require_confirmation: boolean
  cancellation_policy_hours: number
  reminder_hours_before: number[]
}

export interface InvoicingSettings {
  tax_rate: number
  tax_name: string
  invoice_prefix: string
  payment_terms_days: number
  default_notes: string
  bank_account_info?: string
}

export interface NotificationSettings {
  send_appointment_reminders: boolean
  send_vaccine_reminders: boolean
  send_invoice_notifications: boolean
  reminder_channels: ('email' | 'sms' | 'push')[]
}

export interface IntegrationSettings {
  whatsapp_enabled: boolean
  whatsapp_phone?: string
  google_calendar_enabled: boolean
  google_calendar_id?: string
}

/**
 * Default operational settings for new clinics
 */
export const DEFAULT_CLINIC_SETTINGS: ClinicOperationalSettings = {
  general: {
    clinic_name: '',
    phone: '',
    email: '',
    address: '',
    timezone: 'America/Asuncion',
    currency: 'PYG',
    business_hours: {
      monday: { open: '08:00', close: '18:00' },
      tuesday: { open: '08:00', close: '18:00' },
      wednesday: { open: '08:00', close: '18:00' },
      thursday: { open: '08:00', close: '18:00' },
      friday: { open: '08:00', close: '18:00' },
      saturday: { open: '08:00', close: '13:00' },
      sunday: null,
    },
  },
  appointments: {
    slot_duration_minutes: 30,
    buffer_between_appointments: 5,
    max_advance_booking_days: 90,
    allow_online_booking: true,
    require_confirmation: false,
    cancellation_policy_hours: 24,
    reminder_hours_before: [24, 2],
  },
  invoicing: {
    tax_rate: 10,
    tax_name: 'IVA',
    invoice_prefix: 'INV',
    payment_terms_days: 0,
    default_notes: '',
  },
  notifications: {
    send_appointment_reminders: true,
    send_vaccine_reminders: true,
    send_invoice_notifications: true,
    reminder_channels: ['email'],
  },
  integrations: {
    whatsapp_enabled: false,
    google_calendar_enabled: false,
  },
}

/**
 * Validate time format (HH:mm)
 */
export function isValidTimeFormat(time: string): boolean {
  return /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(time)
}

/**
 * Validate day hours configuration
 */
export function validateDayHours(hours: DayHours): boolean {
  if (!isValidTimeFormat(hours.open) || !isValidTimeFormat(hours.close)) {
    return false
  }
  if (hours.break_start && !isValidTimeFormat(hours.break_start)) {
    return false
  }
  if (hours.break_end && !isValidTimeFormat(hours.break_end)) {
    return false
  }
  // Check that close is after open
  return hours.close > hours.open
}
