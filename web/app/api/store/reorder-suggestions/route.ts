import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'

interface ReorderProduct {
  id: string
  name: string
  image_url: string | null
  base_price: number
  sale_price: number | null
  stock_quantity: number
  is_available: boolean
  last_ordered_at: string
  total_times_ordered: number
}

/**
 * GET /api/store/reorder-suggestions
 * Get products from user's recent orders for quick reordering
 *
 * Query params:
 * - clinic: Tenant ID (required)
 * - limit: Max products to return (default: 10)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return apiError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED)
  }

  const { searchParams } = new URL(request.url)
  const clinic = searchParams.get('clinic')
  const limit = parseInt(searchParams.get('limit') || '10')

  if (!clinic) {
    return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
      details: { message: 'Falta parámetro clinic' },
    })
  }

  try {
    // Get order items from user's recent orders (last 90 days)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const { data: orderItems, error: itemsError } = await supabase
      .from('store_order_items')
      .select(
        `
        product_id,
        quantity,
        store_orders!inner(
          id,
          customer_id,
          tenant_id,
          status,
          created_at
        )
      `
      )
      .eq('store_orders.customer_id', user.id)
      .eq('store_orders.tenant_id', clinic)
      .in('store_orders.status', ['delivered', 'confirmed', 'shipped', 'processing'])
      .gte('store_orders.created_at', ninetyDaysAgo.toISOString())

    if (itemsError) throw itemsError

    if (!orderItems || orderItems.length === 0) {
      return NextResponse.json({ products: [], message: 'No hay compras recientes' })
    }

    // Aggregate products by ID with counts and latest order date
    const productStats = new Map<string, { count: number; lastOrdered: string }>()
    for (const item of orderItems) {
      const order = item.store_orders as unknown as { created_at: string }
      const existing = productStats.get(item.product_id)
      if (existing) {
        existing.count += item.quantity
        if (order.created_at > existing.lastOrdered) {
          existing.lastOrdered = order.created_at
        }
      } else {
        productStats.set(item.product_id, {
          count: item.quantity,
          lastOrdered: order.created_at,
        })
      }
    }

    // Get unique product IDs sorted by count (most purchased first)
    const sortedProductIds = Array.from(productStats.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit)
      .map(([id]) => id)

    if (sortedProductIds.length === 0) {
      return NextResponse.json({ products: [] })
    }

    // Fetch product details with inventory
    const { data: products, error: productsError } = await supabase
      .from('store_products')
      .select(
        `
        id,
        name,
        image_url,
        base_price,
        sale_price,
        is_active,
        store_inventory(stock_quantity)
      `
      )
      .in('id', sortedProductIds)
      .eq('tenant_id', clinic)
      .is('deleted_at', null)

    if (productsError) throw productsError

    // Map products with availability info
    const reorderProducts: ReorderProduct[] = (products || [])
      .filter((product) => {
        const stats = productStats.get(product.id)
        return stats !== undefined
      })
      .map((product) => {
        const inventory = product.store_inventory as unknown as { stock_quantity: number } | null
        // Non-null assertion safe: filter above (line 130) ensures stats exists
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const stats = productStats.get(product.id)!

        return {
          id: product.id,
          name: product.name,
          image_url: product.image_url,
          base_price: product.base_price,
          sale_price: product.sale_price,
          stock_quantity: inventory?.stock_quantity || 0,
          is_available: product.is_active && (inventory?.stock_quantity || 0) > 0,
          last_ordered_at: stats.lastOrdered,
          total_times_ordered: stats.count,
        }
      })
      .sort((a, b) => b.total_times_ordered - a.total_times_ordered)

    return NextResponse.json({
      products: reorderProducts,
      available_count: reorderProducts.filter((p) => p.is_available).length,
      total_count: reorderProducts.length,
    })
  } catch (e) {
    logger.error('Error fetching reorder suggestions', {
      tenantId: clinic,
      userId: user.id,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'Error al cargar sugerencias' },
    })
  }
}
