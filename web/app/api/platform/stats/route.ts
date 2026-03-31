/**
 * Platform Statistics API
 *
 * GET /api/platform/stats - Get platform-wide statistics (platform admin only)
 */

import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth/api-wrapper'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

// GET /api/platform/stats - Platform-wide statistics
export const GET = withApiAuth(async ({ profile, supabase }: ApiHandlerContext) => {
  // Verify platform admin
  if (!profile.is_platform_admin) {
    return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, {
      details: { message: 'Platform admin access required' },
    })
  }

  try {
    // Get aggregate counts
    const [tenantsRes, profilesRes, petsRes, appointmentsRes, invoicesRes] = await Promise.all([
      supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('pets').select('id', { count: 'exact', head: true }).is('deleted_at', null),
      supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .gte('start_time', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      supabase
        .from('invoices')
        .select('total', { count: 'exact' })
        .eq('status', 'paid')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    ])

    // Calculate revenue
    const totalRevenue30d =
      invoicesRes.data?.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0) || 0

    // Get recent activity
    const { data: recentActivity } = await supabase
      .from('platform_audit_logs')
      .select('id, action, action_category, target_tenant_id, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    // Get tenant growth (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const { data: newTenants } = await supabase
      .from('tenants')
      .select('created_at')
      .gte('created_at', sixMonthsAgo.toISOString())
      .order('created_at', { ascending: true })

    // Group by month
    const tenantsByMonth: Record<string, number> = {}
    newTenants?.forEach((t) => {
      const month = new Date(t.created_at).toISOString().substring(0, 7) // YYYY-MM
      tenantsByMonth[month] = (tenantsByMonth[month] || 0) + 1
    })

    return NextResponse.json({
      overview: {
        total_tenants: tenantsRes.count || 0,
        total_users: profilesRes.count || 0,
        total_pets: petsRes.count || 0,
        appointments_30d: appointmentsRes.count || 0,
        revenue_30d: totalRevenue30d,
        invoices_30d: invoicesRes.count || 0,
      },
      growth: {
        tenants_by_month: tenantsByMonth,
      },
      recent_activity: recentActivity || [],
    })
  } catch (err) {
    logger.error('Platform stats error', { error: err })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
})
