/**
 * Inngest Billing Functions
 *
 * Background jobs for billing operations:
 * - Auto-charge invoices
 * - Evaluate grace periods
 * - Generate platform invoices
 * - Send billing reminders
 * - Generate commission invoices
 */

import { inngest } from '../client'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import {
  createPaymentIntent,
  toStripeAmount,
} from '@/lib/billing/stripe'
import { withTimeout, withRetry, isTimeoutError, TIMEOUT_PRESETS } from '@/lib/utils/timeout'

// =============================================================================
// AUTO-CHARGE FUNCTION
// =============================================================================

interface ChargeResult {
  invoice_id: string
  invoice_number: string
  tenant_id: string
  amount: number
  status: 'succeeded' | 'failed' | 'requires_action' | 'skipped' | 'timeout'
  error?: string
  timedOut?: boolean
}

export const autoChargeInvoices = inngest.createFunction(
  {
    id: 'billing-auto-charge',
    name: 'Auto-Charge Due Invoices',
    // Retry configuration
    retries: 3,
    // Concurrency limit to prevent overwhelming Stripe
    concurrency: {
      limit: 1,
    },
  },
  { cron: '0 10 * * *' }, // Daily at 10:00 UTC (06:00 Paraguay)
  async ({ step }) => {
    const batchSize = 50
    const results: ChargeResult[] = []
    const today = new Date().toISOString().split('T')[0]

    logger.info('Starting auto-charge job', { date: today, batchSize })

    // Step 1: Fetch invoices to process
    const invoices = await step.run('fetch-invoices', async () => {
      const supabase = await createClient('service_role')

      const { data, error } = await supabase
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
        .limit(batchSize)

      if (error) {
        throw new Error(`Error fetching invoices: ${error.message}`)
      }

      return data || []
    })

    if (invoices.length === 0) {
      logger.info('No invoices to process')
      return { success: true, message: 'No invoices to process', processed: 0 }
    }

    logger.info(`Found ${invoices.length} invoices to process`)

    // Step 2: Process each invoice
    for (const invoice of invoices) {
      const result = await step.run(`process-invoice-${invoice.id}`, async () => {
        return await processInvoiceCharge(invoice)
      })

      results.push(result)

      // Small delay between charges to avoid rate limiting
      await step.sleep('rate-limit-delay', '500ms')
    }

    // Step 3: Generate summary
    const summary = {
      total: results.length,
      succeeded: results.filter((r) => r.status === 'succeeded').length,
      failed: results.filter((r) => r.status === 'failed').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
      needsAction: results.filter((r) => r.status === 'requires_action').length,
      timedOut: results.filter((r) => r.status === 'timeout').length,
    }

    logger.info('Auto-charge job completed', summary)

    // Step 4: Send failure summary if there were failures
    if (summary.failed > 0 || summary.timedOut > 0) {
      await step.run('send-failure-summary', async () => {
        await sendFailureSummaryNotification(results, summary)
      })
    }

    return {
      success: summary.failed === 0 && summary.timedOut === 0,
      message: 'Auto-charge completed',
      summary,
      results,
    }
  }
)

async function processInvoiceCharge(invoice: {
  id: string
  invoice_number: string
  tenant_id: string
  total: number
  due_date: string
  status: string
}): Promise<ChargeResult> {
  const supabase = await createClient('service_role')
  const baseResult = {
    invoice_id: invoice.id,
    invoice_number: invoice.invoice_number,
    tenant_id: invoice.tenant_id,
    amount: Number(invoice.total),
  }

  try {
    // Get tenant with Stripe info
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('stripe_customer_id, default_payment_method_id, name')
      .eq('id', invoice.tenant_id)
      .single()

    if (tenantError || !tenant) {
      return { ...baseResult, status: 'skipped', error: 'Tenant not found' }
    }

    if (!tenant.stripe_customer_id) {
      return { ...baseResult, status: 'skipped', error: 'No Stripe customer' }
    }

    if (!tenant.default_payment_method_id) {
      return { ...baseResult, status: 'skipped', error: 'No default payment method' }
    }

    // Get payment method (verify ownership)
    const { data: paymentMethod, error: pmError } = await supabase
      .from('tenant_payment_methods')
      .select('id, stripe_payment_method_id, display_name, method_type')
      .eq('id', tenant.default_payment_method_id)
      .eq('tenant_id', invoice.tenant_id)
      .eq('is_active', true)
      .single()

    if (pmError || !paymentMethod?.stripe_payment_method_id) {
      return { ...baseResult, status: 'skipped', error: 'Payment method not found' }
    }

    // Create transaction record
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
      return { ...baseResult, status: 'failed', error: 'Error creating transaction' }
    }

    // Create PaymentIntent with Stripe (with timeout and retry)
    const amountInSmallestUnit = toStripeAmount(Number(invoice.total), 'PYG')

    let paymentIntent
    try {
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
        { maxRetries: 3, baseDelayMs: 1000, maxDelayMs: 5000 }
      )

      await supabase
        .from('billing_payment_transactions')
        .update({
          stripe_payment_intent_id: paymentIntent.id,
          stripe_charge_id: (paymentIntent.latest_charge as string) || null,
        })
        .eq('id', transaction.id)
    } catch (stripeError: unknown) {
      const isTimeout = isTimeoutError(stripeError)
      const errorMsg = stripeError instanceof Error ? stripeError.message : 'Unknown Stripe error'

      await supabase
        .from('billing_payment_transactions')
        .update({
          status: 'failed',
          failure_reason: isTimeout ? `Timeout: ${errorMsg}` : errorMsg,
          completed_at: new Date().toISOString(),
        })
        .eq('id', transaction.id)

      return {
        ...baseResult,
        status: isTimeout ? 'timeout' : 'failed',
        error: errorMsg,
        timedOut: isTimeout,
      }
    }

    // Handle payment result
    const now = new Date().toISOString()

    if (paymentIntent.status === 'succeeded') {
      await handleSuccessfulCharge(supabase, invoice, transaction.id, paymentMethod.display_name, paymentIntent.id)
      return { ...baseResult, status: 'succeeded' }
    } else if (paymentIntent.status === 'requires_action') {
      await supabase
        .from('billing_payment_transactions')
        .update({ status: 'processing' })
        .eq('id', transaction.id)
      return { ...baseResult, status: 'requires_action', error: 'Requires 3D Secure' }
    } else {
      await supabase
        .from('billing_payment_transactions')
        .update({
          status: 'failed',
          failure_reason: `Payment status: ${paymentIntent.status}`,
          completed_at: now,
        })
        .eq('id', transaction.id)
      return { ...baseResult, status: 'failed', error: `Status: ${paymentIntent.status}` }
    }
  } catch (e: unknown) {
    return { ...baseResult, status: 'failed', error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

async function handleSuccessfulCharge(
  supabase: Awaited<ReturnType<typeof createClient>>,
  invoice: { id: string; invoice_number: string; tenant_id: string; total: number },
  transactionId: string,
  paymentMethodDisplay: string,
  paymentIntentId: string
): Promise<void> {
  const now = new Date().toISOString()

  // Update transaction
  await supabase
    .from('billing_payment_transactions')
    .update({ status: 'succeeded', completed_at: now })
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
      message: `Se proceso el pago de la factura ${invoice.invoice_number} por ₲${Number(invoice.total).toLocaleString('es-PY')}.`,
    })
  }
}

async function sendFailureSummaryNotification(
  results: ChargeResult[],
  summary: { failed: number; timedOut: number; succeeded: number; total: number }
): Promise<void> {
  const failedResults = results.filter((r) => r.status === 'failed' || r.status === 'timeout')

  logger.error('Auto-charge failures detected', {
    total: summary.total,
    succeeded: summary.succeeded,
    failed: summary.failed,
    timedOut: summary.timedOut,
    failedInvoices: failedResults.map((r) => r.invoice_number),
  })
}

// =============================================================================
// EVALUATE GRACE PERIODS
// =============================================================================

export const evaluateGracePeriods = inngest.createFunction(
  {
    id: 'billing-evaluate-grace',
    name: 'Evaluate Grace Periods',
    retries: 2,
  },
  { cron: '0 11 * * *' }, // Daily at 11:00 UTC
  async ({ step }) => {
    // For cron jobs, process all tenants
    const tenantId: string | undefined = undefined

    const result = await step.run('evaluate-grace', async () => {
      const supabase = await createClient('service_role')
      const today = new Date().toISOString().split('T')[0]

      // Find invoices past grace period
      let query = supabase
        .from('platform_invoices')
        .select('id, tenant_id, invoice_number, grace_period_end')
        .eq('status', 'overdue')
        .lt('grace_period_end', today)
        .limit(100)

      if (tenantId) {
        query = query.eq('tenant_id', tenantId)
      }

      const { data: invoices, error } = await query

      if (error) {
        throw new Error(`Query error: ${error.message}`)
      }

      if (!invoices || invoices.length === 0) {
        return { processed: 0, suspended: 0 }
      }

      let suspended = 0
      for (const invoice of invoices) {
        // Mark invoice as delinquent
        await supabase
          .from('platform_invoices')
          .update({ status: 'delinquent' })
          .eq('id', invoice.id)

        // Suspend tenant services
        await supabase
          .from('tenants')
          .update({ status: 'suspended', suspended_at: new Date().toISOString() })
          .eq('id', invoice.tenant_id)

        suspended++

        logger.info('Tenant suspended for non-payment', {
          tenantId: invoice.tenant_id,
          invoiceNumber: invoice.invoice_number,
        })
      }

      return { processed: invoices.length, suspended }
    })

    return { success: true, ...result }
  }
)

// =============================================================================
// GENERATE PLATFORM INVOICES
// =============================================================================

export const generatePlatformInvoices = inngest.createFunction(
  {
    id: 'billing-generate-platform-invoices',
    name: 'Generate Platform Invoices',
    retries: 2,
  },
  { cron: '0 0 1 * *' }, // 1st of month at 00:00 UTC
  async ({ step }) => {
    // For cron jobs, use current month
    const targetMonth = new Date().toISOString().slice(0, 7)

    const result = await step.run('generate-invoices', async () => {
      const supabase = await createClient('service_role')

      // Call database RPC to generate invoices
      const { data, error } = await supabase.rpc('generate_platform_invoices', {
        p_billing_period: targetMonth,
      })

      if (error) {
        throw new Error(`Invoice generation failed: ${error.message}`)
      }

      return { invoicesGenerated: data || 0 }
    })

    logger.info('Platform invoices generated', { month: targetMonth, ...result })
    return { success: true, month: targetMonth, ...result }
  }
)

// =============================================================================
// SEND BILLING REMINDERS
// =============================================================================

export const sendBillingReminders = inngest.createFunction(
  {
    id: 'billing-send-reminders',
    name: 'Send Billing Reminders',
    retries: 2,
  },
  { cron: '0 9 * * *' }, // Daily at 09:00 UTC
  async ({ step }) => {
    const result = await step.run('send-reminders', async () => {
      const supabase = await createClient('service_role')
      const today = new Date()

      // Get pending reminders
      const { data: reminders, error } = await supabase
        .from('billing_reminders')
        .select('*, platform_invoices(tenant_id, invoice_number, total)')
        .is('sent_at', null)
        .lte('scheduled_for', today.toISOString())
        .limit(100)

      if (error) {
        throw new Error(`Query error: ${error.message}`)
      }

      if (!reminders || reminders.length === 0) {
        return { sent: 0 }
      }

      let sent = 0
      for (const reminder of reminders) {
        // Mark as sent
        await supabase
          .from('billing_reminders')
          .update({ sent_at: new Date().toISOString() })
          .eq('id', reminder.id)

        sent++
      }

      return { sent }
    })

    logger.info('Billing reminders sent', result)
    return { success: true, ...result }
  }
)

// =============================================================================
// GENERATE COMMISSION INVOICES
// =============================================================================

export const generateCommissionInvoices = inngest.createFunction(
  {
    id: 'billing-generate-commission-invoices',
    name: 'Generate Commission Invoices',
    retries: 2,
  },
  { cron: '0 1 1 * *' }, // 1st of month at 01:00 UTC
  async ({ step }) => {
    // For cron jobs, use current month
    const targetMonth = new Date().toISOString().slice(0, 7)

    const result = await step.run('generate-commissions', async () => {
      const supabase = await createClient('service_role')

      // Call database RPC to generate commission invoices
      const { data, error } = await supabase.rpc('generate_commission_invoices', {
        p_billing_period: targetMonth,
      })

      if (error) {
        throw new Error(`Commission generation failed: ${error.message}`)
      }

      return { invoicesGenerated: data || 0 }
    })

    logger.info('Commission invoices generated', { month: targetMonth, ...result })
    return { success: true, month: targetMonth, ...result }
  }
)
