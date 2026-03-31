import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * GET /api/dashboard/coupons/[id]
 * Get a single coupon
 */
export const GET = withApiAuthParams(
  async ({ params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const couponId = params.id

    try {
      const { data: coupon, error } = await supabase
        .from('store_coupons')
        .select('*')
        .eq('id', couponId)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .single()

      if (error || !coupon) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { message: 'Cupón no encontrado' },
        })
      }

      return NextResponse.json({ coupon })
    } catch (e) {
      logger.error('Error fetching coupon', {
        tenantId: profile.tenant_id,
        couponId,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'] }
)

/**
 * PUT /api/dashboard/coupons/[id]
 * Update a coupon
 */
export const PUT = withApiAuthParams(
  async ({ request, params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const couponId = params.id

    try {
      const body = await request.json()
      const {
        code,
        name,
        description,
        discount_type,
        discount_value,
        min_purchase_amount,
        max_discount_amount,
        usage_limit,
        usage_limit_per_user,
        valid_from,
        valid_until,
        applicable_products,
        applicable_categories,
        is_active,
      } = body

      // Check if coupon exists
      const { data: existing } = await supabase
        .from('store_coupons')
        .select('id')
        .eq('id', couponId)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .single()

      if (!existing) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { resource: 'coupon' },
        })
      }

      // Check for duplicate code if code is being changed
      if (code) {
        const { data: duplicate } = await supabase
          .from('store_coupons')
          .select('id')
          .eq('tenant_id', profile.tenant_id)
          .ilike('code', code)
          .neq('id', couponId)
          .is('deleted_at', null)
          .single()

        if (duplicate) {
          return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
            details: { message: 'Ya existe un cupón con este código' },
          })
        }
      }

      // Validation
      if (discount_type === 'percentage' && discount_value && (discount_value <= 0 || discount_value > 100)) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: { message: 'El porcentaje debe estar entre 1 y 100' },
        })
      }

      const updateData: Record<string, unknown> = {}
      if (code !== undefined) updateData.code = code.toUpperCase()
      if (name !== undefined) updateData.name = name
      if (description !== undefined) updateData.description = description
      if (discount_type !== undefined) updateData.discount_type = discount_type
      if (discount_value !== undefined) updateData.discount_value = discount_value
      if (min_purchase_amount !== undefined) updateData.min_purchase_amount = min_purchase_amount
      if (max_discount_amount !== undefined) updateData.max_discount_amount = max_discount_amount
      if (usage_limit !== undefined) updateData.usage_limit = usage_limit
      if (usage_limit_per_user !== undefined) updateData.usage_limit_per_user = usage_limit_per_user
      if (valid_from !== undefined) updateData.valid_from = valid_from
      if (valid_until !== undefined) updateData.valid_until = valid_until
      if (applicable_products !== undefined) updateData.applicable_products = applicable_products
      if (applicable_categories !== undefined) updateData.applicable_categories = applicable_categories
      if (is_active !== undefined) updateData.is_active = is_active

      const { data: coupon, error } = await supabase
        .from('store_coupons')
        .update(updateData)
        .eq('id', couponId)
        .eq('tenant_id', profile.tenant_id)
        .select()
        .single()

      if (error) throw error

      return NextResponse.json({ coupon })
    } catch (e) {
      logger.error('Error updating coupon', {
        tenantId: profile.tenant_id,
        couponId,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)

/**
 * DELETE /api/dashboard/coupons/[id]
 * Soft delete a coupon
 */
export const DELETE = withApiAuthParams(
  async ({ params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const couponId = params.id

    try {
      const { error } = await supabase
        .from('store_coupons')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: user.id,
        })
        .eq('id', couponId)
        .eq('tenant_id', profile.tenant_id)

      if (error) throw error

      return NextResponse.json({ success: true })
    } catch (e) {
      logger.error('Error deleting coupon', {
        tenantId: profile.tenant_id,
        couponId,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'] }
)
