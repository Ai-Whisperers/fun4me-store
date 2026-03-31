import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { checkCronAuth } from '@/lib/api/cron-auth'
import { sendNotification } from '@/lib/notifications'

// SEC-010: Subscription frequency bounds for defensive validation
const SUBSCRIPTION_FREQUENCY = {
  MIN_DAYS: 7,
  MAX_DAYS: 180,
  DEFAULT_DAYS: 30,
} as const

// Use service role key for cron jobs to bypass RLS
// Required environment variables - app will not function without these
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * POST /api/cron/process-subscriptions
 * Process due subscriptions and create orders
 *
 * This should be called by a cron job (e.g., Vercel Cron, GitHub Actions)
 * Protected by CRON_SECRET header
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // SEC-006: Use timing-safe cron authentication
  const { authorized, errorResponse } = checkCronAuth(request)
  if (!authorized) {
    return errorResponse || NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const results = {
    processed: 0,
    failed: 0,
    skipped: 0,
    errors: [] as string[],
  }

  try {
    // Get all active subscriptions due today or earlier
    const today = new Date().toISOString().split('T')[0]

    const { data: dueSubscriptions, error: fetchError } = await supabase
      .from('store_subscriptions')
      .select(
        `
        id,
        tenant_id,
        customer_id,
        product_id,
        variant_id,
        quantity,
        frequency_days,
        subscribed_price,
        shipping_address,
        delivery_notes
      `
      )
      .eq('status', 'active')
      .lte('next_order_date', today)

    if (fetchError) throw fetchError

    if (!dueSubscriptions || dueSubscriptions.length === 0) {
      logger.info('No subscriptions due for processing')
      return NextResponse.json({
        success: true,
        message: 'No subscriptions to process',
        ...results,
      })
    }

    logger.info(`Processing ${dueSubscriptions.length} due subscriptions`)

    // PERF-002: Batch fetch all products in ONE query to avoid N+1
    const productIds = [...new Set(dueSubscriptions.map((s) => s.product_id))]

    const { data: products, error: productsError } = await supabase
      .from('store_products')
      .select(
        `
        id,
        tenant_id,
        name,
        base_price,
        is_active,
        store_inventory(stock_quantity)
      `
      )
      .in('id', productIds)

    if (productsError) {
      logger.error('Failed to batch fetch products', { error: productsError.message })
      throw productsError
    }

    // Create lookup map for O(1) access: key = "product_id:tenant_id"
    const productMap = new Map(products?.map((p) => [`${p.id}:${p.tenant_id}`, p]) ?? [])

    logger.info(`Fetched ${products?.length ?? 0} products for ${productIds.length} unique product IDs`)

    // Epic 3.6: Warn if batch product fetch returned fewer products than requested
    if ((products?.length ?? 0) < productIds.length) {
      const fetchedIds = new Set(products?.map((p) => p.id) ?? [])
      const missingIds = productIds.filter((id) => !fetchedIds.has(id))
      logger.warn('Batch product lookup missing products', {
        requested: productIds.length,
        fetched: products?.length ?? 0,
        missing: missingIds.length,
        missingProductIds: missingIds.slice(0, 10), // Log first 10 to avoid huge logs
      })
    }

    // Process each subscription
    for (const subscription of dueSubscriptions) {
      // Track stock state for rollback in catch block
      let stockResult: { success: boolean; reason?: string; available?: number } | null = null
      let stockRolledBack = false

      try {
        // PERF-002: Use pre-fetched product from batch query
        const product = productMap.get(`${subscription.product_id}:${subscription.tenant_id}`)

        if (!product) {
          results.failed++
          results.errors.push(`Subscription ${subscription.id}: Product not found`)

          // Log to subscription history
          await supabase.from('store_subscription_history').insert({
            subscription_id: subscription.id,
            event_type: 'order_failed',
            event_data: { reason: 'Product not found or inactive' },
          })

          continue
        }

        if (!product.is_active) {
          results.skipped++

          await supabase.from('store_subscription_history').insert({
            subscription_id: subscription.id,
            event_type: 'order_failed',
            event_data: { reason: 'Product is inactive' },
          })

          continue
        }

        // ATOMIC: Decrement stock FIRST with row-level locking
        // This prevents race conditions where two concurrent processes both see
        // sufficient stock and both decrement, causing overselling
        const { data: stockResultData, error: stockError } = await supabase.rpc(
          'decrement_stock_if_available',
          {
            p_product_id: subscription.product_id,
            p_quantity: subscription.quantity,
          }
        )

        // Assign to outer variable for catch block access
        stockResult = stockResultData

        if (stockError) {
          results.failed++
          results.errors.push(`Subscription ${subscription.id}: Stock decrement failed - ${stockError.message}`)

          await supabase.from('store_subscription_history').insert({
            subscription_id: subscription.id,
            event_type: 'order_failed',
            event_data: { reason: 'Stock decrement error', error: stockError.message },
          })

          continue
        }

        // Check if stock decrement succeeded
        if (!stockResult?.success) {
          results.skipped++

          const reason = stockResult?.reason || 'unknown'
          const available = stockResult?.available ?? 0

          await supabase.from('store_subscription_history').insert({
            subscription_id: subscription.id,
            event_type: 'order_failed',
            event_data: {
              reason: reason === 'insufficient_stock' ? 'Insufficient stock' : reason,
              required: subscription.quantity,
              available,
            },
          })

          // Send notification to customer about stock issue
          sendNotification({
            type: 'subscription_stock_issue',
            recipientId: subscription.customer_id,
            recipientType: 'owner',
            tenantId: subscription.tenant_id,
            title: 'Problema con tu suscripción',
            message: `No pudimos procesar tu suscripción: ${product.name} no tiene stock suficiente.`,
            channels: ['email', 'in_app'],
            data: {
              productName: product.name,
              subscriptionId: subscription.id,
              requested: subscription.quantity,
              available,
            },
          }).catch((err: unknown) => {
            logger.warn('Failed to send subscription stock notification', {
              subscriptionId: subscription.id,
              error: err instanceof Error ? err.message : 'Unknown',
            })
          })

          logger.warn(`Subscription ${subscription.id} skipped: ${reason}`, {
            available,
            requested: subscription.quantity,
          })

          continue
        }

        // Stock successfully reserved - now create the order
        // If order creation fails, we MUST roll back the stock (stockRolledBack is declared above)

        // Get current price (might have changed since subscription)
        const currentPrice = product.base_price

        // Create order
        const orderNumber = `SUB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
        const subtotal = currentPrice * subscription.quantity
        const shippingCost = subtotal >= 150000 ? 0 : 15000
        const taxRate = 10
        const taxAmount = Math.round((subtotal * taxRate) / 100)
        const total = subtotal + shippingCost + taxAmount

        const { data: order, error: orderError } = await supabase
          .from('store_orders')
          .insert({
            tenant_id: subscription.tenant_id,
            user_id: subscription.customer_id,
            order_number: orderNumber,
            status: 'pending',
            subtotal,
            discount_amount: 0,
            shipping_cost: shippingCost,
            tax_rate: taxRate,
            tax_amount: taxAmount,
            total,
            shipping_address: subscription.shipping_address,
            shipping_method: 'standard',
            payment_method: 'subscription',
            notes: `Pedido automático de suscripción. ${subscription.delivery_notes || ''}`.trim(),
          })
          .select('id')
          .single()

        if (orderError || !order) {
          results.failed++
          results.errors.push(`Subscription ${subscription.id}: Failed to create order`)

          // ROLLBACK: Restore the stock we already decremented
          await supabase.rpc('increment_stock', {
            p_product_id: subscription.product_id,
            p_quantity: subscription.quantity,
          })
          stockRolledBack = true

          await supabase.from('store_subscription_history').insert({
            subscription_id: subscription.id,
            event_type: 'order_failed',
            event_data: { reason: 'Order creation failed', error: orderError?.message, stock_rolled_back: true },
          })

          continue
        }

        // Create order items
        const { error: itemError } = await supabase.from('store_order_items').insert({
          order_id: order.id,
          tenant_id: subscription.tenant_id,
          product_id: subscription.product_id,
          variant_id: subscription.variant_id,
          product_name: product.name,
          quantity: subscription.quantity,
          unit_price: currentPrice,
          line_total: subtotal,
        })

        if (itemError) {
          results.failed++
          results.errors.push(`Subscription ${subscription.id}: Failed to create order items`)

          // ROLLBACK: Restore the stock we already decremented
          await supabase.rpc('increment_stock', {
            p_product_id: subscription.product_id,
            p_quantity: subscription.quantity,
          })
          stockRolledBack = true

          // Also try to delete the orphan order
          await supabase.from('store_orders').delete().eq('id', order.id)

          continue
        }

        // Stock was already decremented atomically above - no need to decrement again

        // SEC-010: Calculate next order date with bounds validation
        // Clamp frequency_days to valid range to handle legacy/invalid data
        const rawFrequency = subscription.frequency_days ?? SUBSCRIPTION_FREQUENCY.DEFAULT_DAYS
        const frequencyDays = Math.min(
          Math.max(rawFrequency, SUBSCRIPTION_FREQUENCY.MIN_DAYS),
          SUBSCRIPTION_FREQUENCY.MAX_DAYS
        )

        // Log warning if frequency was corrected
        if (frequencyDays !== rawFrequency) {
          logger.warn(`Subscription ${subscription.id}: frequency_days corrected from ${rawFrequency} to ${frequencyDays}`)
        }

        const nextOrderDate = new Date()
        nextOrderDate.setDate(nextOrderDate.getDate() + frequencyDays)

        // Update subscription
        const updateData: Record<string, unknown> = {
          last_order_date: today,
          last_order_id: order.id,
          next_order_date: nextOrderDate.toISOString().split('T')[0],
        }

        // Update subscribed price if it changed
        if (currentPrice !== subscription.subscribed_price) {
          updateData.subscribed_price = currentPrice
        }

        await supabase.from('store_subscriptions').update(updateData).eq('id', subscription.id)

        // Log success
        await supabase.from('store_subscription_history').insert({
          subscription_id: subscription.id,
          event_type: 'order_created',
          event_data: {
            order_id: order.id,
            order_number: orderNumber,
            total,
            next_order_date: nextOrderDate.toISOString().split('T')[0],
          },
        })

        results.processed++

        logger.info(`Subscription ${subscription.id} processed successfully`, {
          orderId: order.id,
          orderNumber,
          total,
        })

        // Send order confirmation email to customer
        try {
          await sendNotification({
            type: 'order_confirmation',
            recipientId: subscription.customer_id,
            recipientType: 'owner',
            tenantId: subscription.tenant_id,
            title: '¡Pedido de suscripción confirmado!',
            message: `Tu pedido automático ${orderNumber} ha sido procesado por ₲ ${total.toLocaleString('es-PY')}.`,
            channels: ['in_app', 'email'],
            data: {
              orderNumber,
              total,
              productName: product.name,
              quantity: subscription.quantity,
              nextRenewal: nextOrderDate.toISOString().split('T')[0],
            },
            actionUrl: `/${subscription.tenant_id}/portal/orders`,
          })
        } catch (notifError) {
          // Don't fail the subscription processing if notification fails
          logger.warn(`Failed to send subscription order notification for ${subscription.id}`, {
            error: notifError instanceof Error ? notifError.message : 'Unknown',
          })
        }
      } catch (e) {
        results.failed++
        const message = e instanceof Error ? e.message : 'Unknown error'
        results.errors.push(`Subscription ${subscription.id}: ${message}`)

        // If stock was decremented but not rolled back, roll it back now
        // This handles exceptions thrown after stock decrement but before completion
        if (stockResult?.success && !stockRolledBack) {
          try {
            await supabase.rpc('increment_stock', {
              p_product_id: subscription.product_id,
              p_quantity: subscription.quantity,
            })
            logger.warn(`Rolled back stock for subscription ${subscription.id} after error`)
          } catch (rollbackError) {
            logger.error(`Failed to roll back stock for subscription ${subscription.id}`, {
              error: rollbackError instanceof Error ? rollbackError.message : 'Unknown',
            })
          }
        }

        logger.error(`Error processing subscription ${subscription.id}`, {
          error: message,
        })
      }
    }

    logger.info('Subscription processing complete', results)

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} subscriptions`,
      ...results,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    logger.error('Fatal error in subscription processing', { error: message })

    return NextResponse.json(
      {
        success: false,
        error: message,
        ...results,
      },
      { status: 500 }
    )
  }
}
