/**
 * Invoice validation schemas
 */

import { z } from 'zod'
import {
  uuidSchema,
  currencySchema,
  percentageSchema,
  requiredString,
  optionalString,
} from './common'
import { INVOICE_STATUSES, type InvoiceStatus } from '@/lib/types/status'

// Re-export for backward compatibility
export { INVOICE_STATUSES, type InvoiceStatus }

/**
 * Invoice item types
 */
export const INVOICE_ITEM_TYPES = ['service', 'product', 'custom'] as const
export type InvoiceItemType = (typeof INVOICE_ITEM_TYPES)[number]

/**
 * Schema for invoice item
 */
export const invoiceItemSchema = z.object({
  service_id: uuidSchema.optional().nullable(),
  product_id: uuidSchema.optional().nullable(),
  description: requiredString('Descripción', 500),
  quantity: z.number().int().min(1, 'Cantidad mínima es 1'),
  unit_price: currencySchema,
  discount_percent: percentageSchema.optional().default(0),
})

export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>

/**
 * Schema for creating an invoice
 */
export const createInvoiceSchema = z.object({
  pet_id: uuidSchema,
  items: z.array(invoiceItemSchema).min(1, 'Debe incluir al menos un item'),
  notes: optionalString(1000),
  due_date: z.string().datetime().optional(),
  tax_rate: percentageSchema.optional().default(10),
})

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>

/**
 * Schema for updating invoice status
 */
export const updateInvoiceStatusSchema = z.object({
  status: z.enum(INVOICE_STATUSES, {
    message: 'Estado de factura inválido',
  }),
})

export type UpdateInvoiceStatusInput = z.infer<typeof updateInvoiceStatusSchema>

/**
 * Schema for recording a payment
 */
export const recordPaymentSchema = z.object({
  amount: currencySchema.refine((val) => val > 0, 'El monto debe ser mayor a 0'),
  payment_method: requiredString('Método de pago', 50),
  reference: optionalString(100),
  notes: optionalString(500),
})

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>

/**
 * Schema for processing a refund
 */
export const processRefundSchema = z.object({
  payment_id: uuidSchema,
  amount: currencySchema.refine((val) => val > 0, 'El monto debe ser mayor a 0'),
  reason: requiredString('Motivo', 500),
})

export type ProcessRefundInput = z.infer<typeof processRefundSchema>

/**
 * Schema for invoice query parameters
 */
export const invoiceQuerySchema = z.object({
  clinic: z.string().optional(),
  status: z.enum(INVOICE_STATUSES).optional(),
  pet_id: uuidSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type InvoiceQueryInput = z.infer<typeof invoiceQuerySchema>
