import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmailWithRetry } from '@/lib/api/cron-external-calls'
import { sendWhatsAppMessage } from '@/lib/whatsapp/client'
import { logger } from '@/lib/logger'
import { checkCronAuth } from '@/lib/api/cron-auth'

export const dynamic = 'force-dynamic'

interface ExpiringProduct {
  id: string
  tenant_id: string
  name: string
  sku: string | null
  stock_quantity: number
  expiry_date: string
  batch_number: string | null
  days_until_expiry: number
  urgency_level: string
}

interface StaffPreference {
  id: string
  profile_id: string
  tenant_id: string
  expiry_alerts: boolean
  email_enabled: boolean
  whatsapp_enabled: boolean
  notification_email: string | null
  notification_phone: string | null
  expiry_days_warning: number
  digest_frequency: string
  last_digest_sent_at: string | null
  profile: {
    full_name: string
    email: string
    phone: string | null
  }
}

/**
 * Expiry Alerts Cron Job
 *
 * Sends notifications about expiring and expired products to staff.
 * Uses multi-day warning thresholds: 7, 14, 30, 60, 90 days.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // SEC-006: Use timing-safe cron authentication
  const { authorized, errorResponse } = checkCronAuth(request)
  if (!authorized) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient('service_role')

  try {
    // Get all tenants
    const { data: tenants, error: tenantsError } = await supabase.from('tenants').select('id, name')

    if (tenantsError) {
      throw tenantsError
    }

    const results = {
      tenantsProcessed: 0,
      alertsSent: 0,
      productsAlerted: 0,
      errors: [] as string[],
    }

    for (const tenant of tenants || []) {
      try {
        // Get expiry summary for this tenant
        const { data: summary } = await supabase.rpc('get_expiry_summary', {
          p_tenant_id: tenant.id,
        })

        // Get expiring products (within 90 days)
        const { data: expiringProducts } = await supabase.rpc('get_expiring_products', {
          p_tenant_id: tenant.id,
          p_days: 90,
        })

        // Check if we have any expiring products
        const hasExpiring = (expiringProducts?.length || 0) > 0

        if (!hasExpiring) {
          continue
        }

        // Get expired products
        const { data: expiredProducts } = await supabase
          .from('expired_products')
          .select('*')
          .eq('tenant_id', tenant.id)

        const hasExpired = (expiredProducts?.length || 0) > 0

        // Categorize products by urgency
        const critical =
          expiringProducts?.filter((p: ExpiringProduct) => p.urgency_level === 'critical') || []
        const high =
          expiringProducts?.filter((p: ExpiringProduct) => p.urgency_level === 'high') || []
        const medium =
          expiringProducts?.filter((p: ExpiringProduct) => p.urgency_level === 'medium') || []

        // Get staff with expiry alert preferences
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
          .eq('expiry_alerts', true)

        // If no explicit preferences, get all admins
        let staffToNotify: StaffPreference[] = []

        if (!staffPreferences || staffPreferences.length === 0) {
          const { data: staff } = await supabase
            .from('profiles')
            .select('id, full_name, email, phone')
            .eq('tenant_id', tenant.id)
            .in('role', ['admin', 'vet'])

          staffToNotify = (staff || []).map((s) => ({
            id: '',
            profile_id: s.id,
            tenant_id: tenant.id,
            expiry_alerts: true,
            email_enabled: true,
            whatsapp_enabled: false,
            notification_email: s.email,
            notification_phone: s.phone,
            expiry_days_warning: 30,
            digest_frequency: 'daily',
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

        // Check which alerts are new (not yet sent)
        for (const staff of staffToNotify) {
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

          // Determine which products to alert based on staff's threshold
          const threshold = staff.expiry_days_warning || 30
          const relevantProducts =
            expiringProducts?.filter((p: ExpiringProduct) => p.days_until_expiry <= threshold) || []

          if (relevantProducts.length === 0 && !hasExpired) {
            continue
          }

          // Send email if enabled (with timeout/retry protection)
          if (staff.email_enabled) {
            const email = staff.notification_email || staff.profile?.email
            if (email) {
              try {
                await sendExpiryAlertEmail({
                  to: email,
                  staffName: staff.profile?.full_name || 'Staff',
                  clinicName: tenant.name,
                  expiredProducts: expiredProducts || [],
                  criticalProducts: critical,
                  highProducts: high,
                  mediumProducts: medium,
                  summary,
                })
                results.alertsSent++
                logger.info('Expiry alert email sent successfully', {
                  email,
                  tenantId: tenant.id,
                })
              } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error)
                results.errors.push(`Email to ${email}: ${errorMsg}`)
                logger.error('Failed to send expiry alert email after retries', {
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
              const whatsappResult = await sendExpiryAlertWhatsApp({
                to: phone,
                expiredCount: expiredProducts?.length || 0,
                criticalCount: critical.length,
                highCount: high.length,
                mediumCount: medium.length,
              })

              if (whatsappResult.success) {
                results.alertsSent++
              } else {
                results.errors.push(`WhatsApp to ${phone}: ${whatsappResult.error}`)
              }
            }
          }

          // Update last alert sent time
          if (staff.id) {
            await supabase
              .from('staff_alert_preferences')
              .update({ last_digest_sent_at: new Date().toISOString() })
              .eq('id', staff.id)
          }
        }

        results.tenantsProcessed++
        results.productsAlerted += (expiringProducts?.length || 0) + (expiredProducts?.length || 0)
      } catch (tenantError) {
        results.errors.push(
          `Tenant ${tenant.id}: ${tenantError instanceof Error ? tenantError.message : String(tenantError)}`
        )
      }
    }

    logger.info('Expiry alerts cron completed', results)

    return NextResponse.json({
      success: true,
      message: 'Expiry alerts processed',
      ...results,
    })
  } catch (error) {
    logger.error('Expiry alerts cron error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

interface SendEmailParams {
  to: string
  staffName: string
  clinicName: string
  expiredProducts: ExpiringProduct[]
  criticalProducts: ExpiringProduct[]
  highProducts: ExpiringProduct[]
  mediumProducts: ExpiringProduct[]
  summary: { urgency_level: string; product_count: number; total_units: number }[] | null
}

async function sendExpiryAlertEmail(params: SendEmailParams): Promise<void> {
  const {
    to,
    staffName,
    clinicName,
    expiredProducts,
    criticalProducts,
    highProducts,
    mediumProducts,
    summary,
  } = params

  const hasExpired = expiredProducts.length > 0
  const hasCritical = criticalProducts.length > 0

  let subject = '📅 Alerta de Vencimiento'
  if (hasExpired) {
    subject = '🔴 Productos Vencidos'
  } else if (hasCritical) {
    subject = '⚠️ Productos por Vencer (< 7 días)'
  }
  subject += ` - ${clinicName}`

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('es-PY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #dc2626; margin: 0;">Alerta de Vencimiento</h1>
        <p style="color: #6b7280; font-size: 14px;">${clinicName}</p>
      </div>

      <p>Hola ${staffName},</p>

      <p>Te informamos sobre el estado de vencimiento de tu inventario:</p>

      ${
        summary
          ? `
        <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #111827;">Resumen de Vencimientos</h3>
          <table style="width: 100%; font-size: 14px;">
            ${summary
              .map(
                (s) => `
              <tr>
                <td style="padding: 4px 0;">
                  ${
                    s.urgency_level === 'expired'
                      ? '🔴 Vencidos'
                      : s.urgency_level === 'critical'
                        ? '⚠️ Críticos (< 7 días)'
                        : s.urgency_level === 'high'
                          ? '🟠 Altos (7-14 días)'
                          : s.urgency_level === 'medium'
                            ? '🟡 Medios (14-30 días)'
                            : '🟢 Bajos (30-60 días)'
                  }
                </td>
                <td style="padding: 4px 0; text-align: right; font-weight: bold;">
                  ${s.product_count} productos (${s.total_units} un.)
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

      ${
        hasExpired
          ? `
        <div style="background-color: #fef2f2; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #fecaca;">
          <h2 style="color: #dc2626; margin: 0 0 15px 0; font-size: 16px;">
            🔴 Productos Vencidos (${expiredProducts.length})
          </h2>
          <p style="color: #7f1d1d; font-size: 14px; margin-bottom: 15px;">
            Estos productos deben ser retirados de la venta inmediatamente.
          </p>
          <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            ${expiredProducts
              .slice(0, 5)
              .map(
                (p) => `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #fecaca;">
                  <strong>${p.name}</strong>
                  ${p.batch_number ? `<br><span style="color: #6b7280; font-size: 12px;">Lote: ${p.batch_number}</span>` : ''}
                </td>
                <td style="padding: 8px 0; border-bottom: 1px solid #fecaca; text-align: right;">
                  <span style="color: #dc2626; font-weight: bold;">
                    Venció ${formatDate(p.expiry_date)}
                  </span>
                  <br><span style="font-size: 12px;">${p.stock_quantity} un.</span>
                </td>
              </tr>
            `
              )
              .join('')}
          </table>
          ${expiredProducts.length > 5 ? `<p style="color: #7f1d1d; font-size: 12px; margin-top: 10px;">... y ${expiredProducts.length - 5} productos más</p>` : ''}
        </div>
      `
          : ''
      }

      ${
        hasCritical
          ? `
        <div style="background-color: #fffbeb; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #fde68a;">
          <h2 style="color: #d97706; margin: 0 0 15px 0; font-size: 16px;">
            ⚠️ Vencen en menos de 7 días (${criticalProducts.length})
          </h2>
          <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            ${criticalProducts
              .slice(0, 5)
              .map(
                (p) => `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #fde68a;">
                  <strong>${p.name}</strong>
                  ${p.batch_number ? `<br><span style="color: #6b7280; font-size: 12px;">Lote: ${p.batch_number}</span>` : ''}
                </td>
                <td style="padding: 8px 0; border-bottom: 1px solid #fde68a; text-align: right;">
                  <span style="color: #d97706; font-weight: bold;">
                    ${p.days_until_expiry} días
                  </span>
                  <br><span style="font-size: 12px;">${formatDate(p.expiry_date)}</span>
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

      ${
        highProducts.length > 0
          ? `
        <div style="background-color: #fff7ed; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #fed7aa;">
          <h2 style="color: #ea580c; margin: 0 0 15px 0; font-size: 16px;">
            🟠 Vencen en 7-14 días (${highProducts.length})
          </h2>
          <p style="font-size: 14px; color: #9a3412;">
            ${highProducts
              .slice(0, 3)
              .map((p) => p.name)
              .join(', ')}
            ${highProducts.length > 3 ? ` y ${highProducts.length - 3} más` : ''}
          </p>
        </div>
      `
          : ''
      }

      ${
        mediumProducts.length > 0
          ? `
        <div style="background-color: #fefce8; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #fef08a;">
          <h2 style="color: #ca8a04; margin: 0 0 10px 0; font-size: 16px;">
            🟡 Vencen en 14-30 días (${mediumProducts.length})
          </h2>
          <p style="font-size: 14px; color: #854d0e;">
            Considera realizar promociones o descuentos para estos productos.
          </p>
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
        Recibiste este email porque tienes alertas de vencimiento activadas.<br>
        Puedes configurar tus preferencias en Configuración → Alertas de Inventario.
      </p>
    </body>
    </html>
  `

  const totalExpiring = criticalProducts.length + highProducts.length + mediumProducts.length

  await sendEmailWithRetry({
    to,
    subject,
    html,
    text: `Alerta de Vencimiento - ${clinicName}\n\nHola ${staffName},\n\nVencidos: ${expiredProducts.length}\nCríticos (< 7 días): ${criticalProducts.length}\nAltos (7-14 días): ${highProducts.length}\nMedios (14-30 días): ${mediumProducts.length}\nTotal por vencer: ${totalExpiring} productos`,
  })
}

interface SendWhatsAppParams {
  to: string
  expiredCount: number
  criticalCount: number
  highCount: number
  mediumCount: number
}

async function sendExpiryAlertWhatsApp(
  params: SendWhatsAppParams
): Promise<{ success: boolean; error?: string }> {
  const { to, expiredCount, criticalCount, highCount, mediumCount } = params

  const lines: string[] = ['📅 *Alerta de Vencimiento*', '']

  if (expiredCount > 0) {
    lines.push(`🔴 *Vencidos:* ${expiredCount} productos`)
  }
  if (criticalCount > 0) {
    lines.push(`⚠️ *< 7 días:* ${criticalCount} productos`)
  }
  if (highCount > 0) {
    lines.push(`🟠 *7-14 días:* ${highCount} productos`)
  }
  if (mediumCount > 0) {
    lines.push(`🟡 *14-30 días:* ${mediumCount} productos`)
  }

  lines.push('')
  lines.push('Revisa el inventario para tomar acción.')

  return sendWhatsAppMessage({
    to,
    body: lines.join('\n'),
  })
}
