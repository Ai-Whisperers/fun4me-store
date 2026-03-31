import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { turnoverQuerySchema } from '@/lib/schemas/analytics'

interface ProductTurnover {
  id: string
  name: string
  sku: string | null
  category_name: string | null
  current_stock: number
  reorder_point: number | null
  avg_daily_sales: number
  days_of_inventory: number | null
  turnover_ratio: number
  status: 'critical' | 'low' | 'healthy' | 'overstocked' | 'slow_moving'
  last_sale_date: string | null
  cost_value: number
}

interface TurnoverSummary {
  total_inventory_value: number
  total_products: number
  critical_stock_count: number
  low_stock_count: number
  overstocked_count: number
  slow_moving_count: number
  avg_turnover_ratio: number
}

interface ReorderSuggestion {
  id: string
  name: string
  sku: string | null
  current_stock: number
  reorder_point: number
  suggested_quantity: number
  days_until_stockout: number | null
  priority: 'urgent' | 'high' | 'medium' | 'low'
}

/**
 * GET /api/analytics/store/turnover
 * Get inventory turnover metrics and reorder suggestions
 */
export const GET = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    const { searchParams } = new URL(request.url)
    
    // Validate query parameters
    const queryValidation = turnoverQuerySchema.safeParse({
      period: searchParams.get('period'),
    })
    
    if (!queryValidation.success) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { issues: queryValidation.error.issues },
      })
    }
    
    // Map period enum to days
    const periodDays: Record<string, number> = { week: 7, month: 30, quarter: 90, year: 365 }
    const period = periodDays[queryValidation.data.period]

    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - period)
      const startDateStr = startDate.toISOString().split('T')[0]

      // Get products with inventory
      const { data: products, error: productsError } = await supabase
        .from('store_products')
        .select(
          `
          id,
          name,
          sku,
          category:store_categories(id, name),
          store_inventory(stock_quantity, reorder_point, weighted_average_cost)
        `
        )
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true)

      if (productsError) throw productsError

      // Get sales data for the period
      const { data: salesData, error: salesError } = await supabase
        .from('store_order_items')
        .select(
          `
          product_id,
          quantity,
          order:store_orders!inner(id, status, created_at)
        `
        )
        .eq('tenant_id', profile.tenant_id)
        .gte('order.created_at', startDateStr)
        .in('order.status', ['delivered', 'shipped', 'confirmed', 'processing'])

      if (salesError) throw salesError

      // Get last sale date for each product
      const { data: lastSalesData, error: lastSalesError } = await supabase
        .from('store_order_items')
        .select(
          `
          product_id,
          order:store_orders!inner(created_at)
        `
        )
        .eq('tenant_id', profile.tenant_id)
        .in('order.status', ['delivered', 'shipped', 'confirmed', 'processing'])
        .order('order.created_at', { ascending: false })

      if (lastSalesError) throw lastSalesError

      // Build last sale map
      const lastSaleMap: Record<string, string> = {}
      for (const sale of lastSalesData || []) {
        if (!lastSaleMap[sale.product_id]) {
          const orderData = sale.order as { created_at: string }[] | { created_at: string } | null
          const order = Array.isArray(orderData) ? orderData[0] : orderData
          if (order?.created_at) {
            lastSaleMap[sale.product_id] = order.created_at
          }
        }
      }

      // Build sales map
      const salesMap: Record<string, number> = {}
      for (const sale of salesData || []) {
        const productId = sale.product_id
        salesMap[productId] = (salesMap[productId] || 0) + sale.quantity
      }

      // Calculate turnover metrics for each product
      const productTurnover: ProductTurnover[] = []
      let totalInventoryValue = 0
      let criticalCount = 0
      let lowCount = 0
      let overstockedCount = 0
      let slowMovingCount = 0
      let totalTurnover = 0
      let productsWithTurnover = 0

      for (const product of products || []) {
        const inventory = Array.isArray(product.store_inventory)
          ? product.store_inventory[0]
          : product.store_inventory

        const currentStock = (inventory as { stock_quantity?: number } | null)?.stock_quantity || 0
        const reorderPoint = (inventory as { reorder_point?: number } | null)?.reorder_point || null
        const cost = (inventory as { weighted_average_cost?: number } | null)?.weighted_average_cost || 0

        const totalSold = salesMap[product.id] || 0
        const avgDailySales = totalSold / period
        const daysOfInventory = avgDailySales > 0 ? currentStock / avgDailySales : null

        const avgInventory = currentStock > 0 ? currentStock : 1
        const turnoverRatio = totalSold / avgInventory

        let status: ProductTurnover['status'] = 'healthy'
        const lastSaleDate = lastSaleMap[product.id] || null
        const daysSinceLastSale = lastSaleDate
          ? Math.floor((Date.now() - new Date(lastSaleDate).getTime()) / (1000 * 60 * 60 * 24))
          : null

        if (currentStock === 0) {
          status = 'critical'
          criticalCount++
        } else if (reorderPoint && currentStock <= reorderPoint) {
          status = 'low'
          lowCount++
        } else if (daysSinceLastSale && daysSinceLastSale > 90) {
          status = 'slow_moving'
          slowMovingCount++
        } else if (daysOfInventory && daysOfInventory > 180) {
          status = 'overstocked'
          overstockedCount++
        }

        const costValue = currentStock * cost
        totalInventoryValue += costValue

        if (turnoverRatio > 0) {
          totalTurnover += turnoverRatio
          productsWithTurnover++
        }

        const categoryData = product.category as { id: string; name: string }[] | { id: string; name: string } | null
        const category = Array.isArray(categoryData) ? categoryData[0] : categoryData

        productTurnover.push({
          id: product.id,
          name: product.name,
          sku: product.sku,
          category_name: category?.name || null,
          current_stock: currentStock,
          reorder_point: reorderPoint,
          avg_daily_sales: Math.round(avgDailySales * 100) / 100,
          days_of_inventory: daysOfInventory ? Math.round(daysOfInventory) : null,
          turnover_ratio: Math.round(turnoverRatio * 100) / 100,
          status,
          last_sale_date: lastSaleDate,
          cost_value: costValue,
        })
      }

      const statusOrder: Record<string, number> = {
        critical: 0,
        low: 1,
        slow_moving: 2,
        overstocked: 3,
        healthy: 4,
      }
      productTurnover.sort((a, b) => {
        const statusDiff = statusOrder[a.status] - statusOrder[b.status]
        if (statusDiff !== 0) return statusDiff
        return (a.days_of_inventory || Infinity) - (b.days_of_inventory || Infinity)
      })

      const reorderSuggestions: ReorderSuggestion[] = productTurnover
        .filter((p) => p.status === 'critical' || p.status === 'low')
        .map((p) => {
          const daysUntilStockout = p.avg_daily_sales > 0 ? Math.round(p.current_stock / p.avg_daily_sales) : null

          const targetDays = 30
          const suggestedQuantity = Math.max(
            (p.reorder_point || 10) * 2,
            Math.ceil(p.avg_daily_sales * targetDays)
          )

          let priority: ReorderSuggestion['priority'] = 'low'
          if (p.current_stock === 0) {
            priority = 'urgent'
          } else if (daysUntilStockout !== null && daysUntilStockout <= 3) {
            priority = 'urgent'
          } else if (daysUntilStockout !== null && daysUntilStockout <= 7) {
            priority = 'high'
          } else if (daysUntilStockout !== null && daysUntilStockout <= 14) {
            priority = 'medium'
          }

          return {
            id: p.id,
            name: p.name,
            sku: p.sku,
            current_stock: p.current_stock,
            reorder_point: p.reorder_point || 10,
            suggested_quantity: suggestedQuantity,
            days_until_stockout: daysUntilStockout,
            priority,
          }
        })
        .sort((a, b) => {
          const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
          return priorityOrder[a.priority] - priorityOrder[b.priority]
        })

      const summary: TurnoverSummary = {
        total_inventory_value: totalInventoryValue,
        total_products: products?.length || 0,
        critical_stock_count: criticalCount,
        low_stock_count: lowCount,
        overstocked_count: overstockedCount,
        slow_moving_count: slowMovingCount,
        avg_turnover_ratio:
          productsWithTurnover > 0 ? Math.round((totalTurnover / productsWithTurnover) * 100) / 100 : 0,
      }

      return NextResponse.json({
        summary,
        productTurnover: productTurnover.slice(0, 100),
        reorderSuggestions: reorderSuggestions.slice(0, 20),
        generatedAt: new Date().toISOString(),
      })
    } catch (e) {
      logger.error('Error fetching turnover analytics', {
        tenantId: profile.tenant_id,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'] }
)
