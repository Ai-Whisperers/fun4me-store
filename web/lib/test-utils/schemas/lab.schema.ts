import { z } from 'zod'

/**
 * Lab Test Catalog Schema
 */
export const LabTestCatalogSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().min(1).optional().nullable(), // NULL = global

  code: z.string().min(2),
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),

  sample_type: z
    .enum([
      'blood',
      'serum',
      'plasma',
      'urine',
      'feces',
      'tissue',
      'swab',
      'citrated_blood',
      'edta_blood',
      'aspirate',
      'biopsy',
      'skin',
      'hair',
      'other',
    ])
    .default('blood'),

  sample_volume_ml: z.number().positive().optional().nullable(),

  // Reference ranges as JSONB: {"dog": {"min": 5, "max": 15, "unit": "mg/dL"}}
  reference_ranges: z
    .record(
      z.string(),
      z.object({
        min: z.number().optional(),
        max: z.number().optional(),
        unit: z.string().optional(),
      })
    )
    .optional()
    .nullable(),

  base_price: z.number().min(0).default(0),
  turnaround_days: z.number().int().positive().default(1),

  requires_fasting: z.boolean().default(false),
  special_instructions: z.string().optional().nullable(),

  is_active: z.boolean().default(true),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
})

export type LabTestCatalogInput = z.input<typeof LabTestCatalogSchema>
export type LabTestCatalog = z.output<typeof LabTestCatalogSchema>

/**
 * Lab Panel Schema
 */
export const LabPanelSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().min(1).optional().nullable(),

  code: z.string().min(1),
  name: z.string().min(2),
  description: z.string().optional().nullable(),

  test_ids: z.array(z.string().uuid()).min(1, 'Panel must have at least one test'),
  panel_price: z.number().min(0).optional().nullable(),

  is_active: z.boolean().default(true),
  created_at: z.string().datetime().optional(),
})

export type LabPanelInput = z.input<typeof LabPanelSchema>
export type LabPanel = z.output<typeof LabPanelSchema>

/**
 * Lab Order Schema
 *
 * CRITICAL: order_number is required (NOT NULL, UNIQUE per tenant)
 */
export const LabOrderSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().min(1),
  pet_id: z.string().uuid(),

  // CRITICAL: Required field - unique per tenant
  order_number: z.string().min(1, 'order_number is required'),

  ordered_by: z.string().uuid().optional().nullable(),
  medical_record_id: z.string().uuid().optional().nullable(),

  priority: z.enum(['stat', 'urgent', 'routine']).default('routine'),
  lab_type: z.enum(['in_house', 'reference_lab']).default('in_house'),
  status: z
    .enum(['pending', 'collected', 'processing', 'completed', 'reviewed', 'cancelled'])
    .default('pending'),

  clinical_notes: z.string().optional().nullable(),
  fasting_confirmed: z.boolean().default(false),

  collected_at: z.string().datetime().optional().nullable(),
  collected_by: z.string().uuid().optional().nullable(),
  processing_at: z.string().datetime().optional().nullable(),
  completed_at: z.string().datetime().optional().nullable(),
  reviewed_at: z.string().datetime().optional().nullable(),
  reviewed_by: z.string().uuid().optional().nullable(),

  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
})

export type LabOrderInput = z.input<typeof LabOrderSchema>
export type LabOrder = z.output<typeof LabOrderSchema>

/**
 * Lab Order Item Schema
 */
export const LabOrderItemSchema = z.object({
  id: z.string().uuid().optional(),
  lab_order_id: z.string().uuid(),
  tenant_id: z.string().min(1).optional(), // Auto-set by trigger
  test_id: z.string().uuid(),

  status: z.enum(['pending', 'processing', 'completed', 'cancelled']).default('pending'),
  price: z.number().min(0).optional().nullable(),

  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
})

export type LabOrderItemInput = z.input<typeof LabOrderItemSchema>
export type LabOrderItem = z.output<typeof LabOrderItemSchema>

/**
 * Lab Result Schema
 */
export const LabResultSchema = z.object({
  id: z.string().uuid().optional(),
  lab_order_id: z.string().uuid(),
  tenant_id: z.string().min(1).optional(), // Auto-set by trigger
  test_id: z.string().uuid(),

  value: z.string().min(1),
  numeric_value: z.number().optional().nullable(),
  unit: z.string().optional().nullable(),

  reference_min: z.number().optional().nullable(),
  reference_max: z.number().optional().nullable(),

  flag: z.enum(['low', 'normal', 'high', 'critical_low', 'critical_high']).optional().nullable(),
  is_abnormal: z.boolean().default(false),

  notes: z.string().optional().nullable(),
  entered_by: z.string().uuid().optional().nullable(),
  entered_at: z.string().datetime().optional(),

  created_at: z.string().datetime().optional(),
})

export type LabResultInput = z.input<typeof LabResultSchema>
export type LabResult = z.output<typeof LabResultSchema>

/**
 * Lab Result Attachment Schema
 */
export const LabResultAttachmentSchema = z.object({
  id: z.string().uuid().optional(),
  lab_order_id: z.string().uuid(),
  tenant_id: z.string().min(1).optional(),

  file_url: z.string().url(),
  file_name: z.string().min(1),
  file_type: z.string().optional().nullable(),
  file_size_bytes: z.number().int().positive().optional().nullable(),

  uploaded_by: z.string().uuid().optional().nullable(),
  created_at: z.string().datetime().optional(),
})

export type LabResultAttachmentInput = z.input<typeof LabResultAttachmentSchema>
export type LabResultAttachment = z.output<typeof LabResultAttachmentSchema>

/**
 * Lab Result Comment Schema
 */
export const LabResultCommentSchema = z.object({
  id: z.string().uuid().optional(),
  lab_order_id: z.string().uuid(),
  tenant_id: z.string().min(1).optional(),

  comment: z.string().min(1),

  created_by: z.string().uuid().optional().nullable(),
  created_at: z.string().datetime().optional(),
})

export type LabResultCommentInput = z.input<typeof LabResultCommentSchema>
export type LabResultComment = z.output<typeof LabResultCommentSchema>

/**
 * Helper: Generate lab order number
 */
export function generateLabOrderNumber(index: number, date?: Date): string {
  const d = date || new Date()
  const year = d.getFullYear()
  return `LAB-${year}-${String(index).padStart(6, '0')}`
}
