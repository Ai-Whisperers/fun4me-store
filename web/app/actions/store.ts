'use server'

import { withActionAuth } from '@/lib/auth'
import { actionSuccess, actionError } from '@/lib/errors'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'
import type { SortOption } from '@/lib/types/store'

/**
 * Get products for the store with filters
 */
export const getStoreProducts = withActionAuth(
  async (
    { user, supabase },
    clinicSlug: string,
    params: {
      page?: number
      limit?: number
      sort?: SortOption
      search?: string
      category?: string
      brand?: string
      species?: string[]
    }
  ) => {
    const { page = 1, limit = 12, sort = 'relevance', search, category, brand, species } = params

    let query = supabase
      .from('store_products')
      .select('*', { count: 'exact' })
      .eq('tenant_id', clinicSlug)
      .eq('is_active', true)
      .is('deleted_at', null)

    // Apply filters
    if (search) query = query.ilike('name', `%${search}%`)
    if (category) query = query.eq('category_id', category)
    if (brand) query = query.eq('brand_id', brand)
    if (species && species.length > 0) query = query.contains('target_species', species)

    // Sort
    switch (sort) {
      case 'price_low_high':
        query = query.order('base_price', { ascending: true })
        break
      case 'price_high_low':
        query = query.order('base_price', { ascending: false })
        break
      case 'newest':
        query = query.order('created_at', { ascending: false })
        break
      default:
        query = query.order('name', { ascending: true })
    }

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: products, error, count } = await query

    if (error) {
      logger.error('Error fetching store products', {
        tenantId: clinicSlug,
        userId: user.id,
        filters: { page, limit, sort, search, category, brand, species },
        error: error.message,
      })
      return actionError('Error al obtener productos')
    }

    return actionSuccess({
      products: products || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    })
  }
)

/**
 * Get a single product with details
 */
export const getStoreProduct = withActionAuth(
  async ({ user, supabase }, clinicSlug: string, productId: string) => {
    const { data: product, error } = await supabase
      .from('store_products')
      .select('*')
      .eq('id', productId)
      .eq('tenant_id', clinicSlug)
      .is('deleted_at', null)
      .single()

    if (error || !product) {
      logger.error('Error fetching store product', {
        tenantId: clinicSlug,
        userId: user.id,
        productId,
        error: error?.message || 'Product not found',
      })
      return actionError('Producto no encontrado')
    }

    return actionSuccess(product)
  }
)

/**
 * Get wishlist for current user
 */
export const getWishlist = withActionAuth(async ({ user, supabase }, clinicSlug: string) => {
  const { data, error } = await supabase
    .from('store_wishlist')
    .select('product_id')
    .eq('customer_id', user.id)
    .eq('tenant_id', clinicSlug)

  if (error) {
    logger.error('Error fetching wishlist', {
      tenantId: clinicSlug,
      userId: user.id,
      error: error.message,
    })
    return actionError('Error al obtener lista de deseos')
  }

  return actionSuccess(new Set(data?.map((w) => w.product_id) || []))
})

/**
 * Toggle product in wishlist
 */
export const toggleWishlist = withActionAuth(
  async ({ user, supabase }, clinicSlug: string, productId: string) => {
    // Check if exists
    const { data: existing } = await supabase
      .from('store_wishlist')
      .select('id')
      .eq('customer_id', user.id)
      .eq('product_id', productId)
      .maybeSingle()

    if (existing) {
      // Remove
      const { error } = await supabase.from('store_wishlist').delete().eq('id', existing.id)

      if (error) return actionError('Error al remover de favoritos')
    } else {
      // Add
      const { error } = await supabase.from('store_wishlist').insert({
        customer_id: user.id,
        product_id: productId,
        tenant_id: clinicSlug,
      })

      if (error) return actionError('Error al agregar a favoritos')
    }

    revalidatePath(`/${clinicSlug}/store`)
    return actionSuccess()
  }
)

