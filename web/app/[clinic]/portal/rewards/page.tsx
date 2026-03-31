import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Gift, ArrowLeft, Star, Sparkles } from 'lucide-react'
import { RewardsClient } from './client'

interface RewardsPageProps {
  params: Promise<{ clinic: string }>
}

export default async function RewardsPage({ params }: RewardsPageProps) {
  const supabase = await createClient()
  const { clinic } = await params

  // Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/${clinic}/portal/login?returnTo=/${clinic}/portal/rewards`)
  }

  // Get user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect(`/${clinic}/portal/login`)
  }

  // Fetch user's loyalty points balance
  const { data: loyaltyData } = await supabase
    .from('loyalty_points')
    .select('balance, tier')
    .eq('client_id', user.id)
    .eq('tenant_id', profile.tenant_id)
    .single()

  const userPoints = loyaltyData?.balance ?? 0
  const userTier = loyaltyData?.tier ?? 'bronze'

  // Fetch available rewards
  const { data: rewards } = await supabase
    .from('loyalty_rewards')
    .select('*')
    .eq('tenant_id', profile.tenant_id)
    .eq('is_active', true)
    .or(`valid_from.is.null,valid_from.lte.${new Date().toISOString()}`)
    .or(`valid_to.is.null,valid_to.gte.${new Date().toISOString()}`)
    .order('is_featured', { ascending: false })
    .order('points_cost', { ascending: true })

  // Get user's redemption count per reward (for max_per_user check)
  const { data: userRedemptions } = await supabase
    .from('loyalty_redemptions')
    .select('reward_id')
    .eq('user_id', user.id)
    .eq('tenant_id', profile.tenant_id)
    .in('status', ['pending', 'approved', 'used'])

  const redemptionCounts = (userRedemptions ?? []).reduce(
    (acc, r) => {
      acc[r.reward_id] = (acc[r.reward_id] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  // Transform rewards with availability status
  const rewardsWithStatus = (rewards ?? []).map((reward) => {
    const userRedemptionCount = redemptionCounts[reward.id] || 0
    const canRedeem =
      userPoints >= reward.points_cost &&
      (reward.stock === null || reward.stock > 0) &&
      (reward.max_per_user === null || userRedemptionCount < reward.max_per_user)

    return {
      ...reward,
      canRedeem,
      userRedemptionCount,
      isOutOfStock: reward.stock !== null && reward.stock <= 0,
      isMaxReached: reward.max_per_user !== null && userRedemptionCount >= reward.max_per_user,
    }
  })

  // Group by category
  const categories = [
    { key: 'discount', label: 'Descuentos' },
    { key: 'service', label: 'Servicios' },
    { key: 'product', label: 'Productos' },
    { key: 'experience', label: 'Experiencias' },
    { key: 'general', label: 'General' },
  ]

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/${clinic}/portal/loyalty`}
          className="mb-4 inline-flex items-center gap-2 text-[var(--text-secondary)] transition hover:text-[var(--primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a mis puntos
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
              <Gift className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Recompensas</h1>
              <p className="text-[var(--text-muted)]">Canjea tus puntos por increíbles premios</p>
            </div>
          </div>
        </div>
      </div>

      {/* Points Balance Card */}
      <div className="mb-8 flex items-center justify-between rounded-2xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark,var(--primary))] p-6 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
            <Star className="h-7 w-7" />
          </div>
          <div>
            <p className="text-sm opacity-80">Tu balance disponible</p>
            <p className="text-3xl font-bold">{userPoints.toLocaleString()} puntos</p>
          </div>
        </div>
        <Link
          href={`/${clinic}/portal/loyalty`}
          className="rounded-lg bg-white/20 px-4 py-2 font-medium transition hover:bg-white/30"
        >
          Ver historial
        </Link>
      </div>

      {/* Rewards */}
      {rewardsWithStatus.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100">
            <Sparkles className="h-12 w-12 text-gray-400" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-[var(--text-primary)]">
            Próximamente nuevas recompensas
          </h2>
          <p className="mx-auto max-w-md text-[var(--text-muted)]">
            Estamos preparando increíbles premios para ti. ¡Sigue acumulando puntos!
          </p>
        </div>
      ) : (
        <RewardsClient
          clinic={clinic}
          rewards={rewardsWithStatus}
          userPoints={userPoints}
          categories={categories}
        />
      )}
    </div>
  )
}
