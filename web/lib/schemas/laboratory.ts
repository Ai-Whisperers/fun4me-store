/**
 * Laboratory validation schemas
 * For lab test ordering, result entry, and panels
 */

import { z } from 'zod'
import { LAB_ORDER_STATUSES } from '../types/status'
import { uuidSchema, requiredString, optionalString, enumSchema } from './common'

// =============================================================================
// LAB TEST CATEGORIES
// =============================================================================

export const LAB_CATEGORIES = [
  'hematology',
  'chemistry',
  'urinalysis',
  'serology',
  'microbiology',
  'cytology',
  'histopathology',
  'parasitology',
  'endocrinology',
  'coagulation',
  'immunology',
  'toxicology',
  'genetics',
  'other',
] as const
export type LabCategory = (typeof LAB_CATEGORIES)[number]

// =============================================================================
// LAB ORDER PRIORITY
// =============================================================================

export const LAB_PRIORITIES = ['routine', 'urgent', 'stat'] as const
export type LabPriority = (typeof LAB_PRIORITIES)[number]

// =============================================================================
// LAB RESULT FLAGS
// =============================================================================

export const LAB_RESULT_FLAGS = [
  'normal',
  'low',
  'high',
  'critical_low',
  'critical_high',
  'abnormal',
] as const
export type LabResultFlag = (typeof LAB_RESULT_FLAGS)[number]

// =============================================================================
// LAB ORDER CREATION
// =============================================================================

/**
 * Schema for creating a lab order
 */
export const createLabOrderSchema = z.object({
  pet_id: uuidSchema,
  tests: z
    .array(uuidSchema)
    .min(1, 'Selecciona al menos un test')
    .max(50, 'Máximo 50 tests por orden'),
  panel_id: uuidSchema.optional(),
  priority: enumSchema(LAB_PRIORITIES, 'Prioridad').default('routine'),
  clinical_notes: optionalString(1000),
  fasting_required: z.boolean().default(false),
  specimen_type: optionalString(100), // e.g., "blood", "urine", "tissue"
  collection_site: optionalString(100),
  ordered_at: z.string().datetime().optional(), // Defaults to now
})

export type CreateLabOrderInput = z.infer<typeof createLabOrderSchema>

/**
 * Schema for updating lab order status
 */
export const updateLabOrderSchema = z.object({
  status: z.enum(LAB_ORDER_STATUSES),
  collected_at: z.string().datetime().optional(),
  processed_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional(),
  cancelled_reason: optionalString(500),
  notes: optionalString(1000),
})

export type UpdateLabOrderInput = z.infer<typeof updateLabOrderSchema>

// =============================================================================
// LAB RESULTS
// =============================================================================

/**
 * Schema for entering a single test result
 */
export const createLabResultSchema = z.object({
  lab_order_id: uuidSchema,
  test_id: uuidSchema,
  value: requiredString('Valor', 200),
  unit: optionalString(50),
  reference_range: optionalString(100), // e.g., "5-10 mg/dL"
  flag: enumSchema(LAB_RESULT_FLAGS, 'Indicador').optional(),
  is_abnormal: z.boolean().default(false),
  notes: optionalString(500),
  verified_at: z.string().datetime().optional(),
  verified_by: uuidSchema.optional(),
})

export type CreateLabResultInput = z.infer<typeof createLabResultSchema>

/**
 * Schema for bulk result entry
 */
export const bulkLabResultsSchema = z.object({
  lab_order_id: uuidSchema,
  results: z
    .array(
      z.object({
        test_id: uuidSchema,
        value: requiredString('Valor', 200),
        unit: optionalString(50),
        flag: enumSchema(LAB_RESULT_FLAGS, 'Indicador').optional(),
        is_abnormal: z.boolean().default(false),
        notes: optionalString(500),
      })
    )
    .min(1, 'Ingresa al menos un resultado'),
})

export type BulkLabResultsInput = z.infer<typeof bulkLabResultsSchema>

/**
 * Schema for updating a lab result
 */
export const updateLabResultSchema = createLabResultSchema.partial().extend({
  id: uuidSchema,
})

export type UpdateLabResultInput = z.infer<typeof updateLabResultSchema>

// =============================================================================
// LAB TEST CATALOG
// =============================================================================

/**
 * Schema for creating a lab test in the catalog
 */
export const createLabTestSchema = z.object({
  name: requiredString('Nombre', 200),
  code: requiredString('Código', 50),
  category: enumSchema(LAB_CATEGORIES, 'Categoría'),
  description: optionalString(1000),
  reference_range: optionalString(200),
  unit: optionalString(50),
  price: z.number().nonnegative().optional(),
  turnaround_time_hours: z.number().int().min(1).optional(),
  specimen_type: optionalString(100),
  preparation_instructions: optionalString(500),
  is_active: z.boolean().default(true),
})

export type CreateLabTestInput = z.infer<typeof createLabTestSchema>

/**
 * Schema for updating a lab test
 */
export const updateLabTestSchema = createLabTestSchema.partial().extend({
  id: uuidSchema,
})

export type UpdateLabTestInput = z.infer<typeof updateLabTestSchema>

// =============================================================================
// LAB PANELS
// =============================================================================

/**
 * Schema for creating a lab panel (group of tests)
 */
export const createLabPanelSchema = z.object({
  name: requiredString('Nombre', 200),
  description: optionalString(1000),
  test_ids: z
    .array(uuidSchema)
    .min(2, 'Un panel debe incluir al menos 2 tests')
    .max(50, 'Máximo 50 tests por panel'),
  price: z.number().nonnegative().optional(),
  is_active: z.boolean().default(true),
})

export type CreateLabPanelInput = z.infer<typeof createLabPanelSchema>

/**
 * Schema for updating a lab panel
 */
export const updateLabPanelSchema = createLabPanelSchema.partial().extend({
  id: uuidSchema,
})

export type UpdateLabPanelInput = z.infer<typeof updateLabPanelSchema>

// =============================================================================
// LAB RESULT ATTACHMENTS
// =============================================================================

/**
 * File types for lab result attachments
 */
export const LAB_FILE_TYPES = ['pdf', 'image', 'document'] as const
export type LabFileType = (typeof LAB_FILE_TYPES)[number]

/**
 * Schema for uploading lab result attachments
 */
export const uploadLabAttachmentSchema = z.object({
  lab_order_id: uuidSchema,
  file_url: z.string().url('URL inválida'),
  file_type: enumSchema(LAB_FILE_TYPES, 'Tipo de archivo'),
  file_name: requiredString('Nombre de archivo', 255),
  file_size_bytes: z.number().int().min(1).max(10485760), // 10MB max
  description: optionalString(500),
})

export type UploadLabAttachmentInput = z.infer<typeof uploadLabAttachmentSchema>

// =============================================================================
// LAB RESULT COMMENTS
// =============================================================================

/**
 * Schema for adding a comment to a lab order
 */
export const createLabCommentSchema = z.object({
  lab_order_id: uuidSchema,
  comment: requiredString('Comentario', 2000),
  is_critical: z.boolean().default(false),
})

export type CreateLabCommentInput = z.infer<typeof createLabCommentSchema>

// =============================================================================
// QUERY SCHEMAS
// =============================================================================

/**
 * Schema for lab order query parameters
 */
export const labOrderQuerySchema = z.object({
  status: z.enum(LAB_ORDER_STATUSES).optional(),
  pet_id: uuidSchema.optional(),
  priority: z.enum(LAB_PRIORITIES).optional(),
  category: z.enum(LAB_CATEGORIES).optional(),
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional(),
  has_critical: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type LabOrderQueryParams = z.infer<typeof labOrderQuerySchema>

/**
 * Schema for lab test search
 */
export const labTestSearchSchema = z.object({
  q: z.string().min(2, 'Ingresa al menos 2 caracteres').max(100),
  category: z.enum(LAB_CATEGORIES).optional(),
  is_active: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export type LabTestSearchParams = z.infer<typeof labTestSearchSchema>
