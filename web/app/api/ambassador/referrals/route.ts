/**
 * Ambassador Referrals API
 *
 * GET /api/ambassador/referrals - List ambassador's referrals
 *
 * Query params:
 * - status: Filter by status (pending, trial_started, converted, expired)
 * - limit: Number of results (default 20)
 * - offset: Pagination offset
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { referralsQuerySchema } from '@/lib/schemas/ambassador'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Get ambassador ID from user
  const { data: ambassador, error: ambError } = await supabase
    .from('ambassadors')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (ambError || !ambassador) {
    return NextResponse.json({ error: 'No eres embajador' }, { status: 404 })
  }

  // Validate query params
  const searchParams = request.nextUrl.searchParams
  const queryValidation = referralsQuerySchema.safeParse({
    status: searchParams.get('status'),
    limit: searchParams.get('limit'),
    offset: searchParams.get('offset'),
  })

  if (!queryValidation.success) {
    return NextResponse.json(
      { error: 'Parámetros inválidos', issues: queryValidation.error.issues },
      { status: 400 }
    )
  }

  const { status, limit, offset } = queryValidation.data

  // Build query
  let query = supabase
    .from('ambassador_referrals')
    .select(
      `
      id,
      status,
      referred_at,
      trial_started_at,
      converted_at,
      subscription_amount,
      commission_rate,
      commission_amount,
      payout_status,
      tenant:tenant_id (
        id,
        name,
        zone
      )
    `,
      { count: 'exact' }
    )
    .eq('ambassador_id', ambassador.id)
    .order('referred_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) {
    query = query.eq('status', status)
  }

  const { data: referrals, error, count } = await query

  if (error) {
    logger.error('Failed to fetch ambassador referrals', {
      ambassadorId: ambassador.id,
      status,
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
}
