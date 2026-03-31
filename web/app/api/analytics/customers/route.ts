import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const customerAnalyticsQuerySchema = z.object({
  period: z.coerce.number().int().min(1).max(365).default(90),
})

/**
 * GET /api/analytics/customers
 * Get customer purchase analytics and segmentation
 *
 * Uses database function for efficient aggregation (no N+1 queries).
 * Previously fetched all orders into memory - now computed server-side.
 */
export const GET = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    const { searchParams } = new URL(request.url)
    
    const queryResult = customerAnalyticsQuerySchema.safeParse({
      period: searchParams.get('period'),
    })

    if (!queryResult.success) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { issues: queryResult.error.issues },
      })
    }

    const { period: validPeriod } = queryResult.data

    try {
      // Use database function for efficient aggregation
      // This replaces the previous O(n^2) TypeScript implementation
      const { data: result, error: rpcError } = await supabase.rpc('get_customer_analytics', {
        p_tenant_id: profile.tenant_id,
        p_period_days: validPeriod,
      })

      if (rpcError) {
        logger.error('Customer analytics RPC error', {
          tenantId: profile.tenant_id,
          error: rpcError.message,
        })
        throw rpcError
      }

      // Return the pre-computed result from the database
      return NextResponse.json(result || {
        summary: {
          total_customers: 0,
          active_customers: 0,
          new_customers_period: 0,
          repeat_purchase_rate: 0,
          avg_customer_lifetime_value: 0,
          avg_orders_per_customer: 0,
          avg_basket_size: 0,
        },
        segments: [],
        topCustomers: [],
        atRiskCustomers: [],
        generatedAt: new Date().toISOString(),
      })
    } catch (e) {
      logger.error('Error fetching customer analytics', {
        tenantId: profile.tenant_id,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'] }
)
