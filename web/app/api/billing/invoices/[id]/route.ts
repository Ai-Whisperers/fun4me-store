/**
 * Platform Invoice Detail API
 *
 * GET /api/billing/invoices/[id] - Get invoice with line items
 *
 * Returns full invoice details including:
 * - Invoice header (amounts, dates, status)
 * - Line items (subscription, commissions, adjustments)
 * - Payment history
 * - Grace period info
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params
  const supabase = await createClient()

  // 1. Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return apiError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED)
  }

  // 2. Get profile and verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
      details: { resource: 'profile' },
    })
  }

  // Only admin can view invoice details
  if (profile.role !== 'admin') {
    return apiError('INSUFFICIENT_ROLE', HTTP_STATUS.FORBIDDEN, {
      details: { required: ['admin'], current: profile.role },
    })
  }

  try {
    // 3. Get invoice with tenant validation
    const { data: invoice, error: invoiceError } = await supabase
      .from('platform_invoices')
      .select(`
        id,
        tenant_id,
        invoice_number,
        period_start,
        period_end,
        subscription_amount,
        store_commission_amount,
        service_commission_amount,
        subtotal,
        tax_rate,
        tax_amount,
        total,
        status,
        issued_at,
        due_date,
        paid_at,
        payment_method,
        payment_reference,
        payment_amount,
        grace_period_days,
        grace_reason,
        grace_evaluation_id,
        reminder_count,
        last_reminder_at,
        notes,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .single()

    if (invoiceError || !invoice) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'invoice' },
      })
    }

    // Verify invoice belongs to user's tenant
    if (invoice.tenant_id !== profile.tenant_id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, {
        details: { message: 'No puede acceder a facturas de otra clínica' },
      })
    }

    // 4. Get line items
    const { data: items } = await supabase
      .from('platform_invoice_items')
      .select(`
        id,
        item_type,
        description,
        quantity,
        unit_price,
        total,
        reference_type,
        reference_id,
        created_at
      `)
      .eq('platform_invoice_id', id)
      .order('created_at', { ascending: true })

    // 5. Get payment transactions for this invoice
    const { data: transactions } = await supabase
      .from('billing_payment_transactions')
      .select(`
        id,
        amount,
        currency,
        payment_method_type,
        payment_method_display,
        status,
        failure_code,
        failure_message,
        stripe_receipt_url,
        created_at,
        completed_at
      `)
      .eq('platform_invoice_id', id)
      .order('created_at', { ascending: false })

    // 6. Get reminders sent for this invoice
    const { data: reminders } = await supabase
      .from('billing_reminders')
      .select(`
        id,
        reminder_type,
        channel,
        status,
        sent_at,
        opened_at,
        created_at
      `)
      .eq('platform_invoice_id', id)
      .order('created_at', { ascending: false })
      .limit(10)

    // 7. Get grace period evaluation if exists
    let graceEvaluation = null
    if (invoice.grace_evaluation_id) {
      const { data } = await supabase
        .from('grace_period_evaluations')
        .select(`
          id,
          recommended_grace_days,
          approved_grace_days,
          confidence,
          reasoning,
          evaluated_at,
          approved_at,
          status
        `)
        .eq('id', invoice.grace_evaluation_id)
        .single()

      graceEvaluation = data
    }

    // 8. Get tenant info for invoice header
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, billing_name, billing_email, billing_ruc, billing_address, billing_city')
      .eq('id', invoice.tenant_id)
      .single()

    // Calculate days overdue
    const daysOverdue = invoice.due_date && invoice.status !== 'paid'
      ? Math.max(0, Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24)))
      : 0

    return NextResponse.json({
      invoice: {
        ...invoice,
        days_overdue: daysOverdue,
        tenant_name: tenant?.name,
        billing_info: {
          name: tenant?.billing_name || tenant?.name,
          email: tenant?.billing_email,
          ruc: tenant?.billing_ruc,
          address: tenant?.billing_address,
          city: tenant?.billing_city,
        },
      },
      items: items || [],
      transactions: transactions || [],
      reminders: reminders || [],
      grace_evaluation: graceEvaluation,
    })
  } catch (e) {
    logger.error('Error fetching invoice detail', {
      invoiceId: id,
      userId: user.id,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'Error al cargar detalle de factura' },
    })
  }
}
