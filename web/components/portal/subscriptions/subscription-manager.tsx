'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import {
  Package,
  Loader2,
  AlertCircle,
  RefreshCw,
  Plus,
  Calendar,
  Filter,
} from 'lucide-react'
import { SubscriptionCard, type Subscription } from './subscription-card'
import { useToast } from '@/components/ui/Toast'

type SubscriptionStatus = Subscription['status']

interface SubscriptionManagerProps {
  initialSubscriptions?: Subscription[]
}

const statusFilters: { value: SubscriptionStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'active', label: 'Activas' },
  { value: 'paused', label: 'Pausadas' },
  { value: 'cancelled', label: 'Canceladas' },
]

export function SubscriptionManager({
  initialSubscriptions,
}: SubscriptionManagerProps): React.ReactElement {
  const params = useParams()
  const clinic = params?.clinic as string
  const { toast } = useToast()

  const [subscriptions, setSubscriptions] = useState<Subscription[]>(
    initialSubscriptions || []
  )
  const [loading, setLoading] = useState(!initialSubscriptions)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | 'all'>('all')

  const fetchSubscriptions = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/store/subscriptions')
      if (!res.ok) {
        throw new Error('Error al cargar suscripciones')
      }
      const data = await res.json()
      setSubscriptions(data.subscriptions || [])
    } catch (err) {
      setError('No se pudieron cargar las suscripciones')
      console.error('Error fetching subscriptions:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!initialSubscriptions) {
      fetchSubscriptions()
    }
  }, [])

  const handleSkip = async (subscriptionId: string) => {
    try {
      const res = await fetch(`/api/store/subscriptions/${subscriptionId}/skip`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Error al omitir pedido')
      
      toast({
        title: 'Pedido omitido',
        description: 'El siguiente pedido ha sido pospuesto.',
      })
      fetchSubscriptions()
    } catch (err) {
      toast({
        title: 'Error',
        description: 'No se pudo omitir el pedido.',
        variant: 'destructive',
      })
    }
  }

  const handlePause = async (subscriptionId: string) => {
    try {
      const res = await fetch(`/api/store/subscriptions/${subscriptionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paused' }),
      })
      if (!res.ok) throw new Error('Error al pausar')
      
      toast({
        title: 'Suscripción pausada',
        description: 'Tu suscripción ha sido pausada.',
      })
      fetchSubscriptions()
    } catch (err) {
      toast({
        title: 'Error',
        description: 'No se pudo pausar la suscripción.',
        variant: 'destructive',
      })
    }
  }

  const handleResume = async (subscriptionId: string) => {
    try {
      const res = await fetch(`/api/store/subscriptions/${subscriptionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      })
      if (!res.ok) throw new Error('Error al reactivar')
      
      toast({
        title: 'Suscripción reactivada',
        description: 'Tu suscripción está activa nuevamente.',
      })
      fetchSubscriptions()
    } catch (err) {
      toast({
        title: 'Error',
        description: 'No se pudo reactivar la suscripción.',
        variant: 'destructive',
      })
    }
  }

  const handleEdit = async (
    subscriptionId: string,
    updates: { quantity?: number; frequency_days?: number }
  ) => {
    try {
      const res = await fetch(`/api/store/subscriptions/${subscriptionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Error al actualizar')
      
      toast({
        title: 'Suscripción actualizada',
        description: 'Los cambios han sido guardados.',
      })
      fetchSubscriptions()
    } catch (err) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la suscripción.',
        variant: 'destructive',
      })
    }
  }

  const handleCancel = async (subscriptionId: string) => {
    try {
      const res = await fetch(`/api/store/subscriptions/${subscriptionId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Error al cancelar')
      
      toast({
        title: 'Suscripción cancelada',
        description: 'Tu suscripción ha sido cancelada.',
      })
      fetchSubscriptions()
    } catch (err) {
      toast({
        title: 'Error',
        description: 'No se pudo cancelar la suscripción.',
        variant: 'destructive',
      })
    }
  }

  // Filter subscriptions
  const filteredSubscriptions = subscriptions.filter((sub) =>
    statusFilter === 'all' ? true : sub.status === statusFilter
  )

  // Group by status for summary
  const statusCounts = subscriptions.reduce(
    (acc, sub) => {
      acc[sub.status] = (acc[sub.status] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-[var(--status-error)]" />
        <p className="text-gray-600">{error}</p>
        <button
          onClick={fetchSubscriptions}
          className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-white"
        >
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            {subscriptions.length}
          </p>
        </div>
        <div className="rounded-xl bg-[var(--status-success-bg)] p-4 shadow-sm">
          <p className="text-sm text-[var(--status-success)]">Activas</p>
          <p className="text-2xl font-bold text-[var(--status-success-text)]">
            {statusCounts['active'] || 0}
          </p>
        </div>
        <div className="rounded-xl bg-[var(--status-warning-bg)] p-4 shadow-sm">
          <p className="text-sm text-[var(--status-warning)]">Pausadas</p>
          <p className="text-2xl font-bold text-[var(--status-warning-text)]">
            {statusCounts['paused'] || 0}
          </p>
        </div>
        <div className="rounded-xl bg-gray-50 p-4 shadow-sm">
          <p className="text-sm text-gray-500">Canceladas</p>
          <p className="text-2xl font-bold text-gray-600">
            {statusCounts['cancelled'] || 0}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600">Filtrar:</span>
        </div>
        {statusFilters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setStatusFilter(filter.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === filter.value
                ? 'bg-[var(--primary)] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {filter.label}
            {filter.value !== 'all' && statusCounts[filter.value] > 0 && (
              <span className="ml-1.5 rounded-full bg-white/20 px-1.5 text-xs">
                {statusCounts[filter.value]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Subscription List */}
      {filteredSubscriptions.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl bg-white p-8 shadow-sm">
          <Package className="h-16 w-16 text-gray-300" />
          <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
            {statusFilter === 'all'
              ? 'No tienes suscripciones'
              : `No tienes suscripciones ${statusFilters.find((f) => f.value === statusFilter)?.label.toLowerCase()}`}
          </h3>
          <p className="mt-2 text-center text-gray-500">
            {statusFilter === 'all'
              ? 'Suscríbete a productos y recíbelos automáticamente con descuento.'
              : 'Prueba con otro filtro para ver más suscripciones.'}
          </p>
          {statusFilter === 'all' && (
            <a
              href={`/${clinic}/store`}
              className="mt-6 flex items-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-3 font-medium text-white hover:opacity-90"
            >
              <Plus className="h-5 w-5" />
              Explorar Tienda
            </a>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSubscriptions.map((subscription) => (
            <SubscriptionCard
              key={subscription.id}
              subscription={subscription}
              clinic={clinic}
              onUpdate={fetchSubscriptions}
            />
          ))}
        </div>
      )}

      {/* Upcoming Orders Info */}
      {filteredSubscriptions.filter((s) => s.status === 'active').length > 0 && (
        <div className="rounded-xl border border-[var(--status-info-border)] bg-[var(--status-info-bg)] p-4">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-[var(--status-info)]" />
            <div>
              <h4 className="font-medium text-[var(--status-info-text)]">Próximos pedidos</h4>
              <p className="mt-1 text-sm text-[var(--status-info-text)]">
                Tus suscripciones activas generarán pedidos automáticamente en las fechas
                indicadas. Recibirás un email de confirmación antes de cada envío.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
