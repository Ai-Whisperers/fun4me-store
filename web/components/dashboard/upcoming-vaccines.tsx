'use client'

/**
 * Upcoming Vaccines Component
 *
 * RES-001: Migrated to React Query for data fetching
 * - Replaced useEffect+fetch with useQuery hook
 * - Mutation remains as manual action with state
 */

import { useState, useMemo } from 'react'
import { Syringe, ChevronRight, Bell, Loader2, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queries'
import { staleTimes, gcTimes } from '@/lib/queries/utils'

interface VaccineReminder {
  pet_id: string
  pet_name: string
  pet_photo?: string
  owner_name: string
  owner_phone?: string
  vaccine_name: string
  due_date: string
  days_until: number
  is_overdue: boolean
}

interface UpcomingVaccinesProps {
  clinic: string
}

export function UpcomingVaccines({ clinic }: UpcomingVaccinesProps) {
  const [sendingReminders, setSendingReminders] = useState(false)
  const [reminderResult, setReminderResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  // React Query: Fetch upcoming vaccines
  const { data: vaccines = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.vaccines.upcoming(clinic, 14),
    queryFn: async (): Promise<VaccineReminder[]> => {
      const res = await fetch(`/api/dashboard/vaccines?clinic=${clinic}&days=14`)
      if (!res.ok) throw new Error('Error al cargar vacunas')
      return res.json()
    },
    staleTime: staleTimes.MEDIUM, // 2 minutes
    gcTime: gcTimes.MEDIUM, // 15 minutes
  })

  // Memoized filtering
  const overdue = useMemo(() => vaccines.filter((v) => v.is_overdue), [vaccines])
  const upcoming = useMemo(() => vaccines.filter((v) => !v.is_overdue), [vaccines])

  if (loading) {
    return (
      <div className="rounded-xl bg-[var(--bg-paper)] p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="mb-4 h-6 w-1/3 rounded bg-[var(--bg-subtle)]"></div>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-PY', {
      day: 'numeric',
      month: 'short',
    })
  }

  const getDaysLabel = (days: number, isOverdue: boolean) => {
    if (isOverdue) {
      return days === -1 ? 'Hace 1 día' : `Hace ${Math.abs(days)} días`
    }
    if (days === 0) return 'Hoy'
    if (days === 1) return 'Mañana'
    return `En ${days} días`
  }

  const handleSendReminders = async () => {
    setSendingReminders(true)
    setReminderResult(null)

    try {
      const res = await fetch('/api/reminders/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_type: 'vaccine' }),
      })

      const data = await res.json()

      if (res.ok) {
        setReminderResult({
          success: true,
          message: data.message || 'Recordatorios de vacunas enviados correctamente',
        })
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

  return (
    <div className="rounded-xl bg-[var(--bg-paper)] p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Syringe className="h-5 w-5 text-[var(--text-secondary)]" />
          <h3 className="font-semibold text-[var(--text-primary)]">Vacunas Próximas</h3>
        </div>
        <Link
          href={`/${clinic}/dashboard/vaccines`}
          className="flex items-center gap-1 text-sm text-[var(--primary)] hover:text-[var(--primary-dark)]"
        >
          Ver todas
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {vaccines.length === 0 ? (
        <div className="py-8 text-center text-[var(--text-secondary)]">
          <Syringe className="mx-auto mb-2 h-12 w-12 text-[var(--border,#e5e7eb)]" />
          <p>No hay vacunas pendientes en los próximos 14 días</p>
        </div>
      ) : (
        <div className="space-y-1">
          {/* Overdue section */}
          {overdue.length > 0 && (
            <>
              <div className="py-2 text-xs font-medium uppercase tracking-wide text-[var(--status-error,#ef4444)]">
                Vencidas ({overdue.length})
              </div>
              {overdue.slice(0, 3).map((vaccine, i) => (
                <VaccineItem
                  key={`overdue-${i}`}
                  vaccine={vaccine}
                  clinic={clinic}
                  formatDate={formatDate}
                  getDaysLabel={getDaysLabel}
                />
              ))}
            </>
          )}

          {/* Upcoming section */}
          {upcoming.length > 0 && (
            <>
              <div className="mt-2 py-2 text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">
                Próximas ({upcoming.length})
              </div>
              {upcoming.slice(0, 5).map((vaccine, i) => (
                <VaccineItem
                  key={`upcoming-${i}`}
                  vaccine={vaccine}
                  clinic={clinic}
                  formatDate={formatDate}
                  getDaysLabel={getDaysLabel}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* Quick action */}
      {vaccines.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-[var(--border-light,#f3f4f6)] pt-4">
          <button
            className="bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-[var(--primary)] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleSendReminders}
            disabled={sendingReminders}
          >
            {sendingReminders ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Bell className="h-4 w-4" />
                Enviar recordatorios
              </>
            )}
          </button>

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

function VaccineItem({
  vaccine,
  clinic,
  formatDate,
  getDaysLabel,
}: {
  vaccine: VaccineReminder
  clinic: string
  formatDate: (date: string) => string
  getDaysLabel: (days: number, isOverdue: boolean) => string
}) {
  return (
    <Link
      href={`/${clinic}/portal/pets/${vaccine.pet_id}`}
      className="group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-[var(--bg-subtle)]"
    >
      <div className="relative">
        {vaccine.pet_photo ? (
          <img
            src={vaccine.pet_photo}
            alt={vaccine.pet_name}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-subtle)] text-sm font-medium text-[var(--text-secondary)]">
            {vaccine.pet_name.charAt(0)}
          </div>
        )}
        {vaccine.is_overdue && (
          <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--status-error,#ef4444)]">
            <span className="text-xs text-white">!</span>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--text-primary)]">
          {vaccine.pet_name}
        </p>
        <p className="truncate text-xs text-[var(--text-secondary)]">
          {vaccine.vaccine_name} • {vaccine.owner_name}
        </p>
      </div>
      <div className="text-right">
        <p
          className={`text-sm font-medium ${
            vaccine.is_overdue
              ? 'text-[var(--status-error,#ef4444)]'
              : vaccine.days_until <= 3
                ? 'text-[var(--status-warning,#f59e0b)]'
                : 'text-[var(--text-secondary)]'
          }`}
        >
          {formatDate(vaccine.due_date)}
        </p>
        <p
          className={`text-xs ${
            vaccine.is_overdue ? 'text-[var(--status-error,#ef4444)]' : 'text-[var(--text-muted)]'
          }`}
        >
          {getDaysLabel(vaccine.days_until, vaccine.is_overdue)}
        </p>
      </div>
    </Link>
  )
}
