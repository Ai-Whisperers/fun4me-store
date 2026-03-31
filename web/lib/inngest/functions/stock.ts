/**
 * Inngest Stock/Inventory Functions
 *
 * Background jobs for stock operations:
 * - Release expired cart reservations
 * - Send customer stock alerts (back in stock)
 * - Send staff low stock alerts
 * - Send product expiry alerts
 */

import { inngest } from '../client'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { sendEmailWithRetry } from '@/lib/api/cron-external-calls'

// =============================================================================
// RELEASE EXPIRED RESERVATIONS
// =============================================================================

export const releaseReservations = inngest.createFunction(
  {
    id: 'stock-release-reservations',
    name: 'Release Expired Cart Reservations',
    retries: 2,
  },
  { cron: '*/5 * * * *' }, // Every 5 minutes
  async ({ step }) => {
    // Default: 30 minute reservation timeout
    const timeoutMinutes = 30

    const result = await step.run('release-reservations', async () => {
      const supabase = await createClient('service_role')

      // Call RPC to release expired reservations
      const { data, error } = await supabase.rpc('release_expired_reservations', {
        timeout_minutes: timeoutMinutes,
      })

      if (error) {
        throw new Error(`RPC error: ${error.message}`)
      }

      return { released: data || 0 }
    })

    if (result.released > 0) {
      logger.info('Released expired reservations', result)
    }

    return { success: true, ...result }
  }
)

// =============================================================================
// CUSTOMER STOCK ALERTS (BACK IN STOCK)
// =============================================================================

export const customerStockAlerts = inngest.createFunction(
  {
    id: 'stock-customer-alerts',
    name: 'Send Customer Stock Alerts',
    retries: 2,
    concurrency: { limit: 1 },
  },
  { cron: '*/30 * * * *' }, // Every 30 minutes
  async ({ step }) => {
    // Default: process 20 notifications per batch
    const batchSize = 20

    // Step 1: Get pending notifications
    const notifications = await step.run('fetch-notifications', async () => {
      const supabase = await createClient('service_role')

      const { data, error } = await supabase
        .from('notification_queue')
        .select('*')
        .eq('type', 'stock_restored')
        .eq('status', 'pending')
        .lt('attempts', 3)
        .limit(batchSize)

      if (error) {
        throw new Error(`Query error: ${error.message}`)
      }

      return data || []
    })

    if (notifications.length === 0) {
      return { success: true, message: 'No pending stock alerts', processed: 0 }
    }

    let totalEmailsSent = 0
    let successful = 0
    let failed = 0

    // Step 2: Process each notification
    for (const notification of notifications) {
      const result = await step.run(`process-notification-${notification.id}`, async () => {
        return await processStockNotification(notification)
      })

      if (result.success) {
        successful++
        totalEmailsSent += result.emailsSent
      } else {
        failed++
      }
    }

    logger.info('Customer stock alerts processed', {
      notifications: notifications.length,
      successful,
      failed,
      totalEmailsSent,
    })

    return {
      success: failed === 0,
      message: `Processed ${notifications.length} stock notifications`,
      stats: { successful, failed, totalEmailsSent },
    }
  }
)

async function processStockNotification(notification: {
  id: string
  payload: { product_id: string; tenant_id: string; new_quantity: number }
  attempts: number
}): Promise<{ success: boolean; emailsSent: number }> {
  const supabase = await createClient('service_role')
  const { product_id, tenant_id, new_quantity } = notification.payload

  try {
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

    // Get tenant name
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenant_id)
      .single()

    const clinicName = tenant?.name || 'Veterinaria'

    // Get pending alerts for this product
    const { data: alerts, error: alertsError } = await supabase
      .from('store_stock_alerts')
      .select('id, email, user_id')
      .eq('product_id', product_id)
      .eq('notified', false)
      .limit(100)

    if (alertsError) {
      throw new Error(`Failed to fetch alerts: ${alertsError.message}`)
    }

    if (!alerts || alerts.length === 0) {
      await supabase
        .from('notification_queue')
        .update({ status: 'completed', processed_at: new Date().toISOString() })
        .eq('id', notification.id)
      return { success: true, emailsSent: 0 }
    }

    const productUrl = `/${tenant_id}/store/products/${product.slug || product.id}`
    let emailsSent = 0

    // Send email to each subscriber
    for (const alert of alerts) {
      try {
        await sendEmailWithRetry({
          to: alert.email,
          subject: `¡${product.name} está disponible! - ${clinicName}`,
          html: buildStockAlertEmail(product, clinicName, productUrl, new_quantity),
          text: `¡${product.name} está disponible en ${clinicName}! Precio: Gs. ${product.base_price?.toLocaleString('es-PY') || 'Consultar'}. Stock: ${new_quantity} unidades.`,
        })

        await supabase
          .from('store_stock_alerts')
          .update({
            notified: true,
            notified_at: new Date().toISOString(),
          })
          .eq('id', alert.id)

        emailsSent++
      } catch (emailError: unknown) {
        logger.error('Failed to send stock alert email', {
          alertId: alert.id,
          email: alert.email,
          error: emailError instanceof Error ? emailError.message : 'Unknown error',
        })
      }
    }

    await supabase
      .from('notification_queue')
      .update({ status: 'completed', processed_at: new Date().toISOString() })
      .eq('id', notification.id)

    return { success: true, emailsSent }
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : 'Unknown error'

    await supabase
      .from('notification_queue')
      .update({
        status: notification.attempts >= 2 ? 'failed' : 'pending',
        error_message: errorMsg,
      })
      .eq('id', notification.id)

    return { success: false, emailsSent: 0 }
  }
}

function buildStockAlertEmail(
  product: { name: string; image_url: string | null; base_price: number | null },
  clinicName: string,
  productUrl: string,
  newQuantity: number
): string {
  return `
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
          Stock disponible: ${newQuantity} unidades
        </p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://vete.app'}${productUrl}"
           style="display: inline-block; background-color: #4f46e5; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
          Ver Producto
        </a>
      </div>

      <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
        Recibiste este email porque te suscribiste a alertas de stock para este producto.
      </p>
    </body>
    </html>
  `
}

// =============================================================================
// STAFF LOW STOCK ALERTS
// =============================================================================

export const staffStockAlerts = inngest.createFunction(
  {
    id: 'stock-staff-alerts',
    name: 'Send Staff Low Stock Alerts',
    retries: 2,
  },
  { cron: '0 8 * * *' }, // Daily at 08:00 UTC
  async ({ step }) => {
    // Default: alert when stock is below 20% of reorder point
    const thresholdPercent = 20

    const result = await step.run('send-staff-alerts', async () => {
      const supabase = await createClient('service_role')

      // Get products below reorder point
      const { data: lowStockProducts, error } = await supabase
        .from('store_inventory')
        .select(`
          product_id,
          stock_quantity,
          reorder_point,
          store_products(id, name, sku, tenant_id)
        `)
        .lt('stock_quantity', supabase.rpc('get_reorder_point_field'))
        .limit(200)

      if (error) {
        throw new Error(`Query error: ${error.message}`)
      }

      if (!lowStockProducts || lowStockProducts.length === 0) {
        return { alertsSent: 0, productsChecked: 0 }
      }

      // Group by tenant
      const byTenant = new Map<string, typeof lowStockProducts>()
      for (const product of lowStockProducts) {
        const storeProduct = (product.store_products as { tenant_id: string }[] | null)?.[0]
        const tenantId = storeProduct?.tenant_id
        if (tenantId) {
          if (!byTenant.has(tenantId)) {
            byTenant.set(tenantId, [])
          }
          const tenantProducts = byTenant.get(tenantId)
          if (tenantProducts) {
            tenantProducts.push(product)
          }
        }
      }

      let alertsSent = 0

      for (const [tenantId, products] of byTenant) {
        // Get admin email for this tenant
        const { data: admin } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .eq('tenant_id', tenantId)
          .eq('role', 'admin')
          .limit(1)
          .single()

        if (admin?.email) {
          // Create notification
          await supabase.from('notifications').insert({
            user_id: admin.id,
            title: 'Alerta de stock bajo',
            message: `${products.length} productos están por debajo del punto de reorden.`,
          })

          alertsSent++
        }
      }

      return { alertsSent, productsChecked: lowStockProducts.length }
    })

    logger.info('Staff stock alerts sent', result)
    return { success: true, ...result }
  }
)

// =============================================================================
// PRODUCT EXPIRY ALERTS
// =============================================================================

export const expiryAlerts = inngest.createFunction(
  {
    id: 'stock-expiry-alerts',
    name: 'Send Product Expiry Alerts',
    retries: 2,
  },
  { cron: '0 7 * * *' }, // Daily at 07:00 UTC
  async ({ step }) => {
    // Default: alert for products expiring within 30 days
    const daysBeforeExpiry = 30

    const result = await step.run('send-expiry-alerts', async () => {
      const supabase = await createClient('service_role')
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + daysBeforeExpiry)
      const expiryDateStr = expiryDate.toISOString().split('T')[0]

      // Get products expiring soon
      const { data: expiringProducts, error } = await supabase
        .from('store_inventory')
        .select(`
          product_id,
          stock_quantity,
          expiry_date,
          store_products(id, name, sku, tenant_id)
        `)
        .lte('expiry_date', expiryDateStr)
        .gt('stock_quantity', 0)
        .limit(200)

      if (error) {
        throw new Error(`Query error: ${error.message}`)
      }

      if (!expiringProducts || expiringProducts.length === 0) {
        return { alertsSent: 0, productsExpiring: 0 }
      }

      // Group by tenant
      const byTenant = new Map<string, typeof expiringProducts>()
      for (const product of expiringProducts) {
        const storeProduct = (product.store_products as { tenant_id: string }[] | null)?.[0]
        const tenantId = storeProduct?.tenant_id
        if (tenantId) {
          if (!byTenant.has(tenantId)) {
            byTenant.set(tenantId, [])
          }
          const tenantProducts = byTenant.get(tenantId)
          if (tenantProducts) {
            tenantProducts.push(product)
          }
        }
      }

      let alertsSent = 0

      for (const [tenantId, products] of byTenant) {
        const { data: admin } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('tenant_id', tenantId)
          .eq('role', 'admin')
          .limit(1)
          .single()

        if (admin) {
          await supabase.from('notifications').insert({
            user_id: admin.id,
            title: 'Productos por vencer',
            message: `${products.length} productos vencen en los próximos ${daysBeforeExpiry} días.`,
          })

          alertsSent++
        }
      }

      return { alertsSent, productsExpiring: expiringProducts.length }
    })

    logger.info('Expiry alerts sent', result)
    return { success: true, ...result }
  }
)
