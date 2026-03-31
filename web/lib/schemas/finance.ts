/**
 * Finance validation schemas
 */

import { z } from 'zod'

/**
 * Schema for P&L query
 */
export const plQuerySchema = z.object({
  clinic: z.string().uuid().optional(),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD').optional(),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD').optional(),
})

export type PLQueryInput = z.infer<typeof plQuerySchema>

/**
 * Expense categories
 */
export const expenseCategoryEnum = z.enum([
  'supplies',
  'medications',
  'equipment',
  'utilities',
  'rent',
  'salaries',
  'marketing',
  'maintenance',
  'insurance',
  'taxes',
  'other',
])

/**
 * Schema for creating an expense
 */
export const createExpenseSchema = z.object({
  amount: z.number().positive('El monto debe ser positivo'),
  category: expenseCategoryEnum,
  description: z.string().max(500).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD'),
  vendor: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
  receipt_url: z.string().url().optional(),
})

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>

/**
 * Schema for updating an expense
 */
export const updateExpenseSchema = createExpenseSchema.partial().extend({
  id: z.string().uuid(),
})

export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>
