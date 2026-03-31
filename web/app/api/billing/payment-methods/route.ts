/**
 * Payment Methods API
 *
 * GET /api/billing/payment-methods - List saved payment methods
 * POST /api/billing/payment-methods - Add a new payment method (after Stripe confirmation)
 *
 * Payment methods are saved after successfully confirming a SetupIntent
 * with Stripe Elements on the frontend.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import {
  getPaymentMethod,
  formatCardBrand,
  getPaymentMethodDisplayName,
  setDefaultPaymentMethod,
} from '@/lib/billing/stripe'
import type { PaymentMethodType } from '@/lib/billing/types'

// =============================================================================
// GET - List payment methods
// =============================================================================

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()

  // 1. Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return apiError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED)
  }

  // 2. Get profile and verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
      details: { resource: 'profile' },
    })
  }

  if (profile.role !== 'admin') {
    return apiError('INSUFFICIENT_ROLE', HTTP_STATUS.FORBIDDEN, {
      details: { required: ['admin'], current: profile.role },
    })
  }

  try {
    // 3. Get payment methods for tenant
    const { data: methods, error } = await supabase
      .from('tenant_payment_methods')
      .select(`
        id,
        method_type,
        display_name,
        card_brand,
        card_last_four,
        card_exp_month,
        card_exp_year,
        card_funding,
        bank_name,
        bank_alias,
        is_default,
        is_verified,
        is_active,
        last_used_at,
        use_count,
        created_at
      `)
      .eq('tenant_id', profile.tenant_id)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({
      payment_methods: methods || [],
      count: methods?.length || 0,
    })
  } catch (e) {
    logger.error('Error fetching payment methods', {
      tenantId: profile.tenant_id,
      userId: user.id,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'Error al cargar metodos de pago' },
    })
  }
}

// =============================================================================
// POST - Add new payment method
// =============================================================================

interface AddPaymentMethodRequest {
  stripe_payment_method_id: string
  set_as_default?: boolean
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()

  // 1. Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return apiError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED)
  }

  // 2. Get profile and verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
      details: { resource: 'profile' },
    })
  }

  if (profile.role !== 'admin') {
    return apiError('INSUFFICIENT_ROLE', HTTP_STATUS.FORBIDDEN, {
      details: { required: ['admin'], current: profile.role },
    })
  }

  try {
    // 3. Parse request body
    const body: AddPaymentMethodRequest = await request.json()

    if (!body.stripe_payment_method_id) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'stripe_payment_method_id es requerido' },
      })
    }

    // 4. Get tenant Stripe customer ID
    const { data: tenant } = await supabase
      .from('tenants')
      .select('stripe_customer_id')
      .eq('id', profile.tenant_id)
      .single()

    if (!tenant?.stripe_customer_id) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'No hay cliente de Stripe configurado' },
      })
    }

    // 5. Get payment method details from Stripe
    const stripeMethod = await getPaymentMethod(body.stripe_payment_method_id)

    if (!stripeMethod) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'stripe_payment_method' },
      })
    }

    // 6. Check if payment method already exists
    const { data: existing } = await supabase
      .from('tenant_payment_methods')
      .select('id')
      .eq('tenant_id', profile.tenant_id)
      .eq('stripe_payment_method_id', body.stripe_payment_method_id)
      .single()

    if (existing) {
      return apiError('DUPLICATE_ERROR', HTTP_STATUS.CONFLICT, {
        details: { message: 'Este metodo de pago ya esta guardado' },
      })
    }

    // 7. Build payment method record
    const methodType: PaymentMethodType = stripeMethod.type === 'card' ? 'card' : 'card'
    const displayName = getPaymentMethodDisplayName(stripeMethod)

    const methodData = {
      tenant_id: profile.tenant_id,
      method_type: methodType,
      display_name: displayName,
      stripe_customer_id: tenant.stripe_customer_id,
      stripe_payment_method_id: stripeMethod.id,
      card_brand: stripeMethod.card?.brand || null,
      card_last_four: stripeMethod.card?.last4 || null,
      card_exp_month: stripeMethod.card?.exp_month || null,
      card_exp_year: stripeMethod.card?.exp_year || null,
      card_funding: stripeMethod.card?.funding || null,
      is_default: body.set_as_default || false,
      is_verified: true,
      is_active: true,
      verified_at: new Date().toISOString(),
      billing_country: stripeMethod.billing_details?.address?.country || 'PY',
    }

    // 8. If setting as default, clear other defaults first
    if (body.set_as_default) {
      await supabase
        .from('tenant_payment_methods')
        .update({ is_default: false })
        .eq('tenant_id', profile.tenant_id)

      // Also update Stripe customer default
      await setDefaultPaymentMethod(tenant.stripe_customer_id, stripeMethod.id)

      // Update tenant's default payment method ID
      // (We'll get the ID after insert)
    }

    // 9. Insert payment method
    const { data: newMethod, error: insertError } = await supabase
      .from('tenant_payment_methods')
      .insert(methodData)
      .select()
      .single()

    if (insertError) throw insertError

    // 10. Update tenant's default payment method ID if this is default
    if (body.set_as_default && newMethod) {
      await supabase
        .from('tenants')
        .update({ default_payment_method_id: newMethod.id })
        .eq('id', profile.tenant_id)
    }

    logger.info('Payment method added', {
      tenantId: profile.tenant_id,
      methodId: newMethod.id,
      stripeMethodId: stripeMethod.id,
      isDefault: body.set_as_default,
    })

    return NextResponse.json({
      success: true,
      payment_method: {
        id: newMethod.id,
        method_type: newMethod.method_type,
        display_name: newMethod.display_name,
        card_brand: formatCardBrand(newMethod.card_brand || ''),
        card_last_four: newMethod.card_last_four,
        card_exp_month: newMethod.card_exp_month,
        card_exp_year: newMethod.card_exp_year,
        is_default: newMethod.is_default,
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    logger.error('Error adding payment method', {
      tenantId: profile.tenant_id,
      userId: user.id,
      error: message,
    })

    return apiError('PAYMENT_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'Error al guardar metodo de pago' },
    })
  }
}
