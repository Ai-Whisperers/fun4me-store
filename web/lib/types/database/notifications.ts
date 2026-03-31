/**
 * Reminders & Notifications Database Tables
 */

import type { NotificationChannel, ReminderType, ReminderStatus } from './enums'

// =============================================================================
// REMINDERS & NOTIFICATIONS
// =============================================================================

export interface NotificationChannelConfig {
  id: string
  tenant_id: string | null
  channel_type: NotificationChannel
  name: string
  is_active: boolean
  config: Record<string, unknown>
  created_at: string
}

export interface NotificationTemplate {
  id: string
  tenant_id: string | null
  channel_id: string
  code: string
  name: string
  subject: string | null
  body_template: string
  variables: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Reminder {
  id: string
  tenant_id: string
  pet_id: string
  owner_id: string
  reminder_type: ReminderType
  title: string
  message: string | null
  due_date: string
  status: ReminderStatus
  snoozed_until: string | null
  related_vaccine_id: string | null
  related_appointment_id: string | null
  created_at: string
  updated_at: string
}

export interface NotificationQueue {
  id: string
  tenant_id: string
  reminder_id: string | null
  template_id: string | null
  channel: NotificationChannel
  recipient_id: string
  recipient_contact: string
  subject: string | null
  body: string
  variables: Record<string, unknown>
  scheduled_for: string
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled'
  sent_at: string | null
  error_message: string | null
  retry_count: number
  created_at: string
}
