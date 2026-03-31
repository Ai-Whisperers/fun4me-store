/**
 * Stripe Webhook Handler
 *
 * POST /api/webhooks/stripe
 *
 * Handles Stripe webhook events for:
 * - Payment confirmation (payment_intent.succeeded)
 * - Payment failure (payment_intent.payment_failed)
 * - Refunds (charge.refunded)
 * - Setup completion (setup_intent.succeeded)
 *
 * Environment variables required:
 * - STRIPE_WEBHOOK_SECRET: Webhook signing secret from Stripe dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { constructWebhookEvent } from '@/lib/billing/stripe'
import { logger } from '@/lib/logger'
import type Stripe from 'stripe'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    logger.error('STRIPE_WEBHOOK_SECRET not configured')
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 500 }
    )
  }

  // Get raw body for signature verification
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    logger.warn('Missing stripe-signature header')
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = constructWebhookEvent(body, signature, webhookSecret)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    logger.error('Webhook signature verification failed', { error: message })
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  // Use service client for admin operations (bypasses RLS)
  const supabase = await createClient('service_role')

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(supabase, event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(supabase, event.data.object as Stripe.PaymentIntent)
        break

      case 'charge.refunded':
        await handleChargeRefunded(supabase, event.data.object as Stripe.Charge)
        break

      case 'setup_intent.succeeded':
        await handleSetupIntentSucceeded(supabase, event.data.object as Stripe.SetupIntent)
        break

      case 'customer.subscription.created':
        await handleSubscriptionCreated(supabase, event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        // Future: Handle subscription update/cancellation events
        logger.info('Subscription event received', {
          type: event.type,
          subscriptionId: (event.data.object as Stripe.Subscription).id,
        })
        break

      default:
        logger.info('Unhandled webhook event', { type: event.type })
    }

    return NextResponse.json({ received: true })

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    logger.error('Error processing webhook', {
      eventType: event.type,
      eventId: event.id,
      error: message,
    })

    // Return 200 to acknowledge receipt even on processing error
    // This prevents Stripe from retrying indefinitely
    return NextResponse.json({ received: true, error: message })
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentIntentSucceeded(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  const metadata = paymentIntent.metadata
  const transactionId = metadata.transaction_id
  const platformInvoiceId = metadata.platform_invoice_id
  const storeInvoiceId = metadata.invoice_id
  const tenantId = metadata.tenant_id

  logger.info('Payment intent succeeded', {
    paymentIntentId: paymentIntent.id,
    transactionId,
    platformInvoiceId,
    storeInvoiceId,
    amount: paymentIntent.amount,
  })

  const now = new Date().toISOString()

  // 1. Handle Platform Billing (Legacy/Platform invoices)
  if (transactionId || platformInvoiceId) {
    // Update transaction if present
    if (transactionId) {
      const { error: txError } = await supabase
        .from('billing_payment_transactions')
        .update({
          status: 'succeeded',
          stripe_charge_id: paymentIntent.latest_charge as string || null,
          completed_at: now,
        })
        .eq('id', transactionId)

      if (txError) {
        logger.error('Error updating transaction', { error: txError.message, transactionId })
      }
    }

    // Update platform invoice if present
    if (platformInvoiceId) {
      const { data: existingInvoice } = await supabase
        .from('platform_invoices')
        .select('status')
        .eq('id', platformInvoiceId)
        .single()

      // Only update if not already paid (avoid duplicate webhooks)
      if (existingInvoice && existingInvoice.status !== 'paid') {
        await supabase
          .from('platform_invoices')
          .update({
            status: 'paid',
            paid_at: now,
            payment_reference: paymentIntent.id,
            updated_at: now,
          })
          .eq('id', platformInvoiceId)

        // Mark commissions as paid
        await supabase
          .from('store_commissions')
          .update({ status: 'paid', paid_at: now })
          .eq('platform_invoice_id', platformInvoiceId)

        await supabase
          .from('service_commissions')
          .update({ status: 'paid', paid_at: now })
          .eq('platform_invoice_id', platformInvoiceId)
      }
    }
  }

  // 2. Handle Store Invoices (Clinic invoices)
  if (storeInvoiceId && tenantId) {
    logger.info('Recording store invoice payment via RPC', { storeInvoiceId, tenantId })
    
    // We use the atomic RPC function for store invoices
    const { data: rpcResult, error: rpcError } = await supabase.rpc('record_invoice_payment', {
      p_invoice_id: storeInvoiceId,
      p_tenant_id: tenantId,
      p_amount: paymentIntent.amount, // Stripe units for PYG match DB units
      p_payment_method: 'stripe',
      p_reference_number: paymentIntent.id,
      p_notes: `Pago procesado vía Stripe (Webhook). Intent ID: ${paymentIntent.id}`,
    })

    if (rpcError) {
      logger.error('RPC record_invoice_payment failed in webhook', { 
        error: rpcError, 
        storeInvoiceId, 
        tenantId 
      })
    } else {
      logger.info('RPC record_invoice_payment successful', { rpcResult, storeInvoiceId })
    }
  }

  // 3. Send Notification to Admin
  if (tenantId) {
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('role', 'admin')
      .limit(1)
      .single()

    if (adminProfile) {
      await supabase.from('notifications').insert({
        user_id: adminProfile.id,
        title: 'Pago confirmado',
        message: `Su pago de ₲${(paymentIntent.amount).toLocaleString('es-PY')} ha sido procesado exitosamente.`,
      })
    }
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentIntentFailed(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  const metadata = paymentIntent.metadata
  const transactionId = metadata.transaction_id
  const invoiceId = metadata.platform_invoice_id
  const tenantId = metadata.tenant_id

  const failureMessage = paymentIntent.last_payment_error?.message || 'Unknown error'

  logger.warn('Payment intent failed', {
    paymentIntentId: paymentIntent.id,
    transactionId,
    invoiceId,
    error: failureMessage,
  })

  if (!transactionId) {
    return
  }

  const now = new Date().toISOString()

  // Update transaction
  await supabase
    .from('billing_payment_transactions')
    .update({
      status: 'failed',
      failure_reason: failureMessage,
      completed_at: now,
    })
    .eq('id', transactionId)

  // Create failure notification
  if (tenantId) {
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('role', 'admin')
      .limit(1)
      .single()

    if (adminProfile) {
      await supabase.from('notifications').insert({
        user_id: adminProfile.id,
        title: 'Error en el pago',
        message: `No se pudo procesar el pago. Razon: ${failureMessage}`,
      })
    }

    // Create reminder for failed payment
    if (invoiceId) {
      await supabase.from('billing_reminders').insert({
        tenant_id: tenantId,
        platform_invoice_id: invoiceId,
        reminder_type: 'overdue_gentle',
        channel: 'email',
        subject: 'Error al procesar su pago',
        content: `Hubo un problema al procesar su pago. Por favor intente nuevamente o utilice otro metodo de pago.`,
      })
    }
  }
}

/**
 * Handle refund
 */
async function handleChargeRefunded(
  supabase: Awaited<ReturnType<typeof createClient>>,
  charge: Stripe.Charge
): Promise<void> {
  const paymentIntentId = charge.payment_intent as string

  logger.info('Charge refunded', {
    chargeId: charge.id,
    paymentIntentId,
    amountRefunded: charge.amount_refunded,
  })

  if (!paymentIntentId) {
    return
  }

  // Find transaction by Stripe payment intent ID
  const { data: transaction } = await supabase
    .from('billing_payment_transactions')
    .select('id, tenant_id, platform_invoice_id')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .single()

  if (!transaction) {
    logger.warn('Transaction not found for refunded charge', { paymentIntentId })
    return
  }

  const now = new Date().toISOString()

  // Check if fully refunded
  if (charge.refunded) {
    await supabase
      .from('billing_payment_transactions')
      .update({
        status: 'refunded',
        completed_at: now,
      })
      .eq('id', transaction.id)

    // Revert invoice to unpaid if fully refunded
    if (transaction.platform_invoice_id) {
      await supabase
        .from('platform_invoices')
        .update({
          status: 'sent', // Back to unpaid/sent
          paid_at: null,
          updated_at: now,
        })
        .eq('id', transaction.platform_invoice_id)

      // Revert commissions to invoiced (not paid)
      await supabase
        .from('store_commissions')
        .update({ status: 'invoiced', paid_at: null })
        .eq('platform_invoice_id', transaction.platform_invoice_id)

      await supabase
        .from('service_commissions')
        .update({ status: 'invoiced', paid_at: null })
        .eq('platform_invoice_id', transaction.platform_invoice_id)
    }

    // Notify admin
    if (transaction.tenant_id) {
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('tenant_id', transaction.tenant_id)
        .eq('role', 'admin')
        .limit(1)
        .single()

      if (adminProfile) {
        await supabase.from('notifications').insert({
          user_id: adminProfile.id,
          title: 'Reembolso procesado',
          message: `Se ha procesado un reembolso de ₲${charge.amount_refunded.toLocaleString('es-PY')}.`,
        })
      }
    }
  }
}

/**
 * Handle new subscription created
 * Triggers ambassador conversion if applicable
 */
async function handleSubscriptionCreated(
  supabase: Awaited<ReturnType<typeof createClient>>,
  subscription: Stripe.Subscription
): Promise<void> {
  const customerId = subscription.customer as string
  const subscriptionAmount = subscription.items.data.reduce(
    (total, item) => total + (item.price?.unit_amount || 0),
    0
  )

  logger.info('Subscription created', {
    subscriptionId: subscription.id,
    customerId,
    status: subscription.status,
    amount: subscriptionAmount,
  })

  // Only process if subscription is active (paid)
  if (subscription.status !== 'active') {
    logger.info('Subscription not active, skipping ambassador conversion', {
      subscriptionId: subscription.id,
      status: subscription.status,
    })
    return
  }

  // Find tenant by Stripe customer ID
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, referred_by_ambassador_id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (tenantError || !tenant) {
    logger.warn('Tenant not found for subscription', { customerId })
    return
  }

  // Check if tenant has ambassador referral
  if (!tenant.referred_by_ambassador_id) {
    logger.info('Tenant has no ambassador referral, skipping', {
      tenantId: tenant.id,
    })
    return
  }

  // Trigger ambassador conversion
  try {
    const internalSecret = process.env.INTERNAL_API_SECRET || process.env.CRON_SECRET
    if (!internalSecret) {
      logger.error('No internal API secret configured for ambassador conversion')
      return
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/ambassador/process-conversion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${internalSecret}`,
      },
      body: JSON.stringify({
        tenantId: tenant.id,
        subscriptionAmount: subscriptionAmount / 100, // Convert from cents
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      logger.error('Ambassador conversion API failed', {
        tenantId: tenant.id,
        status: response.status,
        error: errorData,
      })
      return
    }

    // Epic 3.4: Parse JSON with error handling (prevents silent failures)
    const result = await response.json().catch((parseError) => {
      logger.error('Failed to parse ambassador conversion response', {
        tenantId: tenant.id,
        error: parseError instanceof Error ? parseError.message : 'JSON parse error',
      })
      return {} // Return empty object on parse failure
    })
    
    logger.info('Ambassador conversion triggered', {
      tenantId: tenant.id,
      result,
    })
  } catch (error: unknown) {
    logger.error('Error triggering ambassador conversion', {
      tenantId: tenant.id,
      error: error instanceof Error ? error.message : 'Unknown',
    })
  }
}

/**
 * Handle successful setup (card saved)
 * Note: We're saving payment methods via POST /api/billing/payment-methods
 * This handler is for redundancy/webhooks-first flows
 */
async function handleSetupIntentSucceeded(
  supabase: Awaited<ReturnType<typeof createClient>>,
  setupIntent: Stripe.SetupIntent
): Promise<void> {
  const metadata = setupIntent.metadata
  const tenantId = metadata?.tenant_id
  const paymentMethodId = setupIntent.payment_method as string

  logger.info('Setup intent succeeded', {
    setupIntentId: setupIntent.id,
    tenantId,
    paymentMethodId,
  })

  // We could auto-save the payment method here, but our current flow
  // has the client call POST /api/billing/payment-methods after confirmation.
  // This webhook ensures we have a record even if client-side fails.

  if (!tenantId || !paymentMethodId) {
    return
  }

  // Check if payment method already saved
  const { data: existing } = await supabase
    .from('tenant_payment_methods')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('stripe_payment_method_id', paymentMethodId)
    .single()

  if (existing) {
    logger.info('Payment method already saved', { paymentMethodId })
    return
  }

  // Optional: Auto-save payment method from webhook
  // For now, we just log it since client handles this
  logger.info('Payment method not yet saved, client should call API', {
    tenantId,
    paymentMethodId,
    setupIntentId: setupIntent.id,
  })
}
