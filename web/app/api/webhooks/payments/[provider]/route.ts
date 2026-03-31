import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPaymentService } from '@/lib/payments/service'
import { logger } from '@/lib/logger'
import type { WebhookEvent } from '@/lib/payments/types'

interface RouteParams {
  params: Promise<{ provider: string }>
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { provider } = await params
  
  const supportedProviders = ['stripe', 'bancard', 'tigo_money']
  if (!supportedProviders.includes(provider)) {
    logger.error('Unsupported provider in webhook', { provider })
    return NextResponse.json(
      { error: 'Proveedor no soportado' },
      { status: 400 }
    )
  }

  const webhookSecret = getWebhookSecret(provider)
  if (!webhookSecret) {
    logger.error('Webhook secret not configured', { provider })
    return NextResponse.json(
      { error: 'Webhook no configurado' },
      { status: 500 }
    )
  }

  const body = await request.text()
  const signature = request.headers.get('signature') || 
                   request.headers.get(`${provider}-signature`) ||
                   request.headers.get('webhook-signature')

  if (!signature) {
    logger.warn('Missing signature header', { provider })
    return NextResponse.json(
      { error: 'Firma requerida' },
      { status: 400 }
    )
  }

  const paymentService = getPaymentService(provider)
  
  try {
    const verificationResult = await paymentService.verifyWebhook(
      JSON.parse(body), 
      signature, 
      webhookSecret
    )

    if (!verificationResult.success || !verificationResult.data) {
      logger.error('Webhook verification failed', { 
        provider, 
        error: verificationResult.error?.message 
      })
      return NextResponse.json(
        { error: 'Verificación fallida' },
        { status: 400 }
      )
    }

    const event = verificationResult.data
    const supabase = await createClient('service_role')

    await handleWebhookEvent(supabase, provider, event)

    return NextResponse.json({ received: true })

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error desconocido'
    logger.error('Error procesando webhook', {
      provider,
      error: message,
    })

    return NextResponse.json({ received: true, error: message })
  }
}

function getWebhookSecret(provider: string): string | null {
  switch (provider) {
    case 'stripe':
      return process.env.STRIPE_WEBHOOK_SECRET || null
    case 'bancard':
      return process.env.BANCARD_WEBHOOK_SECRET || null
    case 'tigo_money':
      return process.env.TIGO_MONEY_WEBHOOK_SECRET || null
    default:
      return null
  }
}

async function handleWebhookEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  provider: string,
  event: WebhookEvent
): Promise<void> {
  logger.info('Processing webhook event', {
    provider,
    eventType: event.type || 'unknown',
    eventId: event.id || 'unknown',
  })

  switch (provider) {
    case 'stripe':
      await handleStripeWebhookEvent(supabase, event)
      break
    case 'bancard':
      await handleBancardWebhookEvent(supabase, event)
      break
    case 'tigo_money':
      await handleTigoMoneyWebhookEvent(supabase, event)
      break
    default:
      logger.warn('No handler for provider', { provider })
  }
}

async function handleStripeWebhookEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  event: WebhookEvent
): Promise<void> {
  const data = event.data.object as Record<string, unknown>
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(supabase, data)
      break

    case 'payment_intent.payment_failed':
      await handlePaymentIntentFailed(supabase, data)
      break

    case 'charge.refunded':
      await handleChargeRefunded(supabase, data, 'stripe')
      break

    case 'setup_intent.succeeded':
      await handleSetupIntentSucceeded(supabase, data)
      break

    case 'customer.subscription.created':
      await handleSubscriptionCreated(supabase, data)
      break

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      logger.info('Subscription event received', {
        type: event.type,
        subscriptionId: String(data.id),
      })
      break

    default:
      logger.info('Unhandled Stripe webhook event', { type: event.type })
  }
}

async function handleBancardWebhookEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  event: WebhookEvent
): Promise<void> {
  logger.info('Bancard webhook received', { event })
}

async function handleTigoMoneyWebhookEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  event: WebhookEvent
): Promise<void> {
  logger.info('Tigo Money webhook received', { event })
}

async function handlePaymentIntentSucceeded(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paymentIntent: Record<string, unknown>
): Promise<void> {
  const metadata = (paymentIntent.metadata as Record<string, unknown>) || {}
  const transactionId = metadata.transaction_id as string
  const platformInvoiceId = metadata.platform_invoice_id as string
  const storeInvoiceId = metadata.invoice_id as string
  const tenantId = metadata.tenant_id as string

  logger.info('Payment intent succeeded', {
    paymentIntentId: paymentIntent.id,
    transactionId,
    platformInvoiceId,
    storeInvoiceId,
    amount: paymentIntent.amount,
  })

  const now = new Date().toISOString()

  if (transactionId || platformInvoiceId) {
    if (transactionId) {
      const { error: txError } = await supabase
        .from('billing_payment_transactions')
        .update({
          status: 'succeeded',
          stripe_charge_id: (paymentIntent.latest_charge as string) || null,
          completed_at: now,
        })
        .eq('id', transactionId)

      if (txError) {
        logger.error('Error updating transaction', { error: txError.message, transactionId })
      }
    }

    if (platformInvoiceId) {
      const { data: existingInvoice } = await supabase
        .from('platform_invoices')
        .select('status')
        .eq('id', platformInvoiceId)
        .single()

      if (existingInvoice && existingInvoice.status !== 'paid') {
        await supabase
          .from('platform_invoices')
          .update({
            status: 'paid',
            paid_at: now,
            payment_reference: paymentIntent.id as string,
            updated_at: now,
          })
          .eq('id', platformInvoiceId)

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

  if (storeInvoiceId && tenantId) {
    logger.info('Recording store invoice payment via RPC', { storeInvoiceId, tenantId })
    
    const { data: rpcResult, error: rpcError } = await supabase.rpc('record_invoice_payment', {
      p_invoice_id: storeInvoiceId,
      p_tenant_id: tenantId,
      p_amount: paymentIntent.amount as number,
      p_payment_method: 'stripe',
      p_reference_number: paymentIntent.id as string,
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
        message: `Su pago de ₲${((paymentIntent.amount as number) || 0).toLocaleString('es-PY')} ha sido procesado exitosamente.`,
      })
    }
  }
}

async function handlePaymentIntentFailed(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paymentIntent: Record<string, unknown>
): Promise<void> {
  const metadata = (paymentIntent.metadata as Record<string, unknown>) || {}
  const transactionId = metadata.transaction_id as string
  const invoiceId = metadata.platform_invoice_id as string
  const tenantId = metadata.tenant_id as string

  const lastPaymentError = (paymentIntent.last_payment_error as Record<string, unknown>) || {}
  const failureMessage = (lastPaymentError.message as string) || 'Error desconocido'

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

  await supabase
    .from('billing_payment_transactions')
    .update({
      status: 'failed',
      failure_reason: failureMessage,
      completed_at: now,
    })
    .eq('id', transactionId)

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
        message: `No se pudo procesar el pago. Razón: ${failureMessage}`,
      })
    }

    if (invoiceId) {
      await supabase.from('billing_reminders').insert({
        tenant_id: tenantId,
        platform_invoice_id: invoiceId,
        reminder_type: 'overdue_gentle',
        channel: 'email',
        subject: 'Error al procesar su pago',
        content: `Hubo un problema al procesar su pago. Por favor intente nuevamente o utilice otro método de pago.`,
      })
    }
  }
}

async function handleChargeRefunded(
  supabase: Awaited<ReturnType<typeof createClient>>,
  charge: Record<string, unknown>,
  provider: string
): Promise<void> {
  const paymentIntentId = charge.payment_intent as string

  logger.info('Charge refunded', {
    chargeId: charge.id,
    paymentIntentId,
    amountRefunded: charge.amount_refunded,
    provider,
  })

  if (!paymentIntentId) {
    return
  }

  const { data: transaction } = await supabase
    .from('billing_payment_transactions')
    .select('id, tenant_id, platform_invoice_id')
    .eq(`${provider}_payment_intent_id`, paymentIntentId)
    .single()

  if (!transaction) {
    logger.warn('Transaction not found for refunded charge', { paymentIntentId, provider })
    return
  }

  const now = new Date().toISOString()

  if (charge.refunded) {
    await supabase
      .from('billing_payment_transactions')
      .update({
        status: 'refunded',
        completed_at: now,
      })
      .eq('id', transaction.id)

    if (transaction.platform_invoice_id) {
      await supabase
        .from('platform_invoices')
        .update({
          status: 'sent',
          paid_at: null,
          updated_at: now,
        })
        .eq('id', transaction.platform_invoice_id)

      await supabase
        .from('store_commissions')
        .update({ status: 'invoiced', paid_at: null })
        .eq('platform_invoice_id', transaction.platform_invoice_id)

      await supabase
        .from('service_commissions')
        .update({ status: 'invoiced', paid_at: null })
        .eq('platform_invoice_id', transaction.platform_invoice_id)
    }

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
          message: `Se ha procesado un reembolso de ₲${((charge.amount_refunded as number) || 0).toLocaleString('es-PY')}.`,
        })
      }
    }
  }
}

async function handleSetupIntentSucceeded(
  supabase: Awaited<ReturnType<typeof createClient>>,
  setupIntent: Record<string, unknown>
): Promise<void> {
  const metadata = (setupIntent.metadata as Record<string, unknown>) || {}
  const tenantId = metadata.tenant_id as string
  const paymentMethodId = setupIntent.payment_method as string

  logger.info('Setup intent succeeded', {
    setupIntentId: setupIntent.id,
    tenantId,
    paymentMethodId,
  })

  if (!tenantId || !paymentMethodId) {
    return
  }

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

  logger.info('Payment method not yet saved, client should call API', {
    tenantId,
    paymentMethodId,
    setupIntentId: setupIntent.id,
  })
}

async function handleSubscriptionCreated(
  supabase: Awaited<ReturnType<typeof createClient>>,
  subscription: Record<string, unknown>
): Promise<void> {
  const customerId = subscription.customer as string
  const subscriptionItems = (subscription.items as Record<string, unknown>)?.data as Record<string, unknown>[] || []
  const subscriptionAmount = subscriptionItems.reduce(
    (total: number, item: Record<string, unknown>) => {
      const price = item.price as Record<string, unknown>
      return total + ((price?.unit_amount as number) || 0)
    },
    0
  )

  logger.info('Subscription created', {
    subscriptionId: subscription.id,
    customerId,
    status: subscription.status,
    amount: subscriptionAmount,
  })

  if (subscription.status !== 'active') {
    logger.info('Subscription not active, skipping ambassador conversion', {
      subscriptionId: subscription.id,
      status: subscription.status,
    })
    return
  }

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, referred_by_ambassador_id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (tenantError || !tenant) {
    logger.warn('Tenant not found for subscription', { customerId })
    return
  }

  if (!tenant.referred_by_ambassador_id) {
    logger.info('Tenant has no ambassador referral, skipping', {
      tenantId: tenant.id,
    })
    return
  }

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
        subscriptionAmount: subscriptionAmount / 100,
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

    const result = await response.json().catch((parseError: unknown) => {
      logger.error('Failed to parse ambassador conversion response', {
        tenantId: tenant.id,
        error: parseError instanceof Error ? parseError.message : 'JSON parse error',
      })
      return {}
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
