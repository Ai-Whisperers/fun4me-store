/**
 * Service Commissions Summary API - Clinic View
 *
 * GET /api/billing/commissions/services/summary - Get clinic's service commission summary
 *
 * Query params:
 * - clinic: string (optional) - Tenant ID (defaults to user's tenant)
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
import { commissionConfig } from '@/lib/pricing/tiers'

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
      .select('services_start_date, commission_tier')
      .eq('id', tenantId)
      .single()

    // Calculate current rate using the SQL function
    const { data: currentRate } = await supabase.rpc('get_service_commission_rate', {
      p_tenant_id: tenantId,
    })

    // Calculate months active for services
    let monthsActive = 0
    let rateChangeDate: string | null = null

    if (tenant?.services_start_date) {
      const startDate = new Date(tenant.services_start_date)
      const now = new Date()
      monthsActive =
        (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth())

      // If still on initial rate, calculate when it increases
      if (monthsActive < commissionConfig.monthsUntilIncrease && tenant.commission_tier !== 'enterprise') {
        const changeDate = new Date(startDate)
        changeDate.setMonth(changeDate.getMonth() + commissionConfig.monthsUntilIncrease)
        rateChangeDate = changeDate.toISOString()
      }
    }

    // Get current month date range
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

    // Current month stats
    const { data: currentMonthData } = await supabase
      .from('service_commissions')
      .select('commission_amount, commissionable_amount')
      .eq('tenant_id', tenantId)
      .gte('calculated_at', currentMonthStart)
      .lte('calculated_at', currentMonthEnd)

    const currentMonth = {
      appointment_count: currentMonthData?.length || 0,
      service_revenue: currentMonthData?.reduce((sum, c) => sum + Number(c.commissionable_amount), 0) || 0,
      commission_total: currentMonthData?.reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0,
    }

    // Pending payment (pending + invoiced but not paid)
    const { data: pendingData } = await supabase
      .from('service_commissions')
      .select('commission_amount')
      .eq('tenant_id', tenantId)
      .in('status', ['pending', 'invoiced'])

    const pendingPayment = pendingData?.reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0

    // Totals by status
    const { data: statusTotals } = await supabase
      .from('service_commissions')
      .select('status, commission_amount')
      .eq('tenant_id', tenantId)

    const totals = {
      pending: 0,
      invoiced: 0,
      paid: 0,
      waived: 0,
      adjusted: 0,
      total_lifetime: 0,
    }

    if (statusTotals) {
      for (const record of statusTotals) {
        const amount = Number(record.commission_amount)
        const statusKey = record.status as keyof typeof totals
        if (statusKey in totals && statusKey !== 'total_lifetime') {
          totals[statusKey] += amount
        }
        totals.total_lifetime += amount
      }
    }

    return NextResponse.json({
      current_month: currentMonth,
      pending_payment: pendingPayment,
      rate_info: {
        current_rate: currentRate || commissionConfig.initialRate,
        rate_type: tenant?.commission_tier || (monthsActive < commissionConfig.monthsUntilIncrease ? 'initial' : 'standard'),
        months_active: monthsActive,
        services_start_date: tenant?.services_start_date || null,
        rate_increases_at: rateChangeDate,
        next_rate: rateChangeDate ? commissionConfig.standardRate : null,
      },
      totals,
    })
  } catch (e) {
    logger.error('Error fetching service commission summary', {
      tenantId,
      userId: user.id,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'Error al cargar resumen de comisiones de servicios' },
    })
  }
}
