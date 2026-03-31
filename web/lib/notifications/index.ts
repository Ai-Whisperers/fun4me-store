/**
 * Notification System - Main Export
 * 
 * Unified notification system with multi-channel support
 */

// Re-export types
export type {
  NotificationPayload,
  NotificationResult,
  NotificationChannel,
  NotificationType,
  ChannelResult,
  InAppNotification,
  NotificationPreferences,
} from './types'

// Re-export main functions
export {
  sendNotification,
  sendInAppNotification,
  notifyStaff,
} from './service'

// Email service for direct use
export {
  getEmailService,
  sendEmail,
  sendBatchEmails,
  type EmailOptions,
  type EmailResult,
} from '@/lib/email/service'