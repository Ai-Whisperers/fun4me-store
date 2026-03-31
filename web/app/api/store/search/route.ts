import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import type { SearchSuggestion } from '@/lib/types/store'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { createSearchPattern, MIN_SEARCH_LENGTH } from '@/lib/utils/search'

// GET - Search products with autocomplete suggestions
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const query = searchParams.get('q')?.trim()
  const clinic = searchParams.get('clinic')
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 20)

  if (!clinic) {
    return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
      details: { message: 'Falta parámetro clinic' },
    })
  }

  if (!query || query.length < MIN_SEARCH_LENGTH) {
    return NextResponse.json({
      suggestions: [],
      products: [],
      total: 0,
    })
  }

  // Apply rate limiting for search endpoints (30 requests per minute)
  // Use IP-based rate limiting for unauthenticated store searches
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const rateLimitResult = await rateLimit(request, 'search', user?.id)
  if (!rateLimitResult.success) {
    return rateLimitResult.response as NextResponse<{ error: string }>
  }

  try {
    const suggestions: SearchSuggestion[] = []
    // SEC-009: Escape LIKE special characters to prevent pattern injection
    const searchPattern = createSearchPattern(query)

    // Search products
    const { data: products, error: productsError } = await supabase
      .from('store_products')
      .select(
        `
        id,
        name,
        short_description,
        image_url,
        base_price,
        category_id,
        brand_id,
        avg_rating,
        review_count,
        is_new_arrival,
        is_best_seller,
        store_categories(id, name, slug),
        store_brands(id, name, slug),
        store_inventory(stock_quantity)
      `
      )
      .eq('tenant_id', clinic)
      .eq('is_active', true)
      .or(
        `name.ilike.${searchPattern},short_description.ilike.${searchPattern},sku.ilike.${searchPattern}`
      )
      .order('sales_count', { ascending: false })
      .limit(limit)

    if (productsError) throw productsError

    // Format products for suggestions
    if (products) {
      for (const product of products) {
        suggestions.push({
          type: 'product',
          id: product.id,
          name: product.name,
          image_url: product.image_url,
          price: product.base_price,
          category: (product.store_categories as { name?: string } | null)?.name,
        })
      }
    }

    // Search categories matching query
    const { data: categories } = await supabase
      .from('store_categories')
      .select('id, name, slug')
      .eq('tenant_id', clinic)
      .eq('is_active', true)
      .is('deleted_at', null)
      .ilike('name', searchPattern)
      .limit(3)

    if (categories) {
      for (const cat of categories) {
        suggestions.push({
          type: 'category',
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
        })
      }
    }

    // Search brands matching query
    const { data: brands } = await supabase
      .from('store_brands')
      .select('id, name, slug, logo_url')
      .eq('tenant_id', clinic)
      .eq('is_active', true)
      .is('deleted_at', null)
      .ilike('name', searchPattern)
      .limit(3)

    if (brands) {
      for (const brand of brands) {
        suggestions.push({
          type: 'brand',
          id: brand.id,
          name: brand.name,
          slug: brand.slug,
          image_url: brand.logo_url,
        })
      }
    }

    // Add query suggestion for broader search
    if (products && products.length >= limit) {
      suggestions.unshift({
        type: 'query',
        name: `Buscar "${query}"`,
      })
    }

    // Get campaign prices and format full product list
    const { data: campaigns } = await supabase
      .from('store_campaigns')
      .select(
        `
        id,
        store_campaign_items(product_id, discount_type, discount_value)
      `
      )
      .eq('tenant_id', clinic)
      .eq('is_active', true)
      .is('deleted_at', null)
      .lte('start_date', new Date().toISOString())
      .gte('end_date', new Date().toISOString())

    const campaignDiscounts = new Map<string, { type: string; value: number }>()
    if (campaigns) {
      for (const campaign of campaigns) {
        const items = campaign.store_campaign_items as {
          product_id: string
          discount_type: string
          discount_value: number
        }[]
        for (const item of items) {
          campaignDiscounts.set(item.product_id, {
            type: item.discount_type,
            value: item.discount_value,
          })
        }
      }
    }

    // Format products with calculated prices
    const formattedProducts = (products || []).map((product) => {
      const discount = campaignDiscounts.get(product.id)
      let currentPrice = product.base_price
      let originalPrice: number | null = null
      let hasDiscount = false
      let discountPercentage: number | null = null

      if (discount) {
        originalPrice = product.base_price
        hasDiscount = true
        if (discount.type === 'percentage') {
          currentPrice = product.base_price * (1 - discount.value / 100)
          discountPercentage = discount.value
        } else {
          currentPrice = product.base_price - discount.value
          discountPercentage = Math.round((discount.value / product.base_price) * 100)
        }
      }

      return {
        id: product.id,
        tenant_id: clinic,
        category_id: product.category_id,
        subcategory_id: null,
        brand_id: product.brand_id,
        sku: null,
        barcode: null,
        name: product.name,
        short_description: product.short_description,
        description: null,
        image_url: product.image_url,
        base_price: product.base_price,
        specifications: {},
        features: [],
        ingredients: null,
        nutritional_info: {},
        species: [],
        life_stages: [],
        breed_sizes: [],
        health_conditions: [],
        weight_grams: null,
        dimensions: null,
        is_prescription_required: false,
        is_featured: false,
        is_new_arrival: product.is_new_arrival,
        is_best_seller: product.is_best_seller,
        avg_rating: product.avg_rating,
        review_count: product.review_count,
        sales_count: 0,
        view_count: 0,
        meta_title: null,
        meta_description: null,
        sort_order: 0,
        is_active: true,
        created_at: '',
        updated_at: '',
        category: product.store_categories as unknown as {
          id: string
          name: string
          slug: string
        } | null,
        subcategory: null,
        brand: product.store_brands as unknown as { id: string; name: string; slug: string } | null,
        inventory: product.store_inventory
          ? {
              stock_quantity: (product.store_inventory as unknown as { stock_quantity: number })
                .stock_quantity,
              min_stock_level: null,
            }
          : null,
        images: [],
        variants: [],
        current_price: Math.round(currentPrice),
        original_price: originalPrice,
        has_discount: hasDiscount,
        discount_percentage: discountPercentage,
      }
    })

    return NextResponse.json({
      suggestions,
      products: formattedProducts,
      total: formattedProducts.length,
    })
  } catch (error) {
    logger.error('Store search error', {
      clinic,
      query,
      error: error instanceof Error ? error.message : 'Unknown',
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'Error en búsqueda' },
    })
  }
}
