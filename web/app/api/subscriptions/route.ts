/**
 * Service Subscriptions API
 *
 * GET /api/subscriptions - List subscriptions (staff sees all, customers see own)
 * POST /api/subscriptions - Create a new subscription
 */

import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth/api-wrapper'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

// GET /api/subscriptions - List subscriptions
export const GET = withApiAuth(async ({ profile, supabase, request, user }: ApiHandlerContext) => {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const customerId = searchParams.get('customer_id')
  const petId = searchParams.get('pet_id')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')

  const isStaff = ['vet', 'admin'].includes(profile.role)

  let query = supabase
    .from('service_subscriptions')
    .select(
      `
      *,
      plan:subscription_plans (
        id,
        name,
        service_frequency,
        includes_pickup,
        includes_delivery,
        service:services (
          id,
          name,
          category
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
        photo_url
      )
    `,
      { count: 'exact' }
    )
    .eq('tenant_id', profile.tenant_id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  // Non-staff can only see their own subscriptions
  if (!isStaff) {
    query = query.eq('customer_id', user.id)
  } else if (customerId) {
    query = query.eq('customer_id', customerId)
  }

  if (status) {
    query = query.eq('status', status)
  }

  if (petId) {
    query = query.eq('pet_id', petId)
  }

  const { data, error, count } = await query

  if (error) {
    logger.error('Subscriptions GET error', {
      tenantId: profile.tenant_id,
      error: error.message,
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }

  return NextResponse.json({
    subscriptions: data || [],
    pagination: {
      total: count,
      limit,
      offset,
      hasMore: (count || 0) > offset + limit,
    },
  })
})

// POST /api/subscriptions - Create a new subscription
export const POST = withApiAuth(
  async ({ profile, supabase, request, user }: ApiHandlerContext) => {
    let body
    try {
      body = await request.json()
    } catch (_error: unknown) {
      return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
    }

    const {
      plan_id,
      pet_id,
      customer_id,
      preferred_day_of_week,
      preferred_time_slot,
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
    } = body

    // Validate required fields
    if (!plan_id || !pet_id) {
      return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
        details: { required: ['plan_id', 'pet_id'] },
      })
    }

    // Determine customer
    const isStaff = ['vet', 'admin'].includes(profile.role)
    const finalCustomerId = isStaff && customer_id ? customer_id : user.id

    // Verify plan exists and is active
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', plan_id)
      .eq('tenant_id', profile.tenant_id)
      .eq('is_active', true)
      .single()

    if (planError || !plan) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { message: 'Plan no encontrado o no disponible' },
      })
    }

    // Verify pet exists and customer owns it (or staff is creating)
    const { data: pet, error: petError } = await supabase
      .from('pets')
      .select('id, owner_id, species, weight_kg')
      .eq('id', pet_id)
      .single()

    if (petError || !pet) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { message: 'Mascota no encontrada' },
      })
    }

    if (!isStaff && pet.owner_id !== user.id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, {
        details: { message: 'No tienes acceso a esta mascota' },
      })
    }

    // Check species eligibility
    if (plan.species_allowed && !plan.species_allowed.includes(pet.species)) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { message: `Este plan no está disponible para ${pet.species}` },
      })
    }

    // Check weight eligibility
    if (plan.max_pet_weight_kg && pet.weight_kg && pet.weight_kg > plan.max_pet_weight_kg) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { message: `Este plan es para mascotas de hasta ${plan.max_pet_weight_kg} kg` },
      })
    }

    // Check for existing active subscription for this pet with same service
    const { data: existingSub } = await supabase
      .from('service_subscriptions')
      .select('id')
      .eq('pet_id', pet_id)
      .eq('plan_id', plan_id)
      .eq('status', 'active')
      .single()

    if (existingSub) {
      return apiError('CONFLICT', HTTP_STATUS.CONFLICT, {
        details: { message: 'Ya existe una suscripción activa para esta mascota con este plan' },
      })
    }

    // Calculate price (apply first month discount if any)
    let currentPrice = plan.price_per_period
    if (plan.first_month_discount > 0) {
      currentPrice = plan.price_per_period * (1 - plan.first_month_discount / 100)
    }

    // Add pickup/delivery fees
    if (wants_pickup && plan.includes_pickup) {
      currentPrice += plan.pickup_fee || 0
    }
    if (wants_delivery && plan.includes_delivery) {
      currentPrice += plan.delivery_fee || 0
    }

    // Calculate next service date (next week on preferred day, or next week same day)
    const today = new Date()
    const nextServiceDate = new Date(today)
    nextServiceDate.setDate(today.getDate() + 7) // Start service in 1 week

    if (preferred_day_of_week !== undefined) {
      const dayDiff = preferred_day_of_week - nextServiceDate.getDay()
      if (dayDiff !== 0) {
        nextServiceDate.setDate(nextServiceDate.getDate() + (dayDiff > 0 ? dayDiff : dayDiff + 7))
      }
    }

    // Calculate next billing date (today + 1 month for monthly)
    const nextBillingDate = new Date(today)
    if (plan.billing_frequency === 'weekly') {
      nextBillingDate.setDate(today.getDate() + 7)
    } else if (plan.billing_frequency === 'biweekly') {
      nextBillingDate.setDate(today.getDate() + 14)
    } else if (plan.billing_frequency === 'quarterly') {
      nextBillingDate.setMonth(today.getMonth() + 3)
    } else {
      nextBillingDate.setMonth(today.getMonth() + 1)
    }

    // Create subscription
    const { data, error } = await supabase
      .from('service_subscriptions')
      .insert({
        tenant_id: profile.tenant_id,
        plan_id,
        customer_id: finalCustomerId,
        pet_id,
        status: 'active',
        preferred_day_of_week,
        preferred_time_slot,
        wants_pickup: wants_pickup && plan.includes_pickup,
        wants_delivery: wants_delivery && plan.includes_delivery,
        pickup_address,
        pickup_lat: pickup_lat ? Number(pickup_lat) : null,
        pickup_lng: pickup_lng ? Number(pickup_lng) : null,
        pickup_instructions,
        delivery_address,
        delivery_lat: delivery_lat ? Number(delivery_lat) : null,
        delivery_lng: delivery_lng ? Number(delivery_lng) : null,
        delivery_instructions,
        current_price: currentPrice,
        next_service_date: nextServiceDate.toISOString().split('T')[0],
        next_billing_date: nextBillingDate.toISOString().split('T')[0],
        services_remaining_this_period: plan.services_per_period,
        special_instructions,
      })
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
      logger.error('Subscription POST error', {
        userId: user.id,
        tenantId: profile.tenant_id,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    // Schedule first service instance
    try {
      await supabase.rpc('schedule_subscription_instance', {
        p_subscription_id: data.id,
      })
    } catch (scheduleError) {
      logger.warn('Failed to schedule first instance', {
        subscriptionId: data.id,
        error: scheduleError,
      })
    }

    return NextResponse.json(data, { status: 201 })
  },
  { rateLimit: 'write' }
)
