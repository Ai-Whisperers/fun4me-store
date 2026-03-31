/**
 * Ambassador Statistics API
 *
 * GET /api/ambassador/stats - Get ambassador's referral statistics
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function GET(): Promise<NextResponse> {
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

  // Get stats using database function
  const { data: stats, error: statsError } = await supabase
    .rpc('get_ambassador_stats', { p_ambassador_id: ambassador.id })
    .single()

  if (statsError || !stats) {
    logger.error('Failed to fetch ambassador stats', {
      ambassadorId: ambassador.id,
      error: statsError?.message,
    })
    return NextResponse.json({ error: 'Error al cargar estadísticas' }, { status: 500 })
  }

  // Type assertion for stats from RPC
  const statsObj = stats as Record<string, unknown>

  // Get tier info for display
  const tierInfo = {
    embajador: {
      name: 'Embajador',
      commission: 30,
      color: 'blue',
      benefits: ['Lifetime Professional', '30% comisión'],
    },
    promotor: {
      name: 'Promotor',
      commission: 40,
      color: 'purple',
      benefits: ['Lifetime Professional', '40% comisión', 'Gs 50K bonus por referido'],
    },
    super: {
      name: 'Super Embajador',
      commission: 50,
      color: 'gold',
      benefits: ['Lifetime Professional', '50% comisión', 'Features prioritarios'],
    },
  }

  return NextResponse.json({
    ...statsObj,
    tier_info: tierInfo[statsObj.tier as keyof typeof tierInfo] || tierInfo.embajador,
    next_tier_info: statsObj.next_tier ? tierInfo[statsObj.next_tier as keyof typeof tierInfo] : null,
  })
}
