/**
 * Subscription Plans API
 *
 * GET /api/subscriptions/plans - List available subscription plans
 * POST /api/subscriptions/plans - Create a new subscription plan
 */

import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth/api-wrapper'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

// GET /api/subscriptions/plans - List available subscription plans
export const GET = withApiAuth(async ({ profile, supabase, request }: ApiHandlerContext) => {
  const { searchParams } = new URL(request.url)
  const activeOnly = searchParams.get('active_only') !== 'false'
  const serviceId = searchParams.get('service_id')
  const species = searchParams.get('species')

  let query = supabase
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
    .eq('tenant_id', profile.tenant_id)
    .order('is_featured', { ascending: false })
    .order('price_per_period', { ascending: true })

  if (activeOnly) {
    query = query.eq('is_active', true)
  }

  if (serviceId) {
    query = query.eq('service_id', serviceId)
  }

  const { data, error } = await query

  if (error) {
    logger.error('Subscription plans GET error', {
      tenantId: profile.tenant_id,
      error: error.message,
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }

  // Filter by species if specified
  let filteredData = data || []
  if (species) {
    filteredData = filteredData.filter(
      (plan) => plan.species_allowed?.includes(species) ?? true
    )
  }

  return NextResponse.json(filteredData)
})

// POST /api/subscriptions/plans - Create a new subscription plan
export const POST = withApiAuth(
  async ({ profile, supabase, request, user }: ApiHandlerContext) => {
    let body
    try {
      body = await request.json()
    } catch (_error: unknown) {
      return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
    }

    const {
      name,
      description,
      service_id,
      price_per_period,
      billing_frequency,
      service_frequency,
      services_per_period,
      includes_pickup,
      includes_delivery,
      pickup_fee,
      delivery_fee,
      discount_percent,
      first_month_discount,
      species_allowed,
      max_pet_weight_kg,
      min_commitment_months,
      is_featured,
    } = body

    // Validate required fields
    if (!name || !service_id || price_per_period === undefined) {
      return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
        details: { required: ['name', 'service_id', 'price_per_period'] },
      })
    }

    // Verify service exists
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id')
      .eq('id', service_id)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (serviceError || !service) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { message: 'Servicio no encontrado' },
      })
    }

    // Create plan
    const { data, error } = await supabase
      .from('subscription_plans')
      .insert({
        tenant_id: profile.tenant_id,
        name,
        description,
        service_id,
        price_per_period: Number(price_per_period),
        billing_frequency: billing_frequency || 'monthly',
        service_frequency: service_frequency || 'monthly',
        services_per_period: services_per_period ? Number(services_per_period) : 1,
        includes_pickup: includes_pickup ?? false,
        includes_delivery: includes_delivery ?? false,
        pickup_fee: pickup_fee ? Number(pickup_fee) : 0,
        delivery_fee: delivery_fee ? Number(delivery_fee) : 0,
        discount_percent: discount_percent ? Number(discount_percent) : 0,
        first_month_discount: first_month_discount ? Number(first_month_discount) : 0,
        species_allowed: species_allowed || ['dog', 'cat'],
        max_pet_weight_kg: max_pet_weight_kg ? Number(max_pet_weight_kg) : null,
        min_commitment_months: min_commitment_months ? Number(min_commitment_months) : 0,
        is_featured: is_featured ?? false,
      })
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
      logger.error('Subscription plan POST error', {
        userId: user.id,
        tenantId: profile.tenant_id,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return NextResponse.json(data, { status: 201 })
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)
