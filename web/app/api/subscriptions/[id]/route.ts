/**
 * Single Subscription API
 *
 * GET /api/subscriptions/[id] - Get subscription details
 * PUT /api/subscriptions/[id] - Update subscription
 * DELETE /api/subscriptions/[id] - Cancel subscription
 */

import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth/api-wrapper'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

type Params = { id: string }

// GET /api/subscriptions/[id] - Get subscription details with instances
export const GET = withApiAuthParams<Params>(async ({ profile, supabase, user, params }: ApiHandlerContextWithParams<Params>) => {
  const { id } = params
  const isStaff = ['vet', 'admin'].includes(profile.role)

  const { data, error } = await supabase
    .from('service_subscriptions')
    .select(
      `
      *,
      plan:subscription_plans (
        id,
        name,
        description,
        service_frequency,
        billing_frequency,
        services_per_period,
        includes_pickup,
        includes_delivery,
        pickup_fee,
        delivery_fee,
        service:services (
          id,
          name,
          category,
          duration_minutes
        )
      ),
      customer:profiles!service_subscriptions_customer_id_fkey (
        id,
        full_name,
        email,
        phone
      ),
      pet:pets (
        id,
        name,
        species,
        breed,
        photo_url,
        weight_kg
      ),
      instances:subscription_instances (
        id,
        scheduled_date,
        status,
        pickup_status,
        delivery_status,
        customer_rating,
        completed_at
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
    logger.error('Subscription GET error', {
      subscriptionId: id,
      tenantId: profile.tenant_id,
      error: error.message,
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }

  // Check access
  if (!isStaff && data.customer_id !== user.id) {
    return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
  }

  return NextResponse.json(data)
})

// PUT /api/subscriptions/[id] - Update subscription
export const PUT = withApiAuthParams<Params>(
  async ({ profile, supabase, request, user, params }: ApiHandlerContextWithParams<Params>) => {
    const { id } = params

    let body
    try {
      body = await request.json()
    } catch (_error: unknown) {
      return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
    }

    // Verify subscription exists and user has access
    const { data: existing, error: fetchError } = await supabase
      .from('service_subscriptions')
      .select('id, customer_id, tenant_id, status')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND)
    }

    const isStaff = ['vet', 'admin'].includes(profile.role)
    if (!isStaff && existing.customer_id !== user.id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }

    if (existing.tenant_id !== profile.tenant_id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }

    // Build update object
    const customerUpdatableFields = [
      'preferred_day_of_week',
      'preferred_time_slot',
      'pickup_address',
      'pickup_lat',
      'pickup_lng',
      'pickup_instructions',
      'delivery_address',
      'delivery_lat',
      'delivery_lng',
      'delivery_instructions',
      'special_instructions',
    ]

    const staffOnlyFields = [
      'status',
      'wants_pickup',
      'wants_delivery',
      'current_price',
      'next_service_date',
      'next_billing_date',
      'services_remaining_this_period',
    ]

    const allowedFields = isStaff ? [...customerUpdatableFields, ...staffOnlyFields] : customerUpdatableFields

    const updates: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (['pickup_lat', 'pickup_lng', 'delivery_lat', 'delivery_lng', 'current_price'].includes(field)) {
          updates[field] = body[field] ? Number(body[field]) : null
        } else {
          updates[field] = body[field]
        }
      }
    }

    // Handle status changes
    if (body.status === 'paused' && existing.status === 'active') {
      updates.paused_at = new Date().toISOString()
    } else if (body.status === 'active' && existing.status === 'paused') {
      updates.paused_at = null
    } else if (body.status === 'cancelled') {
      updates.cancelled_at = new Date().toISOString()
      updates.cancellation_reason = body.cancellation_reason || null
    }

    const { data, error } = await supabase
      .from('service_subscriptions')
      .update(updates)
      .eq('id', id)
      .select(
        `
        *,
        plan:subscription_plans (
          id,
          name,
          service:services (
            id,
            name
          )
        ),
        pet:pets (
          id,
          name,
          species
        )
      `
      )
      .single()

    if (error) {
      logger.error('Subscription PUT error', {
        subscriptionId: id,
        userId: user.id,
        tenantId: profile.tenant_id,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return NextResponse.json(data)
  },
  { rateLimit: 'write' }
)

// DELETE /api/subscriptions/[id] - Cancel subscription
export const DELETE = withApiAuthParams<Params>(
  async ({ profile, supabase, request, user, params }: ApiHandlerContextWithParams<Params>) => {
    const { id } = params

    let body
    try {
      body = await request.json()
    } catch (_error: unknown) {
      body = {}
    }

    // Verify subscription exists and user has access
    const { data: existing, error: fetchError } = await supabase
      .from('service_subscriptions')
      .select('id, customer_id, tenant_id, status')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND)
    }

    const isStaff = ['vet', 'admin'].includes(profile.role)
    if (!isStaff && existing.customer_id !== user.id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }

    if (existing.tenant_id !== profile.tenant_id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }

    if (existing.status === 'cancelled') {
      return apiError('CONFLICT', HTTP_STATUS.CONFLICT, {
        details: { message: 'La suscripción ya está cancelada' },
      })
    }

    // Cancel the subscription
    const { error } = await supabase
      .from('service_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: body.reason || 'Cancelado por usuario',
      })
      .eq('id', id)

    if (error) {
      logger.error('Subscription DELETE error', {
        subscriptionId: id,
        userId: user.id,
        tenantId: profile.tenant_id,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    // Cancel pending instances
    await supabase
      .from('subscription_instances')
      .update({ status: 'cancelled' })
      .eq('subscription_id', id)
      .in('status', ['scheduled', 'confirmed'])

    return new NextResponse(null, { status: 204 })
  },
  { rateLimit: 'write' }
)
