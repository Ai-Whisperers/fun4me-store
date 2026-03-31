/**
 * Procurement validation schemas
 */

import { z } from 'zod'
import { uuidSchema, optionalString } from './common'

/**
 * Purchase order statuses
 */
export const PURCHASE_ORDER_STATUSES = [
  'draft',
  'submitted',
  'approved',
  'ordered',
  'partially_received',
  'received',
  'cancelled',
] as const

/**
 * Schema for purchase order query
 */
export const purchaseOrderQuerySchema = z.object({
  status: z.enum(PURCHASE_ORDER_STATUSES).optional(),
  supplier_id: uuidSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type PurchaseOrderQueryInput = z.infer<typeof purchaseOrderQuerySchema>

/**
 * Schema for purchase order item
 */
export const purchaseOrderItemSchema = z.object({
  catalog_product_id: uuidSchema,
  quantity: z.number().int().positive('La cantidad debe ser mayor a 0'),
  unit_cost: z.number().min(0, 'El costo unitario debe ser mayor o igual a 0'),
  notes: optionalString(500),
})

/**
 * Schema for creating a purchase order
 */
export const createPurchaseOrderSchema = z.object({
  supplier_id: uuidSchema,
  items: z.array(purchaseOrderItemSchema).min(1, 'Al menos un producto es requerido'),
  expected_delivery_date: z.string().datetime().optional(),
  shipping_address: optionalString(500),
  notes: optionalString(1000),
})

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>
