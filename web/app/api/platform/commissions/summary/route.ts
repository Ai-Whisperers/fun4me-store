/**
 * Platform Admin - Commission Summary API
 *
 * GET /api/platform/commissions/summary - Get platform-wide commission stats
 *
 * Returns:
 * - totals: Aggregate amounts by status
 * - current_month: This month's stats
 * - by_tenant: Top tenants by commission (optional)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

async function isPlatformAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  return profile?.role === 'platform_admin'
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

  // 2. Platform admin check
  const isAdmin = await isPlatformAdmin(supabase, user.id)
  if (!isAdmin) {
    return apiError('INSUFFICIENT_ROLE', HTTP_STATUS.FORBIDDEN, {
      details: { message: 'Acceso restringido a administradores de plataforma' },
    })
  }

  const { searchParams } = new URL(request.url)
  const includeByTenant = searchParams.get('by_tenant') === 'true'

  try {
    // Get current month date range
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

    // Last month for comparison
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString()

    // Current month stats
    const { data: currentMonthData } = await supabase
      .from('store_commissions')
      .select('commission_amount, commissionable_amount')
      .gte('calculated_at', currentMonthStart)
      .lte('calculated_at', currentMonthEnd)

    const currentMonth = {
      order_count: currentMonthData?.length || 0,
      gmv: currentMonthData?.reduce((sum, c) => sum + Number(c.commissionable_amount), 0) || 0,
      commission_total: currentMonthData?.reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0,
    }

    // Last month stats for comparison
    const { data: lastMonthData } = await supabase
      .from('store_commissions')
      .select('commission_amount, commissionable_amount')
      .gte('calculated_at', lastMonthStart)
      .lte('calculated_at', lastMonthEnd)

    const lastMonth = {
      order_count: lastMonthData?.length || 0,
      gmv: lastMonthData?.reduce((sum, c) => sum + Number(c.commissionable_amount), 0) || 0,
      commission_total: lastMonthData?.reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0,
    }

    // Totals by status
    const { data: allCommissions } = await supabase
      .from('store_commissions')
      .select('status, commission_amount')

    const totals = {
      calculated: 0,
      invoiced: 0,
      paid: 0,
      waived: 0,
      adjusted: 0,
      total_lifetime: 0,
      pending_collection: 0,
    }

    if (allCommissions) {
      for (const record of allCommissions) {
        const amount = Number(record.commission_amount)
        totals[record.status as keyof typeof totals] =
          (totals[record.status as keyof typeof totals] || 0) + amount
        totals.total_lifetime += amount
      }
      totals.pending_collection = totals.calculated + totals.invoiced
    }

    // Count active tenants with e-commerce
    const { count: activeTenantsCount } = await supabase
      .from('tenants')
      .select('id', { count: 'exact' })
      .not('ecommerce_start_date', 'is', null)

    // By tenant breakdown (top 10)
    let byTenant: unknown[] = []
    if (includeByTenant) {
      const { data: tenantBreakdown } = await supabase
        .from('store_commissions')
        .select(
          `
          tenant_id,
          commission_amount,
          tenants!inner(id, name)
        `
        )
        .in('status', ['calculated', 'invoiced', 'paid'])

      if (tenantBreakdown) {
        // Aggregate by tenant
        const tenantTotals = new Map<string, { name: string; total: number; count: number }>()
        for (const record of tenantBreakdown) {
          const tenantId = record.tenant_id
          const tenantsData = record.tenants as { name: string } | { name: string }[] | null
          const tenant = Array.isArray(tenantsData) ? tenantsData[0] : tenantsData
          const existing = tenantTotals.get(tenantId) || {
            name: tenant?.name || 'Unknown',
            total: 0,
            count: 0,
          }
          existing.total += Number(record.commission_amount)
          existing.count += 1
          tenantTotals.set(tenantId, existing)
        }

        byTenant = Array.from(tenantTotals.entries())
          .map(([id, data]) => ({
            tenant_id: id,
            tenant_name: data.name,
            total_commission: data.total,
            order_count: data.count,
          }))
          .sort((a, b) => b.total_commission - a.total_commission)
          .slice(0, 10)
      }
    }

    // Growth calculations
    const orderGrowth = lastMonth.order_count
      ? ((currentMonth.order_count - lastMonth.order_count) / lastMonth.order_count) * 100
      : 0

    const commissionGrowth = lastMonth.commission_total
      ? ((currentMonth.commission_total - lastMonth.commission_total) / lastMonth.commission_total) * 100
      : 0

    return NextResponse.json({
      current_month: currentMonth,
      last_month: lastMonth,
      growth: {
        order_count_pct: Math.round(orderGrowth * 100) / 100,
        commission_pct: Math.round(commissionGrowth * 100) / 100,
      },
      totals,
      active_tenants: activeTenantsCount || 0,
      ...(includeByTenant && { by_tenant: byTenant }),
    })
  } catch (e) {
    logger.error('Platform admin: Error fetching commission summary', {
      userId: user.id,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'Error al cargar resumen de comisiones' },
    })
  }
}
