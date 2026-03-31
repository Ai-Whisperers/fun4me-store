/**
 * Email Module Index
 *
 * Central export for all email functionality
 */

export { sendEmail, isEmailConfigured, getDefaultFrom } from './client'

export type { EmailOptions, EmailResult } from './client'

export * from './templates'
