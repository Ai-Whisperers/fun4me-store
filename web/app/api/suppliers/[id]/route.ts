import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// Validation schema for updating suppliers
const updateSupplierSchema = z.object({
  name: z.string().min(1).optional(),
  legal_name: z.string().optional(),
  tax_id: z.string().optional(),
  contact_info: z
    .object({
      email: z.string().email().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      contact_person: z.string().optional(),
    })
    .optional(),
  supplier_type: z.enum(['products', 'services', 'both']).optional(),
  minimum_order_amount: z.number().min(0).optional(),
  payment_terms: z.string().optional(),
  delivery_time_days: z.number().int().min(0).optional(),
  notes: z.string().optional(),
})

/**
 * GET /api/suppliers/[id]
 * Get supplier details
 */
export const GET = withApiAuthParams(
  async ({ params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const supplierId = params.id

    try {
      // Fetch supplier with related data
      const { data: supplier, error } = await supabase
        .from('suppliers')
        .select(
          `
          *,
          procurement_leads(
            id,
            catalog_product_id,
            unit_cost,
            minimum_order_qty,
            lead_time_days,
            last_verified_at
          )
        `
        )
        .eq('id', supplierId)
        .eq('tenant_id', profile.tenant_id)
        .single()

      if (error || !supplier) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { resource: 'supplier' },
        })
      }

      return NextResponse.json(supplier)
    } catch (e) {
      logger.error('Supplier GET error', {
        tenantId: profile.tenant_id,
        supplierId,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'] }
)

/**
 * PUT /api/suppliers/[id]
 * Update supplier
 */
export const PUT = withApiAuthParams(
  async ({ request, params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const supplierId = params.id

    try {
      // Parse and validate body
      const body = await request.json()
      const validation = updateSupplierSchema.safeParse(body)

      if (!validation.success) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: { errors: validation.error.flatten().fieldErrors },
        })
      }

      // Check supplier exists and belongs to tenant
      const { data: existing } = await supabase
        .from('suppliers')
        .select('id')
        .eq('id', supplierId)
        .eq('tenant_id', profile.tenant_id)
        .single()

      if (!existing) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { resource: 'supplier' },
        })
      }

      // Update supplier
      const { data: supplier, error } = await supabase
        .from('suppliers')
        .update({
          ...validation.data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', supplierId)
        .eq('tenant_id', profile.tenant_id)
        .select()
        .single()

      if (error) {
        logger.error('Error updating supplier', {
          tenantId: profile.tenant_id,
          supplierId,
          error: error.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return NextResponse.json(supplier)
    } catch (e) {
      logger.error('Supplier PUT error', {
        tenantId: profile.tenant_id,
        supplierId,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['admin'], rateLimit: 'write' }
)

/**
 * DELETE /api/suppliers/[id]
 * Soft delete supplier
 */
export const DELETE = withApiAuthParams(
  async ({ params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const supplierId = params.id

    try {
      // Check supplier exists
      const { data: existing } = await supabase
        .from('suppliers')
        .select('id')
        .eq('id', supplierId)
        .eq('tenant_id', profile.tenant_id)
        .single()

      if (!existing) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { resource: 'supplier' },
        })
      }

      // Soft delete
      const { error } = await supabase
        .from('suppliers')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', supplierId)
        .eq('tenant_id', profile.tenant_id)

      if (error) {
        logger.error('Error deleting supplier', {
          tenantId: profile.tenant_id,
          supplierId,
          error: error.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return NextResponse.json({ success: true })
    } catch (e) {
      logger.error('Supplier DELETE error', {
        tenantId: profile.tenant_id,
        supplierId,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['admin'], rateLimit: 'write' }
)
