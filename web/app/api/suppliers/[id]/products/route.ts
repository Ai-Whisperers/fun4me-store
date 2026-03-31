import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * GET /api/suppliers/[id]/products
 * Get products from this supplier via procurement leads
 */
export const GET = withApiAuthParams(
  async ({ params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const supplierId = params.id

    try {
      // Check supplier exists and belongs to tenant
      const { data: supplier } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('id', supplierId)
        .eq('tenant_id', profile.tenant_id)
        .single()

      if (!supplier) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { resource: 'supplier' },
        })
      }

      // Get procurement leads with product info
      const { data: leads, error } = await supabase
        .from('procurement_leads')
        .select(
          `
          id,
          unit_cost,
          minimum_order_qty,
          lead_time_days,
          last_verified_at,
          is_preferred,
          catalog_products (
            id,
            sku,
            name,
            description,
            base_unit
          )
        `
        )
        .eq('supplier_id', supplierId)
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true)
        .order('last_verified_at', { ascending: false, nullsFirst: false })

      if (error) {
        logger.error('Error fetching supplier products', {
          tenantId: profile.tenant_id,
          supplierId,
          error: error.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return NextResponse.json({
        supplier,
        products: leads || [],
      })
    } catch (e) {
      logger.error('Supplier products GET error', {
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
