/**
 * Admin validation schemas
 */

import { z } from 'zod'

/**
 * Schema for pending products query
 */
export const pendingProductsQuerySchema = z.object({
  status: z.enum(['pending', 'verified', 'rejected', 'needs_review', 'all']).default('pending'),
  search: z.string().max(100).default(''),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})

export type PendingProductsQueryInput = z.infer<typeof pendingProductsQuerySchema>

/**
 * Schema for product approval action
 */
export const approveProductSchema = z.object({
  action: z.enum(['verify', 'reject', 'needs_review']),
  rejection_reason: z.string().max(500).optional(),
})

export type ApproveProductInput = z.infer<typeof approveProductSchema>
