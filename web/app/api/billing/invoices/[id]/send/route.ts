/**
 * Send Platform Invoice API
 *
 * POST /api/billing/invoices/[id]/send - Mark invoice as sent and notify clinic
 *
 * This endpoint is typically called by platform admins (via service role)
 * or by the invoice generation cron job to notify clinics of new invoices.
 *
 * Body (optional):
 * - send_email: boolean (default true) - Whether to send email notification
 * - channels: string[] - Additional channels ['sms', 'whatsapp']
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { sendEmail } from '@/lib/email/client'
import {
  generatePlatformInvoiceEmail,
  generatePlatformInvoiceEmailText,
} from '@/lib/email/templates/platform-invoice'

interface RouteContext {
  params: Promise<{ id: string }>
}

// Use service role for database operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params

  // SEC-008: Dual authentication - support both cron and admin session
  const cronSecret =
    request.headers.get('x-cron-secret') ||
    request.headers.get('authorization')?.replace('Bearer ', '')

  let triggeredBy: 'cron' | string = 'cron'
  let tenantIdForAudit: string | null = null

  // Option 1: CRON_SECRET authentication
  if (cronSecret === process.env.CRON_SECRET) {
    triggeredBy = 'cron'
  } else {
    // Option 2: Admin session authentication
    const userSupabase = await createClient()
    const { data: { user } } = await userSupabase.auth.getUser()

    if (!user) {
      logger.warn('Unauthorized invoice send attempt - no session', { invoiceId: id })
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Get user profile to verify role
    const { data: profile } = await userSupabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single()

    // Only platform admins and clinic admins can send invoices
    if (!profile || !['admin', 'platform_admin'].includes(profile.role)) {
      logger.warn('Unauthorized invoice send attempt - not admin', {
        invoiceId: id,
        userId: user.id,
        role: profile?.role,
      })
      return NextResponse.json({ error: 'Solo administradores pueden enviar facturas' }, { status: 403 })
    }

    triggeredBy = user.id
    tenantIdForAudit = profile.tenant_id
  }

  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)

  try {
    // Parse optional body
    let shouldSendEmail = true
    let _channels: string[] = [] // Reserved for future SMS/WhatsApp

    try {
      const body = await request.json()
      shouldSendEmail = body.send_email !== false
      _channels = body.channels || []
    } catch (_error: unknown) {
      // Body is optional
    }

    // 1. Get invoice with all fields needed for email
    const { data: invoice, error: invoiceError } = await supabase
      .from('platform_invoices')
      .select(`
        id,
        tenant_id,
        invoice_number,
        total,
        due_date,
        status,
        period_start,
        period_end,
        subscription_amount,
        store_commission_amount,
        service_commission_amount,
        issued_at,
        created_at,
        tenants!inner(name, billing_email, email)
      `)
      .eq('id', id)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
    }

    // Check invoice is in draft status
    if (invoice.status !== 'draft') {
      return NextResponse.json({
        error: 'La factura ya fue enviada',
        status: invoice.status,
      }, { status: 400 })
    }

    // 2. Update invoice status to 'sent'
    const { error: updateError } = await supabase
      .from('platform_invoices')
      .update({
        status: 'sent',
        issued_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      throw updateError
    }

    // 3. Get tenant info for notifications
    const tenantData = (Array.isArray(invoice.tenants) ? invoice.tenants[0] : invoice.tenants) as { name: string; billing_email: string | null; email: string | null }
    const billingEmail = tenantData.billing_email || tenantData.email

    // 4. Create billing reminder record and send email
    let emailSentSuccessfully = false
    if (shouldSendEmail && billingEmail) {
      const formattedTotal = new Intl.NumberFormat('es-PY', {
        style: 'currency',
        currency: 'PYG',
        maximumFractionDigits: 0,
      }).format(Number(invoice.total))

      // Insert billing reminder record as pending
      const { data: reminder } = await supabase.from('billing_reminders').insert({
        tenant_id: invoice.tenant_id,
        platform_invoice_id: id,
        reminder_type: 'invoice_due',
        channel: 'email',
        recipient_email: billingEmail,
        subject: `Nueva Factura Vetic ${invoice.invoice_number}`,
        content: `Se ha generado una nueva factura por ${formattedTotal}. Fecha de vencimiento: ${invoice.due_date}.`,
        status: 'pending',
        scheduled_for: new Date().toISOString(),
      }).select('id').single()

      // Generate email content using template
      const invoiceDate = invoice.issued_at || invoice.created_at || new Date().toISOString()
      const emailData = {
        clinicName: tenantData.name,
        invoiceNumber: invoice.invoice_number,
        invoiceDate: invoiceDate.split('T')[0],
        dueDate: invoice.due_date,
        periodStart: invoice.period_start,
        periodEnd: invoice.period_end,
        subscriptionAmount: invoice.subscription_amount ? Number(invoice.subscription_amount) : undefined,
        storeCommission: invoice.store_commission_amount ? Number(invoice.store_commission_amount) : undefined,
        serviceCommission: invoice.service_commission_amount ? Number(invoice.service_commission_amount) : undefined,
        total: Number(invoice.total),
        viewUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/billing/invoices/${id}`,
        paymentMethods: ['Transferencia Bancaria', 'MercadoPago'],
        bankDetails: {
          bankName: 'Banco Itaú Paraguay',
          accountNumber: '0123456789',
          accountName: 'Vetic S.A.',
          ruc: '80123456-7',
        },
      }

      const emailHtml = generatePlatformInvoiceEmail(emailData)
      const emailText = generatePlatformInvoiceEmailText(emailData)

      // Send email via Resend
      const emailResult = await sendEmail({
        to: billingEmail,
        subject: `Nueva Factura Vetic ${invoice.invoice_number} - ${formattedTotal}`,
        html: emailHtml,
        text: emailText,
        from: process.env.EMAIL_FROM_BILLING || 'facturacion@vetic.app',
        replyTo: 'soporte@vetic.app',
      })

      emailSentSuccessfully = emailResult.success

      // Update billing reminder status based on send result
      if (reminder?.id) {
        await supabase.from('billing_reminders').update({
          status: emailResult.success ? 'sent' : 'failed',
          sent_at: emailResult.success ? new Date().toISOString() : null,
          error_message: emailResult.error || null,
        }).eq('id', reminder.id)
      }

      logger.info('Invoice email sent', {
        invoiceId: id,
        invoiceNumber: invoice.invoice_number,
        email: billingEmail,
        amount: invoice.total,
        success: emailResult.success,
        messageId: emailResult.messageId,
        error: emailResult.error,
      })
    }

    // 5. Create in-app notifications for clinic admins
    const { data: adminProfiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('tenant_id', invoice.tenant_id)
      .eq('role', 'admin')
      .limit(5)

    if (adminProfiles && adminProfiles.length > 0) {
      const formattedTotal = new Intl.NumberFormat('es-PY', {
        style: 'currency',
        currency: 'PYG',
        maximumFractionDigits: 0,
      }).format(Number(invoice.total))

      const notifications = adminProfiles.map((profile) => ({
        user_id: profile.id,
        title: 'Nueva Factura de Plataforma',
        message: `Factura ${invoice.invoice_number} por ${formattedTotal} - Vence: ${invoice.due_date}`,
        type: 'billing',
        data: {
          invoice_id: id,
          invoice_number: invoice.invoice_number,
          amount: invoice.total,
          due_date: invoice.due_date,
        },
      }))

      await supabase.from('notifications').insert(notifications)
    }

    // 6. Update invoice reminder count
    await supabase
      .from('platform_invoices')
      .update({
        reminder_count: 1,
        last_reminder_at: new Date().toISOString(),
      })
      .eq('id', id)

    logger.info('Invoice sent successfully', {
      invoiceId: id,
      invoiceNumber: invoice.invoice_number,
      tenantId: invoice.tenant_id,
      triggeredBy,
      tenantIdForAudit,
      emailSent: emailSentSuccessfully,
    })

    return NextResponse.json({
      success: true,
      invoice_id: id,
      invoice_number: invoice.invoice_number,
      status: 'sent',
      triggered_by: triggeredBy === 'cron' ? 'cron' : 'admin',
      email_sent: emailSentSuccessfully,
      notifications_created: adminProfiles?.length || 0,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    logger.error('Error sending invoice', { invoiceId: id, error: message })

    return NextResponse.json(
      { error: 'Error al enviar factura', details: message },
      { status: 500 }
    )
  }
}
