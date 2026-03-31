import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmailWithRetry } from '@/lib/api/cron-external-calls'
import { logger } from '@/lib/logger'
import { checkCronAuth } from '@/lib/api/cron-auth'

export const dynamic = 'force-dynamic' // Prevent caching

/**
 * Stock Alerts Cron Job
 *
 * Processes the notification queue for stock restoration events
 * and sends back-in-stock emails to subscribed customers.
 */
export async function GET(request: NextRequest) {
  // SEC-006: Use timing-safe cron authentication
  const { authorized, errorResponse } = checkCronAuth(request)
  if (!authorized) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient('service_role')

  try {
    // 1. Get pending stock_restored notifications from queue
    const { data: notifications, error: fetchError } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('type', 'stock_restored')
      .eq('status', 'pending')
      .lt('attempts', 3) // Max 3 retries
      .limit(20) // Process in batches

    if (fetchError) {
      logger.error('Error fetching notification queue', {
        error: fetchError instanceof Error ? fetchError.message : String(fetchError),
      })
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!notifications || notifications.length === 0) {
      return NextResponse.json({ message: 'No pending stock alerts', count: 0 })
    }

    // 2. Process each notification
    const results = await Promise.allSettled(
      notifications.map(async (notification) => {
        const { product_id, tenant_id, new_quantity } = notification.payload

        // Mark as processing
        await supabase
          .from('notification_queue')
          .update({
            status: 'processing',
            last_attempt_at: new Date().toISOString(),
            attempts: notification.attempts + 1,
          })
          .eq('id', notification.id)

        // Get product details
        const { data: product, error: productError } = await supabase
          .from('store_products')
          .select('id, name, slug, base_price, image_url')
          .eq('id', product_id)
          .single()

        if (productError || !product) {
          throw new Error(`Product not found: ${product_id}`)
        }

        // Get tenant details for branding
        const { data: tenant } = await supabase
          .from('tenants')
          .select('name')
          .eq('id', tenant_id)
          .single()

        const clinicName = tenant?.name || 'Veterinaria'

        // Get pending alerts for this product (with safety limit)
        const { data: alerts, error: alertsError } = await supabase
          .from('store_stock_alerts')
          .select('id, email, user_id')
          .eq('product_id', product_id)
          .eq('notified', false)
          .limit(100) // Safety limit - max 100 emails per product per batch

        if (alertsError) {
          throw new Error(`Failed to fetch alerts: ${alertsError.message}`)
        }

        if (!alerts || alerts.length === 0) {
          // No subscribers, mark notification as completed
          await supabase
            .from('notification_queue')
            .update({ status: 'completed', processed_at: new Date().toISOString() })
            .eq('id', notification.id)
          return { notificationId: notification.id, emailsSent: 0 }
        }

        // Build product URL (assuming store page)
        const productUrl = `/${tenant_id}/store/products/${product.slug || product.id}`

        // Send email to each subscriber (with timeout/retry protection)
        const emailResults = await Promise.allSettled(
          alerts.map(async (alert) => {
            try {
              await sendEmailWithRetry({
                to: alert.email,
                subject: `¡${product.name} está disponible! - ${clinicName}`,
                html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #4f46e5; margin: 0;">¡Buenas noticias!</h1>
                <p style="color: #6b7280; font-size: 14px;">${clinicName}</p>
              </div>

              <p>Hola,</p>

              <p>Te notificamos que el producto que estabas esperando <strong>ya está disponible</strong>:</p>

              <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
                ${product.image_url ? `<img src="${product.image_url}" alt="${product.name}" style="width: 100%; max-width: 200px; height: auto; border-radius: 8px; margin-bottom: 15px;">` : ''}
                <h2 style="color: #111827; margin: 0 0 10px 0;">${product.name}</h2>
                <p style="font-size: 24px; font-weight: bold; color: #059669; margin: 0;">
                  Gs. ${product.base_price?.toLocaleString('es-PY') || 'Consultar'}
                </p>
                <p style="color: #6b7280; font-size: 14px; margin-top: 10px;">
                  Stock disponible: ${new_quantity} unidades
                </p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://vete.app'}${productUrl}"
                   style="display: inline-block; background-color: #4f46e5; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
                  Ver Producto
                </a>
              </div>

              <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                Recibiste este email porque te suscribiste a alertas de stock para este producto.<br>
                Si ya no deseas recibir estas notificaciones, ignora este mensaje.
              </p>
            </body>
            </html>
          `,
                text: `¡${product.name} está disponible en ${clinicName}! Precio: Gs. ${product.base_price?.toLocaleString('es-PY') || 'Consultar'}. Stock: ${new_quantity} unidades. Visita: ${process.env.NEXT_PUBLIC_APP_URL || 'https://vete.app'}${productUrl}`,
              })

              // Mark alert as notified only on successful send
              await supabase
                .from('store_stock_alerts')
                .update({
                  notified: true,
                  notified_at: new Date().toISOString(),
                })
                .eq('id', alert.id)

              logger.info('Stock alert email sent successfully', {
                alertId: alert.id,
                email: alert.email,
                productId: product.id,
              })

              return alert.email
            } catch (error) {
              // Log failure but don't crash - continue to next alert
              logger.error('Failed to send stock alert email after retries', {
                alertId: alert.id,
                email: alert.email,
                productId: product.id,
                error: error instanceof Error ? error.message : String(error),
              })
              throw error // Re-throw so Promise.allSettled catches it as rejected
            }
          })
        )

        const emailsSent = emailResults.filter((r) => r.status === 'fulfilled').length
        const emailsFailed = emailResults.filter((r) => r.status === 'rejected').length

        // Mark notification as completed
        await supabase
          .from('notification_queue')
          .update({
            status: emailsFailed > 0 ? 'completed' : 'completed',
            processed_at: new Date().toISOString(),
          })
          .eq('id', notification.id)

        return {
          notificationId: notification.id,
          productName: product.name,
          emailsSent,
          emailsFailed,
        }
      })
    )

    // 3. Summarize results
    const successful = results.filter((r) => r.status === 'fulfilled')
    const failed = results.filter((r) => r.status === 'rejected')

    // Mark failed notifications
    for (const result of failed) {
      const notification = notifications[results.indexOf(result)]
      if (notification) {
        await supabase
          .from('notification_queue')
          .update({
            status: notification.attempts >= 2 ? 'failed' : 'pending',
            error_message: result.status === 'rejected' ? String(result.reason) : null,
          })
          .eq('id', notification.id)
      }
    }

    const totalEmailsSent = successful.reduce((sum, r) => {
      if (r.status === 'fulfilled') {
        return sum + (r.value?.emailsSent || 0)
      }
      return sum
    }, 0)

    return NextResponse.json({
      success: true,
      message: `Processed ${notifications.length} stock notifications`,
      stats: {
        notificationsProcessed: notifications.length,
        successful: successful.length,
        failed: failed.length,
        totalEmailsSent,
      },
    })
  } catch (error) {
    logger.error('Stock alerts cron error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
