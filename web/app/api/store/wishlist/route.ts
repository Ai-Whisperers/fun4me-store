import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/store/wishlist
 * Load wishlist product IDs for logged-in user
 * Note: Returns empty array for unauthenticated users (not an error)
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // For unauthenticated users, return empty wishlist (not an error)
  if (!user) {
    return NextResponse.json({ items: [], productIds: [], authenticated: false })
  }

  // Get user's profile to determine tenant
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .maybeSingle()

  // If no profile, return empty wishlist (user might be new)
  if (profileError || !profile) {
    return NextResponse.json({ items: [], productIds: [], authenticated: true, no_profile: true })
  }

  // Get wishlist items with product details
  const { data: wishlistItems, error } = await supabase
    .from('store_wishlist')
    .select(
      `
      id,
      product_id,
      created_at,
      store_products (
        id,
        name,
        sku,
        short_description,
        base_price,
        sale_price,
        image_url,
        is_active
      )
    `
    )
    .eq('customer_id', user.id)
    .eq('tenant_id', profile.tenant_id)
    .order('created_at', { ascending: false })

  if (error) {
    logger.error('Error fetching wishlist', {
      userId: user.id,
      tenantId: profile.tenant_id,
      error: error instanceof Error ? error.message : String(error),
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'Error al cargar lista de deseos' },
    })
  }

  // Return just product IDs for the context, full data for the page
  const productIds = wishlistItems?.map((item) => item.product_id) ?? []

  return NextResponse.json({
    items: wishlistItems ?? [],
    productIds,
  })
}

/**
 * POST /api/store/wishlist
 * Add a product to wishlist
 */
export const POST = withApiAuth(
  async ({ user, profile, supabase, request }: ApiHandlerContext) => {
  const { productId } = await request.json()

  if (!productId) {
    return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
      details: { message: 'ID de producto requerido' },
    })
  }

  // Add to wishlist
  const { error } = await supabase.from('store_wishlist').insert({
    customer_id: user.id,
    tenant_id: profile.tenant_id,
    product_id: productId,
  })

  if (error) {
    // If duplicate, silently succeed
    if (error.code === '23505') {
      return NextResponse.json({ success: true, added: false })
    }
    logger.error('Error adding to wishlist', {
      userId: user.id,
      tenantId: profile.tenant_id,
      productId,
      error: error instanceof Error ? error.message : String(error),
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'Error al agregar a lista de deseos' },
    })
  }

  return NextResponse.json({ success: true, added: true })
  },
  { rateLimit: 'write' }
)

/**
 * DELETE /api/store/wishlist
 * Remove a product from wishlist
 */
export const DELETE = withApiAuth(
  async ({ user, supabase, request }: ApiHandlerContext) => {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    if (!productId) {
      return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'ID de producto requerido' },
      })
    }

    // Delete from wishlist
    const { error } = await supabase
      .from('store_wishlist')
      .delete()
      .eq('customer_id', user.id)
      .eq('product_id', productId)

    if (error) {
      logger.error('Error removing from wishlist', {
        userId: user.id,
        productId,
        error: error instanceof Error ? error.message : String(error),
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
        details: { message: 'Error al eliminar de lista de deseos' },
      })
    }

    return NextResponse.json({ success: true })
  },
  { rateLimit: 'write' }
)
