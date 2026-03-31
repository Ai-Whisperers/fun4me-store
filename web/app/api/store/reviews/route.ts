import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

// GET - Get reviews for a product (public)
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const productId = searchParams.get('product_id')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  const sort = searchParams.get('sort') || 'newest'
  const rating = searchParams.get('rating')
  const verifiedOnly = searchParams.get('verified_only') === 'true'
  const withImages = searchParams.get('with_images') === 'true'

  if (!productId) {
    return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
      details: { message: 'Falta product_id' },
    })
  }

  try {
    const offset = (page - 1) * limit

    let query = supabase
      .from('store_reviews')
      .select(
        `
        *,
        profiles(full_name, avatar_url),
        store_review_images(id, image_url, sort_order)
      `,
        { count: 'exact' }
      )
      .eq('product_id', productId)
      .eq('is_approved', true)

    // Apply filters
    if (rating) {
      query = query.eq('rating', parseInt(rating))
    }

    if (verifiedOnly) {
      query = query.eq('is_verified_purchase', true)
    }

    // Apply sorting
    switch (sort) {
      case 'oldest':
        query = query.order('created_at', { ascending: true })
        break
      case 'highest':
        query = query.order('rating', { ascending: false })
        break
      case 'lowest':
        query = query.order('rating', { ascending: true })
        break
      case 'helpful':
        query = query.order('helpful_count', { ascending: false })
        break
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false })
    }

    query = query.range(offset, offset + limit - 1)

    const { data: reviews, error, count } = await query

    if (error) throw error

    // Filter by images if needed (post-query because it's a relation)
    let filteredReviews = reviews || []
    if (withImages) {
      filteredReviews = filteredReviews.filter(
        (r) => r.store_review_images && r.store_review_images.length > 0
      )
    }

    // Get rating summary
    const { data: summaryData } = await supabase
      .from('store_reviews')
      .select('rating')
      .eq('product_id', productId)
      .eq('is_approved', true)

    const ratings = summaryData?.map((r) => r.rating) || []
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0

    const summary = {
      avg_rating: Math.round(avgRating * 10) / 10,
      total_reviews: ratings.length,
      rating_distribution: {
        5: ratings.filter((r) => r === 5).length,
        4: ratings.filter((r) => r === 4).length,
        3: ratings.filter((r) => r === 3).length,
        2: ratings.filter((r) => r === 2).length,
        1: ratings.filter((r) => r === 1).length,
      },
    }

    // Format reviews
    const formattedReviews = filteredReviews.map((r) => ({
      id: r.id,
      product_id: r.product_id,
      rating: r.rating,
      title: r.title,
      content: r.content,
      is_verified_purchase: r.is_verified_purchase,
      helpful_count: r.helpful_count,
      is_featured: r.is_featured,
      created_at: r.created_at,
      user: {
        full_name: r.profiles?.full_name || 'Usuario',
        avatar_url: r.profiles?.avatar_url,
      },
      images: (r.store_review_images || []).sort(
        (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
      ),
    }))

    return NextResponse.json({
      reviews: formattedReviews,
      summary,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (e) {
    logger.error('Error fetching reviews', {
      productId,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'No se pudieron cargar las reseñas' },
    })
  }
}

// POST - Create a review (authenticated users only)
export const POST = withApiAuth(
  async ({ request, user, supabase }: ApiHandlerContext) => {
  try {
    const body = await request.json()
    const { product_id, clinic, rating, title, content, images } = body

    if (!product_id || !clinic || !rating) {
      return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'Faltan parámetros requeridos' },
      })
    }

    if (rating < 1 || rating > 5) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'Calificación debe ser entre 1 y 5' },
      })
    }

    // Check if user already reviewed this product
    const { data: existing } = await supabase
      .from('store_reviews')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', product_id)
      .single()

    if (existing) {
      return apiError('ALREADY_EXISTS', HTTP_STATUS.CONFLICT, {
        details: { message: 'Ya escribiste una reseña para este producto' },
      })
    }

    // Check if user purchased this product (for verified badge)
    const { data: invoiceItem } = await supabase
      .from('invoice_items')
      .select('id')
      .eq('product_id', product_id)
      .single()

    const isVerifiedPurchase = !!invoiceItem

    // Create review
    const { data: review, error } = await supabase
      .from('store_reviews')
      .insert({
        product_id,
        tenant_id: clinic,
        user_id: user.id,
        rating,
        title,
        content,
        is_verified_purchase: isVerifiedPurchase,
        is_approved: true, // Auto-approve for now
      })
      .select()
      .single()

    if (error) {
      logger.error('Error creating review', {
        userId: user.id,
        productId: product_id,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
        details: { message: 'No se pudo crear la reseña' },
      })
    }

    // Add images if provided
    if (images && images.length > 0) {
      const imageInserts = images.map((url: string, index: number) => ({
        review_id: review.id,
        tenant_id: clinic,
        image_url: url,
        sort_order: index,
      }))

      await supabase.from('store_review_images').insert(imageInserts)
    }

    return NextResponse.json({ success: true, review })
  } catch (e) {
    logger.error('Error creating review', {
      userId: user.id,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'No se pudo crear la reseña' },
    })
  }
  },
  { rateLimit: 'write' }
)
