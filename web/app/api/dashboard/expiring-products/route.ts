import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * GET /api/dashboard/expiring-products
 * Get products expiring within a configurable number of days
 */
export const GET = withApiAuth(
  async ({ request, profile, supabase }: ApiHandlerContext) => {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '90', 10)
    const urgency = searchParams.get('urgency') // expired, critical, high, medium, low

    try {
      // Get expiring products using the RPC function
      const { data: expiringProducts, error: productsError } = await supabase.rpc(
        'get_expiring_products',
        {
          p_tenant_id: profile.tenant_id,
          p_days: days,
        }
      )

      if (productsError) throw productsError

      // Get expired products
      const { data: expiredProducts } = await supabase
        .from('expired_products')
        .select('*')
        .eq('tenant_id', profile.tenant_id)

      // Get expiry summary
      const { data: summary } = await supabase.rpc('get_expiry_summary', {
        p_tenant_id: profile.tenant_id,
      })

      // Combine and filter by urgency if specified
      let allProducts = [
        ...(expiredProducts || []).map((p) => ({ ...p, urgency_level: 'expired' })),
        ...(expiringProducts || []),
      ]

      if (urgency) {
        allProducts = allProducts.filter((p) => p.urgency_level === urgency)
      }

      // Group products by urgency level
      const grouped = {
        expired: allProducts.filter((p) => p.urgency_level === 'expired'),
        critical: allProducts.filter((p) => p.urgency_level === 'critical'),
        high: allProducts.filter((p) => p.urgency_level === 'high'),
        medium: allProducts.filter((p) => p.urgency_level === 'medium'),
        low: allProducts.filter((p) => p.urgency_level === 'low'),
      }

      // Calculate totals
      const totals = {
        expired: grouped.expired.length,
        critical: grouped.critical.length,
        high: grouped.high.length,
        medium: grouped.medium.length,
        low: grouped.low.length,
        total: allProducts.length,
      }

      return NextResponse.json({
        products: allProducts,
        grouped,
        totals,
        summary: summary || [],
      })
    } catch (error) {
      logger.error('Error fetching expiring products', {
        tenantId: profile.tenant_id,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'] }
)
