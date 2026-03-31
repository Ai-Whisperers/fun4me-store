import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmailWithRetry } from '@/lib/api/cron-external-calls'
import { sendWhatsAppMessage } from '@/lib/whatsapp/client'
import { logger } from '@/lib/logger'
import { checkCronAuth } from '@/lib/api/cron-auth'

export const dynamic = 'force-dynamic'

interface LowStockProduct {
  id: string
  name: string
  sku: string | null
  stock_quantity: number
  min_stock_level: number
  tenant_id: string
}

interface ExpiringProduct {
  id: string
  name: string
  sku: string | null
  expiry_date: string
  days_until_expiry: number
  tenant_id: string
}

interface StaffPreference {
  id: string
  profile_id: string
  tenant_id: string
  low_stock_alerts: boolean
  expiry_alerts: boolean
  out_of_stock_alerts: boolean
  email_enabled: boolean
  whatsapp_enabled: boolean
  notification_email: string | null
  notification_phone: string | null
  digest_frequency: string
  last_digest_sent_at: string | null
  profile: {
    full_name: string
    email: string
    phone: string | null
  }
}

/**
 * Staff Low Stock Alerts Cron Job
 *
 * Sends email and WhatsApp notifications to staff about:
 * - Low stock products
 * - Out of stock products
 * - Expiring products
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // SEC-006: Use timing-safe cron authentication
  const cronAuth = checkCronAuth(request)
  if (!cronAuth.authorized) {
    return cronAuth.errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient('service_role')

  try {
    // 1. Get all tenants with products
    const { data: tenants, error: tenantsError } = await supabase.from('tenants').select('id, name')

    if (tenantsError) {
      throw tenantsError
    }

    const results = {
      tenantsProcessed: 0,
      alertsSent: 0,
      errors: [] as string[],
    }

    // 2. Process each tenant
    for (const tenant of tenants || []) {
      try {
        // Get low stock products for this tenant
        const { data: lowStockProducts } = await supabase
          .from('low_stock_products')
          .select('*')
          .eq('tenant_id', tenant.id)

        // Get expiring products for this tenant
        const { data: expiringProducts } = await supabase
          .from('expiring_products')
          .select('*')
          .eq('tenant_id', tenant.id)

        // Get out of stock products
        const { data: outOfStockProducts } = await supabase
          .from('store_inventory')
          .select(
            `
            id,
            stock_quantity,
            store_products!inner (id, name, sku, tenant_id)
          `
          )
          .eq('stock_quantity', 0)
          .eq('store_products.tenant_id', tenant.id)

        const hasAlerts =
          (lowStockProducts?.length || 0) > 0 ||
          (expiringProducts?.length || 0) > 0 ||
          (outOfStockProducts?.length || 0) > 0

        if (!hasAlerts) {
          continue
        }

        // 3. Get staff with alert preferences for this tenant
        const { data: staffPreferences } = await supabase
          .from('staff_alert_preferences')
          .select(
            `
            *,
            profile:profiles!staff_alert_preferences_profile_id_fkey (
              full_name,
              email,
              phone
            )
          `
          )
          .eq('tenant_id', tenant.id)

        // If no preferences exist, get all admins/vets with default preferences
        let staffToNotify: StaffPreference[] = []

        if (!staffPreferences || staffPreferences.length === 0) {
          const { data: staff } = await supabase
            .from('profiles')
            .select('id, full_name, email, phone')
            .eq('tenant_id', tenant.id)
            .in('role', ['admin', 'vet'])

          // Create default preferences for staff
          staffToNotify = (staff || []).map((s) => ({
            id: '',
            profile_id: s.id,
            tenant_id: tenant.id,
            low_stock_alerts: true,
            expiry_alerts: true,
            out_of_stock_alerts: true,
            email_enabled: true,
            whatsapp_enabled: false,
            notification_email: s.email,
            notification_phone: s.phone,
            digest_frequency: 'immediate',
            last_digest_sent_at: null,
            profile: {
              full_name: s.full_name,
              email: s.email,
              phone: s.phone,
            },
          }))
        } else {
          staffToNotify = staffPreferences as StaffPreference[]
        }

        // 4. Send notifications to each staff member
        for (const staff of staffToNotify) {
          const alertsToSend: string[] = []

          if (staff.low_stock_alerts && (lowStockProducts?.length || 0) > 0) {
            alertsToSend.push('low_stock')
          }
          if (staff.out_of_stock_alerts && (outOfStockProducts?.length || 0) > 0) {
            alertsToSend.push('out_of_stock')
          }
          if (staff.expiry_alerts && (expiringProducts?.length || 0) > 0) {
            alertsToSend.push('expiring')
          }

          if (alertsToSend.length === 0) {
            continue
          }

          // Check digest frequency
          if (staff.digest_frequency === 'daily') {
            const lastSent = staff.last_digest_sent_at ? new Date(staff.last_digest_sent_at) : null
            const now = new Date()
            if (lastSent && now.getTime() - lastSent.getTime() < 24 * 60 * 60 * 1000) {
              continue
            }
          } else if (staff.digest_frequency === 'weekly') {
            const lastSent = staff.last_digest_sent_at ? new Date(staff.last_digest_sent_at) : null
            const now = new Date()
            if (lastSent && now.getTime() - lastSent.getTime() < 7 * 24 * 60 * 60 * 1000) {
              continue
            }
          }

          // Send email if enabled (with timeout/retry protection)
          if (staff.email_enabled) {
            const email = staff.notification_email || staff.profile?.email
            if (email) {
              try {
                await sendStaffAlertEmail({
                  to: email,
                  staffName: staff.profile?.full_name || 'Staff',
                  clinicName: tenant.name,
                  lowStockProducts: staff.low_stock_alerts ? lowStockProducts : [],
                  outOfStockProducts: staff.out_of_stock_alerts ? outOfStockProducts : [],
                  expiringProducts: staff.expiry_alerts ? expiringProducts : [],
                })
                results.alertsSent++
                logger.info('Staff alert email sent successfully', {
                  email,
                  tenantId: tenant.id,
                })
              } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error)
                results.errors.push(`Email to ${email}: ${errorMsg}`)
                logger.error('Failed to send staff alert email after retries', {
                  email,
                  tenantId: tenant.id,
                  error: errorMsg,
                })
              }
            }
          }

          // Send WhatsApp if enabled
          if (staff.whatsapp_enabled) {
            const phone = staff.notification_phone || staff.profile?.phone
            if (phone) {
              const whatsappResult = await sendStaffAlertWhatsApp({
                to: phone,
                staffName: staff.profile?.full_name || 'Staff',
                lowStockCount: staff.low_stock_alerts ? lowStockProducts?.length || 0 : 0,
                outOfStockCount: staff.out_of_stock_alerts ? outOfStockProducts?.length || 0 : 0,
                expiringCount: staff.expiry_alerts ? expiringProducts?.length || 0 : 0,
              })

              if (whatsappResult.success) {
                results.alertsSent++
              } else {
                results.errors.push(`WhatsApp to ${phone}: ${whatsappResult.error}`)
              }
            }
          }

          // Update last digest sent
          if (staff.id) {
            await supabase
              .from('staff_alert_preferences')
              .update({ last_digest_sent_at: new Date().toISOString() })
              .eq('id', staff.id)
          }
        }

        results.tenantsProcessed++
      } catch (tenantError) {
        results.errors.push(
          `Tenant ${tenant.id}: ${tenantError instanceof Error ? tenantError.message : String(tenantError)}`
        )
      }
    }

    logger.info('Staff stock alerts cron completed', results)

    return NextResponse.json({
      success: true,
      message: 'Staff stock alerts processed',
      ...results,
    })
  } catch (error) {
    logger.error('Staff stock alerts cron error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

interface SendEmailParams {
  to: string
  staffName: string
  clinicName: string
  lowStockProducts: LowStockProduct[] | null
  outOfStockProducts: unknown[] | null
  expiringProducts: ExpiringProduct[] | null
}

async function sendStaffAlertEmail(params: SendEmailParams): Promise<void> {
  const { to, staffName, clinicName, lowStockProducts, outOfStockProducts, expiringProducts } =
    params

  const hasLowStock = (lowStockProducts?.length || 0) > 0
  const hasOutOfStock = (outOfStockProducts?.length || 0) > 0
  const hasExpiring = (expiringProducts?.length || 0) > 0

  let subject = '⚠️ Alerta de Inventario'
  if (hasOutOfStock) {
    subject = '🔴 Productos sin Stock'
  } else if (hasLowStock) {
    subject = '🟠 Stock Bajo'
  } else if (hasExpiring) {
    subject = '📅 Productos por Vencer'
  }
  subject += ` - ${clinicName}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #dc2626; margin: 0;">Alerta de Inventario</h1>
        <p style="color: #6b7280; font-size: 14px;">${clinicName}</p>
      </div>

      <p>Hola ${staffName},</p>

      <p>Te notificamos sobre el estado de tu inventario:</p>

      ${
        hasOutOfStock
          ? `
        <div style="background-color: #fef2f2; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #fecaca;">
          <h2 style="color: #dc2626; margin: 0 0 15px 0; font-size: 16px;">
            🔴 Productos Sin Stock (${outOfStockProducts?.length})
          </h2>
          <p style="color: #7f1d1d; font-size: 14px; margin: 0;">
            Estos productos necesitan reabastecimiento urgente.
          </p>
        </div>
      `
          : ''
      }

      ${
        hasLowStock
          ? `
        <div style="background-color: #fffbeb; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #fde68a;">
          <h2 style="color: #d97706; margin: 0 0 15px 0; font-size: 16px;">
            🟠 Stock Bajo (${lowStockProducts?.length})
          </h2>
          <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            ${(lowStockProducts || [])
              .slice(0, 10)
              .map(
                (p) => `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #fde68a;">
                  <strong>${p.name}</strong>
                  ${p.sku ? `<span style="color: #6b7280;"> (${p.sku})</span>` : ''}
                </td>
                <td style="padding: 8px 0; border-bottom: 1px solid #fde68a; text-align: right; color: #d97706; font-weight: bold;">
                  ${p.stock_quantity} / ${p.min_stock_level}
                </td>
              </tr>
            `
              )
              .join('')}
          </table>
          ${
            (lowStockProducts?.length || 0) > 10
              ? `
            <p style="color: #92400e; font-size: 12px; margin-top: 10px;">
              ... y ${(lowStockProducts?.length || 0) - 10} productos más
            </p>
          `
              : ''
          }
        </div>
      `
          : ''
      }

      ${
        hasExpiring
          ? `
        <div style="background-color: #f0f9ff; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #bae6fd;">
          <h2 style="color: #0369a1; margin: 0 0 15px 0; font-size: 16px;">
            📅 Productos por Vencer (${expiringProducts?.length})
          </h2>
          <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            ${(expiringProducts || [])
              .slice(0, 10)
              .map(
                (p) => `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #bae6fd;">
                  <strong>${p.name}</strong>
                </td>
                <td style="padding: 8px 0; border-bottom: 1px solid #bae6fd; text-align: right; color: #0369a1;">
                  ${p.days_until_expiry} días (${new Date(p.expiry_date).toLocaleDateString('es-PY')})
                </td>
              </tr>
            `
              )
              .join('')}
          </table>
        </div>
      `
          : ''
      }

      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://vete.app'}/dashboard/inventory"
           style="display: inline-block; background-color: #4f46e5; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
          Ver Inventario
        </a>
      </div>

      <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
        Recibiste este email porque tienes alertas de inventario activadas.<br>
        Puedes configurar tus preferencias en el panel de administración.
      </p>
    </body>
    </html>
  `

  await sendEmailWithRetry({
    to,
    subject,
    html,
    text: `Alerta de Inventario - ${clinicName}\n\nHola ${staffName},\n\nStock bajo: ${lowStockProducts?.length || 0} productos\nSin stock: ${outOfStockProducts?.length || 0} productos\nPor vencer: ${expiringProducts?.length || 0} productos`,
  })
}

interface SendWhatsAppParams {
  to: string
  staffName: string
  lowStockCount: number
  outOfStockCount: number
  expiringCount: number
}

async function sendStaffAlertWhatsApp(
  params: SendWhatsAppParams
): Promise<{ success: boolean; error?: string }> {
  const { to, lowStockCount, outOfStockCount, expiringCount } = params

  const lines: string[] = ['⚠️ *Alerta de Inventario*', '']

  if (outOfStockCount > 0) {
    lines.push(`🔴 *Sin Stock:* ${outOfStockCount} productos`)
  }
  if (lowStockCount > 0) {
    lines.push(`🟠 *Stock Bajo:* ${lowStockCount} productos`)
  }
  if (expiringCount > 0) {
    lines.push(`📅 *Por Vencer:* ${expiringCount} productos`)
  }

  lines.push('')
  lines.push('Revisa el inventario en el panel de administración.')

  return sendWhatsAppMessage({
    to,
    body: lines.join('\n'),
  })
}
