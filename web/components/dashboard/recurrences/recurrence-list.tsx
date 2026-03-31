'use client'

/**
 * Recurrence List Component
 *
 * RES-001: Migrated to React Query for data fetching
 * - Replaced useEffect+fetch with useQuery hook
 * - Actions use useMutation with cache invalidation
 */

import { useState, useMemo } from 'react'
import {
  RefreshCw,
  Calendar,
  Search,
  Play,
  Pause,
  Trash2,
  ChevronDown,
  Loader2,
  AlertCircle,
  Clock,
  User,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/Toast'
import { staleTimes, gcTimes } from '@/lib/queries/utils'

interface Recurrence {
  id: string
  pet: {
    id: string
    name: string
    species: string
    photo_url: string | null
  }
  service: {
    id: string
    name: string
    duration_minutes: number
  }
  vet: { id: string; full_name: string } | null
  frequency: string
  interval_value: number
  day_of_week: number[] | null
  day_of_month: number | null
  preferred_time: string
  start_date: string
  end_date: string | null
  max_occurrences: number | null
  occurrences_generated: number
  is_active: boolean
  paused_until: string | null
  created_at: string
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Diario',
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  custom: 'Personalizado',
}

const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export function RecurrenceList(): React.ReactElement {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // React Query: Fetch recurrences
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['appointments', 'recurrences', { showInactive }],
    queryFn: async (): Promise<{ recurrences: Recurrence[] }> => {
      const params = new URLSearchParams()
      if (!showInactive) params.append('active', 'true')

      const res = await fetch(`/api/appointments/recurrences?${params}`)
      if (!res.ok) throw new Error('Error al cargar')
      return res.json()
    },
    staleTime: staleTimes.SHORT,
    gcTime: gcTimes.SHORT,
  })

  const recurrences = data?.recurrences || []

  // Query key for invalidation
  const queryKey = ['appointments', 'recurrences', { showInactive }]

  // Mutation: Pause recurrence
  const pauseMutation = useMutation({
    mutationFn: async ({ id, pausedUntil }: { id: string; pausedUntil: string }) => {
      const res = await fetch(`/api/appointments/recurrences/${id}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paused_until: pausedUntil }),
      })
      if (!res.ok) throw new Error('Error al pausar')
      return res.json()
    },
    onSuccess: (_, { pausedUntil }) => {
      queryClient.invalidateQueries({ queryKey })
      toast({
        title: 'Recurrencia pausada',
        description: `Pausada hasta ${pausedUntil}`,
      })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo pausar la recurrencia',
        variant: 'destructive',
      })
    },
  })

  // Mutation: Resume recurrence
  const resumeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/appointments/recurrences/${id}/pause`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Error al reanudar')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      toast({
        title: 'Recurrencia reanudada',
        description: 'Las citas se generarán automáticamente',
      })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo reanudar',
        variant: 'destructive',
      })
    },
  })

  // Mutation: Deactivate recurrence
  const deactivateMutation = useMutation({
    mutationFn: async ({ id, cancelFuture }: { id: string; cancelFuture: boolean }) => {
      const params = cancelFuture ? '?cancel_future=true' : ''
      const res = await fetch(`/api/appointments/recurrences/${id}${params}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Error al cancelar')
      return res.json()
    },
    onSuccess: (_, { cancelFuture }) => {
      queryClient.invalidateQueries({ queryKey })
      toast({
        title: 'Recurrencia cancelada',
        description: cancelFuture ? 'Citas futuras también canceladas' : 'Citas existentes mantenidas',
      })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo cancelar',
        variant: 'destructive',
      })
    },
  })

  // Mutation: Generate appointments
  const generateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/appointments/recurrences/${id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days_ahead: 30 }),
      })
      if (!res.ok) throw new Error('Error al generar')
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey })
      toast({
        title: 'Citas generadas',
        description: data.message,
      })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudieron generar las citas',
        variant: 'destructive',
      })
    },
  })

  const handlePause = (recurrence: Recurrence) => {
    const pauseDate = prompt('Pausar hasta (YYYY-MM-DD):')
    if (!pauseDate) return
    pauseMutation.mutate({ id: recurrence.id, pausedUntil: pauseDate })
  }

  const handleResume = (recurrence: Recurrence) => {
    resumeMutation.mutate(recurrence.id)
  }

  const handleDeactivate = (recurrence: Recurrence, cancelFuture: boolean) => {
    if (!confirm('¿Cancelar esta recurrencia?')) return
    deactivateMutation.mutate({ id: recurrence.id, cancelFuture })
  }

  const handleGenerate = (recurrence: Recurrence) => {
    generateMutation.mutate(recurrence.id)
  }

  // Track which item is isLoading
  const getActionLoading = (id: string): boolean => {
    return (
      (pauseMutation.isPending && pauseMutation.variables?.id === id) ||
      (resumeMutation.isPending && resumeMutation.variables === id) ||
      (deactivateMutation.isPending && deactivateMutation.variables?.id === id) ||
      (generateMutation.isPending && generateMutation.variables === id)
    )
  }

  const formatTime = (time: string): string => time.substring(0, 5)

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('es-PY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const getStatusBadge = (recurrence: Recurrence) => {
    if (!recurrence.is_active) {
      return <Badge className="bg-gray-100 text-[var(--text-secondary)]">Cancelada</Badge>
    }
    if (recurrence.paused_until) {
      return <Badge className="bg-[var(--status-warning-bg)] text-[var(--status-warning)]">Pausada</Badge>
    }
    return <Badge className="bg-[var(--status-success-bg)] text-[var(--status-success)]">Activa</Badge>
  }

  // Filter recurrences - memoized
  const filteredRecurrences = useMemo(() => {
    return recurrences.filter((r) => {
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      return (
        r.pet.name.toLowerCase().includes(query) ||
        r.service.name.toLowerCase().includes(query)
      )
    })
  }, [recurrences, searchQuery])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            Citas Recurrentes
          </h2>
          <p className="text-sm text-gray-500">
            {recurrences.filter((r) => r.is_active && !r.paused_until).length} activas
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 font-medium text-gray-700 hover:bg-gray-200"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar mascota o servicio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm focus:border-[var(--primary)] focus:outline-none"
          />
        </div>

        {/* Show Inactive */}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-gray-300 text-[var(--primary)] focus:ring-[var(--primary)]"
          />
          Mostrar inactivas
        </label>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
        </div>
      ) : filteredRecurrences.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
          <RefreshCw className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-4 font-medium text-gray-600">
            No hay citas recurrentes
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Las citas recurrentes aparecerán aquí
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecurrences.map((recurrence) => {
            const isActionLoading = getActionLoading(recurrence.id)
            const isExpanded = expandedId === recurrence.id
            const isPaused = !!recurrence.paused_until

            return (
              <div
                key={recurrence.id}
                className={`rounded-xl border bg-white ${
                  !recurrence.is_active
                    ? 'border-gray-200 bg-gray-50'
                    : isPaused
                      ? 'border-[var(--status-warning-border)]'
                      : 'border-gray-200'
                }`}
              >
                {/* Main Row */}
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Pet/Service Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">
                            {recurrence.pet.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {recurrence.service.name}
                          </p>
                        </div>
                        {getStatusBadge(recurrence)}
                      </div>

                      {/* Frequency Info */}
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <RefreshCw className="h-4 w-4" />
                          {FREQUENCY_LABELS[recurrence.frequency] || recurrence.frequency}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatTime(recurrence.preferred_time)}
                        </span>
                        {recurrence.day_of_week && recurrence.day_of_week.length > 0 && (
                          <span>
                            {recurrence.day_of_week.map((d) => DAYS_SHORT[d]).join(', ')}
                          </span>
                        )}
                        {recurrence.vet && (
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {recurrence.vet.full_name}
                          </span>
                        )}
                      </div>

                      {/* Paused Until */}
                      {isPaused && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-[var(--status-warning)]">
                          <AlertCircle className="h-4 w-4" />
                          {/* Non-null assertion safe: isPaused = !!recurrence.paused_until */}
                          {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */}
                          Pausada hasta {formatDate(recurrence.paused_until!)}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {recurrence.is_active && (
                      <div className="flex items-center gap-2">
                        {isPaused ? (
                          <button
                            onClick={() => handleResume(recurrence)}
                            disabled={isActionLoading}
                            className="flex items-center gap-1 rounded-lg bg-[var(--status-success-bg)] px-3 py-2 text-sm font-medium text-[var(--status-success)] hover:opacity-80 disabled:opacity-50"
                          >
                            {isActionLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                            Reanudar
                          </button>
                        ) : (
                          <button
                            onClick={() => handlePause(recurrence)}
                            disabled={isActionLoading}
                            className="flex items-center gap-1 rounded-lg bg-[var(--status-warning-bg)] px-3 py-2 text-sm font-medium text-[var(--status-warning)] hover:opacity-80 disabled:opacity-50"
                          >
                            {isActionLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Pause className="h-4 w-4" />
                            )}
                            Pausar
                          </button>
                        )}

                        <button
                          onClick={() => setExpandedId(isExpanded ? null : recurrence.id)}
                          className="rounded-lg p-2 hover:bg-gray-100"
                        >
                          <ChevronDown
                            className={`h-5 w-5 text-gray-400 transition-transform ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded Actions */}
                {isExpanded && recurrence.is_active && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => handleGenerate(recurrence)}
                        disabled={isActionLoading}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <Calendar className="h-4 w-4" />
                        Generar próximas citas
                      </button>

                      <button
                        onClick={() => handleDeactivate(recurrence, false)}
                        disabled={isActionLoading}
                        className="flex items-center gap-2 rounded-lg border border-[var(--status-error-border)] px-4 py-2 text-sm font-medium text-[var(--status-error)] hover:bg-[var(--status-error-bg)] disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Cancelar recurrencia
                      </button>

                      <button
                        onClick={() => handleDeactivate(recurrence, true)}
                        disabled={isActionLoading}
                        className="flex items-center gap-2 rounded-lg bg-[var(--status-error-bg)] px-4 py-2 text-sm font-medium text-[var(--status-error)] hover:opacity-80 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Cancelar todo (incluir citas futuras)
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                      <div>
                        <p className="text-gray-500">Inicio</p>
                        <p className="font-medium">{formatDate(recurrence.start_date)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Fin</p>
                        <p className="font-medium">
                          {recurrence.end_date ? formatDate(recurrence.end_date) : 'Sin fecha'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Citas generadas</p>
                        <p className="font-medium">{recurrence.occurrences_generated}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Máximo</p>
                        <p className="font-medium">
                          {recurrence.max_occurrences || 'Sin límite'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
