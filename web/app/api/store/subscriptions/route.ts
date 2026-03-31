import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { z } from 'zod'

// Validation schemas
const createSubscriptionSchema = z.object({
  clinic: z.string().min(1),
  product_id: z.string().uuid(),
  variant_id: z.string().uuid().optional().nullable(),
  quantity: z.number().int().min(1).max(100).default(1),
  frequency_days: z.number().int().min(7).max(180).default(30),
  shipping_address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      phone: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),
})

const updateSubscriptionSchema = z.object({
  quantity: z.number().int().min(1).max(100).optional(),
  frequency_days: z.number().int().min(7).max(180).optional(),
  status: z.enum(['active', 'paused', 'cancelled']).optional(),
  pause_reason: z.string().optional(),
  cancellation_reason: z.string().optional(),
  shipping_address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      phone: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),
})

/**
 * GET /api/store/subscriptions
 * Get customer's subscriptions
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return apiError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED)
  }

  const { searchParams } = new URL(request.url)
  const clinic = searchParams.get('clinic')

  if (!clinic) {
    return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
      details: { message: 'Falta parámetro clinic' },
    })
  }

  try {
    // Use the helper function for enriched subscription data
    const { data: subscriptions, error } = await supabase.rpc('get_customer_subscriptions', {
      p_customer_id: user.id,
      p_tenant_id: clinic,
    })

    if (error) throw error

    return NextResponse.json({
      subscriptions: subscriptions || [],
      total: subscriptions?.length || 0,
    })
  } catch (e) {
    logger.error('Error fetching subscriptions', {
      tenantId: clinic,
      userId: user.id,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'Error al cargar suscripciones' },
    })
  }
}

/**
 * POST /api/store/subscriptions
 * Create a new subscription
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return apiError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED)
  }

  try {
    const body = await request.json()
    const parsed = createSubscriptionSchema.safeParse(body)

    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { errors: parsed.error.flatten() },
      })
    }

    const { clinic, product_id, variant_id, quantity, frequency_days, shipping_address } =
      parsed.data

    // Verify product exists and is active
    const { data: product, error: productError } = await supabase
      .from('store_products')
      .select(
        `
        id,
        name,
        base_price,
        is_active,
        store_product_variants(id, name, price)
      `
      )
      .eq('id', product_id)
      .eq('tenant_id', clinic)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single()

    if (productError || !product) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { message: 'Producto no encontrado o no disponible' },
      })
    }

    // Get price (variant price if applicable, else base price)
    let subscribed_price = product.base_price
    if (variant_id) {
      const variants = product.store_product_variants as
        | { id: string; name: string; price: number }[]
        | null
      const variant = variants?.find((v) => v.id === variant_id)
      if (!variant) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { message: 'Variante no encontrada' },
        })
      }
      subscribed_price = variant.price
    }

    // Check if subscription already exists
    const { data: existing } = await supabase
      .from('store_subscriptions')
      .select('id, status')
      .eq('tenant_id', clinic)
      .eq('customer_id', user.id)
      .eq('product_id', product_id)
      .eq('variant_id', variant_id || null)
      .neq('status', 'cancelled')
      .single()

    if (existing) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.CONFLICT, {
        details: { message: 'Ya tienes una suscripción activa para este producto' },
      })
    }

    // Calculate next order date
    const next_order_date = new Date()
    next_order_date.setDate(next_order_date.getDate() + frequency_days)

    // Create subscription
    const { data: subscription, error: createError } = await supabase
      .from('store_subscriptions')
      .insert({
        tenant_id: clinic,
        customer_id: user.id,
        product_id,
        variant_id: variant_id || null,
        quantity,
        frequency_days,
        next_order_date: next_order_date.toISOString().split('T')[0],
        subscribed_price,
        shipping_address,
        status: 'active',
      })
      .select()
      .single()

    if (createError) throw createError

    logger.info('Subscription created', {
      tenantId: clinic,
      userId: user.id,
      subscriptionId: subscription.id,
      productId: product_id,
    })

    return NextResponse.json(
      {
        success: true,
        subscription: {
          id: subscription.id,
          product_name: product.name,
          quantity,
          frequency_days,
          next_order_date: subscription.next_order_date,
          subscribed_price,
        },
        message: `Suscripción creada. Próximo pedido: ${new Date(subscription.next_order_date).toLocaleDateString('es-PY')}`,
      },
      { status: 201 }
    )
  } catch (e) {
    logger.error('Error creating subscription', {
      userId: user.id,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'Error al crear suscripción' },
    })
  }
}

/**
 * PATCH /api/store/subscriptions
 * Update a subscription (pause, resume, cancel, modify)
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return apiError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED)
  }

  try {
    const { searchParams } = new URL(request.url)
    const subscriptionId = searchParams.get('id')

    if (!subscriptionId) {
      return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'Falta ID de suscripción' },
      })
    }

    const body = await request.json()
    const parsed = updateSubscriptionSchema.safeParse(body)

    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { errors: parsed.error.flatten() },
      })
    }

    // Build update object
    const updateData: Record<string, unknown> = {}
    const {
      quantity,
      frequency_days,
      status,
      pause_reason,
      cancellation_reason,
      shipping_address,
    } = parsed.data

    if (quantity !== undefined) updateData.quantity = quantity
    if (frequency_days !== undefined) updateData.frequency_days = frequency_days
    if (shipping_address !== undefined) updateData.shipping_address = shipping_address

    if (status) {
      updateData.status = status
      if (status === 'paused') {
        updateData.pause_reason = pause_reason || null
      } else if (status === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString()
        updateData.cancellation_reason = cancellation_reason || null
      }
    }

    // Update subscription (RLS ensures user owns it)
    const { data: subscription, error: updateError } = await supabase
      .from('store_subscriptions')
      .update(updateData)
      .eq('id', subscriptionId)
      .eq('customer_id', user.id)
      .select()
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { message: 'Suscripción no encontrada' },
        })
      }
      throw updateError
    }

    return NextResponse.json({
      success: true,
      subscription,
      message:
        status === 'cancelled'
          ? 'Suscripción cancelada'
          : status === 'paused'
            ? 'Suscripción pausada'
            : status === 'active'
              ? 'Suscripción reactivada'
              : 'Suscripción actualizada',
    })
  } catch (e) {
    logger.error('Error updating subscription', {
      userId: user.id,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'Error al actualizar suscripción' },
    })
  }
}

/**
 * DELETE /api/store/subscriptions
 * Cancel a subscription (soft delete via status change)
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return apiError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED)
  }

  try {
    const { searchParams } = new URL(request.url)
    const subscriptionId = searchParams.get('id')
    const reason = searchParams.get('reason')

    if (!subscriptionId) {
      return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'Falta ID de suscripción' },
      })
    }

    // Cancel subscription (soft delete)
    const { error: cancelError } = await supabase
      .from('store_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason || 'Usuario canceló',
      })
      .eq('id', subscriptionId)
      .eq('customer_id', user.id)

    if (cancelError) throw cancelError

    return NextResponse.json({
      success: true,
      message: 'Suscripción cancelada exitosamente',
    })
  } catch (e) {
    logger.error('Error cancelling subscription', {
      userId: user.id,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'Error al cancelar suscripción' },
    })
  }
}
