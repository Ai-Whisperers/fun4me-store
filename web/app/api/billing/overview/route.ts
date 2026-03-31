/**
 * Billing Overview API
 *
 * GET /api/billing/overview - Get complete billing overview for dashboard
 *
 * Returns comprehensive billing information including:
 * - Subscription tier and monthly amount
 * - Trial status and days remaining
 * - Next invoice date and estimated total
 * - Current period commission totals (store + services)
 * - Outstanding balance and payment status
 * - Default payment method info
 *
 * Query params:
 * - clinic: string (optional) - Tenant ID (defaults to user's tenant)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { getTierById, type TierId } from '@/lib/pricing/tiers'
import {
  type BillingOverviewResponse,
  type TenantPaymentMethod,
  TAX_RATE_PY,
} from '@/lib/billing/types'

// Map tier IDs to display names
const TIER_DISPLAY_NAMES: Record<TierId, string> = {
  gratis: 'Gratis',
  profesional: 'Profesional',
}

// Get subscription amount for a tier (in PYG)
function getSubscriptionAmount(tierId: TierId): number {
  const tier = getTierById(tierId)
  return tier?.monthlyPrice || 0
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()

  // 1. Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return apiError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED)
  }

  // 2. Get profile and verify staff role
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

  // Only admins can view billing overview
  if (profile.role !== 'admin') {
    return apiError('INSUFFICIENT_ROLE', HTTP_STATUS.FORBIDDEN, {
      details: { required: ['admin'], current: profile.role },
    })
  }

  // 3. Parse query params
  const { searchParams } = new URL(request.url)
  const clinic = searchParams.get('clinic')

  // Validate clinic matches user's tenant
  if (clinic && clinic !== profile.tenant_id) {
    return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, {
      details: { message: 'No puede acceder a facturación de otra clínica' },
    })
  }

  const tenantId = clinic || profile.tenant_id

  try {
    // 4. Get tenant billing info
    const { data: tenant } = await supabase
      .from('tenants')
      .select(`
        id,
        name,
        subscription_tier,
        trial_ends_at,
        created_at,
        ecommerce_start_date,
        services_start_date,
        next_invoice_date,
        outstanding_balance,
        days_overdue,
        payment_status,
        auto_pay_enabled,
        default_payment_method_id
      `)
      .eq('id', tenantId)
      .single()

    if (!tenant) {
      return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
        details: { resource: 'tenant' },
      })
    }

    // 5. Calculate trial status
    const now = new Date()
    const trialEndsAt = tenant.trial_ends_at ? new Date(tenant.trial_ends_at) : null
    const isTrial = trialEndsAt ? now < trialEndsAt : false
    const trialDaysRemaining = trialEndsAt
      ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : null

    // 6. Get subscription info
    const tier = (tenant.subscription_tier as TierId) || 'gratis'
    const monthlyAmount = getSubscriptionAmount(tier)

    // 7. Calculate current billing period (current month)
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const periodStartStr = periodStart.toISOString().split('T')[0]
    const periodEndStr = periodEnd.toISOString().split('T')[0]

    // 8. Get current period store commissions
    const { data: storeCommissions } = await supabase
      .from('store_commissions')
      .select('commission_amount')
      .eq('tenant_id', tenantId)
      .gte('calculated_at', periodStartStr)
      .lte('calculated_at', periodEndStr + 'T23:59:59')

    const storeCommissionTotal = storeCommissions?.reduce(
      (sum, c) => sum + Number(c.commission_amount), 0
    ) || 0
    const storeOrderCount = storeCommissions?.length || 0

    // 9. Get current period service commissions
    const { data: serviceCommissions } = await supabase
      .from('service_commissions')
      .select('commission_amount')
      .eq('tenant_id', tenantId)
      .gte('calculated_at', periodStartStr)
      .lte('calculated_at', periodEndStr + 'T23:59:59')

    const serviceCommissionTotal = serviceCommissions?.reduce(
      (sum, c) => sum + Number(c.commission_amount), 0
    ) || 0
    const serviceAppointmentCount = serviceCommissions?.length || 0

    // 10. Calculate estimated invoice totals
    const totalCommission = storeCommissionTotal + serviceCommissionTotal
    const estimatedSubtotal = monthlyAmount + totalCommission
    const estimatedTax = Math.round(estimatedSubtotal * TAX_RATE_PY)
    const estimatedTotal = estimatedSubtotal + estimatedTax

    // 11. Calculate next invoice date and first invoice date
    const nextInvoiceDate: string | null = tenant.next_invoice_date || null
    let firstInvoiceDate: string | null = null

    // If no next_invoice_date set and trial is active, calculate first invoice date
    if (!nextInvoiceDate && isTrial && trialEndsAt) {
      // First invoice is 15 days after trial ends (mid-month after trial)
      const firstInvoice = new Date(trialEndsAt)
      firstInvoice.setDate(firstInvoice.getDate() + 15)
      firstInvoiceDate = firstInvoice.toISOString().split('T')[0]
    }

    // 12. Get default payment method if exists
    let defaultPaymentMethod: Partial<TenantPaymentMethod> | null = null
    if (tenant.default_payment_method_id) {
      const { data: paymentMethod } = await supabase
        .from('tenant_payment_methods')
        .select(`
          id,
          method_type,
          display_name,
          card_brand,
          card_last_four,
          card_exp_month,
          card_exp_year,
          bank_name,
          bank_alias,
          is_default,
          is_verified
        `)
        .eq('id', tenant.default_payment_method_id)
        .single()

      if (paymentMethod) {
        defaultPaymentMethod = paymentMethod
      }
    }

    // 13. Check if has any payment method
    const { count: paymentMethodCount } = await supabase
      .from('tenant_payment_methods')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_active', true)

    const hasPaymentMethod = (paymentMethodCount || 0) > 0

    // 14. Build response
    const response: BillingOverviewResponse = {
      tenant_id: tenantId,
      tenant_name: tenant.name,

      // Subscription
      tier,
      tier_display_name: TIER_DISPLAY_NAMES[tier] || tier,
      monthly_amount: monthlyAmount,
      billing_cycle: 'monthly',

      // Trial
      is_trial: isTrial,
      trial_days_remaining: trialDaysRemaining,
      trial_end_date: trialEndsAt?.toISOString().split('T')[0] || null,

      // Next invoice
      next_invoice_date: nextInvoiceDate,
      first_invoice_date: firstInvoiceDate,

      // Current period
      current_period: {
        start: periodStartStr,
        end: periodEndStr,
        store_orders: storeOrderCount,
        store_commission: storeCommissionTotal,
        service_appointments: serviceAppointmentCount,
        service_commission: serviceCommissionTotal,
        total_commission: totalCommission,
        subscription: monthlyAmount,
        estimated_subtotal: estimatedSubtotal,
        estimated_tax: estimatedTax,
        estimated_total: estimatedTotal,
      },

      // Outstanding
      outstanding_balance: Number(tenant.outstanding_balance) || 0,
      days_overdue: tenant.days_overdue || 0,
      payment_status: (tenant.payment_status as BillingOverviewResponse['payment_status']) || 'current',

      // Payment methods
      has_payment_method: hasPaymentMethod,
      default_payment_method: defaultPaymentMethod as TenantPaymentMethod | null,
    }

    return NextResponse.json(response)
  } catch (e) {
    logger.error('Error fetching billing overview', {
      tenantId,
      userId: user.id,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'Error al cargar información de facturación' },
    })
  }
}
