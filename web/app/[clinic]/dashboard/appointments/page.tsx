import { createClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/auth'
import { AppointmentQueue } from '@/components/dashboard/appointments/appointment-queue'
import { DateFilter } from '@/components/dashboard/appointments/date-filter'
import { StatusFilter } from '@/components/dashboard/appointments/status-filter'
import { PendingRequestsPanel } from '@/components/dashboard/appointments/pending-requests-panel'
import { logger } from '@/lib/logger'
import * as Icons from 'lucide-react'

interface Props {
  params: Promise<{ clinic: string }>
  searchParams: Promise<{ date?: string; status?: string }>
}

export default async function StaffAppointmentsPage({ params, searchParams }: Props) {
  const { clinic } = await params
  const { date, status } = await searchParams

  // SEC-008: Require staff authentication with tenant verification
  await requireStaff(clinic)

  const supabase = await createClient()

  const today = date || new Date().toISOString().split('T')[0]

  // Fetch scheduled appointments for the day (exclude pending_scheduling)
  let query = supabase
    .from('appointments')
    .select(
      `
      id,
      tenant_id,
      start_time,
      end_time,
      status,
      reason,
      notes,
      scheduling_status,
      pets (
        id,
        name,
        species,
        photo_url,
        owner:profiles!pets_owner_id_fkey (
          id,
          full_name,
          phone
        )
      )
    `
    )
    .eq('tenant_id', clinic)
    .neq('scheduling_status', 'pending_scheduling') // Only show scheduled appointments
    .gte('start_time', `${today}T00:00:00`)
    .lt('start_time', `${today}T23:59:59`)
    .order('start_time', { ascending: true })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data: appointments, error } = await query

  // Show error state if query failed
  if (error) {
    logger.error('Error fetching appointments', { error: error.message })
    return (
      <div className="mx-auto max-w-7xl p-6">
        <div
          className="rounded-xl p-6 text-center"
          style={{
            backgroundColor: 'var(--status-error-bg)',
            border: '1px solid var(--status-error-light)',
          }}
        >
          <Icons.AlertCircle
            className="mx-auto mb-4 h-12 w-12"
            style={{ color: 'var(--status-error)' }}
          />
          <h3 className="mb-2 text-lg font-bold" style={{ color: 'var(--status-error-dark)' }}>
            Error al cargar citas
          </h3>
          <p className="mb-4" style={{ color: 'var(--status-error)' }}>
            No se pudieron cargar las citas. Por favor intenta de nuevo.
          </p>
          <a
            href={`/${clinic}/dashboard/appointments`}
            className="inline-block rounded-lg px-4 py-2 font-medium text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: 'var(--status-error)' }}
          >
            Reintentar
          </a>
        </div>
      </div>
    )
  }

  // Transform pets data (Supabase returns arrays from joins)
  const transformedAppointments =
    appointments?.map((apt) => {
      const pets = Array.isArray(apt.pets) ? apt.pets[0] : apt.pets
      // Also transform nested owner (use undefined instead of null for type compatibility)
      const owner = pets?.owner
        ? Array.isArray(pets.owner)
          ? pets.owner[0]
          : pets.owner
        : undefined
      return {
        ...apt,
        pets: {
          ...pets,
          owner,
        },
      }
    }) || []

  // Calculate stats
  const stats = {
    total: transformedAppointments.length,
    pending: transformedAppointments.filter((a) => ['scheduled', 'confirmed'].includes(a.status))
      .length,
    checkedIn: transformedAppointments.filter((a) => a.status === 'checked_in').length,
    inProgress: transformedAppointments.filter((a) => a.status === 'in_progress').length,
    completed: transformedAppointments.filter((a) => a.status === 'completed').length,
    noShow: transformedAppointments.filter((a) => a.status === 'no_show').length,
  }

  const isToday = today === new Date().toISOString().split('T')[0]

  return (
    <div className="mx-auto max-w-7xl p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            {isToday ? 'Citas de Hoy' : 'Citas del Día'}
          </h1>
          <p className="text-[var(--text-secondary)]">
            {new Date(today).toLocaleDateString('es-PY', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <DateFilter currentDate={today} clinic={clinic} />
          <StatusFilter currentStatus={status || 'all'} clinic={clinic} currentDate={today} />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
        <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-default)] p-4">
          <div className="mb-1 flex items-center gap-2" style={{ color: 'var(--status-info)' }}>
            <Icons.Calendar className="h-4 w-4" />
            <span className="text-xs font-medium">En Espera</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.pending}</p>
        </div>

        <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-default)] p-4">
          <div
            className="mb-1 flex items-center gap-2"
            style={{ color: 'var(--status-warning-dark)' }}
          >
            <Icons.UserCheck className="h-4 w-4" />
            <span className="text-xs font-medium">Registrados</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.checkedIn}</p>
        </div>

        <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-default)] p-4">
          <div className="mb-1 flex items-center gap-2" style={{ color: 'var(--accent-purple)' }}>
            <Icons.Stethoscope className="h-4 w-4" />
            <span className="text-xs font-medium">En Consulta</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.inProgress}</p>
        </div>

        <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-default)] p-4">
          <div className="mb-1 flex items-center gap-2" style={{ color: 'var(--status-success)' }}>
            <Icons.CheckCircle className="h-4 w-4" />
            <span className="text-xs font-medium">Completadas</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.completed}</p>
        </div>

        <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-default)] p-4">
          <div className="mb-1 flex items-center gap-2" style={{ color: 'var(--accent-orange)' }}>
            <Icons.UserX className="h-4 w-4" />
            <span className="text-xs font-medium">No Presentados</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.noShow}</p>
        </div>
      </div>

      {/* Pending Requests Panel */}
      <PendingRequestsPanel clinic={clinic} />

      {/* Appointment Queue */}
      {transformedAppointments.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-default)] p-8 text-center sm:p-12">
          <Icons.CalendarX className="mx-auto mb-4 h-12 w-12 text-[var(--text-muted)]" />
          <h3 className="mb-2 text-lg font-bold text-[var(--text-primary)]">
            No hay citas programadas
          </h3>
          <p className="text-[var(--text-secondary)]">
            {status && status !== 'all'
              ? 'No hay citas con este estado para la fecha seleccionada.'
              : 'No hay citas programadas para esta fecha.'}
          </p>
        </div>
      ) : (
        <AppointmentQueue appointments={transformedAppointments} clinic={clinic} />
      )}
    </div>
  )
}
