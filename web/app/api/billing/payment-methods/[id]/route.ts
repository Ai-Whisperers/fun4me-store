/**
 * Payment Method Detail API
 *
 * DELETE /api/billing/payment-methods/[id] - Remove a payment method
 * PUT /api/billing/payment-methods/[id] - Update (e.g., set as default)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { detachPaymentMethod, setDefaultPaymentMethod } from '@/lib/billing/stripe'

interface RouteContext {
  params: Promise<{ id: string }>
}

// =============================================================================
// DELETE - Remove payment method
// =============================================================================

export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params
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
    // 3. Get payment method
    const { data: method, error: methodError } = await supabase
      .from('tenant_payment_methods')
      .select('id, tenant_id, stripe_payment_method_id, is_default')
      .eq('id', id)
      .single()

    if (methodError || !method) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'payment_method' },
      })
    }

    // Verify ownership
    if (method.tenant_id !== profile.tenant_id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, {
        details: { message: 'No puede eliminar metodos de pago de otra clinica' },
      })
    }

    // 4. Detach from Stripe (soft delete)
    if (method.stripe_payment_method_id) {
      try {
        await detachPaymentMethod(method.stripe_payment_method_id)
      } catch (stripeError) {
        // Log but continue - payment method might already be detached
        logger.warn('Stripe detach failed', {
          methodId: id,
          stripeMethodId: method.stripe_payment_method_id,
          error: stripeError instanceof Error ? stripeError.message : 'Unknown',
        })
      }
    }

    // 5. Soft delete in our database (mark as inactive)
    const { error: updateError } = await supabase
      .from('tenant_payment_methods')
      .update({
        is_active: false,
        is_default: false,
      })
      .eq('id', id)

    if (updateError) throw updateError

    // 6. If this was the default, clear tenant's default
    if (method.is_default) {
      await supabase
        .from('tenants')
        .update({ default_payment_method_id: null })
        .eq('id', profile.tenant_id)
    }

    logger.info('Payment method deleted', {
      tenantId: profile.tenant_id,
      methodId: id,
    })

    return NextResponse.json({
      success: true,
      message: 'Metodo de pago eliminado',
    })
  } catch (e) {
    logger.error('Error deleting payment method', {
      methodId: id,
      userId: user.id,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'Error al eliminar metodo de pago' },
    })
  }
}

// =============================================================================
// PUT - Update payment method (set as default)
// =============================================================================

interface UpdatePaymentMethodRequest {
  is_default?: boolean
}

export async function PUT(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params
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
    // 3. Parse request
    const body: UpdatePaymentMethodRequest = await request.json()

    // 4. Get payment method
    const { data: method, error: methodError } = await supabase
      .from('tenant_payment_methods')
      .select('id, tenant_id, stripe_payment_method_id')
      .eq('id', id)
      .eq('is_active', true)
      .single()

    if (methodError || !method) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'payment_method' },
      })
    }

    // Verify ownership
    if (method.tenant_id !== profile.tenant_id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, {
        details: { message: 'No puede modificar metodos de pago de otra clinica' },
      })
    }

    // 5. Handle set as default
    if (body.is_default) {
      // Clear other defaults
      await supabase
        .from('tenant_payment_methods')
        .update({ is_default: false })
        .eq('tenant_id', profile.tenant_id)

      // Set this as default
      await supabase
        .from('tenant_payment_methods')
        .update({ is_default: true })
        .eq('id', id)

      // Update Stripe customer default
      const { data: tenant } = await supabase
        .from('tenants')
        .select('stripe_customer_id')
        .eq('id', profile.tenant_id)
        .single()

      if (tenant?.stripe_customer_id && method.stripe_payment_method_id) {
        await setDefaultPaymentMethod(tenant.stripe_customer_id, method.stripe_payment_method_id)
      }

      // Update tenant default payment method ID
      await supabase
        .from('tenants')
        .update({ default_payment_method_id: id })
        .eq('id', profile.tenant_id)

      logger.info('Payment method set as default', {
        tenantId: profile.tenant_id,
        methodId: id,
      })
    }

    return NextResponse.json({
      success: true,
      message: body.is_default ? 'Metodo de pago predeterminado actualizado' : 'Metodo de pago actualizado',
    })
  } catch (e) {
    logger.error('Error updating payment method', {
      methodId: id,
      userId: user.id,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'Error al actualizar metodo de pago' },
    })
  }
}
