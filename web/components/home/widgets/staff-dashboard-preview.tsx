'use client'

import Link from 'next/link'
import Image from 'next/image'
import {
  Users,
  Calendar,
  Clock,
  FileCheck,
  ArrowRight,
  Dog,
  Cat,
  PawPrint,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

interface Pet {
  id: string
  name: string
  photo_url: string | null
  species: string
}

interface Appointment {
  id: string
  start_time: string
  end_time: string
  status: string
  reason: string
  pets: Pet | null
}

interface StaffPreviewData {
  waitingCount: number
  todayAppointments: Appointment[]
  pendingApprovals: number
}

interface StaffDashboardPreviewProps {
  clinic: string
}

function AppointmentRow({ appointment, clinic: _clinic }: { appointment: Appointment; clinic: string }): React.ReactElement {
  const startTime = new Date(appointment.start_time)
  const formattedTime = startTime.toLocaleTimeString('es-PY', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const statusColors: Record<string, string> = {
    scheduled: 'bg-gray-100 text-gray-700',
    confirmed: 'bg-blue-100 text-blue-700',
    checked_in: 'bg-amber-100 text-amber-700',
    in_progress: 'bg-green-100 text-green-700',
    completed: 'bg-emerald-100 text-emerald-700',
  }

  const statusLabels: Record<string, string> = {
    scheduled: 'Programada',
    confirmed: 'Confirmada',
    checked_in: 'En espera',
    in_progress: 'En curso',
    completed: 'Completada',
  }

  const SpeciesIcon =
    appointment.pets?.species === 'dog' ? Dog : appointment.pets?.species === 'cat' ? Cat : PawPrint

  return (
    <div className="flex items-center gap-3 rounded-lg bg-[var(--bg-subtle)] p-3">
      {/* Pet Photo */}
      <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-white">
        {appointment.pets?.photo_url ? (
          <Image
            src={appointment.pets.photo_url}
            alt={appointment.pets.name}
            fill
            className="object-cover"
            sizes="40px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <SpeciesIcon className="h-5 w-5 text-[var(--text-muted)]" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--text-primary)]">
          {appointment.pets?.name || 'Paciente'}
        </p>
        <p className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
          <Clock className="h-3 w-3" />
          {formattedTime}
        </p>
      </div>

      {/* Status */}
      <span
        className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[appointment.status] || statusColors.scheduled}`}
      >
        {statusLabels[appointment.status] || appointment.status}
      </span>
    </div>
  )
}

function AlertBadge({
  icon,
  count,
  label,
  href,
}: {
  icon: React.ReactNode
  count: number
  label: string
  href: string
}): React.ReactElement {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] p-3 transition-colors hover:bg-[var(--status-warning-bg)]/80"
    >
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--status-warning)]/20">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-bold text-[var(--status-warning-text)]">{count}</p>
        <p className="truncate text-xs text-[var(--status-warning-text)]">{label}</p>
      </div>
      <ArrowRight className="h-4 w-4 flex-shrink-0 text-[var(--status-warning-text)]" />
    </Link>
  )
}

function SkeletonLoader(): React.ReactElement {
  return (
    <section className="bg-white py-8">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid gap-6 lg:grid-cols-4">
          <div className="h-32 animate-pulse rounded-2xl bg-gray-200" />
          <div className="h-48 animate-pulse rounded-2xl bg-gray-200 lg:col-span-2" />
          <div className="space-y-3">
            <div className="h-20 animate-pulse rounded-xl bg-gray-200" />
            <div className="h-20 animate-pulse rounded-xl bg-gray-200" />
          </div>
        </div>
      </div>
    </section>
  )
}

export function StaffDashboardPreview({ clinic }: StaffDashboardPreviewProps): React.ReactElement | null {
  const { data, isLoading, error } = useQuery<StaffPreviewData>({
    queryKey: ['staff-preview', clinic],
    queryFn: () => fetch(`/api/homepage/staff-preview?clinic=${clinic}`).then((r) => r.json()),
    refetchInterval: 30000,
    placeholderData: (previousData) => previousData,
  })

  if (isLoading && !data) return <SkeletonLoader />
  if (error || !data) return null

  return (
    <section className="bg-white py-8">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Waiting Room Card */}
          <div className="rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/80">Sala de Espera</p>
                <p className="text-4xl font-bold">{data.waitingCount}</p>
                <p className="mt-1 text-sm text-white/70">pacientes</p>
              </div>
              <Users className="h-12 w-12 text-white/20" />
            </div>
            <Link
              href={`/${clinic}/dashboard`}
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-white/90 hover:text-white hover:underline"
            >
              Ver cola
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Today's Schedule Preview */}
          <div className="rounded-2xl border border-gray-100 bg-[var(--bg-paper)] p-5 shadow-sm lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
                <Calendar className="h-5 w-5 text-[var(--primary)]" />
                Agenda de Hoy
              </h3>
              <Link
                href={`/${clinic}/dashboard/calendar`}
                className="text-sm font-medium text-[var(--primary)] hover:underline"
              >
                Ver completa
              </Link>
            </div>

            {data.todayAppointments.length === 0 ? (
              <p className="py-4 text-center text-sm text-[var(--text-secondary)]">
                No hay citas programadas para hoy
              </p>
            ) : (
              <div className="space-y-2">
                {data.todayAppointments.map((apt) => (
                  <AppointmentRow key={apt.id} appointment={apt} clinic={clinic} />
                ))}
              </div>
            )}
          </div>

          {/* Alerts Column */}
          <div className="space-y-3">
            {data.pendingApprovals > 0 && (
              <AlertBadge
                icon={<FileCheck className="h-4 w-4 text-[var(--status-warning)]" />}
                count={data.pendingApprovals}
                label="Órdenes por aprobar"
                href={`/${clinic}/dashboard/orders?status=pending`}
              />
            )}

            {/* Quick link to full dashboard */}
            <Link
              href={`/${clinic}/dashboard`}
              className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)]"
            >
              Ver Dashboard Completo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
