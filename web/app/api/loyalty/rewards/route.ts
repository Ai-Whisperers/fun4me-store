import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

/**
 * GET /api/loyalty/rewards
 * Get available loyalty rewards for the current tenant
 */
export const GET = withApiAuth(async ({ request, user, profile, supabase }: ApiHandlerContext) => {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const includeInactive = searchParams.get('includeInactive') === 'true'

  try {
    // Build query
    let query = supabase
      .from('loyalty_rewards')
      .select('*')
      .eq('tenant_id', profile.tenant_id)

    // Only show active by default (unless admin requesting inactive)
    if (!includeInactive || profile.role === 'owner') {
      query = query.eq('is_active', true)
    }

    // Filter by category
    if (category) {
      query = query.eq('category', category)
    }

    // Only show valid rewards (within date range)
    const now = new Date().toISOString()
    query = query
      .or(`valid_from.is.null,valid_from.lte.${now}`)
      .or(`valid_to.is.null,valid_to.gte.${now}`)

    // Order: featured first, then by points cost
    query = query
      .order('is_featured', { ascending: false })
      .order('points_cost', { ascending: true })

    const { data: rewards, error } = await query

    if (error) {
      logger.error('Failed to fetch loyalty rewards', {
        tenantId: profile.tenant_id,
        userId: user.id,
        error: error.message,
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    // Get user's current points balance
    const { data: balance } = await supabase.rpc('get_user_loyalty_balance', {
      p_user_id: user.id,
    })

    // Get user's redemption counts
    const { data: redemptions } = await supabase
      .from('loyalty_redemptions')
      .select('reward_id')
      .eq('user_id', user.id)
      .eq('tenant_id', profile.tenant_id)
      .in('status', ['pending', 'approved', 'used'])

    const redemptionCounts = (redemptions ?? []).reduce(
      (acc, r) => {
        acc[r.reward_id] = (acc[r.reward_id] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    // Enrich rewards with availability info
    const enrichedRewards = (rewards ?? []).map((reward) => {
      const userRedemptionCount = redemptionCounts[reward.id] || 0
      const userBalance = (balance as number) ?? 0
      const canAfford = userBalance >= reward.points_cost
      const isOutOfStock = reward.stock !== null && reward.stock <= 0
      const isMaxReached = reward.max_per_user !== null && userRedemptionCount >= reward.max_per_user

      return {
        ...reward,
        canRedeem: canAfford && !isOutOfStock && !isMaxReached,
        canAfford,
        isOutOfStock,
        isMaxReached,
        userRedemptionCount,
      }
    })

    return NextResponse.json({
      rewards: enrichedRewards,
      userBalance: balance ?? 0,
      categories: [...new Set(rewards?.map((r) => r.category) ?? [])],
    })
  } catch (e) {
    logger.error('Unexpected error fetching loyalty rewards', {
      tenantId: profile.tenant_id,
      userId: user.id,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
})
