'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { logger } from '@/lib/logger'
import {
  Package,
  Calendar,
  AlertTriangle,
  Pause,
  Play,
  SkipForward,
  Trash2,
  ChevronDown,
  Loader2,
  CheckCircle,
} from 'lucide-react'
import { clsx } from 'clsx'

interface Subscription {
  id: string
  productId: string
  productName: string
  productImage: string | null
  variantId: string | null
  variantName: string | null
  quantity: number
  frequencyDays: number
  nextOrderDate: string
  status: 'active' | 'paused' | 'cancelled'
  subscribedPrice: number
  currentPrice: number
  priceChanged: boolean
}

interface SubscriptionsClientProps {
  clinic: string
  initialSubscriptions: Subscription[]
}

const FREQUENCY_OPTIONS = [
  { value: 7, label: 'Cada semana' },
  { value: 14, label: 'Cada 2 semanas' },
  { value: 21, label: 'Cada 3 semanas' },
  { value: 30, label: 'Cada mes' },
  { value: 45, label: 'Cada 6 semanas' },
  { value: 60, label: 'Cada 2 meses' },
  { value: 90, label: 'Cada 3 meses' },
]

export function SubscriptionsClient({ clinic, initialSubscriptions }: SubscriptionsClientProps) {
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  )

  const formatPrice = (price: number): string => {
    return `Gs ${price.toLocaleString('es-PY')}`
  }

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('es-PY', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getFrequencyLabel = (days: number): string => {
    const option = FREQUENCY_OPTIONS.find((o) => o.value === days)
    return option?.label || `Cada ${days} días`
  }

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message })
    setTimeout(() => setFeedback(null), 4000)
  }

  const handlePauseResume = async (subscription: Subscription) => {
    setLoadingId(subscription.id)
    const newStatus = subscription.status === 'active' ? 'paused' : 'active'

    try {
      const res = await fetch(`/api/store/subscriptions?id=${subscription.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) throw new Error('Error al actualizar')

      setSubscriptions((prev) =>
        prev.map((s) => (s.id === subscription.id ? { ...s, status: newStatus } : s))
      )

      showFeedback(
        'success',
        newStatus === 'paused' ? 'Suscripción pausada' : 'Suscripción reactivada'
      )
    } catch (e) {
      logger.error('Error toggling subscription status', {
        error: e instanceof Error ? e.message : 'Unknown error',
        subscriptionId: subscription.id,
        newStatus
      })
      showFeedback('error', 'Error al actualizar suscripción')
    } finally {
      setLoadingId(null)
    }
  }

  const handleSkip = async (subscription: Subscription) => {
    setLoadingId(subscription.id)

    try {
      const res = await fetch(`/api/store/subscriptions/${subscription.id}/skip`, {
        method: 'POST',
      })

      if (!res.ok) throw new Error('Error al saltar pedido')

      const data = await res.json()

      setSubscriptions((prev) =>
        prev.map((s) =>
          s.id === subscription.id ? { ...s, nextOrderDate: data.subscription.next_order_date } : s
        )
      )

      showFeedback('success', data.message)
    } catch (e) {
      logger.error('Error skipping subscription order', {
        error: e instanceof Error ? e.message : 'Unknown error',
        subscriptionId: subscription.id
      })
      showFeedback('error', 'Error al saltar pedido')
    } finally {
      setLoadingId(null)
    }
  }

  const handleCancel = async (subscription: Subscription) => {
    if (!confirm('¿Estás seguro de cancelar esta suscripción? Esta acción no se puede deshacer.')) {
      return
    }

    setLoadingId(subscription.id)

    try {
      const res = await fetch(`/api/store/subscriptions?id=${subscription.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Error al cancelar')

      setSubscriptions((prev) => prev.filter((s) => s.id !== subscription.id))
      showFeedback('success', 'Suscripción cancelada')
    } catch (e) {
      logger.error('Error canceling subscription', {
        error: e instanceof Error ? e.message : 'Unknown error',
        subscriptionId: subscription.id
      })
      showFeedback('error', 'Error al cancelar suscripción')
    } finally {
      setLoadingId(null)
    }
  }

  const handleFrequencyChange = async (subscription: Subscription, newFrequency: number) => {
    setLoadingId(subscription.id)

    try {
      const res = await fetch(`/api/store/subscriptions?id=${subscription.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frequency_days: newFrequency }),
      })

      if (!res.ok) throw new Error('Error al actualizar')

      setSubscriptions((prev) =>
        prev.map((s) => (s.id === subscription.id ? { ...s, frequencyDays: newFrequency } : s))
      )

      showFeedback('success', 'Frecuencia actualizada')
    } catch (e) {
      logger.error('Error updating subscription frequency', {
        error: e instanceof Error ? e.message : 'Unknown error',
        subscriptionId: subscription.id,
        newFrequency
      })
      showFeedback('error', 'Error al actualizar frecuencia')
    } finally {
      setLoadingId(null)
    }
  }

  const handleQuantityChange = async (subscription: Subscription, newQuantity: number) => {
    if (newQuantity < 1 || newQuantity > 100) return

    setLoadingId(subscription.id)

    try {
      const res = await fetch(`/api/store/subscriptions?id=${subscription.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQuantity }),
      })

      if (!res.ok) throw new Error('Error al actualizar')

      setSubscriptions((prev) =>
        prev.map((s) => (s.id === subscription.id ? { ...s, quantity: newQuantity } : s))
      )

      showFeedback('success', 'Cantidad actualizada')
    } catch (e) {
      logger.error('Error updating subscription quantity', {
        error: e instanceof Error ? e.message : 'Unknown error',
        subscriptionId: subscription.id,
        newQuantity
      })
      showFeedback('error', 'Error al actualizar cantidad')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Feedback Toast */}
      {feedback && (
        <div
          className={clsx(
            'fixed right-4 top-4 z-50 flex items-center gap-2 rounded-xl px-6 py-3 font-medium shadow-lg',
            feedback.type === 'success' && 'bg-green-500 text-white',
            feedback.type === 'error' && 'bg-red-500 text-white'
          )}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertTriangle className="h-5 w-5" />
          )}
          {feedback.message}
        </div>
      )}

      {subscriptions.map((subscription) => {
        const isLoading = loadingId === subscription.id
        const isExpanded = expandedId === subscription.id
        const isPaused = subscription.status === 'paused'

        return (
          <div
            key={subscription.id}
            className={clsx(
              'overflow-hidden rounded-2xl border bg-white shadow-sm transition-all',
              isPaused ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100'
            )}
          >
            {/* Main Row */}
            <div className="p-4 md:p-6">
              <div className="flex items-start gap-4">
                {/* Product Image */}
                <Link href={`/${clinic}/store/product/${subscription.productId}`}>
                  <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100 md:h-24 md:w-24">
                    {subscription.productImage ? (
                      <Image
                        src={subscription.productImage}
                        alt={subscription.productName}
                        fill
                        className="object-contain p-2"
                        sizes="96px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    {isPaused && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Pause className="h-8 w-8 text-white" />
                      </div>
                    )}
                  </div>
                </Link>

                {/* Product Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/${clinic}/store/product/${subscription.productId}`}
                        className="line-clamp-1 font-bold text-[var(--text-primary)] hover:text-[var(--primary)]"
                      >
                        {subscription.productName}
                      </Link>
                      {subscription.variantName && (
                        <p className="text-sm text-[var(--text-muted)]">
                          {subscription.variantName}
                        </p>
                      )}
                    </div>

                    {/* Status Badge */}
                    <span
                      className={clsx(
                        'flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium',
                        isPaused ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                      )}
                    >
                      {isPaused ? 'Pausada' : 'Activa'}
                    </span>
                  </div>

                  {/* Details Row */}
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
                    <span className="text-[var(--text-secondary)]">
                      Cantidad: <strong>{subscription.quantity}</strong>
                    </span>
                    <span className="text-[var(--text-secondary)]">
                      {getFrequencyLabel(subscription.frequencyDays)}
                    </span>
                    <span className="font-bold text-[var(--primary)]">
                      {formatPrice(subscription.subscribedPrice * subscription.quantity)}
                    </span>
                  </div>

                  {/* Price Change Warning */}
                  {subscription.priceChanged && (
                    <div className="mt-2 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5 text-sm text-amber-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span>
                        El precio cambió de {formatPrice(subscription.subscribedPrice)} a{' '}
                        {formatPrice(subscription.currentPrice)}
                      </span>
                    </div>
                  )}

                  {/* Next Order */}
                  <div className="mt-3 flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-[var(--text-muted)]" />
                    <span className="text-[var(--text-secondary)]">
                      {isPaused
                        ? 'Pausada'
                        : `Próximo pedido: ${formatDate(subscription.nextOrderDate)}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {!isPaused && (
                  <button
                    onClick={() => handleSkip(subscription)}
                    disabled={isLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 font-medium text-[var(--text-primary)] transition hover:bg-gray-200 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <SkipForward className="h-4 w-4" />
                    )}
                    Saltar Pedido
                  </button>
                )}

                <button
                  onClick={() => handlePauseResume(subscription)}
                  disabled={isLoading}
                  className={clsx(
                    'inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition disabled:opacity-50',
                    isPaused
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isPaused ? (
                    <Play className="h-4 w-4" />
                  ) : (
                    <Pause className="h-4 w-4" />
                  )}
                  {isPaused ? 'Reactivar' : 'Pausar'}
                </button>

                <button
                  onClick={() => setExpandedId(isExpanded ? null : subscription.id)}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 font-medium text-[var(--text-primary)] transition hover:bg-gray-50"
                >
                  Editar
                  <ChevronDown
                    className={clsx('h-4 w-4 transition-transform', isExpanded && 'rotate-180')}
                  />
                </button>

                <button
                  onClick={() => handleCancel(subscription)}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Cancelar
                </button>
              </div>
            </div>

            {/* Expanded Edit Section */}
            {isExpanded && (
              <div className="border-t border-gray-100 bg-gray-50 p-4 md:p-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Quantity */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                      Cantidad por pedido
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          handleQuantityChange(subscription, subscription.quantity - 1)
                        }
                        disabled={isLoading || subscription.quantity <= 1}
                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-50"
                      >
                        -
                      </button>
                      <span className="w-16 text-center text-lg font-bold">
                        {subscription.quantity}
                      </span>
                      <button
                        onClick={() =>
                          handleQuantityChange(subscription, subscription.quantity + 1)
                        }
                        disabled={isLoading || subscription.quantity >= 100}
                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-50"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Frequency */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                      Frecuencia de entrega
                    </label>
                    <select
                      value={subscription.frequencyDays}
                      onChange={(e) =>
                        handleFrequencyChange(subscription, parseInt(e.target.value))
                      }
                      disabled={isLoading}
                      className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-50"
                    >
                      {FREQUENCY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Price Summary */}
                <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Total por pedido:</span>
                    <span className="text-xl font-bold text-[var(--primary)]">
                      {formatPrice(subscription.currentPrice * subscription.quantity)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {subscription.quantity} x {formatPrice(subscription.currentPrice)} ={' '}
                    {formatPrice(subscription.currentPrice * subscription.quantity)}
                  </p>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
