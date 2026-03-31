'use client'

/**
 * Mandatory Vaccines Widget
 *
 * RES-001: Migrated to React Query for data fetching
 * - Replaced useEffect+fetch with useQuery hook
 * - Native refetchInterval replaces setInterval
 * - Mutation for sending reminders uses manual state
 */

import { useState, useMemo } from 'react'
import {
  Syringe,
  ChevronRight,
  Bell,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  RefreshCw,
  Check,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queries'
import { staleTimes, gcTimes } from '@/lib/queries/utils'

interface MissingVaccine {
  vaccine_name: string
  vaccine_code: string
  status: 'overdue' | 'due' | 'missing'
  days_overdue?: number
  is_mandatory: true
}

interface MandatoryVaccineAlert {
  pet_id: string
  pet_name: string
  pet_photo_url: string | null
  species: string
  owner_id: string
  owner_name: string | null
  owner_email: string | null
  vaccines: MissingVaccine[]
  urgency: 'overdue' | 'due' | 'upcoming'
  booking_url: string
  reminder_sent_at?: string | null
}

interface AlertSummary {
  total_pets: number
  overdue_count: number
  due_count: number
  upcoming_count: number
}

interface MandatoryVaccinesWidgetProps {
  clinic: string
}

export function MandatoryVaccinesWidget({ clinic }: MandatoryVaccinesWidgetProps): React.ReactElement {
  const queryClient = useQueryClient()
  const [selectedPetIds, setSelectedPetIds] = useState<Set<string>>(new Set())
  const [sendingReminders, setSendingReminders] = useState(false)
  const [reminderResult, setReminderResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  // React Query: Fetch mandatory vaccine alerts with 5-minute auto-refresh
  const {
    data,
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: queryKeys.vaccines.mandatory(30),
    queryFn: async (): Promise<{ alerts: MandatoryVaccineAlert[]; summary: AlertSummary | null }> => {
      const res = await fetch(`/api/vaccines/mandatory-alerts?days=30`)
      if (!res.ok) throw new Error('Error al cargar alertas de vacunas')
      const json = await res.json()
      return {
        alerts: json.alerts || [],
        summary: json.summary || null,
      }
    },
    staleTime: staleTimes.MEDIUM, // 2 minutes
    gcTime: gcTimes.MEDIUM, // 15 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  })

  const alerts = data?.alerts ?? []
  const summary = data?.summary ?? null

  // Memoized filtering
  const overdue = useMemo(() => alerts.filter((a) => a.urgency === 'overdue'), [alerts])
  const due = useMemo(() => alerts.filter((a) => a.urgency === 'due'), [alerts])

  const handleSelectPet = (petId: string): void => {
    setSelectedPetIds((prev) => {
      const next = new Set(prev)
      if (next.has(petId)) {
        next.delete(petId)
      } else {
        next.add(petId)
      }
      return next
    })
  }

  const handleSelectAll = (): void => {
    if (selectedPetIds.size === alerts.length) {
      setSelectedPetIds(new Set())
    } else {
      setSelectedPetIds(new Set(alerts.map((a) => a.pet_id)))
    }
  }

  const handleSendReminders = async (petIds?: string[]): Promise<void> => {
    const idsToSend = petIds || Array.from(selectedPetIds)
    if (idsToSend.length === 0) return

    setSendingReminders(true)
    setReminderResult(null)

    try {
      const res = await fetch('/api/vaccines/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pet_ids: idsToSend }),
      })

      const data = await res.json()

      if (res.ok) {
        setReminderResult({
          success: true,
          message: `${data.created} recordatorio${data.created !== 1 ? 's' : ''} enviado${data.created !== 1 ? 's' : ''}${data.skipped > 0 ? `, ${data.skipped} omitido${data.skipped !== 1 ? 's' : ''}` : ''}`,
        })
        // Clear selection and refresh
        setSelectedPetIds(new Set())
        refetch()
      } else {
        setReminderResult({
          success: false,
          message: data.error || 'Error al enviar recordatorios',
        })
      }
    } catch (_error: unknown) {
      setReminderResult({
        success: false,
        message: 'Error de conexión al enviar recordatorios',
      })
    } finally {
      setSendingReminders(false)
      // Clear result after 5 seconds
      setTimeout(() => setReminderResult(null), 5000)
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl bg-[var(--bg-paper)] p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="mb-4 h-6 w-2/3 rounded bg-[var(--bg-subtle)]"></div>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-4 w-4 rounded bg-[var(--bg-subtle)]"></div>
                <div className="h-10 w-10 rounded-full bg-[var(--bg-subtle)]"></div>
                <div className="flex-1">
                  <div className="mb-1 h-4 w-3/4 rounded bg-[var(--bg-subtle)]"></div>
                  <div className="h-3 w-1/2 rounded bg-[var(--border-light,#f3f4f6)]"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-[var(--bg-paper)] p-6 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Syringe className="h-5 w-5 text-[var(--status-error)]" />
            {summary && summary.overdue_count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--status-error)] opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--status-error)]"></span>
              </span>
            )}
          </div>
          <h3 className="font-semibold text-[var(--text-primary)]">Vacunas Obligatorias</h3>
          {summary && summary.total_pets > 0 && (
            <span className="rounded-full bg-[var(--status-error-bg)] px-2 py-0.5 text-xs font-medium text-[var(--status-error)]">
              {summary.total_pets}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="rounded-lg p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-subtle)]"
            title="Actualizar"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <Link
            href={`/${clinic}/dashboard/vaccines`}
            className="flex items-center gap-1 text-sm text-[var(--primary)] hover:text-[var(--primary-dark)]"
          >
            Ver todas
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Summary badges */}
      {summary && summary.total_pets > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {summary.overdue_count > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--status-error-bg)] px-2.5 py-1 text-xs font-medium text-[var(--status-error)]">
              <AlertTriangle className="h-3 w-3" />
              {summary.overdue_count} vencida{summary.overdue_count !== 1 ? 's' : ''}
            </span>
          )}
          {summary.due_count > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--status-warning-bg)] px-2.5 py-1 text-xs font-medium text-[var(--status-warning)]">
              <Calendar className="h-3 w-3" />
              {summary.due_count} próxima{summary.due_count !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {alerts.length === 0 ? (
        <div className="py-8 text-center text-[var(--text-secondary)]">
          <CheckCircle className="mx-auto mb-2 h-12 w-12 text-[var(--status-success)]" />
          <p className="font-medium">Todas las vacunas al día</p>
          <p className="text-sm">No hay vacunas obligatorias pendientes</p>
        </div>
      ) : (
        <div className="space-y-1">
          {/* Select all */}
          <div className="flex items-center justify-between border-b border-[var(--border-light,#f3f4f6)] pb-2">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <div
                className={`flex h-4 w-4 items-center justify-center rounded border ${
                  selectedPetIds.size === alerts.length && alerts.length > 0
                    ? 'border-[var(--primary)] bg-[var(--primary)]'
                    : 'border-gray-300'
                }`}
              >
                {selectedPetIds.size === alerts.length && alerts.length > 0 && (
                  <Check className="h-3 w-3 text-white" />
                )}
              </div>
              Seleccionar todos
            </button>
            <span className="text-xs text-[var(--text-muted)]">
              {selectedPetIds.size} seleccionado{selectedPetIds.size !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Overdue section */}
          {overdue.length > 0 && (
            <>
              <div className="py-2 text-xs font-medium uppercase tracking-wide text-[var(--status-error)]">
                Vencidas ({overdue.length})
              </div>
              {overdue.slice(0, 5).map((alert) => (
                <AlertItem
                  key={alert.pet_id}
                  alert={alert}
                  clinic={clinic}
                  isSelected={selectedPetIds.has(alert.pet_id)}
                  onSelect={() => handleSelectPet(alert.pet_id)}
                />
              ))}
            </>
          )}

          {/* Due section */}
          {due.length > 0 && (
            <>
              <div className="mt-2 py-2 text-xs font-medium uppercase tracking-wide text-[var(--status-warning)]">
                Próximas ({due.length})
              </div>
              {due.slice(0, 5).map((alert) => (
                <AlertItem
                  key={alert.pet_id}
                  alert={alert}
                  clinic={clinic}
                  isSelected={selectedPetIds.has(alert.pet_id)}
                  onSelect={() => handleSelectPet(alert.pet_id)}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* Actions */}
      {alerts.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-[var(--border-light,#f3f4f6)] pt-4">
          <div className="flex gap-2">
            <button
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => handleSendReminders()}
              disabled={sendingReminders || selectedPetIds.size === 0}
            >
              {sendingReminders ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4" />
                  Enviar Recordatorio ({selectedPetIds.size})
                </>
              )}
            </button>
            {selectedPetIds.size === 0 && (
              <button
                className="flex items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => handleSendReminders(alerts.map((a) => a.pet_id))}
                disabled={sendingReminders}
              >
                <Bell className="h-4 w-4" />
                Enviar a Todos
              </button>
            )}
          </div>

          {/* Result feedback */}
          {reminderResult && (
            <div
              className={`flex items-center gap-2 rounded-lg p-2 text-sm ${
                reminderResult.success ? 'bg-[var(--status-success-bg)] text-[var(--status-success)]' : 'bg-[var(--status-error-bg)] text-[var(--status-error)]'
              }`}
            >
              {reminderResult.success ? (
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 flex-shrink-0" />
              )}
              <span className="truncate">{reminderResult.message}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AlertItem({
  alert,
  clinic,
  isSelected,
  onSelect,
}: {
  alert: MandatoryVaccineAlert
  clinic: string
  isSelected: boolean
  onSelect: () => void
}): React.ReactElement {
  const vaccineNames = alert.vaccines.map((v) => v.vaccine_name).join(', ')
  const maxDaysOverdue = Math.max(...alert.vaccines.map((v) => v.days_overdue || 0))

  return (
    <div className="group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-[var(--bg-subtle)]">
      {/* Checkbox */}
      <button
        onClick={onSelect}
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
          isSelected ? 'border-[var(--primary)] bg-[var(--primary)]' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        {isSelected && <Check className="h-3 w-3 text-white" />}
      </button>

      {/* Pet info */}
      <Link
        href={`/${clinic}/dashboard/patients/${alert.pet_id}`}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <div className="relative shrink-0">
          {alert.pet_photo_url ? (
            <Image
              src={alert.pet_photo_url}
              alt={alert.pet_name}
              width={40}
              height={40}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-subtle)] text-sm font-medium text-[var(--text-secondary)]">
              {alert.pet_name.charAt(0)}
            </div>
          )}
          {alert.urgency === 'overdue' && (
            <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--status-error)]">
              <span className="text-[10px] text-white">!</span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[var(--text-primary)]">{alert.pet_name}</p>
          <p className="truncate text-xs text-[var(--text-secondary)]">
            {alert.owner_name || 'Sin dueño'} • {vaccineNames}
          </p>
        </div>
      </Link>

      {/* Status */}
      <div className="shrink-0 text-right">
        {alert.urgency === 'overdue' ? (
          <span className="text-xs font-medium text-[var(--status-error)]">
            Hace {maxDaysOverdue} día{maxDaysOverdue !== 1 ? 's' : ''}
          </span>
        ) : (
          <span className="text-xs font-medium text-[var(--status-warning)]">Próxima</span>
        )}
        {alert.reminder_sent_at && (
          <p className="text-[10px] text-[var(--status-success)]">
            Recordatorio enviado
          </p>
        )}
      </div>
    </div>
  )
}
