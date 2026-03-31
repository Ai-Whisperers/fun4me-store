/**
 * Referral Statistics API
 *
 * GET /api/referrals/stats - Get referral program statistics for tenant
 */

import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth/api-wrapper'
import { logger } from '@/lib/logger'

export const GET = withApiAuth(
  async ({ profile, supabase }: ApiHandlerContext): Promise<NextResponse> => {
    // Get referral stats using the database function
    const { data: stats, error: statsError } = await supabase
      .rpc('get_referral_stats', { p_tenant_id: profile.tenant_id })
      .single()

    if (statsError) {
      logger.error('Failed to fetch referral stats', {
        tenantId: profile.tenant_id,
        error: statsError.message,
      })
      return NextResponse.json({ error: 'Error al cargar estadísticas' }, { status: 500 })
    }

    // Get tenant's current discount
    const { data: tenant } = await supabase
      .from('tenants')
      .select('referral_discount_percent')
      .eq('id', profile.tenant_id)
      .single()

    return NextResponse.json({
      ...(stats || {}),
      current_discount: tenant?.referral_discount_percent || 0,
      max_discount: 100, // Max 100% (free)
      discount_per_referral: 30, // 30% per converted referral
    })
  },
  { roles: ['admin', 'vet'] }
)
