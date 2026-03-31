import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { storeAnalyticsQuerySchema } from '@/lib/schemas/analytics'

export const dynamic = 'force-dynamic'

interface SalesSummary {
  today: { total: number; count: number }
  week: { total: number; count: number }
  month: { total: number; count: number }
  year: { total: number; count: number }
}

interface TopProduct {
  id: string
  name: string
  sku: string | null
  image_url: string | null
  category_name: string | null
  total_sold: number
  total_revenue: number
}

interface CategoryRevenue {
  category_id: string
  category_name: string
  total_revenue: number
  order_count: number
  percentage: number
}

interface StatusDistribution {
  status: string
  count: number
  total: number
  percentage: number
}

interface DailyTrend {
  date: string
  revenue: number
  orders: number
  avg_order_value: number
}

interface CouponStats {
  total_coupons: number
  active_coupons: number
  total_usage: number
  total_discount_given: number
}

/**
 * GET /api/analytics/store
 * Comprehensive store analytics with various metrics
 */
export const GET = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    const { searchParams } = new URL(request.url)
    
    // Validate query parameters
    const queryValidation = storeAnalyticsQuerySchema.safeParse({
      period: searchParams.get('period'),
      topProducts: searchParams.get('topProducts'),
    })
    
    if (!queryValidation.success) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { issues: queryValidation.error.issues },
      })
    }
    
    const { period, topProducts: topProductsLimit } = queryValidation.data

    try {
      // Calculate date boundaries
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekStart = new Date(todayStart)
      weekStart.setDate(weekStart.getDate() - 7)
      const monthStart = new Date(todayStart)
      monthStart.setMonth(monthStart.getMonth() - 1)
      const yearStart = new Date(todayStart)
      yearStart.setFullYear(yearStart.getFullYear() - 1)
      const periodStart = new Date(todayStart)
      periodStart.setDate(periodStart.getDate() - period)

      const tenantId = profile.tenant_id
      const validStatuses = ['confirmed', 'processing', 'ready', 'shipped', 'delivered']

      // Sales Summary
      const [todayOrders, weekOrders, monthOrders, yearOrders] = await Promise.all([
        supabase
          .from('store_orders')
          .select('total')
          .eq('tenant_id', tenantId)
          .gte('created_at', todayStart.toISOString())
          .in('status', validStatuses)
          .is('deleted_at', null),
        supabase
          .from('store_orders')
          .select('total')
          .eq('tenant_id', tenantId)
          .gte('created_at', weekStart.toISOString())
          .in('status', validStatuses)
          .is('deleted_at', null),
        supabase
          .from('store_orders')
          .select('total')
          .eq('tenant_id', tenantId)
          .gte('created_at', monthStart.toISOString())
          .in('status', validStatuses)
          .is('deleted_at', null),
        supabase
          .from('store_orders')
          .select('total')
          .eq('tenant_id', tenantId)
          .gte('created_at', yearStart.toISOString())
          .in('status', validStatuses)
          .is('deleted_at', null),
      ])

      const sumOrders = (data: { total: number }[] | null): { total: number; count: number } => {
        const orders = data || []
        return {
          total: orders.reduce((sum, o) => sum + (o.total || 0), 0),
          count: orders.length,
        }
      }

      const summary: SalesSummary = {
        today: sumOrders(todayOrders.data as { total: number }[] | null),
        week: sumOrders(weekOrders.data as { total: number }[] | null),
        month: sumOrders(monthOrders.data as { total: number }[] | null),
        year: sumOrders(yearOrders.data as { total: number }[] | null),
      }

      // Top Products
      const { data: orderItems } = await supabase
        .from('store_order_items')
        .select(
          `
          product_id,
          product_name,
          product_sku,
          product_image_url,
          quantity,
          total_price,
          order:store_orders!inner(status),
          product:store_products(category_id, category:store_categories(name))
        `
        )
        .eq('tenant_id', tenantId)
        .gte('created_at', monthStart.toISOString())

      interface OrderItemRow {
        product_id: string
        product_name: string
        product_sku: string | null
        product_image_url: string | null
        quantity: number
        total_price: number
        order: { status: string }[]
        product: { category: { name: string }[] | null }[] | null
      }

      const productMap = new Map<string, TopProduct>()
      for (const item of (orderItems || []) as OrderItemRow[]) {
        const orderStatus = item.order?.[0]?.status
        if (!orderStatus || !validStatuses.includes(orderStatus)) continue

        const existing = productMap.get(item.product_id)
        if (existing) {
          existing.total_sold += Number(item.quantity)
          existing.total_revenue += Number(item.total_price)
        } else {
          const categoryName = item.product?.[0]?.category?.[0]?.name || null
          productMap.set(item.product_id, {
            id: item.product_id,
            name: item.product_name,
            sku: item.product_sku,
            image_url: item.product_image_url,
            category_name: categoryName,
            total_sold: Number(item.quantity),
            total_revenue: Number(item.total_price),
          })
        }
      }

      const topProducts = Array.from(productMap.values())
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, topProductsLimit)

      // Category Revenue
      interface ItemWithCategory {
        total_price: number
        product: { category_id: string | null; category: { name: string }[] | null }[] | null
        order: { status: string }[]
      }

      const categoryMap = new Map<string, { name: string; revenue: number; count: number }>()
      let totalRevenue = 0

      for (const item of (orderItems || []) as ItemWithCategory[]) {
        const orderStatus = item.order?.[0]?.status
        if (!orderStatus || !validStatuses.includes(orderStatus)) continue

        const productData = item.product?.[0]
        const categoryId = productData?.category_id || 'uncategorized'
        const categoryName = productData?.category?.[0]?.name || 'Sin Categoría'
        const revenue = Number(item.total_price)

        totalRevenue += revenue

        const existing = categoryMap.get(categoryId)
        if (existing) {
          existing.revenue += revenue
          existing.count += 1
        } else {
          categoryMap.set(categoryId, { name: categoryName, revenue, count: 1 })
        }
      }

      const categoryRevenue: CategoryRevenue[] = Array.from(categoryMap.entries())
        .map(([id, data]) => ({
          category_id: id,
          category_name: data.name,
          total_revenue: data.revenue,
          order_count: data.count,
          percentage: totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 100) : 0,
        }))
        .sort((a, b) => b.total_revenue - a.total_revenue)

      // Status Distribution
      const { data: allOrders } = await supabase
        .from('store_orders')
        .select('status, total')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)

      interface OrderRow {
        status: string
        total: number
      }
      const statusMap = new Map<string, { count: number; total: number }>()
      let totalCount = 0

      for (const order of (allOrders || []) as OrderRow[]) {
        totalCount++
        const existing = statusMap.get(order.status)
        if (existing) {
          existing.count++
          existing.total += Number(order.total)
        } else {
          statusMap.set(order.status, { count: 1, total: Number(order.total) })
        }
      }

      const statusLabels: Record<string, string> = {
        pending: 'Pendiente',
        confirmed: 'Confirmado',
        processing: 'En Proceso',
        ready: 'Listo',
        shipped: 'Enviado',
        delivered: 'Entregado',
        cancelled: 'Cancelado',
        refunded: 'Reembolsado',
      }

      const statusDistribution: StatusDistribution[] = Array.from(statusMap.entries())
        .map(([status, data]) => ({
          status: statusLabels[status] || status,
          count: data.count,
          total: data.total,
          percentage: totalCount > 0 ? Math.round((data.count / totalCount) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count)

      // Daily Trend
      const { data: trendOrders } = await supabase
        .from('store_orders')
        .select('created_at, total')
        .eq('tenant_id', tenantId)
        .gte('created_at', periodStart.toISOString())
        .in('status', validStatuses)
        .is('deleted_at', null)

      interface TrendOrder {
        created_at: string
        total: number
      }
      const dateMap = new Map<string, { revenue: number; orders: number }>()

      for (const order of (trendOrders || []) as TrendOrder[]) {
        const date = order.created_at.substring(0, 10)
        const existing = dateMap.get(date)
        if (existing) {
          existing.revenue += Number(order.total)
          existing.orders++
        } else {
          dateMap.set(date, { revenue: Number(order.total), orders: 1 })
        }
      }

      const dailyTrend: DailyTrend[] = Array.from(dateMap.entries())
        .map(([date, data]) => ({
          date,
          revenue: data.revenue,
          orders: data.orders,
          avg_order_value: data.orders > 0 ? Math.round(data.revenue / data.orders) : 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date))

      // Coupon Stats
      const [couponsResult, couponOrdersResult] = await Promise.all([
        supabase.from('store_coupons').select('is_active, used_count').eq('tenant_id', tenantId),
        supabase
          .from('store_orders')
          .select('discount_amount, coupon_id')
          .eq('tenant_id', tenantId)
          .is('deleted_at', null),
      ])

      interface CouponRow {
        is_active: boolean
        used_count: number
      }
      interface CouponOrderRow {
        discount_amount: number
        coupon_id: string | null
      }

      const coupons = (couponsResult.data || []) as CouponRow[]
      const couponOrders = (couponOrdersResult.data || []) as CouponOrderRow[]

      const totalDiscountGiven = couponOrders
        .filter((o) => o.coupon_id)
        .reduce((sum, o) => sum + (o.discount_amount || 0), 0)

      const couponStats: CouponStats = {
        total_coupons: coupons.length,
        active_coupons: coupons.filter((c) => c.is_active).length,
        total_usage: coupons.reduce((sum, c) => sum + (c.used_count || 0), 0),
        total_discount_given: totalDiscountGiven,
      }

      return NextResponse.json({
        summary,
        topProducts,
        categoryRevenue,
        statusDistribution,
        dailyTrend,
        couponStats,
        generatedAt: new Date().toISOString(),
      })
    } catch (e) {
      logger.error('Error fetching store analytics', {
        tenantId: profile.tenant_id,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
        details: { message: e instanceof Error ? e.message : 'Unknown error' },
      })
    }
  },
  { roles: ['vet', 'admin'] }
)
