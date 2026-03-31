/**
 * Single Subscription Plan API
 *
 * GET /api/subscriptions/plans/[id] - Get plan details
 * PUT /api/subscriptions/plans/[id] - Update plan
 * DELETE /api/subscriptions/plans/[id] - Deactivate plan
 */

import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth/api-wrapper'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

type Params = { id: string }

// GET /api/subscriptions/plans/[id] - Get plan details
export const GET = withApiAuthParams<Params>(async ({ profile, supabase, params }: ApiHandlerContextWithParams<Params>) => {
  const { id } = params

  const { data, error } = await supabase
    .from('subscription_plans')
    .select(
      `
      *,
      service:services (
        id,
        name,
        category,
        duration_minutes
      )
    `
    )
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND)
    }
    logger.error('Subscription plan GET error', {
      planId: id,
      tenantId: profile.tenant_id,
      error: error.message,
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }

  return NextResponse.json(data)
})

// PUT /api/subscriptions/plans/[id] - Update plan
export const PUT = withApiAuthParams<Params>(
  async ({ profile, supabase, request, user, params }: ApiHandlerContextWithParams<Params>) => {
    const { id } = params

    let body
    try {
      body = await request.json()
    } catch (_error: unknown) {
      return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
    }

    // Verify plan exists
    const { data: existing, error: fetchError } = await supabase
      .from('subscription_plans')
      .select('id, tenant_id')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND)
    }

    if (existing.tenant_id !== profile.tenant_id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }

    // Build update object
    const allowedFields = [
      'name',
      'description',
      'price_per_period',
      'billing_frequency',
      'service_frequency',
      'services_per_period',
      'includes_pickup',
      'includes_delivery',
      'pickup_fee',
      'delivery_fee',
      'discount_percent',
      'first_month_discount',
      'species_allowed',
      'max_pet_weight_kg',
      'min_commitment_months',
      'is_active',
      'is_featured',
    ]

    const updates: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (
          [
            'price_per_period',
            'services_per_period',
            'pickup_fee',
            'delivery_fee',
            'discount_percent',
            'first_month_discount',
            'max_pet_weight_kg',
            'min_commitment_months',
          ].includes(field)
        ) {
          updates[field] = body[field] ? Number(body[field]) : field === 'max_pet_weight_kg' ? null : 0
        } else {
          updates[field] = body[field]
        }
      }
    }

    const { data, error } = await supabase
      .from('subscription_plans')
      .update(updates)
      .eq('id', id)
      .select(
        `
        *,
        service:services (
          id,
          name,
          category
        )
      `
      )
      .single()

    if (error) {
      logger.error('Subscription plan PUT error', {
        planId: id,
        userId: user.id,
        tenantId: profile.tenant_id,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return NextResponse.json(data)
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)

// DELETE /api/subscriptions/plans/[id] - Deactivate plan (soft delete)
export const DELETE = withApiAuthParams<Params>(
  async ({ profile, supabase, user, params }: ApiHandlerContextWithParams<Params>) => {
    const { id } = params

    // Verify plan exists
    const { data: existing, error: fetchError } = await supabase
      .from('subscription_plans')
      .select('id, tenant_id')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND)
    }

    if (existing.tenant_id !== profile.tenant_id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }

    // Soft delete by setting is_active to false
    const { error } = await supabase.from('subscription_plans').update({ is_active: false }).eq('id', id)

    if (error) {
      logger.error('Subscription plan DELETE error', {
        planId: id,
        userId: user.id,
        tenantId: profile.tenant_id,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return new NextResponse(null, { status: 204 })
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)
