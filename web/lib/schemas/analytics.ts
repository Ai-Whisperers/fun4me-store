/**
 * Analytics validation schemas
 */

import { z } from 'zod'

/**
 * Schema for store analytics query parameters
 */
export const storeAnalyticsQuerySchema = z.object({
  period: z.coerce.number().int().min(1).max(365).default(30),
  topProducts: z.coerce.number().int().min(1).max(100).default(10),
})

export type StoreAnalyticsQueryInput = z.infer<typeof storeAnalyticsQuerySchema>

/**
 * Schema for analytics export query parameters
 */
export const analyticsExportQuerySchema = z.object({
  type: z.enum(['revenue', 'appointments', 'clients', 'services', 'inventory', 'customers']).default('revenue'),
  format: z.enum(['csv', 'pdf', 'json']).default('csv'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD').optional(),
})

export type AnalyticsExportQueryInput = z.infer<typeof analyticsExportQuerySchema>

/**
 * Schema for web vitals metrics
 */
export const webVitalsSchema = z.object({
  name: z.enum(['CLS', 'FCP', 'FID', 'INP', 'LCP', 'TTFB']),
  value: z.number(),
  id: z.string().optional(),
  delta: z.number().optional(),
  navigationType: z.string().optional(),
  rating: z.enum(['good', 'needs-improvement', 'poor']).optional(),
})

export type WebVitalsInput = z.infer<typeof webVitalsSchema>

/**
 * Schema for turnover analytics query
 */
export const turnoverQuerySchema = z.object({
  period: z.enum(['week', 'month', 'quarter', 'year']).default('month'),
})

export type TurnoverQueryInput = z.infer<typeof turnoverQuerySchema>

/**
 * Schema for margins analytics query
 */
export const marginsQuerySchema = z.object({
  period: z.coerce.number().int().min(1).max(365).default(30),
  lowMarginThreshold: z.coerce.number().min(0).max(100).default(15),
})

export type MarginsQueryInput = z.infer<typeof marginsQuerySchema>

/**
 * Schema for web vitals POST payload
 */
export const webVitalsPayloadSchema = z.object({
  name: z.string().min(1),
  value: z.number(),
  id: z.string().min(1),
  url: z.string().url().optional(),
  userAgent: z.string().optional(),
  timestamp: z.number().optional(),
  rating: z.enum(['good', 'needs-improvement', 'poor']).optional(),
})

export type WebVitalsPayloadInput = z.infer<typeof webVitalsPayloadSchema>
