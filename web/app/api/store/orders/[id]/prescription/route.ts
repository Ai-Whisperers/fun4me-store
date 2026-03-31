import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { apiError, validationError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

const approvalSchema = z
  .object({
    action: z.enum(['approve', 'reject']),
    notes: z.string().optional(),
  })
  .refine((data) => data.action !== 'reject' || (data.notes && data.notes.trim().length > 0), {
    message: 'Las notas son requeridas para rechazar una receta',
    path: ['notes'],
  })

/**
 * GET /api/store/orders/[id]/prescription
 * Get prescription details for an order (staff only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: orderId } = await params
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return apiError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED)
  }

  // Get user's profile and verify staff role
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, { details: { resource: 'profile' } })
  }

  if (profile.role !== 'vet' && profile.role !== 'admin') {
    return apiError('INSUFFICIENT_ROLE', HTTP_STATUS.FORBIDDEN, {
      details: { required: ['vet', 'admin'], current: profile.role },
    })
  }

  // Get order with prescription details
  const { data: order, error: orderError } = await supabase
    .from('store_orders')
    .select(
      `
      id,
      invoice_number,
      status,
      requires_prescription_review,
      prescription_file_url,
      prescription_reviewed_by,
      prescription_reviewed_at,
      prescription_notes,
      prescription_rejection_reason,
      created_at,
      customer:profiles!store_orders_customer_id_fkey(id, full_name, email, phone),
      items:store_order_items(
        id,
        product_id,
        quantity,
        unit_price,
        requires_prescription,
        prescription_file_url,
        product:store_products(id, name, image_url, is_prescription_required)
      )
    `
    )
    .eq('id', orderId)
    .eq('tenant_id', profile.tenant_id)
    .single()

  if (orderError || !order) {
    logger.warn('Pedido no encontrado para revisión de receta', {
      orderId,
      tenantId: profile.tenant_id,
      userId: user.id,
    })
    return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, { details: { resource: 'order' } })
  }

  // Get reviewer info if reviewed
  let reviewer = null
  if (order.prescription_reviewed_by) {
    const { data: reviewerData } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', order.prescription_reviewed_by)
      .single()
    reviewer = reviewerData
  }

  return NextResponse.json({
    order,
    reviewer,
  })
}

/**
 * PUT /api/store/orders/[id]/prescription
 * Approve or reject prescription order (staff only)
 *
 * Request body:
 * {
 *   action: 'approve' | 'reject';
 *   notes?: string;  // Required for rejection
 * }
 *
 * Response:
 * {
 *   success: true;
 *   order: { id, status, prescription_reviewed_at, ... };
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
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

  // 2. Get user's profile and verify staff role (vet/admin)
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, { details: { resource: 'profile' } })
  }

  if (profile.role !== 'vet' && profile.role !== 'admin') {
    logger.warn('Usuario sin permisos intentó revisar receta', {
      userId: user.id,
      role: profile.role,
      orderId,
    })
    return apiError('INSUFFICIENT_ROLE', HTTP_STATUS.FORBIDDEN, {
      details: { required: ['vet', 'admin'], current: profile.role },
    })
  }

  try {
    // Parse and validate request body
    const body = await request.json()
    const validation = approvalSchema.safeParse(body)

    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors
      return validationError(
        Object.fromEntries(Object.entries(fieldErrors).map(([key, value]) => [key, value || []]))
      )
    }

    const { action, notes } = validation.data

    // 3. Get order and verify it belongs to user's tenant
    const { data: order, error: orderError } = await supabase
      .from('store_orders')
      .select('id, status, requires_prescription_review, customer_id, order_number')
      .eq('id', orderId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (orderError || !order) {
      logger.warn('Pedido no encontrado para revisión de receta', {
        orderId,
        tenantId: profile.tenant_id,
        userId: user.id,
      })
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'order', message: 'Pedido no encontrado' },
      })
    }

    // 4. Verify order has requires_prescription_review = true
    if (!order.requires_prescription_review) {
      logger.warn('Intento de revisar pedido sin requisito de receta', {
        orderId,
        tenantId: profile.tenant_id,
        userId: user.id,
      })
      return apiError('CONFLICT', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'Este pedido no requiere revisión de receta' },
      })
    }

    // Verify order is in the correct status for review
    if (order.status !== 'pending_prescription') {
      logger.warn('Intento de revisar pedido en estado incorrecto', {
        orderId,
        currentStatus: order.status,
        tenantId: profile.tenant_id,
      })
      return apiError('CONFLICT', HTTP_STATUS.BAD_REQUEST, {
        details: {
          message: 'Este pedido no está pendiente de revisión de receta',
          currentStatus: order.status,
        },
      })
    }

    // 5. Prepare update based on action
    const now = new Date().toISOString()
    const updateData: Record<string, unknown> = {
      prescription_reviewed_by: user.id,
      prescription_reviewed_at: now,
      prescription_notes: notes || null,
    }

    if (action === 'approve') {
      updateData.status = 'confirmed'
    } else {
      // Reject - status is 'prescription_rejected', notes are required (validated by schema)
      updateData.status = 'prescription_rejected'
      updateData.prescription_rejection_reason = notes
    }

    // Update order
    const { data: updatedOrder, error: updateError } = await supabase
      .from('store_orders')
      .update(updateData)
      .eq('id', orderId)
      .select(
        'id, order_number, status, prescription_reviewed_by, prescription_reviewed_at, prescription_notes, prescription_rejection_reason'
      )
      .single()

    if (updateError) {
      logger.error('Error al actualizar pedido', {
        orderId,
        tenantId: profile.tenant_id,
        userId: user.id,
        error: updateError.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    // Create notification for customer
    const notificationMessage =
      action === 'approve'
        ? 'Tu pedido ha sido aprobado y está siendo procesado.'
        : `Tu pedido ha sido rechazado. Motivo: ${notes}`

    const { error: notifError } = await supabase.from('notifications').insert({
      user_id: order.customer_id,
      title: action === 'approve' ? 'Pedido Aprobado' : 'Pedido Rechazado',
      message: notificationMessage,
      type: 'order_status',
      data: {
        order_id: orderId,
        action,
      },
    })

    if (notifError) {
      logger.warn('Error al crear notificación de revisión de receta', {
        orderId,
        customerId: order.customer_id,
        error: notifError.message,
      })
      // Don't fail the request, notification is secondary
    }

    // 6. Log action in audit_logs table
    const { error: auditError } = await supabase.from('audit_logs').insert({
      tenant_id: profile.tenant_id,
      user_id: user.id,
      action: action === 'approve' ? 'prescription_approved' : 'prescription_rejected',
      resource: 'store_orders',
      resource_id: orderId,
      details: {
        order_number: order.order_number,
        notes,
        reviewer_name: profile.full_name,
        previous_status: order.status,
        new_status: updateData.status,
      },
    })

    if (auditError) {
      logger.error('Error al registrar auditoría de revisión de receta', {
        orderId,
        tenantId: profile.tenant_id,
        error: auditError.message,
      })
      // Don't fail the request, audit logging is secondary
    }

    logger.info('Receta revisada exitosamente', {
      orderId,
      action,
      tenantId: profile.tenant_id,
      reviewerId: user.id,
      reviewerName: profile.full_name,
    })

    // 7. Return updated order
    return NextResponse.json({
      success: true,
      order: updatedOrder,
    })
  } catch (error) {
    logger.error('Error interno en revisión de receta', {
      orderId,
      tenantId: profile.tenant_id,
      userId: user.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
}
