import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * GET /api/store/orders/pending-prescriptions
 * List orders pending prescription review (staff only)
 */
export const GET = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // Build query
    let query = supabase
      .from('store_orders')
      .select(
        `
        id,
        invoice_number,
        status,
        total,
        requires_prescription_review,
        prescription_file_url,
        created_at,
        customer:profiles!store_orders_customer_id_fkey(id, full_name, email, phone),
        items:store_order_items(
          id,
          product_id,
          quantity,
          unit_price,
          requires_prescription,
          prescription_file_url,
          product:store_products(id, name, image_url)
        )
      `,
        { count: 'exact' }
      )
      .eq('tenant_id', profile.tenant_id)
      .eq('status', 'pending_prescription')
      .order('created_at', { ascending: false })

    // Date filters
    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo)
    }

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: orders, error: ordersError, count } = await query

    if (ordersError) {
      logger.error('Error fetching pending prescriptions', {
        tenantId: profile.tenant_id,
        userId: user.id,
        error: ordersError.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
        details: { message: 'Error al obtener pedidos' },
      })
    }

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  },
  { roles: ['vet', 'admin'] }
)
