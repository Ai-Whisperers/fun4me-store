import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// BUG-013: API endpoint for customers to cancel pending orders

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Get user's tenant
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
  }

  // Get the order and verify ownership
  const { data: order, error: orderError } = await supabase
    .from('store_orders')
    .select('id, status, customer_id, tenant_id')
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  }

  // Verify ownership - user must own the order
  if (order.customer_id !== user.id) {
    return NextResponse.json({ error: 'No autorizado para este pedido' }, { status: 403 })
  }

  // Verify tenant isolation
  if (order.tenant_id !== profile.tenant_id) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  }

  // Only pending orders can be cancelled by customer
  if (order.status !== 'pending') {
    return NextResponse.json(
      { error: 'Solo pedidos pendientes pueden ser cancelados' },
      { status: 400 }
    )
  }

  // Fetch order items before cancellation to restore inventory
  const { data: orderItems, error: itemsError } = await supabase
    .from('store_order_items')
    .select('product_id, quantity, item_type')
    .eq('order_id', orderId)

  if (itemsError) {
    logger.error('Error fetching order items for cancellation', {
      orderId,
      error: itemsError.message,
    })
    return NextResponse.json({ error: 'Error al cargar items del pedido' }, { status: 500 })
  }

  // Begin transaction-like operations
  try {
    // 1. Update order status
    const { error: updateError } = await supabase
      .from('store_orders')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: 'Cancelado por el cliente',
      })
      .eq('id', orderId)

    if (updateError) {
      throw new Error(`Order update failed: ${updateError.message}`)
    }

    // 2. Restore inventory stock for each product item
    for (const item of orderItems || []) {
      if (item.item_type === 'product' && item.product_id) {
        // Try RPC function first (atomic operation)
        const { error: stockRpcError } = await supabase.rpc('increase_inventory_stock', {
          p_product_id: item.product_id,
          p_tenant_id: profile.tenant_id,
          p_quantity: item.quantity,
        })

        if (stockRpcError) {
          if (stockRpcError.code === '42883') {
            // Function doesn't exist - fallback to read-then-update
            const { data: currentStock } = await supabase
              .from('store_inventory')
              .select('stock_quantity')
              .eq('product_id', item.product_id)
              .eq('tenant_id', profile.tenant_id)
              .single()

            if (currentStock) {
              const { error: stockError } = await supabase
                .from('store_inventory')
                .update({
                  stock_quantity: currentStock.stock_quantity + item.quantity,
                  updated_at: new Date().toISOString(),
                })
                .eq('product_id', item.product_id)
                .eq('tenant_id', profile.tenant_id)

              if (stockError) {
                logger.error('Failed to restore inventory manually', {
                  orderId,
                  productId: item.product_id,
                  quantity: item.quantity,
                  error: stockError.message,
                })
              }
            }
          } else {
            logger.error('Failed to restore inventory via RPC', {
              orderId,
              productId: item.product_id,
              quantity: item.quantity,
              error: stockRpcError.message,
            })
          }
        }
      }
    }

    // 3. Send notification to clinic staff (basic implementation)
    // Note: In a full system, this would use a proper notification service
    logger.info('Order cancellation notification needed', {
      orderId,
      tenantId: profile.tenant_id,
      customerId: user.id,
      message: `Pedido ${orderId} ha sido cancelado por el cliente`,
    })

  } catch (error) {
    logger.error('Error during order cancellation', {
      orderId,
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Error al cancelar el pedido' }, { status: 500 })
  }

  logger.info('Order cancelled by customer', {
    orderId,
    userId: user.id,
    tenantId: profile.tenant_id,
  })

  return NextResponse.json({ success: true })
}
