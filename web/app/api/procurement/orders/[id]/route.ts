import { NextResponse } from 'next/server'
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * GET /api/procurement/orders/[id]
 * Get a single purchase order with all related data
 */
export const GET = withApiAuthParams(
  async ({ params, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const { id } = params

    // Fetch order with all related data
    const { data: order, error } = await supabase
      .from('purchase_orders')
      .select(
        `
        *,
        suppliers(id, name, contact_name, email, phone),
        purchase_order_items(
          id,
          catalog_product_id,
          quantity,
          unit_cost,
          line_total,
          received_quantity,
          received_at,
          notes,
          store_products(id, name, sku, base_price)
        ),
        created_by_profile:profiles!purchase_orders_created_by_fkey(id, full_name, email),
        received_by_profile:profiles!purchase_orders_received_by_fkey(id, full_name)
      `
      )
      .eq('id', id)
      .single()

    if (error) {
      logger.error('Error fetching purchase order', {
        tenantId: profile.tenant_id,
        orderId: id,
        error: error.message,
      })
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'purchase_order' },
      })
    }

    // Verify order belongs to staff's tenant
    if (order.tenant_id !== profile.tenant_id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }

    return NextResponse.json(order)
  },
  { roles: ['vet', 'admin'] }
)

/**
 * PATCH /api/procurement/orders/[id]
 * Update order status or receive items
 * Body: {
 *   status?: 'draft' | 'submitted' | 'confirmed' | 'shipped' | 'received' | 'cancelled',
 *   received_items?: [{ item_id: string, received_quantity: number }],
 *   notes?: string
 * }
 */
export const PATCH = withApiAuthParams(
  async ({ request, params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const { id } = params

    // Parse body
    let body
    try {
      body = await request.json()
    } catch (_error: unknown) {
      return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
    }

    const { status, received_items, notes } = body

    // Verify order exists and belongs to tenant
    const { data: existing } = await supabase
      .from('purchase_orders')
      .select('id, tenant_id, status')
      .eq('id', id)
      .single()

    if (!existing) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'purchase_order' },
      })
    }

    if (existing.tenant_id !== profile.tenant_id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }

    // Build update object
    const updates: Record<string, unknown> = {}

    if (status) {
      // Validate status transition
      const validTransitions: Record<string, string[]> = {
        draft: ['submitted', 'cancelled'],
        submitted: ['confirmed', 'cancelled'],
        confirmed: ['shipped', 'cancelled'],
        shipped: ['received', 'cancelled'],
        received: [], // Terminal state
        cancelled: [], // Terminal state
      }

      if (!validTransitions[existing.status]?.includes(status)) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          field_errors: {
            status: [`No se puede cambiar de ${existing.status} a ${status}`],
          },
        })
      }

      updates.status = status

      // Set status timestamps
      const now = new Date().toISOString()
      switch (status) {
        case 'submitted':
          updates.submitted_at = now
          break
        case 'confirmed':
          updates.confirmed_at = now
          break
        case 'shipped':
          updates.shipped_at = now
          break
        case 'received':
          updates.received_at = now
          updates.received_by = user.id
          break
        case 'cancelled':
          updates.cancelled_at = now
          updates.cancelled_by = user.id
          break
      }
    }

    if (notes !== undefined) {
      updates.notes = notes
    }

    // Handle received items
    if (received_items && Array.isArray(received_items) && received_items.length > 0) {
      const now = new Date().toISOString()

      for (const item of received_items) {
        if (!item.item_id || item.received_quantity === undefined) {
          continue
        }

        // Get the item details first (need unit_cost and catalog_product_id)
        const { data: orderItem } = await supabase
          .from('purchase_order_items')
          .select('catalog_product_id, unit_cost, received_quantity')
          .eq('id', item.item_id)
          .eq('purchase_order_id', id)
          .single()

        if (!orderItem) {
          logger.error('Order item not found', {
            tenantId: profile.tenant_id,
            orderId: id,
            itemId: item.item_id,
          })
          continue
        }

        // Calculate the newly received quantity (difference from previous)
        const previouslyReceived = orderItem.received_quantity || 0
        const newlyReceived = item.received_quantity - previouslyReceived

        const { error: itemError } = await supabase
          .from('purchase_order_items')
          .update({
            received_quantity: item.received_quantity,
            received_at: item.received_quantity > 0 ? now : null,
          })
          .eq('id', item.item_id)
          .eq('purchase_order_id', id)

        if (itemError) {
          logger.error('Error updating item received quantity', {
            tenantId: profile.tenant_id,
            orderId: id,
            itemId: item.item_id,
            error: itemError.message,
          })
        }

        // If status is 'received' and there's newly received quantity, update inventory
        if (status === 'received' && newlyReceived > 0) {
          const productId = orderItem.catalog_product_id
          const unitCost = orderItem.unit_cost

          // Get current inventory for WAC calculation
          const { data: currentInventory } = await supabase
            .from('store_inventory')
            .select('stock_quantity, weighted_average_cost')
            .eq('product_id', productId)
            .eq('tenant_id', profile.tenant_id)
            .single()

          const currentStock = currentInventory?.stock_quantity || 0
          const currentWac = currentInventory?.weighted_average_cost || 0

          // Calculate new WAC (Weighted Average Cost)
          // WAC = (Old Stock × Old WAC + New Qty × New Cost) / (Old Stock + New Qty)
          const totalCurrentValue = currentStock * currentWac
          const newValue = newlyReceived * unitCost
          const newTotalStock = currentStock + newlyReceived
          const newWac = newTotalStock > 0 ? (totalCurrentValue + newValue) / newTotalStock : unitCost

          // Upsert inventory record
          const { error: inventoryError } = await supabase
            .from('store_inventory')
            .upsert(
              {
                product_id: productId,
                tenant_id: profile.tenant_id,
                stock_quantity: newTotalStock,
                weighted_average_cost: Math.round(newWac * 100) / 100, // Round to 2 decimal places
              },
              {
                onConflict: 'product_id,tenant_id',
              }
            )

          if (inventoryError) {
            logger.error('Error updating inventory on receive', {
              tenantId: profile.tenant_id,
              orderId: id,
              productId,
              error: inventoryError.message,
            })
          } else {
            // Create inventory transaction record
            const { error: transactionError } = await supabase
              .from('store_inventory_transactions')
              .insert({
                tenant_id: profile.tenant_id,
                product_id: productId,
                type: 'purchase',
                quantity: newlyReceived,
                unit_cost: unitCost,
                notes: `Recepción de orden de compra ${existing.id}`,
                reference_type: 'purchase_order',
                reference_id: id,
                performed_by: user.id,
              })

            if (transactionError) {
              logger.error('Error creating inventory transaction', {
                tenantId: profile.tenant_id,
                orderId: id,
                productId,
                error: transactionError.message,
              })
            }

            logger.info('Inventory updated from purchase order', {
              tenantId: profile.tenant_id,
              orderId: id,
              productId,
              previousStock: currentStock,
              newStock: newTotalStock,
              previousWac: currentWac,
              newWac,
              quantityReceived: newlyReceived,
            })
          }
        }
      }
    }

    // Only update if there are changes
    if (Object.keys(updates).length > 0) {
      const { data: updatedOrder, error: updateError } = await supabase
        .from('purchase_orders')
        .update(updates)
        .eq('id', id)
        .select(
          `
          *,
          suppliers(id, name),
          purchase_order_items(
            id,
            catalog_product_id,
            quantity,
            unit_cost,
            line_total,
            received_quantity,
            store_products(id, name, sku)
          )
        `
        )
        .single()

      if (updateError) {
        logger.error('Error updating purchase order', {
          tenantId: profile.tenant_id,
          orderId: id,
          error: updateError.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return NextResponse.json(updatedOrder)
    }

    // Fetch and return current order if only items were updated
    const { data: order } = await supabase
      .from('purchase_orders')
      .select(
        `
        *,
        suppliers(id, name),
        purchase_order_items(
          id,
          catalog_product_id,
          quantity,
          unit_cost,
          line_total,
          received_quantity,
          store_products(id, name, sku)
        )
      `
      )
      .eq('id', id)
      .single()

    return NextResponse.json(order)
  },
  { roles: ['admin'], rateLimit: 'write' }
)

/**
 * DELETE /api/procurement/orders/[id]
 * Delete a purchase order (only draft orders can be deleted)
 */
export const DELETE = withApiAuthParams(
  async ({ params, user, profile, supabase }: ApiHandlerContextWithParams<{ id: string }>) => {
    const { id } = params

    // Verify order exists and belongs to tenant
    const { data: existing } = await supabase
      .from('purchase_orders')
      .select('id, tenant_id, status')
      .eq('id', id)
      .single()

    if (!existing) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'purchase_order' },
      })
    }

    if (existing.tenant_id !== profile.tenant_id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
    }

    // Only draft orders can be deleted
    if (existing.status !== 'draft') {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        field_errors: {
          status: ['Solo se pueden eliminar órdenes en estado borrador'],
        },
      })
    }

    // Delete order (items will cascade)
    const { error } = await supabase.from('purchase_orders').delete().eq('id', id)

    if (error) {
      logger.error('Error deleting purchase order', {
        tenantId: profile.tenant_id,
        userId: user.id,
        orderId: id,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return new NextResponse(null, { status: 204 })
  },
  { roles: ['admin'], rateLimit: 'write' }
)
