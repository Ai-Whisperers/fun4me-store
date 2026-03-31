/**
 * Store Commissions Summary API - Clinic View
 *
 * GET /api/store/commissions/summary - Get clinic's commission summary
 *
 * Query params:
 * - clinic: string (required) - Tenant ID
 *
 * Returns:
 * - current_month: Commissions for current month
 * - pending_payment: Total unpaid commissions
 * - rate_info: Current commission rate and when it changes
 * - totals: Lifetime totals by status
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { getTierById, type TierId } from '@/lib/pricing/tiers'

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

  // Only staff can view commission summary
  if (profile.role !== 'vet' && profile.role !== 'admin') {
    return apiError('INSUFFICIENT_ROLE', HTTP_STATUS.FORBIDDEN, {
      details: { required: ['vet', 'admin'], current: profile.role },
    })
  }

  // 3. Parse query params
  const { searchParams } = new URL(request.url)
  const clinic = searchParams.get('clinic')

  // Validate clinic matches user's tenant
  if (clinic && clinic !== profile.tenant_id) {
    return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, {
      details: { message: 'No puede acceder a comisiones de otra clínica' },
    })
  }

  const tenantId = clinic || profile.tenant_id

  try {
    // Get tenant info for rate calculation
    const { data: tenant } = await supabase
      .from('tenants')
      .select('ecommerce_start_date, subscription_tier')
      .eq('id', tenantId)
      .single()

    // Get tier info - commission rates are now flat per tier (no time-based escalation)
    const tierId = (tenant?.subscription_tier as TierId) || 'gratis'
    const tier = getTierById(tierId)
    const currentRate = tier?.ecommerceCommission ?? 0

    // Calculate months active (informational only - rates don't change)
    let monthsActive = 0
    if (tenant?.ecommerce_start_date) {
      const startDate = new Date(tenant.ecommerce_start_date)
      const now = new Date()
      monthsActive =
        (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth())
    }

    // Get current month date range
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

    // Current month stats
    const { data: currentMonthData } = await supabase
      .from('store_commissions')
      .select('commission_amount, commissionable_amount')
      .eq('tenant_id', tenantId)
      .gte('calculated_at', currentMonthStart)
      .lte('calculated_at', currentMonthEnd)

    const currentMonth = {
      order_count: currentMonthData?.length || 0,
      gmv: currentMonthData?.reduce((sum, c) => sum + Number(c.commissionable_amount), 0) || 0,
      commission_total: currentMonthData?.reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0,
    }

    // Pending payment (calculated + invoiced but not paid)
    const { data: pendingData } = await supabase
      .from('store_commissions')
      .select('commission_amount')
      .eq('tenant_id', tenantId)
      .in('status', ['calculated', 'invoiced'])

    const pendingPayment = pendingData?.reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0

    // Totals by status
    const { data: statusTotals } = await supabase
      .from('store_commissions')
      .select('status, commission_amount')
      .eq('tenant_id', tenantId)

    const totals = {
      calculated: 0,
      invoiced: 0,
      paid: 0,
      waived: 0,
      adjusted: 0,
      total_lifetime: 0,
    }

    if (statusTotals) {
      for (const record of statusTotals) {
        const amount = Number(record.commission_amount)
        totals[record.status as keyof typeof totals] =
          (totals[record.status as keyof typeof totals] || 0) + amount
        totals.total_lifetime += amount
      }
    }

    // Get latest invoice info if exists
    const { data: latestInvoice } = await supabase
      .from('store_commission_invoices')
      .select('id, invoice_number, period_start, period_end, amount_due, status, due_date')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({
      current_month: currentMonth,
      pending_payment: pendingPayment,
      rate_info: {
        current_rate: currentRate,
        tier_id: tierId,
        tier_name: tier?.name || 'Gratis',
        months_active: monthsActive,
        ecommerce_start_date: tenant?.ecommerce_start_date || null,
        // Rates are now flat per tier - they don't change over time
        rate_increases_at: null,
        next_rate: null,
      },
      totals,
      latest_invoice: latestInvoice || null,
    })
  } catch (e) {
    logger.error('Error fetching commission summary', {
      tenantId,
      userId: user.id,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'Error al cargar resumen de comisiones' },
    })
  }
}
