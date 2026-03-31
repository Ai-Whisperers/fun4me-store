/**
 * Reminders Domain Types
 *
 * Types for reminder rules, reminders, and notification queue.
 */

// ===========================================================================
// ENUMS & CONSTANTS
// ===========================================================================

export type ReminderType =
  | 'vaccine_reminder'
  | 'vaccine_overdue'
  | 'appointment_reminder'
  | 'appointment_confirmation'
  | 'appointment_cancelled'
  | 'invoice_sent'
  | 'payment_received'
  | 'payment_overdue'
  | 'birthday'
  | 'follow_up'
  | 'lab_results_ready'
  | 'hospitalization_update'
  | 'custom'

export type ReminderStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled' | 'skipped'

export type RuleType =
  | 'vaccine_due'
  | 'vaccine_overdue'
  | 'appointment_before'
  | 'appointment_after'
  | 'birthday'
  | 'wellness_checkup'
  | 'medication_refill'
  | 'custom'

export type NotificationChannel = 'email' | 'sms' | 'whatsapp' | 'push' | 'in_app'

export type NotificationStatus =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'bounced'

// ===========================================================================
// CORE ENTITIES
// ===========================================================================

export interface ReminderRule {
  id: string
  tenant_id: string
  name: string
  description: string | null
  type: RuleType
  days_offset: number
  hours_offset: number
  time_of_day: string
  channels: NotificationChannel[]
  template_id: string | null
  conditions: Record<string, unknown> | null
  priority: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Reminder {
  id: string
  tenant_id: string
  client_id: string
  pet_id: string | null
  type: ReminderType
  reference_type: string | null
  reference_id: string | null
  scheduled_at: string
  status: ReminderStatus
  attempts: number
  max_attempts: number
  last_attempt_at: string | null
  next_attempt_at: string | null
  error_message: string | null
  custom_subject: string | null
  custom_body: string | null
  created_at: string
  updated_at: string
}

export interface ReminderWithRelations extends Reminder {
  client?: {
    id: string
    full_name: string
    email: string
    phone: string | null
  }
  pet?: {
    id: string
    name: string
    species: string
  }
}

export interface Notification {
  id: string
  tenant_id: string
  reminder_id: string | null
  client_id: string
  channel_type: NotificationChannel
  destination: string
  subject: string | null
  body: string
  status: NotificationStatus
  sent_at: string | null
  delivered_at: string | null
  opened_at: string | null
  clicked_at: string | null
  error_code: string | null
  error_message: string | null
  created_at: string
}

// ===========================================================================
// INPUT TYPES
// ===========================================================================

export interface CreateRuleInput {
  name: string
  description?: string
  type: RuleType
  days_offset: number
  hours_offset?: number
  time_of_day?: string
  channels: NotificationChannel[]
  template_id?: string
  conditions?: Record<string, unknown>
  priority?: number
}

export interface UpdateRuleInput extends Partial<CreateRuleInput> {
  is_active?: boolean
}

export interface CreateReminderInput {
  client_id: string
  pet_id?: string
  type: ReminderType
  reference_type?: string
  reference_id?: string
  scheduled_at: string
  custom_subject?: string
  custom_body?: string
}

export interface QueueNotificationInput {
  reminder_id?: string
  client_id: string
  channel_type: NotificationChannel
  destination: string
  subject?: string
  body: string
}

// ===========================================================================
// FILTER TYPES
// ===========================================================================

export interface ReminderFilters {
  client_id?: string
  pet_id?: string
  type?: ReminderType
  status?: ReminderStatus
  from_date?: string
  to_date?: string
  pending_only?: boolean
}

export interface NotificationFilters {
  reminder_id?: string
  client_id?: string
  channel_type?: NotificationChannel
  status?: NotificationStatus
  from_date?: string
  to_date?: string
}

// ===========================================================================
// STATISTICS
// ===========================================================================

export interface ReminderStats {
  pending_count: number
  sent_today: number
  failed_count: number
  success_rate: number
  by_type: Record<string, number>
}
