'use client'

/**
 * My Patients Widget
 *
 * RES-001: Migrated to React Query for data fetching
 * - Replaced useAsyncData with useQuery hook
 * - Auto-refresh every 30 seconds
 */

import { useQuery } from '@tanstack/react-query'
import { Dog, Cat, PawPrint, Clock, AlertCircle, User } from 'lucide-react'
import Link from 'next/link'
import { queryKeys } from '@/lib/queries'
import { staleTimes, gcTimes } from '@/lib/queries/utils'

interface Patient {
  id: string
  pet_name: string
  species: 'dog' | 'cat'
  owner_name: string
  appointment_time: string
  reason: string
  status: 'scheduled' | 'confirmed' | 'checked_in' | 'in_progress'
}

interface MyPatientsWidgetProps {
  vetId: string
  clinic: string
}

export function MyPatientsWidget({ vetId, clinic }: MyPatientsWidgetProps): React.ReactElement {
  // React Query: Fetch my patients with auto-refresh
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.dashboard.myPatients(vetId),
    queryFn: async (): Promise<{ patients: Patient[] }> => {
      const res = await fetch(`/api/dashboard/my-patients?vetId=${vetId}`)
      if (!res.ok) throw new Error('Error al cargar pacientes')
      return res.json()
    },
    staleTime: staleTimes.SHORT,
    gcTime: gcTimes.SHORT,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  })

  const patients = data?.patients || []

  const getStatusColor = (status: Patient['status']): string => {
    switch (status) {
      case 'checked_in':
        return 'bg-green-100 text-green-700'
      case 'in_progress':
        return 'bg-blue-100 text-blue-700'
      case 'confirmed':
        return 'bg-amber-100 text-amber-700'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  const getStatusLabel = (status: Patient['status']): string => {
    switch (status) {
      case 'checked_in':
        return 'En espera'
      case 'in_progress':
        return 'En consulta'
      case 'confirmed':
        return 'Confirmado'
      default:
        return 'Programado'
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
          <PawPrint className="h-5 w-5 text-[var(--primary)]" />
          Mis Pacientes Hoy
        </h3>
        <Link
          href={`/${clinic}/dashboard/appointments`}
          className="text-sm font-medium text-[var(--primary)] hover:underline"
        >
          Ver todos
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-xl bg-gray-100 p-4">
              <div className="mb-2 h-4 w-1/2 rounded bg-gray-200" />
              <div className="h-3 w-3/4 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-[var(--status-error-bg)] p-4 text-sm text-[var(--status-error)]">
          <AlertCircle className="h-4 w-4" />
          Error al cargar pacientes
        </div>
      )}

      {!isLoading && !error && patients.length === 0 && (
        <div className="rounded-xl bg-[var(--bg-subtle)] p-6 text-center">
          <PawPrint className="mx-auto mb-2 h-8 w-8 text-gray-400" />
          <p className="text-sm text-[var(--text-muted)]">
            No tienes pacientes asignados hoy
          </p>
        </div>
      )}

      {!isLoading && !error && patients.length > 0 && (
        <div className="space-y-3">
          {patients.slice(0, 5).map((patient) => (
            <Link
              key={patient.id}
              href={`/${clinic}/dashboard/appointments/${patient.id}`}
              className="group block rounded-xl border border-[var(--border)] p-3 transition-all hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--bg-subtle)]">
                    {patient.species === 'dog' ? (
                      <Dog className="h-5 w-5 text-[var(--text-muted)]" />
                    ) : (
                      <Cat className="h-5 w-5 text-[var(--text-muted)]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--primary)]">
                      {patient.pet_name}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                      <User className="h-3 w-3" />
                      {patient.owner_name}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      {patient.reason}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="flex items-center gap-1 text-xs font-medium text-[var(--text-muted)]">
                    <Clock className="h-3 w-3" />
                    {new Date(patient.appointment_time).toLocaleTimeString('es-PY', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(patient.status)}`}
                  >
                    {getStatusLabel(patient.status)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
          {patients.length > 5 && (
            <p className="text-center text-xs text-[var(--text-muted)]">
              +{patients.length - 5} pacientes más
            </p>
          )}
        </div>
      )}
    </div>
  )
}
