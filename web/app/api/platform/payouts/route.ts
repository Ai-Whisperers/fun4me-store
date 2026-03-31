/**
 * Platform Admin - List Ambassador Payouts
 *
 * GET /api/platform/payouts - List all payout requests
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()

  // Verify platform admin
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_platform_admin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  // Parse query params
  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get('status')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')

  // Use service client for admin operations
  const serviceClient = createServiceClient()

  let query = serviceClient
    .from('ambassador_payouts')
    .select(`
      id,
      ambassador_id,
      amount,
      status,
      bank_name,
      bank_account,
      bank_holder_name,
      notes,
      processed_at,
      processed_by,
      created_at,
      ambassadors (
        id,
        email,
        full_name,
        phone,
        tier
      )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) {
    query = query.eq('status', status)
  }

  const { data: payouts, error, count } = await query

  if (error) {
    logger.error('Failed to fetch payouts', { error: error.message })
    return NextResponse.json({ error: 'Error al cargar pagos' }, { status: 500 })
  }

  // Get summary stats
  const { data: stats } = await serviceClient
    .from('ambassador_payouts')
    .select('status, amount')

  const summary = {
    pending: 0,
    pendingAmount: 0,
    completed: 0,
    completedAmount: 0,
    rejected: 0,
  }

  stats?.forEach((p) => {
    if (p.status === 'pending' || p.status === 'approved' || p.status === 'processing') {
      summary.pending++
      summary.pendingAmount += p.amount
    } else if (p.status === 'completed') {
      summary.completed++
      summary.completedAmount += p.amount
    } else if (p.status === 'rejected') {
      summary.rejected++
    }
  })

  return NextResponse.json({
    payouts,
    summary,
    pagination: {
      total: count,
      limit,
      offset,
      hasMore: (count || 0) > offset + limit,
    },
  })
}
