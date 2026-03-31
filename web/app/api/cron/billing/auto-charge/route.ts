/**
 * Auto-Charge Cron Job
 *
 * POST /api/cron/billing/auto-charge
 *
 * Automatically charges invoices that are due using saved payment methods.
 *
 * Schedule: Daily at 10:00 UTC (06:00 Paraguay time)
 *
 * Process:
 * 1. Find invoices due today or overdue with unpaid status
 * 2. Filter to tenants with a default payment method
 * 3. Attempt payment via Stripe
 * 4. Update invoice status and send notifications
 *
 * Authorization: Requires CRON_SECRET header
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCronHandler, CronContext } from '@/lib/cron/handler'
import { logger } from '@/lib/logger'
import {
  createPaymentIntent,
  toStripeAmount,
} from '@/lib/billing/stripe'
import { withTimeout, withRetry, isTimeoutError, TIMEOUT_PRESETS } from '@/lib/utils/timeout'

interface ChargeResult {
  invoice_id: string
  invoice_number: string
  tenant_id: string
  amount: number
  status: 'succeeded' | 'failed' | 'requires_action' | 'skipped' | 'timeout'
  error?: string
  timedOut?: boolean
}

async function handler(_request: NextRequest, _context: CronContext): Promise<NextResponse> {
  const supabase = await createClient('service_role')
  const results: ChargeResult[] = []
  const today = new Date().toISOString().split('T')[0]

  logger.info('Starting auto-charge cron job', { date: today })

  try {
    // 1. Get invoices due today or overdue (status: sent or overdue)
    // Process in batches to prevent OOM on large installations
    const { data: invoices, error: invoicesError } = await supabase
      .from('platform_invoices')
      .select(`
        id,
        invoice_number,
        tenant_id,
        total,
        due_date,
        status
      `)
      .in('status', ['sent', 'overdue'])
      .lte('due_date', today)
      .order('due_date', { ascending: true })
      .limit(50) // Safety limit - process 50 invoices per run (prevents payment gateway overload)

    if (invoicesError) {
      throw new Error(`Error fetching invoices: ${invoicesError.message}`)
    }

    if (!invoices || invoices.length === 0) {
      logger.info('No invoices to process')
      return NextResponse.json({
        success: true,
        message: 'No invoices to process',
        processed: 0,
        results: [],
      })
    }

    logger.info(`Found ${invoices.length} invoices to process`)

    // 2. Process each invoice
    for (const invoice of invoices) {
      const result = await processInvoice(supabase, invoice)
      results.push(result)

      // Small delay between charges to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    // 3. Summary
    const succeeded = results.filter((r) => r.status === 'succeeded').length
    const failed = results.filter((r) => r.status === 'failed').length
    const skipped = results.filter((r) => r.status === 'skipped').length
    const needsAction = results.filter((r) => r.status === 'requires_action').length
    const timedOut = results.filter((r) => r.status === 'timeout').length

    logger.info('Auto-charge cron completed', {
      total: results.length,
      succeeded,
      failed,
      skipped,
      needsAction,
      timedOut,
    })

    // Send failure summary email if there were failures or timeouts
    if (failed > 0 || timedOut > 0) {
      await sendFailureSummaryEmail(supabase, results, { failed, timedOut, succeeded, total: results.length })
    }

    return NextResponse.json({
      success: true,
      message: 'Auto-charge completed',
      summary: {
        total: results.length,
        succeeded,
        failed,
        skipped,
        requires_action: needsAction,
        timed_out: timedOut,
      },
      results,
    })

  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    logger.error('Auto-charge cron failed', { error: message })

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
 * Process a single invoice for auto-charge
 */
async function processInvoice(
  supabase: Awaited<ReturnType<typeof createClient>>,
  invoice: {
    id: string
    invoice_number: string
    tenant_id: string
    total: number
    due_date: string
    status: string
  }
): Promise<ChargeResult> {
  const baseResult = {
    invoice_id: invoice.id,
    invoice_number: invoice.invoice_number,
    tenant_id: invoice.tenant_id,
    amount: Number(invoice.total),
  }

  try {
    // 1. Get tenant with Stripe info and default payment method
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('stripe_customer_id, default_payment_method_id, name')
      .eq('id', invoice.tenant_id)
      .single()

    if (tenantError || !tenant) {
      logger.warn('Tenant not found for invoice', { invoiceId: invoice.id })
      return { ...baseResult, status: 'skipped', error: 'Tenant not found' }
    }

    // 2. Check if tenant has Stripe customer and default payment method
    if (!tenant.stripe_customer_id) {
      logger.info('Tenant has no Stripe customer', { tenantId: invoice.tenant_id })
      return { ...baseResult, status: 'skipped', error: 'No Stripe customer' }
    }

    if (!tenant.default_payment_method_id) {
      logger.info('Tenant has no default payment method', { tenantId: invoice.tenant_id })
      return { ...baseResult, status: 'skipped', error: 'No default payment method' }
    }

    // 3. Get default payment method
    // SEC-023: Verify payment method ownership - must belong to same tenant as invoice
    const { data: paymentMethod, error: pmError } = await supabase
      .from('tenant_payment_methods')
      .select('id, stripe_payment_method_id, display_name, method_type')
      .eq('id', tenant.default_payment_method_id)
      .eq('tenant_id', invoice.tenant_id)
      .eq('is_active', true)
      .single()

    if (pmError || !paymentMethod || !paymentMethod.stripe_payment_method_id) {
      logger.warn('Default payment method not found, inactive, or tenant mismatch', {
        tenantId: invoice.tenant_id,
        methodId: tenant.default_payment_method_id,
      })
      return { ...baseResult, status: 'skipped', error: 'Payment method not found or tenant mismatch' }
    }

    // 4. Create transaction record
    const { data: transaction, error: txError } = await supabase
      .from('billing_payment_transactions')
      .insert({
        tenant_id: invoice.tenant_id,
        platform_invoice_id: invoice.id,
        amount: invoice.total,
        currency: 'PYG',
        payment_method_type: paymentMethod.method_type,
        payment_method_id: paymentMethod.id,
        status: 'pending',
      })
      .select()
      .single()

    if (txError || !transaction) {
      logger.error('Error creating transaction', { error: txError?.message, invoiceId: invoice.id })
      return { ...baseResult, status: 'failed', error: 'Error creating transaction' }
    }

    // 5. Create PaymentIntent with Stripe (with timeout and retry)
    const amountInSmallestUnit = toStripeAmount(Number(invoice.total), 'PYG')

    let paymentIntent
    try {
      // Wrap Stripe call with retry logic (3 attempts) and timeout (20s per attempt)
      paymentIntent = await withRetry(
        async () => {
          return await withTimeout(
            createPaymentIntent(
              amountInSmallestUnit,
              'PYG',
              tenant.stripe_customer_id,
              paymentMethod.stripe_payment_method_id,
              {
                platform_invoice_id: invoice.id,
                transaction_id: transaction.id,
                tenant_id: invoice.tenant_id,
                invoice_number: invoice.invoice_number,
                auto_charge: 'true',
              }
            ),
            TIMEOUT_PRESETS.PAYMENT,
            `stripe-charge-${invoice.id}`
          )
        },
        {
          maxRetries: 3,
          baseDelayMs: 1000,
          maxDelayMs: 5000,
        }
      )

      // Update transaction with Stripe IDs
      await supabase
        .from('billing_payment_transactions')
        .update({
          stripe_payment_intent_id: paymentIntent.id,
          stripe_charge_id: paymentIntent.latest_charge as string || null,
        })
        .eq('id', transaction.id)

      logger.info('Stripe payment intent created successfully', {
        invoiceId: invoice.id,
        paymentIntentId: paymentIntent.id,
      })

    } catch (stripeError) {
      const isTimeout = isTimeoutError(stripeError)
      const errorMsg = stripeError instanceof Error ? stripeError.message : 'Unknown Stripe error'

      await supabase
        .from('billing_payment_transactions')
        .update({
          status: 'failed',
          failure_reason: isTimeout ? `Timeout after retries: ${errorMsg}` : errorMsg,
          completed_at: new Date().toISOString(),
        })
        .eq('id', transaction.id)

      // Notify admin of failure
      await notifyPaymentFailure(supabase, invoice, tenant.name, errorMsg)

      logger.error('Stripe charge failed after retries', {
        invoiceId: invoice.id,
        tenantId: invoice.tenant_id,
        error: errorMsg,
        isTimeout,
        attempts: 3,
      })

      return {
        ...baseResult,
        status: isTimeout ? 'timeout' : 'failed',
        error: errorMsg,
        timedOut: isTimeout,
      }
    }

    // 6. Handle payment result
    const now = new Date().toISOString()

    if (paymentIntent.status === 'succeeded') {
      // Payment succeeded immediately
      await handleSuccessfulAutoCharge(
        supabase,
        invoice,
        transaction.id,
        paymentMethod.display_name,
        paymentIntent.id
      )

      logger.info('Auto-charge succeeded', {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        amount: invoice.total,
      })

      return { ...baseResult, status: 'succeeded' }

    } else if (paymentIntent.status === 'requires_action') {
      // Needs 3D Secure - can't complete automatically
      await supabase
        .from('billing_payment_transactions')
        .update({ status: 'processing' })
        .eq('id', transaction.id)

      // Notify admin that action is required
      await notifyPaymentActionRequired(supabase, invoice, tenant.name)

      logger.info('Auto-charge requires action', { invoiceId: invoice.id })

      return { ...baseResult, status: 'requires_action', error: 'Requires 3D Secure' }

    } else {
      // Payment failed
      await supabase
        .from('billing_payment_transactions')
        .update({
          status: 'failed',
          failure_reason: `Payment status: ${paymentIntent.status}`,
          completed_at: now,
        })
        .eq('id', transaction.id)

      await notifyPaymentFailure(supabase, invoice, tenant.name, `Status: ${paymentIntent.status}`)

      return { ...baseResult, status: 'failed', error: `Status: ${paymentIntent.status}` }
    }

  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'Unknown error'
    logger.error('Error processing invoice', {
      invoiceId: invoice.id,
      error: errorMsg,
    })
    return { ...baseResult, status: 'failed', error: errorMsg }
  }
}

/**
 * Handle successful auto-charge
 */
async function handleSuccessfulAutoCharge(
  supabase: Awaited<ReturnType<typeof createClient>>,
  invoice: {
    id: string
    invoice_number: string
    tenant_id: string
    total: number
  },
  transactionId: string,
  paymentMethodDisplay: string,
  paymentIntentId: string
): Promise<void> {
  const now = new Date().toISOString()

  // Update transaction
  await supabase
    .from('billing_payment_transactions')
    .update({
      status: 'succeeded',
      completed_at: now,
    })
    .eq('id', transactionId)

  // Update invoice
  await supabase
    .from('platform_invoices')
    .update({
      status: 'paid',
      paid_at: now,
      payment_method: paymentMethodDisplay,
      payment_reference: paymentIntentId,
      updated_at: now,
    })
    .eq('id', invoice.id)

  // Mark commissions as paid
  await supabase
    .from('store_commissions')
    .update({ status: 'paid', paid_at: now })
    .eq('platform_invoice_id', invoice.id)

  await supabase
    .from('service_commissions')
    .update({ status: 'paid', paid_at: now })
    .eq('platform_invoice_id', invoice.id)

  // Update payment method usage
  const { data: paymentMethod } = await supabase
    .from('tenant_payment_methods')
    .select('id, use_count')
    .eq('tenant_id', invoice.tenant_id)
    .eq('display_name', paymentMethodDisplay)
    .single()

  if (paymentMethod) {
    await supabase
      .from('tenant_payment_methods')
      .update({
        use_count: (paymentMethod.use_count || 0) + 1,
        last_used_at: now,
      })
      .eq('id', paymentMethod.id)
  }

  // Create payment confirmation
  await supabase.from('billing_reminders').insert({
    tenant_id: invoice.tenant_id,
    platform_invoice_id: invoice.id,
    reminder_type: 'payment_confirmation',
    channel: 'email',
    sent_at: now,
    subject: `Pago automatico confirmado - Factura ${invoice.invoice_number}`,
    content: `Su pago automatico de ₲${Number(invoice.total).toLocaleString('es-PY')} ha sido procesado exitosamente.`,
  })

  // Notify admin
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
      title: 'Pago automatico confirmado',
      message: `Se ha procesado automaticamente el pago de la factura ${invoice.invoice_number} por ₲${Number(invoice.total).toLocaleString('es-PY')}.`,
    })
  }
}

/**
 * Notify admin of payment failure
 */
async function notifyPaymentFailure(
  supabase: Awaited<ReturnType<typeof createClient>>,
  invoice: { id: string; invoice_number: string; tenant_id: string },
  tenantName: string,
  reason: string
): Promise<void> {
  // Create reminder
  await supabase.from('billing_reminders').insert({
    tenant_id: invoice.tenant_id,
    platform_invoice_id: invoice.id,
    reminder_type: 'overdue_gentle',
    channel: 'email',
    subject: `Error en cobro automatico - Factura ${invoice.invoice_number}`,
    content: `No pudimos procesar el pago automatico para ${tenantName}. Razon: ${reason}. Por favor actualice su metodo de pago.`,
  })

  // Notify admin
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
      title: 'Error en pago automatico',
      message: `No se pudo procesar el pago de la factura ${invoice.invoice_number}. ${reason}`,
    })
  }
}

/**
 * Notify admin that payment requires action (3D Secure)
 */
async function notifyPaymentActionRequired(
  supabase: Awaited<ReturnType<typeof createClient>>,
  invoice: { id: string; invoice_number: string; tenant_id: string },
  _tenantName: string
): Promise<void> {
  // Create reminder
  await supabase.from('billing_reminders').insert({
    tenant_id: invoice.tenant_id,
    platform_invoice_id: invoice.id,
    reminder_type: 'invoice_due',
    channel: 'email',
    subject: `Accion requerida - Factura ${invoice.invoice_number}`,
    content: `Su pago requiere autenticacion adicional. Por favor ingrese a su panel de administracion para completar el pago.`,
  })

  // Notify admin
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
      title: 'Accion requerida para pago',
      message: `La factura ${invoice.invoice_number} requiere autenticacion adicional. Por favor complete el pago manualmente.`,
    })
  }
}

/**
 * Send failure summary email to platform admins
 * Epic 3.3: Notify when auto-charges fail or timeout
 */
async function sendFailureSummaryEmail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  results: ChargeResult[],
  summary: { failed: number; timedOut: number; succeeded: number; total: number }
): Promise<void> {
  const failedResults = results.filter((r) => r.status === 'failed' || r.status === 'timeout')
  
  if (failedResults.length === 0) {
    return
  }

  // Get platform admin emails (you may need to adjust this query based on your schema)
  const { data: platformAdmins } = await supabase
    .from('profiles')
    .select('email')
    .eq('role', 'platform_admin')
    .limit(10)

  if (!platformAdmins || platformAdmins.length === 0) {
    logger.warn('No platform admins found to send auto-charge failure summary')
    return
  }

  const failureDetails = failedResults.map((r) => 
    `- Factura ${r.invoice_number} (${r.tenant_id}): ${r.timedOut ? 'TIMEOUT' : 'FAILED'} - ${r.error || 'Sin detalles'}`
  ).join('\n')

  const emailSubject = `⚠️ Auto-Charge Failures: ${summary.failed + summary.timedOut} de ${summary.total} fallaron`

  // Log the failure summary with all details for monitoring
  logger.error('Auto-charge failures detected', {
    total: summary.total,
    succeeded: summary.succeeded,
    failed: summary.failed,
    timedOut: summary.timedOut,
    failedInvoices: failedResults.map((r) => r.invoice_number),
    failureDetails,
  })

  // Note: In a full implementation, you'd use sendEmailWithRetry here
  // For now, we just log since the cron-external-calls import would be circular
  // The actual email sending can be handled by a separate notification system
  for (const admin of platformAdmins) {
    logger.info('Would send failure summary email', {
      to: admin.email,
      subject: emailSubject,
      failureCount: failedResults.length,
      summary: {
        total: summary.total,
        succeeded: summary.succeeded,
        failed: summary.failed,
        timedOut: summary.timedOut,
      },
    })
  }
}

export const POST = createCronHandler(handler)
