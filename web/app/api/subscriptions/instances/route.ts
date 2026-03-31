/**
 * Subscription Instances API
 *
 * GET /api/subscriptions/instances - List service instances
 */

import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth/api-wrapper'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

// GET /api/subscriptions/instances - List instances (for route planning)
export const GET = withApiAuth(async ({ profile, supabase, request }: ApiHandlerContext) => {
  const { searchParams } = new URL(request.url)
  const subscriptionId = searchParams.get('subscription_id')
  const date = searchParams.get('date') // 'today' or specific date
  const needsTransport = searchParams.get('needs_transport') === 'true'
  const status = searchParams.get('status')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  let query = supabase
    .from('subscription_instances')
    .select(
      `
      id,
      subscription_id,
      scheduled_date,
      scheduled_time,
      status,
      pickup_status,
      pickup_driver_id,
      pickup_time,
      delivery_status,
      delivery_driver_id,
      delivery_time,
      customer_rating,
      customer_feedback,
      completed_at,
      subscription:service_subscriptions (
        id,
        customer_id,
        pet_id,
        wants_pickup,
        wants_delivery,
        pickup_address,
        pickup_lat,
        pickup_lng,
        pickup_instructions,
        delivery_address,
        delivery_lat,
        delivery_lng,
        delivery_instructions,
        special_instructions,
        customer:profiles!service_subscriptions_customer_id_fkey (
          id,
          full_name,
          phone
        ),
        pet:pets (
          id,
          name,
          species,
          breed
        ),
        plan:subscription_plans (
          id,
          name,
          service:services (
            id,
            name
          )
        )
      )
    `,
      { count: 'exact' }
    )
    .eq('tenant_id', profile.tenant_id)
    .order('scheduled_date', { ascending: true })
    .range(offset, offset + limit - 1)

  // Filter by subscription
  if (subscriptionId) {
    query = query.eq('subscription_id', subscriptionId)
  }

  // Filter by date
  if (date === 'today') {
    const today = new Date().toISOString().split('T')[0]
    query = query.eq('scheduled_date', today)
  } else if (date) {
    query = query.eq('scheduled_date', date)
  }

  // Filter for transport needs
  if (needsTransport) {
    query = query.or('pickup_status.eq.pending,delivery_status.eq.pending')
  }

  // Filter by status
  if (status) {
    query = query.eq('status', status)
  }

  const { data, error, count } = await query

  if (error) {
    logger.error('Subscription instances GET error', {
      tenantId: profile.tenant_id,
      error: error.message,
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }

  // Transform data for easier consumption
  const instances = (data || []).map((instance) => {
    // Handle subscription as array or single object from join
    const subData = instance.subscription
    const subRaw = Array.isArray(subData) ? subData[0] : subData
    const sub = subRaw as unknown as {
      customer: { full_name: string; phone: string | null } | { full_name: string; phone: string | null }[]
      pet: { name: string; species: string } | { name: string; species: string }[]
      plan: { name: string; service: { name: string } } | { name: string; service: { name: string } }[]
      pickup_address: string | null
      delivery_address: string | null
    } | null
    // Extract first element if arrays
    const customer = sub?.customer && (Array.isArray(sub.customer) ? sub.customer[0] : sub.customer)
    const pet = sub?.pet && (Array.isArray(sub.pet) ? sub.pet[0] : sub.pet)
    const plan = sub?.plan && (Array.isArray(sub.plan) ? sub.plan[0] : sub.plan)

    return {
      ...instance,
      customer_name: customer?.full_name,
      customer_phone: customer?.phone,
      pet_name: pet?.name,
      pet_species: pet?.species,
      plan_name: plan?.name,
      service_name: plan?.service?.name,
      pickup_address: sub?.pickup_address,
      delivery_address: sub?.delivery_address,
    }
  })

  return NextResponse.json({
    instances,
    pagination: {
      total: count,
      limit,
      offset,
      hasMore: (count || 0) > offset + limit,
    },
  })
})
