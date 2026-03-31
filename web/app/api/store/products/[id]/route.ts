import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'

interface Props {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: Props): Promise<NextResponse> {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const clinic = searchParams.get('clinic')

  if (!clinic) {
    return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
      details: { message: 'Falta el parámetro clinic' },
    })
  }

  const supabase = await createClient()

  try {
    // Get product with related data from existing schema
    const { data: product, error: pError } = await supabase
      .from('store_products')
      .select(
        `
        *,
        store_categories(id, name, slug, description, image_url),
        store_brands(id, name, slug, logo_url, description, website),
        store_inventory(stock_quantity, min_stock_level, expiry_date, batch_number)
      `
      )
      .eq('tenant_id', clinic)
      .eq('id', id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single()

    if (pError) {
      logger.error('Product query error', {
        error: pError.message,
        productId: id,
        tenantId: clinic,
      })
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { message: 'Producto no encontrado' },
      })
    }

    if (!product) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { message: 'Producto no encontrado' },
      })
    }

    // Fetch active campaigns for discount
    const now = new Date().toISOString()
    const { data: campaigns } = await supabase
      .from('store_campaigns')
      .select(
        `
        id,
        store_campaign_items!inner(product_id, discount_type, discount_value)
      `
      )
      .eq('tenant_id', clinic)
      .eq('is_active', true)
      .eq('store_campaign_items.product_id', id)
      .lte('start_date', now)
      .gte('end_date', now)

    let currentPrice = product.base_price
    let originalPrice: number | null = null
    let discountPercentage: number | null = null
    let hasDiscount = false

    if (campaigns && campaigns.length > 0) {
      const campaignItem = campaigns[0].store_campaign_items[0]
      if (campaignItem) {
        hasDiscount = true
        originalPrice = product.base_price
        if (campaignItem.discount_type === 'percentage') {
          currentPrice = product.base_price * (1 - campaignItem.discount_value / 100)
          discountPercentage = campaignItem.discount_value
        } else {
          currentPrice = Math.max(0, product.base_price - campaignItem.discount_value)
          discountPercentage = Math.round((campaignItem.discount_value / product.base_price) * 100)
        }
      }
    }

    // Get reviews summary
    const { data: reviews } = await supabase
      .from('store_reviews')
      .select('id, rating, title, content, created_at, customer_id')
      .eq('product_id', id)
      .eq('is_approved', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(10)

    const reviewCount = reviews?.length || 0
    const avgRating =
      reviewCount > 0 && reviews ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount : 0

    const reviewSummary = {
      avg_rating: avgRating,
      total_reviews: reviewCount,
      rating_distribution: {
        5: reviews?.filter((r) => r.rating === 5).length || 0,
        4: reviews?.filter((r) => r.rating === 4).length || 0,
        3: reviews?.filter((r) => r.rating === 3).length || 0,
        2: reviews?.filter((r) => r.rating === 2).length || 0,
        1: reviews?.filter((r) => r.rating === 1).length || 0,
      },
    }

    // Get related products (same category)
    let relatedProducts: unknown[] = []
    if (product.category_id) {
      const { data: related } = await supabase
        .from('store_products')
        .select(
          `
          id, name, short_description, image_url, base_price,
          is_featured, created_at,
          store_inventory(stock_quantity)
        `
        )
        .eq('tenant_id', clinic)
        .eq('category_id', product.category_id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .neq('id', id)
        .limit(6)

      // Transform to match RelatedProduct interface expected by component
      relatedProducts = (related || []).map(
        (p: {
          id: string
          name: string
          short_description: string | null
          image_url: string | null
          base_price: number
          is_featured: boolean
          created_at: string
          store_inventory: { stock_quantity: number }[] | null
        }) => {
          // Check if product is "new" (created in last 30 days)
          const createdAt = new Date(p.created_at)
          const thirtyDaysAgo = new Date()
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
          const isNewArrival = createdAt > thirtyDaysAgo

          // Transform store_inventory from array to object
          const inventoryArray = p.store_inventory as { stock_quantity: number }[] | null
          const inventory =
            inventoryArray && inventoryArray.length > 0
              ? { stock_quantity: inventoryArray[0].stock_quantity }
              : null

          return {
            relation_type: 'similar',
            product: {
              id: p.id,
              name: p.name,
              short_description: p.short_description,
              image_url: p.image_url,
              base_price: p.base_price,
              avg_rating: 0, // Would need separate query for reviews
              review_count: 0,
              is_new_arrival: isNewArrival,
              is_best_seller: p.is_featured || false,
              store_inventory: inventory,
            },
          }
        }
      )
    }

    // Build response matching what the client expects
    // Note: This is a PUBLIC endpoint - sensitive fields (cost_price, purchase_unit, internal inventory) are excluded
    const productWithDetails = {
      id: product.id,
      tenant_id: clinic,
      category_id: product.category_id,
      brand_id: product.brand_id,
      sku: product.sku,
      // barcode excluded - internal use only
      name: product.name,
      short_description: product.short_description,
      description: product.description,
      image_url: product.image_url,
      images: product.images || [],
      base_price: product.base_price,
      sale_price: product.sale_price,
      // cost_price EXCLUDED - internal pricing, not for public
      // purchase_unit EXCLUDED - internal use only
      sale_unit: product.sale_unit,
      // conversion_factor EXCLUDED - internal use only
      weight_grams: product.weight_grams,
      dimensions: product.dimensions,
      attributes: product.attributes || {},
      specifications: product.attributes || {}, // Alias for tabs
      features: [], // Schema doesn't have features array
      ingredients: product.description || null, // Use description as fallback
      nutritional_info: {},
      target_species: product.target_species || [],
      species: product.target_species || [], // Alias
      life_stages: [],
      breed_sizes: [],
      health_conditions: [],
      requires_prescription: product.requires_prescription,
      is_featured: product.is_featured,
      is_active: product.is_active,
      display_order: product.display_order,
      created_at: product.created_at,
      updated_at: product.updated_at,
      variants: [], // Schema doesn't have product variants table
      category: product.store_categories || null,
      subcategory: null, // Schema doesn't have subcategories
      brand: product.store_brands || null,
      // Public inventory - only show stock quantity for availability, not internal min_stock or batch
      inventory: product.store_inventory
        ? {
            stock_quantity: product.store_inventory.stock_quantity || 0,
            // min_stock_level EXCLUDED - internal threshold
            // expiry_date EXCLUDED - internal tracking
            // batch_number EXCLUDED - internal tracking
          }
        : { stock_quantity: 0 },
      current_price: currentPrice,
      original_price: originalPrice,
      has_discount: hasDiscount,
      discount_percentage: discountPercentage,
      avg_rating: avgRating,
      review_count: reviewCount,
    }

    return NextResponse.json({
      product: productWithDetails,
      review_summary: reviewSummary,
      reviews:
        reviews?.map((r) => ({
          id: r.id,
          rating: r.rating,
          title: r.title,
          content: r.content,
          created_at: r.created_at,
        })) || [],
      questions: [], // Schema doesn't have product questions table
      related_products: relatedProducts,
    })
  } catch (e) {
    logger.error('Error loading product details', {
      error: e instanceof Error ? e.message : 'Unknown',
      productId: id,
      tenantId: clinic,
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'No se pudo cargar el producto' },
    })
  }
}

/**
 * DELETE - Soft delete a product (staff only)
 * Sets deleted_at and is_active = false
 */
export async function DELETE(request: NextRequest, { params }: Props): Promise<NextResponse> {
  const { id } = await params
  const supabase = await createClient()

  // Auth check - require staff
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return apiError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED)
  }

  // Get user profile to verify tenant and role
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'vet')) {
    return apiError('INSUFFICIENT_ROLE', HTTP_STATUS.FORBIDDEN, {
      details: { message: 'No tienes permisos para esta acción' },
    })
  }

  try {
    // Check if product exists and belongs to this tenant
    const { data: product, error: findError } = await supabase
      .from('store_products')
      .select('id, name')
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .is('deleted_at', null)
      .single()

    if (findError || !product) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { message: 'Producto no encontrado' },
      })
    }

    // Check if product is used in any invoices
    const { count: invoiceCount } = await supabase
      .from('invoice_items')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', id)

    if (invoiceCount && invoiceCount > 0) {
      return apiError('CONFLICT', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'No se puede eliminar: el producto tiene ventas registradas' },
      })
    }

    // Check if product is in any active orders
    const { count: orderCount } = await supabase
      .from('store_order_items')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', id)

    if (orderCount && orderCount > 0) {
      return apiError('CONFLICT', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'No se puede eliminar: el producto tiene pedidos pendientes' },
      })
    }

    // Soft delete: set deleted_at and is_active = false
    const { error: deleteError } = await supabase
      .from('store_products')
      .update({
        deleted_at: new Date().toISOString(),
        is_active: false,
      })
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)

    if (deleteError) {
      logger.error('Error deleting product', {
        error: deleteError.message,
        productId: id,
        tenantId: profile.tenant_id,
        userId: user.id,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
        details: { message: 'Error al eliminar el producto' },
      })
    }

    // Also delete inventory record
    await supabase.from('store_inventory').delete().eq('product_id', id)

    return NextResponse.json({ success: true, message: 'Producto eliminado' })
  } catch (e) {
    logger.error('Error deleting product', {
      error: e instanceof Error ? e.message : 'Unknown',
      productId: id,
      userId: user?.id,
    })
    return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
}
