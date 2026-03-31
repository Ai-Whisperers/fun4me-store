/**
 * Notification Types
 *
 * Type definitions for the unified notification system
 */

// =============================================================================
// Notification Types
// =============================================================================

export type NotificationType =
  // Waitlist
  | 'waitlist_slot_available'
  | 'waitlist_confirmed'
  | 'waitlist_declined'
  // Orders & Subscriptions
  | 'order_confirmation'
  | 'order_status_update'
  | 'subscription_stock_issue'
  | 'subscription_renewal'
  // Admin/Platform
  | 'product_approved'
  | 'product_rejected'
  | 'commission_invoice'
  // Staff
  | 'recurrence_limit_warning'
  | 'appointment_reminder'
  | 'low_stock_alert'
  // Laboratory
  | 'lab_results_ready'
  | 'lab_critical_result'
  | 'lab_abnormal_result'
  // General
  | 'custom'

export type NotificationChannel = 'email' | 'in_app' | 'sms' | 'push'

export type RecipientType = 'owner' | 'staff' | 'clinic' | 'user'

// =============================================================================
// Notification Payload
// =============================================================================

export interface NotificationPayload {
  /** Type of notification */
  type: NotificationType
  /** User ID to send notification to */
  recipientId: string
  /** Type of recipient */
  recipientType: RecipientType
  /** Tenant ID for multi-tenancy */
  tenantId: string
  /** Notification title (for in-app and push) */
  title: string
  /** Short message/body */
  message: string
  /** Channels to deliver through */
  channels: NotificationChannel[]
  /** Additional data for templating */
  data?: Record<string, unknown>
  /** Email-specific options */
  email?: {
    subject?: string
    templateId?: string
    replyTo?: string
  }
  /** Priority level */
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  /** Schedule for later (ISO string) */
  scheduledAt?: string
  /** Link to related resource */
  actionUrl?: string
}

// =============================================================================
// Notification Result
// =============================================================================

export interface ChannelResult {
  channel: NotificationChannel
  success: boolean
  error?: string
  messageId?: string
}

export interface NotificationResult {
  success: boolean
  notificationId?: string
  channels: ChannelResult[]
  errors?: string[]
}

// =============================================================================
// In-App Notification Record
// =============================================================================

export interface InAppNotification {
  id: string
  user_id: string
  tenant_id: string
  type: NotificationType
  title: string
  message: string
  data?: Record<string, unknown>
  action_url?: string
  read_at?: string | null
  created_at: string
}

// =============================================================================
// Notification Preferences
// =============================================================================

export interface NotificationPreferences {
  email: boolean
  push: boolean
  sms: boolean
  in_app: boolean
  /** Per-type overrides */
  types?: Partial<Record<NotificationType, NotificationChannel[]>>
}
