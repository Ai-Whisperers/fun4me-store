/**
 * Stripe SetupIntent API
 *
 * POST /api/billing/stripe/setup-intent
 *
 * Creates a SetupIntent for adding a payment method.
 * Returns the client_secret needed for Stripe Elements.
 *
 * The flow is:
 * 1. Client calls this endpoint to get a SetupIntent
 * 2. Client uses Stripe.js to collect card details
 * 3. Client confirms the SetupIntent with Stripe
 * 4. Webhook receives setup_intent.succeeded event
 * 5. We save the payment method to our database
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import {
  getOrCreateCustomer,
  createSetupIntent,
  getStripePublishableKey,
} from '@/lib/billing/stripe'

export async function POST(_request: NextRequest): Promise<NextResponse> {
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
    .select('tenant_id, role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
      details: { resource: 'profile' },
    })
  }

  // Only admin can manage payment methods
  if (profile.role !== 'admin') {
    return apiError('INSUFFICIENT_ROLE', HTTP_STATUS.FORBIDDEN, {
      details: { required: ['admin'], current: profile.role },
    })
  }

  try {
    // 3. Get tenant info
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select(`
        id,
        name,
        stripe_customer_id,
        billing_email,
        email,
        subscription_tier,
        trial_ends_at
      `)
      .eq('id', profile.tenant_id)
      .single()

    if (tenantError || !tenant) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'tenant' },
      })
    }

    // 4. Get or create Stripe customer
    let stripeCustomerId = tenant.stripe_customer_id

    if (!stripeCustomerId) {
      const customerEmail = tenant.billing_email || tenant.email || user.email || ''
      const customer = await getOrCreateCustomer(
        tenant.id,
        customerEmail,
        tenant.name,
        {
          tenant_id: tenant.id,
          subscription_tier: tenant.subscription_tier || 'unknown',
        }
      )

      stripeCustomerId = customer.id

      // Save Stripe customer ID to tenant
      await supabase
        .from('tenants')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', tenant.id)
    }

    // 5. Create SetupIntent
    const setupIntent = await createSetupIntent(stripeCustomerId, {
      tenant_id: tenant.id,
      created_by: user.id,
    })

    // 6. Calculate billing info for display
    const now = new Date()
    const trialEndsAt = tenant.trial_ends_at ? new Date(tenant.trial_ends_at) : null
    const isOnTrial = trialEndsAt ? now < trialEndsAt : false
    const trialDaysRemaining = trialEndsAt
      ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : null

    // First invoice date (15 days after trial ends)
    let firstInvoiceDate: string | null = null
    if (isOnTrial && trialEndsAt) {
      const invoiceDate = new Date(trialEndsAt)
      invoiceDate.setDate(invoiceDate.getDate() + 15)
      firstInvoiceDate = invoiceDate.toISOString().split('T')[0]
    }

    logger.info('SetupIntent created', {
      tenantId: tenant.id,
      customerId: stripeCustomerId,
      setupIntentId: setupIntent.id,
    })

    return NextResponse.json({
      client_secret: setupIntent.client_secret,
      customer_id: stripeCustomerId,
      publishable_key: getStripePublishableKey(),
      billing_context: {
        tenant_name: tenant.name,
        tier: tenant.subscription_tier,
        is_on_trial: isOnTrial,
        trial_days_remaining: trialDaysRemaining,
        trial_ends_at: trialEndsAt?.toISOString().split('T')[0] || null,
        first_invoice_date: firstInvoiceDate,
        will_be_charged_today: false, // Never charge on setup
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    logger.error('Error creating SetupIntent', {
      tenantId: profile.tenant_id,
      userId: user.id,
      error: message,
    })

    return apiError('PAYMENT_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'Error al configurar metodo de pago' },
    })
  }
}
