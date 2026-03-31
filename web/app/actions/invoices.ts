/**
 * Invoice Actions - Re-export Module
 *
 * This file maintains backward compatibility with existing imports.
 * All invoice actions are now organized in the `invoices/` directory.
 *
 * For new code, import directly from the specific modules:
 * import { createInvoice } from '@/app/actions/invoices/create'
 *
 * Or use the barrel export:
 * import { createInvoice } from '@/app/actions/invoices'
 */

// Re-export all invoice actions for backward compatibility
export {
  createInvoice,
  updateInvoice,
  updateInvoiceStatus,
  recordPayment,
  sendInvoice,
  voidInvoice,
  getClinicServices,
  getClinicPets,
  getInvoices,
  getInvoice,
} from './invoices/index'
