import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * GET /api/dashboard/orders/[id]
 * Get a single order with all details
 */
export const GET = withApiAuthParams(
  async ({ params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const orderId = params.id

    try {
      // Get order with customer details
      const { data: order, error } = await supabase
        .from('store_orders')
        .select(
          `
          *,
          profiles:customer_id (
            id,
            full_name,
            email,
            phone
          ),
          cancelled_by_profile:cancelled_by (
            id,
            full_name
          ),
          store_coupons:coupon_id (
            id,
            code,
            name
          )
        `
        )
        .eq('id', orderId)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .single()

      if (error || !order) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { message: 'Pedido no encontrado' },
        })
      }

      // Get order items with product details
      const { data: items } = await supabase
        .from('store_order_items')
        .select(
          `
          *,
          store_products (
            id,
            name,
            sku,
            images
          )
        `
        )
        .eq('order_id', orderId)
        .order('created_at', { ascending: true })

      return NextResponse.json({
        order: {
          ...order,
          customer: order.profiles,
          coupon: order.store_coupons,
          cancelled_by_info: order.cancelled_by_profile,
        },
        items:
          items?.map((item) => ({
            ...item,
            product: item.store_products,
          })) || [],
      })
    } catch (e) {
      logger.error('Error fetching order', {
        tenantId: profile.tenant_id,
        orderId,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'] }
)

/**
 * PUT /api/dashboard/orders/[id]
 * Update order status or details
 */
export const PUT = withApiAuthParams(
  async ({ request, params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const orderId = params.id

    try {
      const body = await request.json()
      const { status, payment_status, tracking_number, internal_notes, cancellation_reason } = body

      // Check if order exists
      const { data: existing } = await supabase
        .from('store_orders')
        .select('id, status')
        .eq('id', orderId)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .single()

      if (!existing) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { resource: 'order' },
        })
      }

      const updateData: Record<string, unknown> = {}

      // Update status with timestamp tracking
      if (status !== undefined && status !== existing.status) {
        updateData.status = status

        switch (status) {
          case 'confirmed':
            updateData.confirmed_at = new Date().toISOString()
            break
          case 'shipped':
            updateData.shipped_at = new Date().toISOString()
            break
          case 'delivered':
            updateData.delivered_at = new Date().toISOString()
            break
          case 'cancelled':
            updateData.cancelled_at = new Date().toISOString()
            updateData.cancelled_by = user.id
            if (cancellation_reason) {
              updateData.cancellation_reason = cancellation_reason
            }
            break
        }
      }

      if (payment_status !== undefined) updateData.payment_status = payment_status
      if (tracking_number !== undefined) updateData.tracking_number = tracking_number
      if (internal_notes !== undefined) updateData.internal_notes = internal_notes

      const { data: order, error } = await supabase
        .from('store_orders')
        .update(updateData)
        .eq('id', orderId)
        .eq('tenant_id', profile.tenant_id)
        .select()
        .single()

      if (error) throw error

      // Calculate commission when payment is marked as paid
      if (payment_status === 'paid') {
        const { error: commissionError } = await supabase.rpc('calculate_order_commission', {
          p_order_id: orderId,
        })

        if (commissionError) {
          // Log but don't fail the order update
          logger.warn('Failed to calculate commission', {
            tenantId: profile.tenant_id,
            orderId,
            error: commissionError.message,
          })
        }
      }

      // Adjust commission when order is refunded
      if (payment_status === 'refunded' || status === 'refunded') {
        const { error: adjustError } = await supabase.rpc('adjust_commission_for_refund', {
          p_order_id: orderId,
          p_refund_amount: order.total,
          p_reason: cancellation_reason || 'Order refunded',
        })

        if (adjustError) {
          logger.warn('Failed to adjust commission for refund', {
            tenantId: profile.tenant_id,
            orderId,
            error: adjustError.message,
          })
        }
      }

      return NextResponse.json({ order })
    } catch (e) {
      logger.error('Error updating order', {
        tenantId: profile.tenant_id,
        orderId,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'] }
)

/**
 * DELETE /api/dashboard/orders/[id]
 * Soft delete an order (admin only)
 */
export const DELETE = withApiAuthParams(
  async ({ params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const orderId = params.id

    try {
      const { error } = await supabase
        .from('store_orders')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: user.id,
        })
        .eq('id', orderId)
        .eq('tenant_id', profile.tenant_id)

      if (error) throw error

      return NextResponse.json({ success: true })
    } catch (e) {
      logger.error('Error deleting order', {
        tenantId: profile.tenant_id,
        orderId,
        userId: user.id,
        error: e instanceof Error ? e.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['admin'], rateLimit: 'write' }
)
