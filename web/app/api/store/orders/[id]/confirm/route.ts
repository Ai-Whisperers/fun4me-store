/**
 * Store Order Confirmation API
 *
 * POST /api/store/orders/[id]/confirm
 *
 * Marks an order as confirmed with payment received.
 * Triggers commission calculation for the platform.
 *
 * Body:
 * {
 *   payment_method?: string (default: 'cash')
 *   payment_reference?: string
 *   notes?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

const confirmSchema = z.object({
  payment_method: z.string().default('cash'),
  payment_reference: z.string().optional(),
  notes: z.string().optional(),
})

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const { id: orderId } = await params
  const supabase = await createClient()

  // 1. Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return apiError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED)
  }

  // 2. Get profile and verify staff role
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

  // Only staff can confirm orders
  if (profile.role !== 'vet' && profile.role !== 'admin') {
    return apiError('INSUFFICIENT_ROLE', HTTP_STATUS.FORBIDDEN, {
      details: { required: ['vet', 'admin'], current: profile.role },
    })
  }

  try {
    // Parse body
    let body = {}
    try {
      body = await request.json()
    } catch (_error: unknown) {
      // Empty body is fine, will use defaults
    }

    const validation = confirmSchema.safeParse(body)
    if (!validation.success) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        field_errors: validation.error.flatten().fieldErrors as Record<string, string[]>,
      })
    }

    const { payment_method, payment_reference, notes } = validation.data

    // Get order
    const { data: order, error: fetchError } = await supabase
      .from('store_orders')
      .select('id, status, payment_status, total, tenant_id, order_number, customer_id')
      .eq('id', orderId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (fetchError || !order) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'order', message: 'Pedido no encontrado' },
      })
    }

    // Check order can be confirmed
    if (order.payment_status === 'paid') {
      return apiError('CONFLICT', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'Este pedido ya fue pagado' },
      })
    }

    if (order.status === 'cancelled' || order.status === 'refunded') {
      return apiError('CONFLICT', HTTP_STATUS.BAD_REQUEST, {
        details: { message: `No se puede confirmar un pedido ${order.status}` },
      })
    }

    const now = new Date().toISOString()

    // Update order status to confirmed + paid
    const updateData: Record<string, unknown> = {
      status: order.status === 'pending' || order.status === 'pending_prescription' ? 'confirmed' : order.status,
      payment_status: 'paid',
      payment_method,
      payment_reference: payment_reference || null,
      confirmed_by: user.id,
      confirmed_at: now,
      updated_at: now,
    }

    // Add internal notes if provided
    if (notes) {
      // Get current notes to append
      const { data: currentOrder } = await supabase
        .from('store_orders')
        .select('internal_notes')
        .eq('id', orderId)
        .single()

      updateData.internal_notes = currentOrder?.internal_notes
        ? `${currentOrder.internal_notes}\n[${new Date().toLocaleDateString()}] ${notes}`
        : `[${new Date().toLocaleDateString()}] ${notes}`
    }

    const { data: updatedOrder, error: updateError } = await supabase
      .from('store_orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single()

    if (updateError) throw updateError

    // Calculate commission for the order
    let commissionId: string | null = null
    let commissionError: string | null = null

    const { data: commissionResult, error: commError } = await supabase.rpc('calculate_order_commission', {
      p_order_id: orderId,
    })

    if (commError) {
      commissionError = commError.message
      logger.warn('Failed to calculate commission', {
        orderId,
        tenantId: profile.tenant_id,
        error: commError.message,
      })
      // Don't fail the order confirmation - commission can be calculated later
    } else if (commissionResult) {
      commissionId = commissionResult
    }

    // Create notification for customer
    const { error: notifError } = await supabase.from('notifications').insert({
      user_id: order.customer_id,
      title: 'Pago Confirmado',
      message: `Tu pedido #${order.order_number} ha sido confirmado y está siendo procesado.`,
      type: 'order_status',
      data: {
        order_id: orderId,
        status: 'confirmed',
      },
    })

    if (notifError) {
      logger.warn('Failed to create order confirmation notification', {
        orderId,
        error: notifError.message,
      })
    }

    // Audit log
    const { error: auditError } = await supabase.from('audit_logs').insert({
      tenant_id: profile.tenant_id,
      user_id: user.id,
      action: 'order_confirmed',
      resource: 'store_orders',
      resource_id: orderId,
      details: {
        order_number: order.order_number,
        payment_method,
        payment_reference,
        total: order.total,
        commission_id: commissionId,
      },
    })

    if (auditError) {
      logger.warn('Failed to log order confirmation audit', { orderId, error: auditError.message })
    }

    logger.info('Order confirmed with payment', {
      orderId,
      tenantId: profile.tenant_id,
      confirmedBy: user.id,
      orderNumber: order.order_number,
      total: order.total,
      paymentMethod: payment_method,
      commissionId,
    })

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      commission: commissionId
        ? { id: commissionId, calculated: true }
        : { calculated: false, error: commissionError },
      message: 'Pedido confirmado exitosamente',
    })
  } catch (e) {
    logger.error('Error confirming order', {
      orderId,
      tenantId: profile.tenant_id,
      userId: user.id,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'Error al confirmar pedido' },
    })
  }
}
