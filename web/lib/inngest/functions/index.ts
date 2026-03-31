/**
 * Inngest Functions Index
 *
 * Exports all Inngest functions for registration with the serve endpoint.
 */

// Billing functions
import {
  autoChargeInvoices,
  evaluateGracePeriods,
  generatePlatformInvoices,
  sendBillingReminders,
  generateCommissionInvoices,
} from './billing'

// Reminder functions
import {
  generateReminders,
  processReminders,
} from './reminders'

// Stock/Inventory functions
import {
  releaseReservations,
  customerStockAlerts,
  staffStockAlerts,
  expiryAlerts,
} from './stock'

// Maintenance functions
import {
  cleanupExports,
  dataRetention,
  captureMetrics,
  verifyBackup,
  healthCheck,
  processSubscriptions,
  generateRecurringAppointments,
} from './maintenance'

/**
 * All Inngest functions for registration
 *
 * Import this array in the serve endpoint:
 * ```typescript
 * import { inngestFunctions } from '@/lib/inngest/functions'
 * import { serve } from 'inngest/next'
 * import { inngest } from '@/lib/inngest/client'
 *
 * export const { GET, POST, PUT } = serve({
 *   client: inngest,
 *   functions: inngestFunctions,
 * })
 * ```
 */
export const inngestFunctions = [
  // Billing (5 functions)
  autoChargeInvoices,
  evaluateGracePeriods,
  generatePlatformInvoices,
  sendBillingReminders,
  generateCommissionInvoices,
  // Reminders (2 functions)
  generateReminders,
  processReminders,
  // Stock (4 functions)
  releaseReservations,
  customerStockAlerts,
  staffStockAlerts,
  expiryAlerts,
  // Maintenance (7 functions)
  cleanupExports,
  dataRetention,
  captureMetrics,
  verifyBackup,
  healthCheck,
  processSubscriptions,
  generateRecurringAppointments,
]

// Named exports for individual imports
export {
  // Billing
  autoChargeInvoices,
  evaluateGracePeriods,
  generatePlatformInvoices,
  sendBillingReminders,
  generateCommissionInvoices,
  // Reminders
  generateReminders,
  processReminders,
  // Stock
  releaseReservations,
  customerStockAlerts,
  staffStockAlerts,
  expiryAlerts,
  // Maintenance
  cleanupExports,
  dataRetention,
  captureMetrics,
  verifyBackup,
  healthCheck,
  processSubscriptions,
  generateRecurringAppointments,
}
