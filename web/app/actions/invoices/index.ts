/**
 * Invoice Actions - Modular Structure
 *
 * This directory contains all invoice-related server actions, split by domain:
 * - create.ts: Create new invoices
 * - update.ts: Update invoices and status changes
 * - payment.ts: Record payments
 * - send.ts: Send invoices via email
 * - void.ts: Void/cancel invoices
 * - queries.ts: Read operations (get invoices, services, pets)
 *
 * Import from this index for backward compatibility:
 * import { createInvoice, updateInvoice } from '@/app/actions/invoices'
 */

// Create operations
export { createInvoice } from './create'

// Update operations
export { updateInvoice, updateInvoiceStatus } from './update'

// Payment operations
export { recordPayment } from './payment'

// Send/Email operations
export { sendInvoice } from './send'

// Void operations
export { voidInvoice } from './void'

// Query operations
export { getClinicServices, getClinicPets, getInvoices, getInvoice } from './queries'
