/**
 * Platform Referrals Summary API
 *
 * GET /api/platform/referrals/summary
 *
 * Returns referral program statistics for the platform admin dashboard.
 * Requires platform_admin role.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()

  // Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Check for platform_admin role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || profile.role !== 'platform_admin') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  // Fetch referral statistics
  const [
    { count: totalReferrals },
    { count: pendingReferrals },
    { count: trialStarted },
    { count: convertedReferrals },
    { data: totalDiscount },
    { data: topReferrers },
  ] = await Promise.all([
    // Total referrals
    supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true }),

    // Pending (not started trial)
    supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),

    // Trial started
    supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'trial_started'),

    // Converted
    supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'converted'),

    // Total discount given
    supabase
      .from('tenants')
      .select('referral_discount_percent')
      .gt('referral_discount_percent', 0),

    // Top referrers (using the view)
    supabase
      .from('referral_leaderboard')
      .select('tenant_id, tenant_name, total_referrals, converted_referrals')
      .order('converted_referrals', { ascending: false })
      .limit(5),
  ])

  const totalDiscountGiven = totalDiscount?.reduce(
    (sum, t) => sum + (parseFloat(String(t.referral_discount_percent)) || 0),
    0
  ) || 0

  const total = totalReferrals || 0
  const converted = convertedReferrals || 0
  const conversionRate = total > 0 ? (converted / total) * 100 : 0

  return NextResponse.json({
    total_referrals: total,
    pending_referrals: pendingReferrals || 0,
    trial_started: trialStarted || 0,
    converted_referrals: converted,
    conversion_rate: conversionRate,
    total_discount_given: totalDiscountGiven,
    top_referrers: topReferrers?.map(r => ({
      tenant_id: r.tenant_id,
      tenant_name: r.tenant_name,
      referral_count: r.total_referrals,
      converted_count: r.converted_referrals,
    })) || [],
  })
}
