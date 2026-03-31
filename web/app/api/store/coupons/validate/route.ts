import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * POST /api/store/coupons/validate
 * Validate a coupon code
 */
export const POST = withApiAuth(async ({ request, user, profile, supabase }: ApiHandlerContext) => {
  try {
    const body = await request.json()
    const { code, clinic, cart_total } = body

    if (!code || !clinic || cart_total === undefined) {
      return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'Faltan parámetros requeridos' },
      })
    }

    // Use the database function for validation
    const { data, error } = await supabase.rpc('validate_coupon', {
      p_tenant_id: clinic,
      p_code: code.toUpperCase(),
      p_user_id: user.id,
      p_cart_total: cart_total,
    })

    if (error) throw error

    if (!data || !data.valid) {
      return NextResponse.json({
        valid: false,
        error: data?.error || 'Cupón no válido',
      })
    }

    return NextResponse.json({
      valid: true,
      coupon_id: data.coupon_id,
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      calculated_discount: data.calculated_discount,
      name: data.name,
    })
  } catch (e) {
    logger.error('Error validating coupon', {
      tenantId: profile.tenant_id,
      userId: user.id,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'No se pudo validar el cupón' },
    })
  }
}, { rateLimit: 'write' })
