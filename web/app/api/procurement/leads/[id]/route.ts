import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const updateLeadSchema = z.object({
  unit_cost: z.number().positive().optional(),
  minimum_order_qty: z.number().int().positive().optional(),
  lead_time_days: z.number().int().min(0).optional(),
  is_preferred: z.boolean().optional(),
  notes: z.string().optional(),
})

/**
 * GET /api/procurement/leads/[id]
 * Get procurement lead details
 */
export const GET = withApiAuthParams(
  async ({ params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const leadId = params.id

    try {
      const { data: lead, error } = await supabase
        .from('procurement_leads')
        .select(
          `
          *,
          suppliers (id, name, contact_info, verification_status),
          catalog_products (id, sku, name, description, base_unit)
        `
        )
        .eq('id', leadId)
        .eq('tenant_id', profile.tenant_id)
        .single()

      if (error || !lead) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { resource: 'procurement_lead' },
        })
      }

      return NextResponse.json(lead)
    } catch (e) {
      logger.error('Procurement lead GET error', {
        tenantId: profile.tenant_id,
        leadId,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'] }
)

/**
 * PUT /api/procurement/leads/[id]
 * Update procurement lead
 */
export const PUT = withApiAuthParams(
  async ({ request, params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const leadId = params.id

    try {
      // Parse and validate body
      const body = await request.json()
      const validation = updateLeadSchema.safeParse(body)

      if (!validation.success) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: { errors: validation.error.flatten().fieldErrors },
        })
      }

      // Check lead exists
      const { data: existing } = await supabase
        .from('procurement_leads')
        .select('id')
        .eq('id', leadId)
        .eq('tenant_id', profile.tenant_id)
        .single()

      if (!existing) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { resource: 'procurement_lead' },
        })
      }

      // Update lead
      const { data: lead, error } = await supabase
        .from('procurement_leads')
        .update({
          ...validation.data,
          last_verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId)
        .eq('tenant_id', profile.tenant_id)
        .select()
        .single()

      if (error) {
        logger.error('Error updating procurement lead', {
          tenantId: profile.tenant_id,
          leadId,
          error: error.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return NextResponse.json(lead)
    } catch (e) {
      logger.error('Procurement lead PUT error', {
        tenantId: profile.tenant_id,
        leadId,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['admin'], rateLimit: 'write' }
)

/**
 * DELETE /api/procurement/leads/[id]
 * Soft delete procurement lead
 */
export const DELETE = withApiAuthParams(
  async ({ params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const leadId = params.id

    try {
      // Soft delete
      const { error } = await supabase
        .from('procurement_leads')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId)
        .eq('tenant_id', profile.tenant_id)

      if (error) {
        logger.error('Error deleting procurement lead', {
          tenantId: profile.tenant_id,
          leadId,
          error: error.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return NextResponse.json({ success: true })
    } catch (e) {
      logger.error('Procurement lead DELETE error', {
        tenantId: profile.tenant_id,
        leadId,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['admin'], rateLimit: 'write' }
)
