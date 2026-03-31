import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * GET /api/procurement/compare
 * Compare prices across suppliers for products
 */
export const GET = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    // Parse query params
    const { searchParams } = new URL(request.url)
    const productIds = searchParams.get('products')?.split(',').filter(Boolean) || []
    const verifiedOnly = searchParams.get('verified_only') === 'true'

    if (productIds.length === 0) {
      return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
        details: { required: ['products'] },
      })
    }

    try {
      // Get all procurement leads for the specified products
      let query = supabase
        .from('procurement_leads')
        .select(
          `
          id,
          catalog_product_id,
          unit_cost,
          minimum_order_qty,
          lead_time_days,
          is_preferred,
          last_verified_at,
          suppliers (
            id,
            name,
            verification_status,
            delivery_time_days,
            payment_terms
          ),
          catalog_products (
            id,
            sku,
            name,
            base_unit
          )
        `
        )
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true)
        .in('catalog_product_id', productIds)
        .order('unit_cost', { ascending: true })

      if (verifiedOnly) {
        query = query.eq('suppliers.verification_status', 'verified')
      }

      const { data: leads, error } = await query

      if (error) {
        logger.error('Error fetching comparison data', {
          tenantId: profile.tenant_id,
          userId: user.id,
          productCount: productIds.length,
          error: error.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      // Group by product for easier comparison
      const comparison: Record<
        string,
        {
          product: { id: string; sku: string; name: string; base_unit: string } | null
          suppliers: Array<{
            supplier: { id: string; name: string; verification_status: string } | null
            unit_cost: number
            minimum_order_qty: number | null
            lead_time_days: number | null
            is_preferred: boolean
            last_verified_at: string | null
            total_lead_time: number
          }>
          best_price: number | null
          price_range: { min: number; max: number } | null
        }
      > = {}

      for (const lead of leads || []) {
        const productId = lead.catalog_product_id

        if (!comparison[productId]) {
          type ProductType = { id: string; sku: string; name: string; base_unit: string }
          const productData = lead.catalog_products as ProductType | ProductType[] | null
          const product = Array.isArray(productData) ? productData[0] : productData
          comparison[productId] = {
            product,
            suppliers: [],
            best_price: null,
            price_range: null,
          }
        }

        type SupplierType = {
          id: string
          name: string
          verification_status: string
          delivery_time_days: number | null
        }
        const supplierRawData = lead.suppliers as SupplierType | SupplierType[] | null
        const supplierData = Array.isArray(supplierRawData) ? supplierRawData[0] : supplierRawData

        comparison[productId].suppliers.push({
          supplier: supplierData
            ? {
                id: supplierData.id,
                name: supplierData.name,
                verification_status: supplierData.verification_status,
              }
            : null,
          unit_cost: lead.unit_cost,
          minimum_order_qty: lead.minimum_order_qty,
          lead_time_days: lead.lead_time_days,
          is_preferred: lead.is_preferred,
          last_verified_at: lead.last_verified_at,
          total_lead_time: (lead.lead_time_days || 0) + (supplierData?.delivery_time_days || 0),
        })
      }

      // Calculate best prices and ranges
      for (const productId of Object.keys(comparison)) {
        const suppliers = comparison[productId].suppliers
        if (suppliers.length > 0) {
          const prices = suppliers.map((s) => s.unit_cost)
          comparison[productId].best_price = Math.min(...prices)
          comparison[productId].price_range = {
            min: Math.min(...prices),
            max: Math.max(...prices),
          }
        }
      }

      return NextResponse.json({
        comparison: Object.values(comparison),
        product_count: Object.keys(comparison).length,
        total_quotes: leads?.length || 0,
      })
    } catch (e) {
      logger.error('Procurement compare GET error', {
        tenantId: profile.tenant_id,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'] }
)
