/**
 * Invoice Domain Module
 *
 * Clean domain layer for invoice operations.
 * Exports types, repository, and service for external use.
 */

// Types
export * from './types'

// Repository (data access layer)
export { InvoiceRepository } from './repository'

// Service (business logic layer)
export { InvoiceService } from './service'
