/**
 * Referrals API
 *
 * GET /api/referrals - List tenant's referrals (as referrer)
 *
 * Query params:
 * - status: Filter by status (pending, trial_started, converted, expired)
 * - limit: Number of results (default 20)
 * - offset: Pagination offset
 */

import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth/api-wrapper'
import { logger } from '@/lib/logger'

export const GET = withApiAuth(
  async ({ profile, supabase, request }: ApiHandlerContext): Promise<NextResponse> => {
    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('referrals')
      .select(`
        id,
        status,
        created_at,
        trial_started_at,
        converted_at,
        first_payment_amount,
        referrer_discount_percent,
        referrer_discount_applied,
        referrer_points_issued,
        referrer_points_amount,
        referred_tenant:referred_tenant_id (
          id,
          name
        ),
        referral_code:referral_code_id (
          code
        )
      `, { count: 'exact' })
      .eq('referrer_tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: referrals, error, count } = await query

    if (error) {
      logger.error('Failed to fetch referrals', {
        tenantId: profile.tenant_id,
        error: error.message,
      })
      return NextResponse.json({ error: 'Error al cargar referidos' }, { status: 500 })
    }

    return NextResponse.json({
      referrals,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    })
  },
  { roles: ['admin', 'vet'] }
)
