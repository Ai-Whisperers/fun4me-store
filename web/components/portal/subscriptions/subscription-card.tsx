'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  RefreshCw,
  Calendar,
  Package,
  Pause,
  Play,
  Trash2,
  Edit2,
  SkipForward,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { Modal, ModalFooter } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/Toast'
import { useTranslations } from 'next-intl'

export interface Subscription {
  id: string
  product_id: string
  product_name: string
  product_image?: string | null
  product_image_url?: string | null
  variant_name?: string | null
  quantity: number
  frequency_days: number
  subscribed_price?: number
  discount_percent?: number
  status: 'active' | 'paused' | 'cancelled' | 'expired'
  next_order_date: string
  last_order_date?: string | null
  orders_count?: number
  created_at: string
  updated_at?: string
}

interface SubscriptionCardProps {
  subscription: Subscription
  clinic: string
  onUpdate: () => void
}

const statusConfig = {
  active: { label: 'Activa', color: 'bg-[var(--status-success-bg)] text-[var(--status-success-text)]' },
  paused: { label: 'Pausada', color: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]' },
  cancelled: { label: 'Cancelada', color: 'bg-gray-100 text-gray-700' },
  expired: { label: 'Expirada', color: 'bg-gray-100 text-gray-500' },
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-PY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function getFrequencyLabel(days: number): string {
  if (days === 7) return 'Semanal'
  if (days === 14) return 'Quincenal'
  if (days === 30) return 'Mensual'
  if (days === 60) return 'Bimensual'
  return `Cada ${days} días`
}

export function SubscriptionCard({
  subscription,
  clinic: _clinic,
  onUpdate,
}: SubscriptionCardProps): React.ReactElement {
  const { toast } = useToast()
  const t = useTranslations()
  const [isLoading, setIsLoading] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editQuantity, setEditQuantity] = useState(subscription.quantity)
  const [editFrequency, setEditFrequency] = useState(subscription.frequency_days)

  const statusInfo = statusConfig[subscription.status]

  const handleAction = async (
    action: 'pause' | 'resume' | 'cancel' | 'skip',
    reason?: string
  ) => {
    setIsLoading(true)
    try {
      let url = `/api/store/subscriptions?id=${subscription.id}`
      let method = 'PATCH'
      let body: Record<string, unknown> = {}

      switch (action) {
        case 'pause':
          body = { status: 'paused', pause_reason: reason }
          break
        case 'resume':
          body = { status: 'active' }
          break
        case 'cancel':
          method = 'DELETE'
          url += `&reason=${encodeURIComponent(reason || 'Usuario canceló')}`
          break
        case 'skip':
          url = `/api/store/subscriptions/${subscription.id}/skip`
          method = 'POST'
          break
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method !== 'DELETE' ? JSON.stringify(body) : undefined,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.details?.message || 'Error al actualizar')
      }

      toast({
        title: 'Éxito',
        description: data.message,
        variant: 'success',
      })

      onUpdate()
      setShowCancelModal(false)
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Error al actualizar',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/store/subscriptions?id=${subscription.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: editQuantity,
          frequency_days: editFrequency,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.details?.message || 'Error al actualizar')
      }

      toast({
        title: 'Éxito',
        description: 'Suscripción actualizada',
        variant: 'success',
      })

      onUpdate()
      setShowEditModal(false)
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Error al actualizar',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex gap-4">
          {/* Product image */}
          <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
            {(subscription.product_image || subscription.product_image_url) ? (
              <Image
                src={subscription.product_image || subscription.product_image_url || ''}
                alt={subscription.product_name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Package className="h-8 w-8 text-gray-400" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">
                  {subscription.product_name}
                </h3>
                {subscription.variant_name && (
                  <p className="text-sm text-gray-500">{subscription.variant_name}</p>
                )}
              </div>
              <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <RefreshCw className="h-4 w-4" />
                {getFrequencyLabel(subscription.frequency_days)}
              </span>
              <span className="flex items-center gap-1">
                <Package className="h-4 w-4" />
                {subscription.quantity} unidad{subscription.quantity > 1 ? 'es' : ''}
              </span>
              {subscription.subscribed_price !== undefined && (
                <span className="font-medium text-[var(--text-primary)]">
                  {formatCurrency(subscription.subscribed_price * subscription.quantity)}
                </span>
              )}
            </div>

            {subscription.status === 'active' && (
              <div className="mt-2 flex items-center gap-1 text-sm">
                <Calendar className="h-4 w-4 text-[var(--primary)]" />
                <span className="text-gray-600">Próxima entrega:</span>
                <span className="font-medium text-[var(--text-primary)]">
                  {formatDate(subscription.next_order_date)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {subscription.status !== 'cancelled' && (
          <div className="mt-4 flex items-center gap-2 border-t pt-4">
            {subscription.status === 'active' ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleAction('skip')}
                  disabled={isLoading}
                  leftIcon={<SkipForward className="h-4 w-4" />}
                >
                  Omitir
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleAction('pause')}
                  disabled={isLoading}
                  leftIcon={<Pause className="h-4 w-4" />}
                >
                  Pausar
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleAction('resume')}
                disabled={isLoading}
                leftIcon={<Play className="h-4 w-4" />}
              >
                Reanudar
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowEditModal(true)}
              disabled={isLoading}
              leftIcon={<Edit2 className="h-4 w-4" />}
            >
              Editar
            </Button>

            <div className="flex-1" />

            <IconButton
              icon={<Trash2 className="h-4 w-4" />}
              aria-label={`${t('common.cancel')} suscripción`}
              variant="destructive"
              size="sm"
              onClick={() => setShowCancelModal(true)}
              disabled={isLoading}
            />
          </div>
        )}
      </div>

      {/* Cancel Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title={`${t('common.cancel')} Suscripción`}
        size="sm"
      >
        <p className="text-gray-600">
          ¿Estás seguro que deseas cancelar tu suscripción a {subscription.product_name}?
        </p>
        <p className="mt-2 text-sm text-gray-500">
          No recibirás más entregas automáticas. Puedes volver a suscribirte en cualquier momento.
        </p>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setShowCancelModal(false)} disabled={isLoading}>
            Volver
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleAction('cancel')}
            isLoading={isLoading}
          >
            Sí, cancelar
          </Button>
        </ModalFooter>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`${t('common.edit')} Suscripción`}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Cantidad</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setEditQuantity(Math.max(1, editQuantity - 1))}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-lg font-bold hover:bg-gray-50"
              >
                −
              </button>
              <span className="min-w-[3rem] text-center text-lg font-bold">{editQuantity}</span>
              <button
                onClick={() => setEditQuantity(Math.min(10, editQuantity + 1))}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-lg font-bold hover:bg-gray-50"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Frecuencia</label>
            <select
              value={editFrequency}
              onChange={(e) => setEditFrequency(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[var(--primary)] focus:outline-none"
            >
              <option value={7}>Cada semana</option>
              <option value={14}>Cada 2 semanas</option>
              <option value={30}>Cada mes</option>
              <option value={60}>Cada 2 meses</option>
            </select>
          </div>
        </div>

        <ModalFooter>
          <Button variant="ghost" onClick={() => setShowEditModal(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleEdit} isLoading={isLoading}>
            Guardar Cambios
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}
