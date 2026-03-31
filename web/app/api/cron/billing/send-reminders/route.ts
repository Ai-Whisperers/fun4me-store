/**
 * Billing Reminders Cron Job
 *
 * POST /api/cron/billing/send-reminders
 *
 * Sends billing reminder emails at appropriate intervals.
 *
 * Schedule: Daily at 09:00 local time (13:00 UTC for Paraguay)
 *
 * Reminder types:
 * - upcoming_invoice: 7 days before due date
 * - invoice_due: On due date
 * - overdue_gentle: 7 days after due date
 * - overdue_reminder: 14 days after due date
 * - overdue_urgent: 30 days after due date
 * - grace_period_warning: When grace period is ending (7 days before)
 *
 * Authorization: Requires CRON_SECRET header
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCronHandler, CronContext } from '@/lib/cron/handler'
import { logger } from '@/lib/logger'
import { sendEmailWithRetry } from '@/lib/api/cron-external-calls'

interface ReminderResult {
  tenant_id: string
  invoice_id: string
  invoice_number: string
  reminder_type: string
  status: 'sent' | 'skipped' | 'error'
  reason?: string
}

async function handler(_request: NextRequest, _context: CronContext): Promise<NextResponse> {
  const supabase = await createClient('service_role')
  const results: ReminderResult[] = []
  const now = new Date()
  const today = now.toISOString().split('T')[0]

  logger.info('Starting billing reminders cron', { date: today })

  try {
    // Get all unpaid invoices
    const { data: invoices, error: invoicesError } = await supabase
      .from('platform_invoices')
      .select(`
        id,
        invoice_number,
        tenant_id,
        total,
        due_date,
        status,
        grace_period_days,
        issued_at,
        tenants (
          name,
          email,
          billing_email
        )
      `)
      .in('status', ['draft', 'sent', 'overdue'])
      .order('due_date', { ascending: true })

    if (invoicesError) {
      throw new Error(`Error fetching invoices: ${invoicesError.message}`)
    }

    if (!invoices || invoices.length === 0) {
      logger.info('No unpaid invoices to process')
      return NextResponse.json({
        success: true,
        message: 'No unpaid invoices',
        sent: 0,
      })
    }

    // Process each invoice
    for (const invoice of invoices) {
      // Transform tenants array to single object (Supabase returns array for joins)
      const transformedInvoice = {
        ...invoice,
        tenants: Array.isArray(invoice.tenants) ? invoice.tenants[0] || null : invoice.tenants,
      }
      const reminderResults = await processInvoiceReminders(supabase, transformedInvoice as Parameters<typeof processInvoiceReminders>[1], now)
      results.push(...reminderResults)
    }

    // Summary
    const sent = results.filter((r) => r.status === 'sent').length
    const skipped = results.filter((r) => r.status === 'skipped').length
    const errors = results.filter((r) => r.status === 'error').length

    logger.info('Billing reminders completed', {
      total: results.length,
      sent,
      skipped,
      errors,
    })

    return NextResponse.json({
      success: true,
      message: 'Reminders processed',
      summary: { sent, skipped, errors },
      results,
    })

  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    logger.error('Billing reminders cron failed', { error: message })

    return NextResponse.json(
      {
        success: false,
        error: message,
        results,
      },
      { status: 500 }
    )
  }
}

/**
 * Process reminders for a single invoice
 */
async function processInvoiceReminders(
  supabase: Awaited<ReturnType<typeof createClient>>,
  invoice: {
    id: string
    invoice_number: string
    tenant_id: string
    total: number
    due_date: string
    status: string
    grace_period_days: number | null
    issued_at: string | null
    tenants: { name: string; email: string; billing_email: string | null } | null
  },
  now: Date
): Promise<ReminderResult[]> {
  const results: ReminderResult[] = []
  const dueDate = new Date(invoice.due_date)
  const daysDiff = Math.floor((dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))

  const baseResult = {
    tenant_id: invoice.tenant_id,
    invoice_id: invoice.id,
    invoice_number: invoice.invoice_number,
  }

  // Check existing reminders to avoid duplicates
  const { data: existingReminders } = await supabase
    .from('billing_reminders')
    .select('reminder_type, sent_at')
    .eq('platform_invoice_id', invoice.id)

  const sentTypes = new Set(existingReminders?.map((r) => r.reminder_type) || [])

  // Determine which reminders to send
  const remindersToSend: { type: string; subject: string; content: string }[] = []

  // 7 days before due date
  if (daysDiff === 7 && !sentTypes.has('upcoming_invoice')) {
    remindersToSend.push({
      type: 'upcoming_invoice',
      subject: `Proxima factura - ${invoice.invoice_number}`,
      content: `Su factura ${invoice.invoice_number} por ₲${Number(invoice.total).toLocaleString('es-PY')} vence en 7 dias (${dueDate.toLocaleDateString('es-PY')}). Puede realizar el pago desde su panel de administracion.`,
    })
  }

  // On due date
  if (daysDiff === 0 && !sentTypes.has('invoice_due')) {
    remindersToSend.push({
      type: 'invoice_due',
      subject: `Factura vence hoy - ${invoice.invoice_number}`,
      content: `Su factura ${invoice.invoice_number} por ₲${Number(invoice.total).toLocaleString('es-PY')} vence hoy. Por favor realice el pago para evitar cargos adicionales.`,
    })
  }

  // 7 days overdue
  if (daysDiff === -7 && !sentTypes.has('overdue_gentle')) {
    remindersToSend.push({
      type: 'overdue_gentle',
      subject: `Factura vencida - ${invoice.invoice_number}`,
      content: `Su factura ${invoice.invoice_number} por ₲${Number(invoice.total).toLocaleString('es-PY')} esta vencida hace 7 dias. Por favor regularice su situacion a la brevedad.`,
    })
  }

  // 14 days overdue
  if (daysDiff === -14 && !sentTypes.has('overdue_reminder')) {
    remindersToSend.push({
      type: 'overdue_reminder',
      subject: `Recordatorio urgente - Factura ${invoice.invoice_number}`,
      content: `Su factura ${invoice.invoice_number} por ₲${Number(invoice.total).toLocaleString('es-PY')} esta vencida hace 14 dias. Le pedimos contactarnos si tiene inconvenientes con el pago.`,
    })
  }

  // 30 days overdue
  if (daysDiff === -30 && !sentTypes.has('overdue_urgent')) {
    remindersToSend.push({
      type: 'overdue_urgent',
      subject: `URGENTE: Factura vencida - ${invoice.invoice_number}`,
      content: `Su factura ${invoice.invoice_number} por ₲${Number(invoice.total).toLocaleString('es-PY')} esta vencida hace 30 dias. Es importante regularizar su situacion. Contactenos si necesita asistencia.`,
    })
  }

  // Grace period ending (7 days before grace expires)
  if (invoice.grace_period_days && invoice.status === 'overdue') {
    const graceEndDate = new Date(dueDate)
    graceEndDate.setDate(graceEndDate.getDate() + invoice.grace_period_days)
    const daysUntilGraceEnds = Math.floor((graceEndDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))

    if (daysUntilGraceEnds === 7 && !sentTypes.has('grace_period_warning')) {
      remindersToSend.push({
        type: 'grace_period_warning',
        subject: `Periodo de gracia por terminar - ${invoice.invoice_number}`,
        content: `Su periodo de gracia para la factura ${invoice.invoice_number} termina en 7 dias (${graceEndDate.toLocaleDateString('es-PY')}). Por favor realice el pago antes de esa fecha.`,
      })
    }
  }

  // Send each reminder
  for (const reminder of remindersToSend) {
    try {
      await sendReminder(supabase, invoice, reminder)
      results.push({
        ...baseResult,
        reminder_type: reminder.type,
        status: 'sent',
      })
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error'
      results.push({
        ...baseResult,
        reminder_type: reminder.type,
        status: 'error',
        reason: errorMsg,
      })
    }
  }

  // If no reminders were needed
  if (remindersToSend.length === 0) {
    results.push({
      ...baseResult,
      reminder_type: 'none',
      status: 'skipped',
      reason: 'No reminders due',
    })
  }

  return results
}

/**
 * Generate HTML email for billing reminder
 */
function generateReminderEmail(
  clinicName: string,
  subject: string,
  content: string,
  invoiceNumber: string
): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 30px 40px 20px; text-align: center; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Vetic</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 30px 40px;">
              <h2 style="margin: 0 0 15px; color: #333333; font-size: 18px; font-weight: 600;">
                Hola ${clinicName},
              </h2>
              <p style="margin: 0 0 20px; color: #555555; font-size: 16px; line-height: 1.6;">
                ${content}
              </p>
              <div style="background-color: #f8fafc; border-radius: 6px; padding: 15px; margin-top: 20px;">
                <p style="margin: 0; color: #64748b; font-size: 14px;">
                  <strong>Factura:</strong> ${invoiceNumber}
                </p>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px 30px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center;">
                Si tienes alguna pregunta, responde a este correo o contáctanos en soporte@vetic.app
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim()
}

/**
 * Send a reminder (save to database, send email, and notify)
 */
async function sendReminder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  invoice: {
    id: string
    invoice_number: string
    tenant_id: string
    tenants: { name: string; email: string; billing_email: string | null } | null
  },
  reminder: { type: string; subject: string; content: string }
): Promise<void> {
  const now = new Date().toISOString()
  const recipientEmail = invoice.tenants?.billing_email || invoice.tenants?.email
  const clinicName = invoice.tenants?.name || 'Estimado cliente'

  // Save reminder record as pending
  const { data: reminderRecord } = await supabase.from('billing_reminders').insert({
    tenant_id: invoice.tenant_id,
    platform_invoice_id: invoice.id,
    reminder_type: reminder.type,
    channel: 'email',
    recipient_email: recipientEmail,
    subject: reminder.subject,
    content: reminder.content,
    status: 'pending',
    scheduled_for: now,
  }).select('id').single()

  // Send email if we have a recipient (with timeout/retry protection)
  let emailSuccess = false
  let emailError: string | undefined

  if (recipientEmail) {
    const emailHtml = generateReminderEmail(
      clinicName,
      reminder.subject,
      reminder.content,
      invoice.invoice_number
    )

    try {
      await sendEmailWithRetry({
        to: recipientEmail,
        subject: reminder.subject,
        html: emailHtml,
        text: `${clinicName},\n\n${reminder.content}\n\nFactura: ${invoice.invoice_number}\n\nSi tienes preguntas, contáctanos en soporte@vetic.app`,
        from: process.env.EMAIL_FROM_BILLING || 'facturacion@vetic.app',
        replyTo: 'soporte@vetic.app',
      })
      emailSuccess = true
      logger.info('Billing reminder email sent successfully', {
        invoiceId: invoice.id,
        reminderType: reminder.type,
        recipientEmail,
      })
    } catch (error) {
      emailError = error instanceof Error ? error.message : 'Email send failed'
      logger.error('Failed to send billing reminder email after retries', {
        invoiceId: invoice.id,
        reminderType: reminder.type,
        recipientEmail,
        error: emailError,
      })
    }
  }

  // Update reminder record with send status
  if (reminderRecord?.id) {
    await supabase.from('billing_reminders').update({
      status: emailSuccess ? 'sent' : (recipientEmail ? 'failed' : 'skipped'),
      sent_at: emailSuccess ? now : null,
      error_message: emailError || (recipientEmail ? null : 'No email address'),
    }).eq('id', reminderRecord.id)
  }

  // Create notification for clinic admin
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('tenant_id', invoice.tenant_id)
    .eq('role', 'admin')
    .limit(1)
    .single()

  if (adminProfile) {
    await supabase.from('notifications').insert({
      user_id: adminProfile.id,
      title: reminder.subject,
      message: reminder.content,
    })
  }

  logger.info('Reminder processed', {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoice_number,
    tenantId: invoice.tenant_id,
    reminderType: reminder.type,
    email: recipientEmail,
    emailSent: emailSuccess,
    error: emailError,
  })
}

export const POST = createCronHandler(handler)
