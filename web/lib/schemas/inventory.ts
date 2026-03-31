/**
 * Inventory validation schemas
 */

import { z } from 'zod'
import { uuidSchema, optionalString } from './common'

/**
 * Schema for barcode lookup query
 */
export const barcodeLookupQuerySchema = z.object({
  barcode: z.string().min(1, 'Código de barras requerido').max(100),
  clinic: uuidSchema,
})

export type BarcodeLookupQueryInput = z.infer<typeof barcodeLookupQuerySchema>

/**
 * Adjustment reasons
 */
export const ADJUSTMENT_REASONS = [
  'physical_count',
  'damage',
  'theft',
  'expired',
  'return',
  'correction',
  'other',
] as const

export type AdjustmentReason = (typeof ADJUSTMENT_REASONS)[number]

/**
 * Schema for inventory adjustment
 */
export const inventoryAdjustSchema = z.object({
  product_id: uuidSchema,
  new_quantity: z.number().int().min(0, 'La cantidad no puede ser negativa'),
  reason: z.enum(ADJUSTMENT_REASONS, {
    message: 'Razón de ajuste inválida',
  }),
  notes: optionalString(500),
})

export type InventoryAdjustInput = z.infer<typeof inventoryAdjustSchema>

/**
 * Schema for inventory import preview
 */
export const inventoryImportPreviewSchema = z.object({
  format: z.enum(['csv', 'xlsx']).default('csv'),
})

export type InventoryImportPreviewInput = z.infer<typeof inventoryImportPreviewSchema>

/**
 * Schema for inventory receive
 */
export const inventoryReceiveSchema = z.object({
  product_id: uuidSchema,
  quantity: z.number().int().positive('La cantidad debe ser mayor a 0'),
  unit_cost: z.number().min(0).optional(),
  notes: optionalString(500),
  batch_number: optionalString(100),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD').optional(),
})

export type InventoryReceiveInput = z.infer<typeof inventoryReceiveSchema>

/**
 * Schema for inventory import preview (JSON body mode)
 */
export const inventoryImportRowSchema = z.object({
  operation: z.string().optional(),
  sku: z.string().optional(),
  name: z.string().optional(),
  category: z.string().optional(),
  price: z.number().optional(),
  quantity: z.number().optional(),
  unit_cost: z.number().optional(),
  expiry_date: z.string().optional().nullable(),
  batch_number: z.string().optional().nullable(),
})

export const inventoryImportPreviewBodySchema = z.object({
  rows: z.array(inventoryImportRowSchema).min(1, 'Al menos una fila requerida'),
})

export type InventoryImportPreviewBodyInput = z.infer<typeof inventoryImportPreviewBodySchema>

/**
 * Schema for catalog product assignment
 */
export const catalogAssignSchema = z.object({
  catalog_product_id: uuidSchema,
  clinic_id: uuidSchema,
  sale_price: z.number().min(0, 'El precio de venta no puede ser negativo'),
  min_stock_level: z.number().int().min(0).optional(),
  location: z.string().max(100).optional(),
  initial_stock: z.number().int().min(0, 'El stock inicial no puede ser negativo').optional(),
  requires_prescription: z.boolean().optional(),
})

export type CatalogAssignInput = z.infer<typeof catalogAssignSchema>

/**
 * Schema for inventory export query
 */
export const inventoryExportQuerySchema = z.object({
  type: z.enum(['catalog', 'template']).default('catalog'),
})

export type InventoryExportQueryInput = z.infer<typeof inventoryExportQuerySchema>
