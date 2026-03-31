import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { parsePagination, paginatedResponse } from '@/lib/api/pagination'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * GET /api/suppliers/[id]/orders
 * Get purchase order history for a specific supplier
 * Query params:
 *   - status: Filter by order status
 *   - page, limit: Pagination
 */
export const GET = withApiAuthParams(
  async ({ request, params, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const supplierId = params.id

    try {
      // Verify supplier exists and belongs to tenant
      const { data: supplier, error: supplierError } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('id', supplierId)
        .eq('tenant_id', profile.tenant_id)
        .single()

      if (supplierError || !supplier) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { resource: 'supplier' },
        })
      }

      const { searchParams } = new URL(request.url)
      const status = searchParams.get('status')
      const { page, limit, offset } = parsePagination(searchParams)

      // Build query
      let query = supabase
        .from('purchase_orders')
        .select(
          `
          id,
          order_number,
          status,
          subtotal,
          total,
          expected_delivery_date,
          created_at,
          submitted_at,
          received_at,
          purchase_order_items(
            id,
            quantity,
            unit_cost,
            received_quantity,
            store_products(id, name, sku)
          ),
          created_by_profile:profiles!purchase_orders_created_by_fkey(id, full_name)
        `,
          { count: 'exact' }
        )
        .eq('tenant_id', profile.tenant_id)
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (status) {
        query = query.eq('status', status)
      }

      const { data: orders, error, count } = await query

      if (error) {
        logger.error('Error fetching supplier order history', {
          tenantId: profile.tenant_id,
          supplierId,
          error: error.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      // Calculate summary statistics
      const { data: stats } = await supabase
        .from('purchase_orders')
        .select('status, total')
        .eq('tenant_id', profile.tenant_id)
        .eq('supplier_id', supplierId)

      interface StatsAccumulator {
        total_orders: number
        total_spent: number
        pending_orders: number
        received_orders: number
      }

      const summary: StatsAccumulator = {
        total_orders: stats?.length || 0,
        total_spent: 0,
        pending_orders: 0,
        received_orders: 0,
      }

      if (stats) {
        for (const order of stats) {
          if (order.status === 'received') {
            summary.total_spent += order.total || 0
            summary.received_orders++
          } else if (!['cancelled', 'received'].includes(order.status)) {
            summary.pending_orders++
          }
        }
      }

      return NextResponse.json({
        ...paginatedResponse(orders || [], count || 0, { page, limit, offset }),
        supplier: {
          id: supplier.id,
          name: supplier.name,
        },
        summary,
      })
    } catch (e) {
      logger.error('Supplier orders GET error', {
        tenantId: profile.tenant_id,
        supplierId,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'] }
)
