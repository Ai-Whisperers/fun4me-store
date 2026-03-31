/**
 * Pay Invoice API
 *
 * POST /api/billing/pay-invoice
 *
 * Processes payment for a platform invoice using a saved payment method.
 * Creates a PaymentIntent with Stripe and records the transaction.
 *
 * Request body:
 * {
 *   invoice_id: string (required)
 *   payment_method_id?: string (optional, uses default if not provided)
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import {
  createPaymentIntent,
  toStripeAmount,
} from '@/lib/billing/stripe'

interface PayInvoiceRequest {
  invoice_id: string
  payment_method_id?: string
}

export async function POST(request: NextRequest): Promise<NextResponse> {
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

  if (profile.role !== 'admin') {
    return apiError('INSUFFICIENT_ROLE', HTTP_STATUS.FORBIDDEN, {
      details: { required: ['admin'], current: profile.role },
    })
  }

  try {
    // 3. Parse request
    const body: PayInvoiceRequest = await request.json()

    if (!body.invoice_id) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'invoice_id es requerido' },
      })
    }

    // 4. Get invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('platform_invoices')
      .select('*')
      .eq('id', body.invoice_id)
      .single()

    if (invoiceError || !invoice) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'platform_invoice' },
      })
    }

    // Verify ownership
    if (invoice.tenant_id !== profile.tenant_id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, {
        details: { message: 'No puede pagar facturas de otra clinica' },
      })
    }

    // Check invoice status
    if (invoice.status === 'paid') {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'Esta factura ya esta pagada' },
      })
    }

    if (invoice.status === 'void') {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'Esta factura ha sido anulada' },
      })
    }

    // 5. Get tenant with Stripe customer
    const { data: tenant } = await supabase
      .from('tenants')
      .select('stripe_customer_id, default_payment_method_id')
      .eq('id', profile.tenant_id)
      .single()

    if (!tenant?.stripe_customer_id) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'No hay cliente de Stripe configurado. Agregue un metodo de pago primero.' },
      })
    }

    // 6. Get payment method
    const paymentMethodId = body.payment_method_id || tenant.default_payment_method_id

    if (!paymentMethodId) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'No hay metodo de pago especificado ni predeterminado' },
      })
    }

    const { data: paymentMethod, error: pmError } = await supabase
      .from('tenant_payment_methods')
      .select('id, stripe_payment_method_id, display_name, method_type')
      .eq('id', paymentMethodId)
      .eq('is_active', true)
      .single()

    if (pmError || !paymentMethod) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'payment_method', message: 'Metodo de pago no encontrado o inactivo' },
      })
    }

    // Verify payment method ownership
    const { data: pmOwnership } = await supabase
      .from('tenant_payment_methods')
      .select('tenant_id')
      .eq('id', paymentMethodId)
      .single()

    if (pmOwnership?.tenant_id !== profile.tenant_id) {
      return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, {
        details: { message: 'El metodo de pago no pertenece a esta clinica' },
      })
    }

    if (!paymentMethod.stripe_payment_method_id) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'Este metodo de pago no tiene un ID de Stripe asociado' },
      })
    }

    // 7. Create billing transaction record (pending)
    const { data: transaction, error: txError } = await supabase
      .from('billing_payment_transactions')
      .insert({
        tenant_id: profile.tenant_id,
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
      throw new Error('Error creating transaction record')
    }

    // 8. Create PaymentIntent with Stripe
    let paymentIntent
    try {
      const amountInSmallestUnit = toStripeAmount(Number(invoice.total), 'PYG')

      paymentIntent = await createPaymentIntent(
        amountInSmallestUnit,
        'PYG',
        tenant.stripe_customer_id,
        paymentMethod.stripe_payment_method_id,
        {
          platform_invoice_id: invoice.id,
          transaction_id: transaction.id,
          tenant_id: profile.tenant_id,
          invoice_number: invoice.invoice_number,
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

    } catch (stripeError) {
      // Update transaction as failed
      await supabase
        .from('billing_payment_transactions')
        .update({
          status: 'failed',
          failure_reason: stripeError instanceof Error ? stripeError.message : 'Unknown Stripe error',
          completed_at: new Date().toISOString(),
        })
        .eq('id', transaction.id)

      logger.error('Stripe payment failed', {
        invoiceId: invoice.id,
        tenantId: profile.tenant_id,
        error: stripeError instanceof Error ? stripeError.message : 'Unknown',
      })

      return apiError('PAYMENT_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
        details: { message: 'Error al procesar el pago con Stripe' },
      })
    }

    // 9. Check payment status
    if (paymentIntent.status === 'succeeded') {
      // Payment succeeded immediately
      await handleSuccessfulPayment(supabase, invoice, transaction.id, profile.tenant_id, paymentMethod.display_name)

      logger.info('Invoice paid successfully', {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        tenantId: profile.tenant_id,
        amount: invoice.total,
        paymentIntentId: paymentIntent.id,
      })

      return NextResponse.json({
        success: true,
        message: 'Pago procesado exitosamente',
        payment: {
          status: 'succeeded',
          amount: invoice.total,
          currency: 'PYG',
          invoice_number: invoice.invoice_number,
          payment_method: paymentMethod.display_name,
        },
      })

    } else if (paymentIntent.status === 'requires_action') {
      // Needs 3D Secure or other action
      await supabase
        .from('billing_payment_transactions')
        .update({ status: 'processing' })
        .eq('id', transaction.id)

      return NextResponse.json({
        success: false,
        requires_action: true,
        message: 'El pago requiere autenticacion adicional',
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
      })

    } else if (paymentIntent.status === 'processing') {
      // Payment is being processed
      await supabase
        .from('billing_payment_transactions')
        .update({ status: 'processing' })
        .eq('id', transaction.id)

      return NextResponse.json({
        success: false,
        processing: true,
        message: 'El pago esta siendo procesado',
        payment_intent_id: paymentIntent.id,
      })

    } else {
      // Payment failed or was cancelled
      await supabase
        .from('billing_payment_transactions')
        .update({
          status: 'failed',
          failure_reason: `Payment status: ${paymentIntent.status}`,
          completed_at: new Date().toISOString(),
        })
        .eq('id', transaction.id)

      return apiError('PAYMENT_ERROR', HTTP_STATUS.BAD_REQUEST, {
        details: { message: 'El pago no pudo ser procesado', status: paymentIntent.status },
      })
    }

  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    logger.error('Error processing invoice payment', {
      tenantId: profile.tenant_id,
      userId: user.id,
      error: message,
    })

    return apiError('PAYMENT_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'Error al procesar el pago' },
    })
  }
}

/**
 * Handle successful payment - update invoice, commissions, and send notification
 */
async function handleSuccessfulPayment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  invoice: {
    id: string
    invoice_number: string
    tenant_id: string
    total: number
  },
  transactionId: string,
  tenantId: string,
  paymentMethodDisplay: string
): Promise<void> {
  const now = new Date().toISOString()

  // Update transaction as succeeded
  await supabase
    .from('billing_payment_transactions')
    .update({
      status: 'succeeded',
      completed_at: now,
    })
    .eq('id', transactionId)

  // Update invoice as paid
  await supabase
    .from('platform_invoices')
    .update({
      status: 'paid',
      paid_at: now,
      payment_method: paymentMethodDisplay,
      updated_at: now,
    })
    .eq('id', invoice.id)

  // Mark store commissions as paid
  await supabase
    .from('store_commissions')
    .update({
      status: 'paid',
      paid_at: now,
    })
    .eq('platform_invoice_id', invoice.id)

  // Mark service commissions as paid
  await supabase
    .from('service_commissions')
    .update({
      status: 'paid',
      paid_at: now,
    })
    .eq('platform_invoice_id', invoice.id)

  // Update payment method usage stats
  const { data: paymentMethod } = await supabase
    .from('tenant_payment_methods')
    .select('id, use_count')
    .eq('tenant_id', tenantId)
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

  // Create payment confirmation reminder/notification
  await supabase
    .from('billing_reminders')
    .insert({
      tenant_id: tenantId,
      platform_invoice_id: invoice.id,
      reminder_type: 'payment_confirmation',
      channel: 'email',
      sent_at: now,
      subject: `Pago confirmado - Factura ${invoice.invoice_number}`,
      content: `Su pago de ₲${Number(invoice.total).toLocaleString('es-PY')} ha sido procesado exitosamente.`,
    })

  // Create notification for clinic admin
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
      message: `Se ha procesado el pago de la factura ${invoice.invoice_number} por ₲${Number(invoice.total).toLocaleString('es-PY')}.`,
    })
  }
}
