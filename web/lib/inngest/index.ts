/**
 * Inngest Module
 *
 * Central export for Inngest client and functions.
 *
 * @example
 * ```typescript
 * // Import client for sending events
 * import { inngest } from '@/lib/inngest'
 *
 * await inngest.send({ name: 'billing/auto-charge', data: { batchSize: 50 } })
 *
 * // Import functions for the serve endpoint
 * import { inngestFunctions } from '@/lib/inngest'
 * ```
 */

export { inngest } from './client'
export type { InngestEvents, InngestEventName } from './client'
export { inngestFunctions } from './functions'

// Re-export individual function modules for direct access
export * as billingFunctions from './functions/billing'
export * as reminderFunctions from './functions/reminders'
export * as stockFunctions from './functions/stock'
export * as maintenanceFunctions from './functions/maintenance'
