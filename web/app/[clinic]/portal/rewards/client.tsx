'use client'

import { useState } from 'react'
import { Gift, Star, Check, AlertCircle, Sparkles, Clock, Package } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

interface Reward {
  id: string
  name: string
  description: string | null
  category: string
  points_cost: number
  reward_type: string
  reward_value: number | null
  stock: number | null
  max_per_user: number | null
  is_featured: boolean
  image_url: string | null
  canRedeem: boolean
  userRedemptionCount: number
  isOutOfStock: boolean
  isMaxReached: boolean
}

interface Category {
  key: string
  label: string
}

interface RewardsClientProps {
  clinic: string
  rewards: Reward[]
  userPoints: number
  categories: Category[]
}

const REWARD_TYPE_LABELS = {
  discount_percentage: 'Descuento %',
  discount_fixed: 'Descuento fijo',
  free_service: 'Servicio gratis',
  free_product: 'Producto gratis',
  custom: 'Especial',
}

const CATEGORY_ICONS = {
  discount: Gift,
  service: Star,
  product: Package,
  experience: Sparkles,
  general: Gift,
}

export function RewardsClient({ clinic: _clinic, rewards, userPoints, categories }: RewardsClientProps) {
  const { toast } = useToast()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [redeemingId, setRedeemingId] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<Reward | null>(null)
  const [successDialog, setSuccessDialog] = useState<{
    reward: Reward
    code: string
    expiresAt: string
  } | null>(null)

  const filteredRewards = selectedCategory
    ? rewards.filter((r) => r.category === selectedCategory)
    : rewards

  const handleRedeem = async (reward: Reward) => {
    setConfirmDialog(reward)
  }

  const confirmRedeem = async () => {
    if (!confirmDialog) return

    setRedeemingId(confirmDialog.id)
    setConfirmDialog(null)

    try {
      const response = await fetch(`/api/loyalty/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardId: confirmDialog.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al canjear la recompensa')
      }

      setSuccessDialog({
        reward: confirmDialog,
        code: data.redemptionCode,
        expiresAt: data.expiresAt,
      })

      toast({ title: '¡Recompensa canjeada exitosamente!', variant: 'default' })
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : 'Error al canjear', variant: 'destructive' })
    } finally {
      setRedeemingId(null)
    }
  }

  const formatRewardValue = (reward: Reward): string => {
    if (reward.reward_type === 'discount_percentage' && reward.reward_value) {
      return `${reward.reward_value}% de descuento`
    }
    if (reward.reward_type === 'discount_fixed' && reward.reward_value) {
      return `₲ ${reward.reward_value.toLocaleString()} de descuento`
    }
    if (reward.reward_type === 'free_service') {
      return 'Servicio gratuito'
    }
    if (reward.reward_type === 'free_product') {
      return 'Producto gratuito'
    }
    return REWARD_TYPE_LABELS[reward.reward_type as keyof typeof REWARD_TYPE_LABELS] || 'Especial'
  }

  return (
    <div>
      {/* Category Filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            selectedCategory === null
              ? 'bg-[var(--primary)] text-white'
              : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
          }`}
        >
          Todos
        </button>
        {categories.map((cat) => {
          const count = rewards.filter((r) => r.category === cat.key).length
          if (count === 0) return null
          return (
            <button
              key={cat.key}
              data-testid="reward-category"
              onClick={() => setSelectedCategory(cat.key)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                selectedCategory === cat.key
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              {cat.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Rewards Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3" data-testid="rewards-list">
        {filteredRewards.map((reward) => {
          const CategoryIcon = CATEGORY_ICONS[reward.category as keyof typeof CATEGORY_ICONS] || Gift
          const notEnoughPoints = userPoints < reward.points_cost

          return (
            <div
              key={reward.id}
              data-testid="reward-item"
              className={`relative overflow-hidden rounded-2xl bg-[var(--bg-secondary)] shadow-sm transition hover:shadow-md ${
                !reward.canRedeem ? 'opacity-75' : ''
              }`}
            >
              {/* Featured badge */}
              {reward.is_featured && (
                <div className="absolute right-4 top-4 z-10">
                  <div className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-yellow-900">
                    <Sparkles className="mr-1 inline h-3 w-3" />
                    Destacado
                  </div>
                </div>
              )}

              {/* Image or placeholder */}
              <div className="relative h-40 bg-gradient-to-br from-purple-100 to-purple-200">
                {reward.image_url ? (
                  <img
                    src={reward.image_url}
                    alt={reward.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <CategoryIcon className="h-16 w-16 text-purple-400" />
                  </div>
                )}

                {/* Stock badge */}
                {reward.stock !== null && reward.stock > 0 && reward.stock <= 5 && (
                  <div className="absolute bottom-2 left-2 rounded-full bg-red-500 px-2 py-1 text-xs font-medium text-white">
                    ¡Solo {reward.stock} disponibles!
                  </div>
                )}

                {/* Out of stock overlay */}
                {reward.isOutOfStock && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <span className="rounded-full bg-red-500 px-4 py-2 font-bold text-white" data-testid="availability">
                      Agotado
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="mb-1 text-lg font-bold text-[var(--text-primary)]">{reward.name}</h3>
                {reward.description && (
                  <p className="mb-3 line-clamp-2 text-sm text-[var(--text-muted)]">
                    {reward.description}
                  </p>
                )}

                {/* Reward value */}
                <div className="mb-3 inline-block rounded-lg bg-purple-100 px-3 py-1 text-sm font-medium text-purple-700">
                  {formatRewardValue(reward)}
                </div>

                {/* Points cost */}
                <div className="mb-4 flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <span className="text-lg font-bold text-[var(--text-primary)]">
                    {reward.points_cost.toLocaleString()}
                  </span>
                  <span className="text-[var(--text-muted)]">puntos</span>
                </div>

                {/* Status messages */}
                {reward.isMaxReached && (
                  <p className="mb-3 flex items-center gap-2 text-sm text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    Ya canjeaste el máximo permitido
                  </p>
                )}
                {notEnoughPoints && !reward.isMaxReached && (
                  <p className="mb-3 flex items-center gap-2 text-sm text-[var(--text-muted)]">
                    <AlertCircle className="h-4 w-4" />
                    Te faltan {(reward.points_cost - userPoints).toLocaleString()} puntos
                  </p>
                )}

                {/* Redeem button */}
                <button
                  onClick={() => handleRedeem(reward)}
                  disabled={!reward.canRedeem || redeemingId === reward.id}
                  data-testid="redeem-button"
                  className={`w-full rounded-xl py-3 font-bold transition ${
                    reward.canRedeem
                      ? 'bg-[var(--primary)] text-white hover:brightness-110'
                      : 'cursor-not-allowed bg-gray-200 text-gray-500'
                  }`}
                >
                  {redeemingId === reward.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Canjeando...
                    </span>
                  ) : reward.canRedeem ? (
                    'Canjear'
                  ) : (
                    'No disponible'
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div
          role="dialog"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                <Gift className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">¿Confirmar canje?</h3>
                <p className="text-sm text-[var(--text-muted)]">Esta acción no se puede deshacer</p>
              </div>
            </div>

            <div className="mb-6 rounded-xl bg-[var(--bg-secondary)] p-4">
              <p className="font-medium text-[var(--text-primary)]">{confirmDialog.name}</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {formatRewardValue(confirmDialog)}
              </p>
              <div className="mt-3 flex items-center gap-2 text-lg font-bold text-[var(--primary)]">
                <Star className="h-5 w-5 text-yellow-500" />
                {confirmDialog.points_cost.toLocaleString()} puntos
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 rounded-xl border border-[var(--border-light)] py-3 font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-secondary)]"
              >
                Cancelar
              </button>
              <button
                onClick={confirmRedeem}
                className="flex-1 rounded-xl bg-[var(--primary)] py-3 font-bold text-white transition hover:brightness-110"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Dialog */}
      {successDialog && (
        <div
          role="dialog"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Check className="h-8 w-8 text-green-600" />
            </div>

            <h3 className="mb-2 text-xl font-bold text-[var(--text-primary)]">
              ¡Recompensa canjeada!
            </h3>
            <p className="mb-6 text-[var(--text-muted)]">{successDialog.reward.name}</p>

            <div className="mb-6 rounded-xl bg-[var(--bg-secondary)] p-6">
              <p className="mb-2 text-sm text-[var(--text-muted)]">Tu código de canje</p>
              <p
                className="font-mono text-3xl font-bold tracking-wider text-[var(--primary)]"
                data-testid="redemption-code"
              >
                {successDialog.code}
              </p>
              <p className="mt-4 flex items-center justify-center gap-2 text-sm text-[var(--text-muted)]">
                <Clock className="h-4 w-4" />
                Válido hasta {new Date(successDialog.expiresAt).toLocaleDateString('es-PY')}
              </p>
            </div>

            <p className="mb-6 text-sm text-[var(--text-muted)]">
              Presenta este código en la clínica para hacer uso de tu recompensa.
            </p>

            <button
              onClick={() => {
                setSuccessDialog(null)
                window.location.reload()
              }}
              className="w-full rounded-xl bg-[var(--primary)] py-3 font-bold text-white transition hover:brightness-110"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
