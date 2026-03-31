import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * POST /api/vaccine_reactions/check
 * Check if a pet has existing reactions to a vaccine brand
 */
export const POST = withApiAuth(async ({ request, profile, supabase }: ApiHandlerContext) => {
  try {
    const { pet_id, brand } = await request.json()

    if (!pet_id || !brand) {
      return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
        details: { required: ['pet_id', 'brand'] },
      })
    }

    // Check for existing reactions to this brand
    // Case-insensitive check is better for safety
    const { data, error } = await supabase
      .from('vaccine_reactions')
      .select('*')
      .eq('pet_id', pet_id)
      .ilike('vaccine_brand', brand)
      .maybeSingle()

    if (error) {
      logger.error('Error checking vaccine reactions', {
        tenantId: profile.tenant_id,
        petId: pet_id,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    if (data) {
      return NextResponse.json({
        hasReaction: true,
        record: data,
      })
    }

    return NextResponse.json({ hasReaction: false })
  } catch (e) {
    logger.error('Unexpected error checking vaccine reactions', {
      tenantId: profile.tenant_id,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
}, { rateLimit: 'write' })
