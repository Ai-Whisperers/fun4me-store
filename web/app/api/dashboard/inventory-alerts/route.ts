import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

// GET /api/dashboard/inventory-alerts - Get low stock and expiring products
export const GET = withApiAuth(
  async ({ profile, supabase }: ApiHandlerContext) => {
    try {
      // Try materialized view first
      const { data: alerts, error } = await supabase
        .from('mv_inventory_alerts')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('alert_priority', { ascending: false })

      if (error) {
        // Fallback to live queries
        const [lowStock, expiring] = await Promise.all([
          // Low stock items
          supabase
            .from('store_inventory')
            .select(
              `
              id, stock_quantity, min_stock_level,
              product:store_products(id, name, sku)
            `
            )
            .eq('tenant_id', profile.tenant_id)
            .lt('stock_quantity', supabase.rpc('get_min_stock_level')),

          // Expiring products (within 30 days) - using store_products with inventory join
          supabase
            .from('store_products')
            .select(
              `
              id, name, sku, expiry_date,
              store_inventory(stock_quantity)
            `
            )
            .eq('tenant_id', profile.tenant_id)
            .not('expiry_date', 'is', null)
            .lte('expiry_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()),
        ])

        const result = {
          low_stock:
            lowStock.data?.map((item) => {
              const product = Array.isArray(item.product) ? item.product[0] : item.product
              return {
                product_id: product?.id,
                product_name: product?.name,
                sku: product?.sku,
                current_stock: item.stock_quantity,
                min_stock: item.min_stock_level,
                alert_type: 'low_stock',
              }
            }) || [],
          expiring_soon:
            expiring.data?.map((item) => {
              const inventory = Array.isArray(item.store_inventory)
                ? item.store_inventory[0]
                : item.store_inventory
              return {
                product_id: item.id,
                product_name: item.name,
                sku: item.sku,
                expiry_date: item.expiry_date,
                current_stock: inventory?.stock_quantity ?? 0,
                alert_type: 'expiring',
              }
            }) || [],
        }

        return NextResponse.json(result)
      }

      // Group alerts by type
      const grouped = {
        low_stock: alerts?.filter((a) => a.alert_type === 'low_stock') || [],
        expiring_soon: alerts?.filter((a) => a.alert_type === 'expiring') || [],
        out_of_stock: alerts?.filter((a) => a.alert_type === 'out_of_stock') || [],
      }

      return NextResponse.json(grouped)
    } catch (e) {
      logger.error('Error loading inventory alerts', {
        tenantId: profile.tenant_id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
        details: { message: e instanceof Error ? e.message : 'Unknown error' },
      })
    }
  },
  { roles: ['vet', 'admin'] }
)
