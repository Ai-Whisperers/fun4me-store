import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'

export const dynamic = 'force-dynamic'

interface ReorderSuggestion {
  id: string
  name: string
  sku: string | null
  image_url: string | null
  category_name: string | null
  stock_quantity: number
  available_quantity: number
  min_stock_level: number
  reorder_point: number | null
  reorder_quantity: number | null
  weighted_average_cost: number | null
  supplier_id: string | null
  supplier_name: string | null
  urgency: 'critical' | 'low' | 'reorder'
}

interface GroupedSuggestions {
  [supplierId: string]: {
    supplier_id: string | null
    supplier_name: string
    products: ReorderSuggestion[]
    total_cost: number
    total_items: number
  }
}

/**
 * GET /api/inventory/reorder-suggestions
 * Returns products that are at or below their reorder point
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return apiError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED, {
      details: { message: 'No autorizado' },
    })
  }

  // Get user's tenant
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !['vet', 'admin'].includes(profile.role)) {
    return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, {
      details: { message: 'Acceso denegado' },
    })
  }

  const tenantId = profile.tenant_id
  const { searchParams } = new URL(request.url)
  const groupBySupplier = searchParams.get('groupBySupplier') !== 'false'

  // Get products that need reordering
  // Using the unified view or direct query
  const { data: products, error: queryError } = await supabase
    .from('store_inventory')
    .select(
      `
      id,
      product_id,
      stock_quantity,
      available_quantity,
      min_stock_level,
      reorder_point,
      reorder_quantity,
      weighted_average_cost,
      store_products!inner (
        id,
        name,
        sku,
        image_url,
        default_supplier_id,
        category_id,
        store_categories (
          name
        ),
        suppliers (
          id,
          name
        )
      )
    `
    )
    .eq('tenant_id', tenantId)
    .or(
      `available_quantity.lte.reorder_point,and(reorder_point.is.null,available_quantity.lte.min_stock_level)`
    )
    .order('available_quantity', { ascending: true })

  if (queryError) {
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'Error al consultar productos' },
    })
  }

  // Transform the data
  const suggestions: ReorderSuggestion[] = (products || []).map((item) => {
    // store_products is a single object when using !inner join
    const storeProducts = item.store_products as unknown
    const product = (Array.isArray(storeProducts) ? storeProducts[0] : storeProducts) as {
      id: string
      name: string
      sku: string | null
      image_url: string | null
      default_supplier_id: string | null
      category_id: string | null
      store_categories: { name: string } | null
      suppliers: { id: string; name: string } | null
    }

    // Determine urgency
    let urgency: 'critical' | 'low' | 'reorder' = 'reorder'
    if (item.available_quantity === 0) {
      urgency = 'critical'
    } else if (item.available_quantity <= (item.min_stock_level || 0)) {
      urgency = 'low'
    }

    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      image_url: product.image_url,
      category_name: product.store_categories?.name || null,
      stock_quantity: item.stock_quantity || 0,
      available_quantity: item.available_quantity || 0,
      min_stock_level: item.min_stock_level || 0,
      reorder_point: item.reorder_point,
      reorder_quantity: item.reorder_quantity,
      weighted_average_cost: item.weighted_average_cost,
      supplier_id: product.default_supplier_id,
      supplier_name: product.suppliers?.name || null,
      urgency,
    }
  })

  // Group by supplier if requested
  if (groupBySupplier) {
    const grouped: GroupedSuggestions = {}

    for (const suggestion of suggestions) {
      const key = suggestion.supplier_id || 'no-supplier'

      if (!grouped[key]) {
        grouped[key] = {
          supplier_id: suggestion.supplier_id,
          supplier_name: suggestion.supplier_name || 'Sin proveedor asignado',
          products: [],
          total_cost: 0,
          total_items: 0,
        }
      }

      grouped[key].products.push(suggestion)
      grouped[key].total_items += suggestion.reorder_quantity || 10 // Default reorder quantity
      grouped[key].total_cost +=
        (suggestion.weighted_average_cost || 0) * (suggestion.reorder_quantity || 10)
    }

    return NextResponse.json({
      success: true,
      grouped: Object.values(grouped).sort((a, b) => b.products.length - a.products.length),
      summary: {
        total_products: suggestions.length,
        critical_count: suggestions.filter((s) => s.urgency === 'critical').length,
        low_count: suggestions.filter((s) => s.urgency === 'low').length,
        total_estimated_cost: Object.values(grouped).reduce((sum, g) => sum + g.total_cost, 0),
      },
    })
  }

  return NextResponse.json({
    success: true,
    suggestions,
    summary: {
      total_products: suggestions.length,
      critical_count: suggestions.filter((s) => s.urgency === 'critical').length,
      low_count: suggestions.filter((s) => s.urgency === 'low').length,
    },
  })
}
