/**
 * Inngest Client Configuration
 *
 * Central client instance for all Inngest functions.
 * Provides type-safe event schemas and configuration.
 *
 * @see https://www.inngest.com/docs
 */

import { Inngest, EventSchemas } from 'inngest'

/**
 * Event Schemas for type-safe event publishing
 *
 * Each event defines its data shape for compile-time checking.
 */
type Events = {
  // =============================================================================
  // BILLING EVENTS
  // =============================================================================

  /**
   * Auto-charge invoices that are due
   * Schedule: Daily at 10:00 UTC (06:00 Paraguay time)
   */
  'billing/auto-charge': {
    data: {
      batchSize?: number
    }
  }

  /**
   * Evaluate grace periods for overdue invoices
   * Schedule: Daily at 11:00 UTC
   */
  'billing/evaluate-grace': {
    data: {
      tenantId?: string // Optional: process single tenant
    }
  }

  /**
   * Generate monthly platform invoices
   * Schedule: 1st of each month at 00:00 UTC
   */
  'billing/generate-platform-invoices': {
    data: {
      month?: string // YYYY-MM format, defaults to current month
    }
  }

  /**
   * Send billing reminder emails
   * Schedule: Daily at 09:00 UTC
   */
  'billing/send-reminders': {
    data: {
      reminderType?: 'gentle' | 'urgent' | 'final'
    }
  }

  /**
   * Generate commission invoices for stores
   * Schedule: 1st of each month at 01:00 UTC
   */
  'billing/generate-commission-invoices': {
    data: {
      month?: string
    }
  }

  // =============================================================================
  // REMINDER EVENTS
  // =============================================================================

  /**
   * Generate reminders based on rules (vaccines, appointments, birthdays)
   * Schedule: Daily at 06:00 UTC (02:00 Paraguay time)
   */
  'reminders/generate': {
    data: {
      tenantId?: string
      types?: Array<'vaccine_due' | 'vaccine_overdue' | 'appointment_before' | 'birthday' | 'appointment_after'>
    }
  }

  /**
   * Process and send pending reminders
   * Schedule: Every 15 minutes
   */
  'reminders/process': {
    data: {
      batchSize?: number
      channels?: Array<'email' | 'sms' | 'whatsapp'>
    }
  }

  // =============================================================================
  // STOCK & INVENTORY EVENTS
  // =============================================================================

  /**
   * Release expired cart stock reservations
   * Schedule: Every 5 minutes
   */
  'stock/release-reservations': {
    data: {
      reservationTimeoutMinutes?: number
    }
  }

  /**
   * Send stock alerts to customers (back in stock)
   * Schedule: Every 30 minutes
   */
  'stock/customer-alerts': {
    data: {
      batchSize?: number
    }
  }

  /**
   * Send low stock alerts to staff
   * Schedule: Daily at 08:00 UTC
   */
  'stock/staff-alerts': {
    data: {
      thresholdPercent?: number
    }
  }

  /**
   * Send product expiry alerts
   * Schedule: Daily at 07:00 UTC
   */
  'stock/expiry-alerts': {
    data: {
      daysBeforeExpiry?: number
    }
  }

  // =============================================================================
  // SUBSCRIPTION EVENTS
  // =============================================================================

  /**
   * Process subscription renewals
   * Schedule: Daily at 00:00 UTC
   */
  'subscriptions/process': {
    data: {
      subscriptionId?: string // Optional: process single subscription
    }
  }

  /**
   * Generate recurring appointments
   * Schedule: Daily at 05:00 UTC
   */
  'appointments/generate-recurring': {
    data: {
      daysAhead?: number
    }
  }

  // =============================================================================
  // MAINTENANCE EVENTS
  // =============================================================================

  /**
   * Clean up old export files
   * Schedule: Daily at 03:00 UTC
   */
  'maintenance/cleanup-exports': {
    data: {
      maxAgeDays?: number
    }
  }

  /**
   * Apply data retention policies
   * Schedule: Weekly on Sunday at 02:00 UTC
   */
  'maintenance/retention': {
    data: {
      dryRun?: boolean
    }
  }

  /**
   * Capture system metrics
   * Schedule: Every hour
   */
  'maintenance/capture-metrics': {
    data: Record<string, never>
  }

  /**
   * Verify backup integrity
   * Schedule: Daily at 04:00 UTC
   */
  'maintenance/verify-backup': {
    data: Record<string, never>
  }

  /**
   * Health check for monitoring
   * Schedule: Every 5 minutes
   */
  'maintenance/health-check': {
    data: Record<string, never>
  }
}

/**
 * Inngest Client Instance
 *
 * Use this client to:
 * - Define functions with `inngest.createFunction()`
 * - Send events with `inngest.send()`
 */
export const inngest = new Inngest({
  id: 'vete-app',
  schemas: new EventSchemas().fromRecord<Events>(),
  // Enable retry with exponential backoff
  retryFunction: async (attempt: number) => ({
    delay: Math.min(Math.pow(2, attempt) * 1000, 60000), // Max 1 minute
    maxAttempts: 5,
  }),
})

/**
 * Type helpers for function definitions
 */
export type InngestEvents = Events
export type InngestEventName = keyof Events
