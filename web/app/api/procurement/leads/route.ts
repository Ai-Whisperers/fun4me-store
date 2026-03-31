import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// Validation schema for procurement leads
const procurementLeadSchema = z.object({
  supplier_id: z.string().uuid('ID de proveedor inválido'),
  catalog_product_id: z.string().uuid('ID de producto inválido'),
  unit_cost: z.number().positive('Costo debe ser positivo'),
  minimum_order_qty: z.number().int().positive().optional(),
  lead_time_days: z.number().int().min(0).optional(),
  is_preferred: z.boolean().optional(),
  notes: z.string().optional(),
})

/**
 * GET /api/procurement/leads
 * List procurement leads with filters
 */
export const GET = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    // Parse query params
    const { searchParams } = new URL(request.url)
    const supplierId = searchParams.get('supplier_id')
    const productId = searchParams.get('product_id')
    const preferredOnly = searchParams.get('preferred') === 'true'
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    try {
      // Build query
      let query = supabase
        .from('procurement_leads')
        .select(
          `
          *,
          suppliers (id, name, verification_status, delivery_time_days),
          catalog_products (id, sku, name, base_unit)
        `,
          { count: 'exact' }
        )
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true)
        .order('unit_cost', { ascending: true })

      if (supplierId) {
        query = query.eq('supplier_id', supplierId)
      }

      if (productId) {
        query = query.eq('catalog_product_id', productId)
      }

      if (preferredOnly) {
        query = query.eq('is_preferred', true)
      }

      query = query.range(offset, offset + limit - 1)

      const { data: leads, error, count } = await query

      if (error) {
        logger.error('Error fetching procurement leads', {
          tenantId: profile.tenant_id,
          userId: user.id,
          error: error.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return NextResponse.json({
        leads,
        total: count || 0,
        limit,
        offset,
      })
    } catch (e) {
      logger.error('Procurement leads GET error', {
        tenantId: profile.tenant_id,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'] }
)

/**
 * POST /api/procurement/leads
 * Add new price quote
 */
export const POST = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    try {
      // Parse and validate body
      const body = await request.json()
      const validation = procurementLeadSchema.safeParse(body)

      if (!validation.success) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: { errors: validation.error.flatten().fieldErrors },
        })
      }

      const leadData = validation.data

      // Verify supplier exists and belongs to tenant
      const { data: supplier } = await supabase
        .from('suppliers')
        .select('id')
        .eq('id', leadData.supplier_id)
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true)
        .single()

      if (!supplier) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { resource: 'supplier' },
        })
      }

      // Check if lead already exists for this supplier-product combo
      const { data: existing } = await supabase
        .from('procurement_leads')
        .select('id')
        .eq('tenant_id', profile.tenant_id)
        .eq('supplier_id', leadData.supplier_id)
        .eq('catalog_product_id', leadData.catalog_product_id)
        .eq('is_active', true)
        .single()

      if (existing) {
        // Update existing lead
        const { data: lead, error } = await supabase
          .from('procurement_leads')
          .update({
            unit_cost: leadData.unit_cost,
            minimum_order_qty: leadData.minimum_order_qty,
            lead_time_days: leadData.lead_time_days,
            is_preferred: leadData.is_preferred,
            notes: leadData.notes,
            last_verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single()

        if (error) {
          logger.error('Error updating procurement lead', {
            tenantId: profile.tenant_id,
            leadId: existing.id,
            error: error.message,
          })
          return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
        }

        return NextResponse.json(lead)
      }

      // Create new lead
      const { data: lead, error } = await supabase
        .from('procurement_leads')
        .insert({
          tenant_id: profile.tenant_id,
          supplier_id: leadData.supplier_id,
          catalog_product_id: leadData.catalog_product_id,
          unit_cost: leadData.unit_cost,
          minimum_order_qty: leadData.minimum_order_qty,
          lead_time_days: leadData.lead_time_days,
          is_preferred: leadData.is_preferred || false,
          notes: leadData.notes,
          last_verified_at: new Date().toISOString(),
          is_active: true,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) {
        logger.error('Error creating procurement lead', {
          tenantId: profile.tenant_id,
          userId: user.id,
          error: error.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return NextResponse.json(lead, { status: 201 })
    } catch (e) {
      logger.error('Procurement leads POST error', {
        tenantId: profile.tenant_id,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['admin'], rateLimit: 'write' }
)
