import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Star, ArrowLeft, Gift, TrendingUp, Award } from 'lucide-react'
import { LoyaltyClient } from './client'

interface LoyaltyPageProps {
  params: Promise<{ clinic: string }>
}

// Tier thresholds and colors
const TIERS = {
  bronze: { name: 'Bronce', threshold: 0, color: 'bg-amber-600', textColor: 'text-amber-600' },
  silver: { name: 'Plata', threshold: 500, color: 'bg-gray-400', textColor: 'text-gray-500' },
  gold: { name: 'Oro', threshold: 2000, color: 'bg-yellow-500', textColor: 'text-yellow-600' },
  platinum: { name: 'Platino', threshold: 5000, color: 'bg-purple-500', textColor: 'text-purple-600' },
} as const

function getTierInfo(tier: string) {
  return TIERS[tier as keyof typeof TIERS] || TIERS.bronze
}

function getNextTier(currentTier: string, lifetimeEarned: number): { name: string; pointsNeeded: number } | null {
  const tierOrder = ['bronze', 'silver', 'gold', 'platinum']
  const currentIndex = tierOrder.indexOf(currentTier)

  if (currentIndex < tierOrder.length - 1) {
    const nextTierKey = tierOrder[currentIndex + 1] as keyof typeof TIERS
    const nextTier = TIERS[nextTierKey]
    return {
      name: nextTier.name,
      pointsNeeded: nextTier.threshold - lifetimeEarned,
    }
  }
  return null
}

export default async function LoyaltyPage({ params }: LoyaltyPageProps) {
  const supabase = await createClient()
  const { clinic } = await params

  // Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/${clinic}/portal/login?returnTo=/${clinic}/portal/loyalty`)
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

  // Fetch loyalty points balance
  const { data: loyaltyData } = await supabase
    .from('loyalty_points')
    .select('balance, lifetime_earned, lifetime_redeemed, tier')
    .eq('client_id', user.id)
    .eq('tenant_id', profile.tenant_id)
    .single()

  // Fetch recent transactions
  const { data: transactions } = await supabase
    .from('loyalty_transactions')
    .select('id, points, description, type, created_at, balance_after')
    .eq('client_id', user.id)
    .eq('tenant_id', profile.tenant_id)
    .order('created_at', { ascending: false })
    .limit(20)

  // Fetch redemption history
  const { data: redemptions } = await supabase
    .from('loyalty_redemptions')
    .select(`
      id,
      points_spent,
      redemption_code,
      status,
      expires_at,
      used_at,
      created_at,
      loyalty_rewards (
        name,
        description,
        reward_type,
        reward_value
      )
    `)
    .eq('user_id', user.id)
    .eq('tenant_id', profile.tenant_id)
    .order('created_at', { ascending: false })
    .limit(10)

  const balance = loyaltyData?.balance ?? 0
  const lifetimeEarned = loyaltyData?.lifetime_earned ?? 0
  const lifetimeRedeemed = loyaltyData?.lifetime_redeemed ?? 0
  const tier = loyaltyData?.tier ?? 'bronze'
  const tierInfo = getTierInfo(tier)
  const nextTier = getNextTier(tier, lifetimeEarned)

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/${clinic}/portal`}
          className="mb-4 inline-flex items-center gap-2 text-[var(--text-secondary)] transition hover:text-[var(--primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al portal
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
            <Star className="h-6 w-6 text-yellow-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Mis Puntos de Lealtad</h1>
            <p className="text-[var(--text-muted)]">Acumula puntos y canjea recompensas</p>
          </div>
        </div>
      </div>

      {/* Points Balance Card */}
      <div className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark,var(--primary))] p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm opacity-80">Tu balance actual</p>
            <div className="flex items-baseline gap-2" data-testid="points-balance">
              <span className="text-5xl font-bold">{balance.toLocaleString()}</span>
              <span className="text-xl opacity-80">puntos</span>
            </div>
          </div>
          <div className="mt-4 md:mt-0 md:text-right">
            <div
              className={`inline-flex items-center gap-2 rounded-full ${tierInfo.color} px-4 py-2`}
              data-testid="tier-level"
            >
              <Award className="h-5 w-5" />
              <span className="font-bold">Nivel {tierInfo.name}</span>
            </div>
            {nextTier && nextTier.pointsNeeded > 0 && (
              <p className="mt-2 text-sm opacity-80">
                {nextTier.pointsNeeded.toLocaleString()} puntos para {nextTier.name}
              </p>
            )}
          </div>
        </div>

        {/* Progress to next tier */}
        {nextTier && nextTier.pointsNeeded > 0 && (
          <div className="mt-6">
            <div className="mb-2 flex justify-between text-sm opacity-80">
              <span>{tierInfo.name}</span>
              <span>{nextTier.name}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all duration-500"
                style={{
                  width: `${Math.min(100, (lifetimeEarned / TIERS[tier === 'bronze' ? 'silver' : tier === 'silver' ? 'gold' : 'platinum'].threshold) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-[var(--bg-secondary)] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-muted)]" data-testid="lifetime-earned">
                Total ganado
              </p>
              <p className="text-xl font-bold text-[var(--text-primary)]">
                {lifetimeEarned.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-[var(--bg-secondary)] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
              <Gift className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-muted)]">Total canjeado</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">
                {lifetimeRedeemed.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <Link
          href={`/${clinic}/portal/rewards`}
          className="rounded-xl bg-[var(--primary)] p-4 text-white transition hover:brightness-110"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm opacity-80">Ver catálogo</p>
              <p className="text-xl font-bold">Recompensas</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Client Component for Tabs */}
      <LoyaltyClient
        clinic={clinic}
        transactions={transactions ?? []}
        redemptions={(redemptions ?? []).map((r) => ({
          ...r,
          reward: Array.isArray(r.loyalty_rewards) ? r.loyalty_rewards[0] : r.loyalty_rewards,
        }))}
      />
    </div>
  )
}
