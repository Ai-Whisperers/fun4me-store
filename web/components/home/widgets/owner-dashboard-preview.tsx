'use client'

import Link from 'next/link'
import Image from 'next/image'
import {
  Calendar,
  Syringe,
  PawPrint,
  Dog,
  Cat,
  ArrowRight,
  Clock,
  CalendarPlus,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

interface Pet {
  id: string
  name: string
  species: string
  breed: string | null
  photo_url: string | null
}

interface Appointment {
  id: string
  start_time: string
  status: string
  reason: string
  pets: { name: string } | null
}

interface OwnerPreviewData {
  pets: Pet[]
  upcomingAppointments: Appointment[]
  pendingVaccines: number
}

interface OwnerDashboardPreviewProps {
  clinic: string
}

function PetMiniCard({ pet, clinic }: { pet: Pet; clinic: string }): React.ReactElement {
  const SpeciesIcon = pet.species === 'dog' ? Dog : pet.species === 'cat' ? Cat : PawPrint

  return (
    <Link
      href={`/${clinic}/portal/pets/${pet.id}`}
      className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      {/* Pet Photo */}
      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full bg-[var(--bg-subtle)]">
        {pet.photo_url ? (
          <Image
            src={pet.photo_url}
            alt={pet.name}
            fill
            className="object-cover"
            sizes="48px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <SpeciesIcon className="h-6 w-6 text-[var(--text-muted)]" />
          </div>
        )}
      </div>

      {/* Pet Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-[var(--text-primary)]">{pet.name}</p>
        <p className="truncate text-sm text-[var(--text-secondary)]">
          {pet.breed || (pet.species === 'dog' ? 'Perro' : pet.species === 'cat' ? 'Gato' : 'Mascota')}
        </p>
      </div>

      <ArrowRight className="h-4 w-4 flex-shrink-0 text-[var(--text-muted)]" />
    </Link>
  )
}

function AppointmentMiniCard({ appointment, clinic: _clinic }: { appointment: Appointment; clinic: string }): React.ReactElement {
  const date = new Date(appointment.start_time)
  const formattedDate = date.toLocaleDateString('es-PY', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
  const formattedTime = date.toLocaleTimeString('es-PY', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="flex items-center gap-3 rounded-lg bg-[var(--bg-subtle)] p-3">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/10">
        <Calendar className="h-5 w-5 text-[var(--primary)]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--text-primary)]">
          {appointment.pets?.name || 'Cita'}
        </p>
        <p className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
          <Clock className="h-3 w-3" />
          {formattedDate} - {formattedTime}
        </p>
      </div>
    </div>
  )
}

function SkeletonLoader(): React.ReactElement {
  return (
    <section className="bg-[var(--bg-subtle)] py-8">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Pets skeleton */}
          <div className="space-y-3 lg:col-span-2">
            <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-200" />
              ))}
            </div>
          </div>
          {/* Sidebar skeleton */}
          <div className="space-y-4">
            <div className="h-44 animate-pulse rounded-2xl bg-gray-200" />
            <div className="h-24 animate-pulse rounded-xl bg-gray-200" />
          </div>
        </div>
      </div>
    </section>
  )
}

export function OwnerDashboardPreview({ clinic }: OwnerDashboardPreviewProps): React.ReactElement | null {
  const { data, isLoading, error } = useQuery<OwnerPreviewData>({
    queryKey: ['owner-preview', clinic],
    queryFn: async () => {
      const r = await fetch(`/api/homepage/owner-preview?clinic=${clinic}`)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.json()
    },
    refetchInterval: 60000,
    placeholderData: (previousData) => previousData,
  })

  if (isLoading && !data) return <SkeletonLoader />
  if (error || !data) return null

  return (
    <section className="bg-[var(--bg-subtle)] py-8">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Pets Preview - Left Column */}
          <div className="space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--text-primary)]">
                <PawPrint className="h-5 w-5 text-[var(--primary)]" />
                Tus Mascotas
              </h2>
              <Link
                href={`/${clinic}/portal/pets`}
                className="text-sm font-medium text-[var(--primary)] hover:underline"
              >
                Ver todas
              </Link>
            </div>

            {data.pets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center">
                <PawPrint className="mx-auto mb-3 h-10 w-10 text-[var(--text-muted)]" />
                <p className="mb-2 font-medium text-[var(--text-primary)]">
                  Aún no tienes mascotas registradas
                </p>
                <Link
                  href={`/${clinic}/portal/pets/new`}
                  className="inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)] hover:underline"
                >
                  Agregar mascota
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.pets.map((pet) => (
                  <PetMiniCard key={pet.id} pet={pet} clinic={clinic} />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar - Right Column */}
          <div className="space-y-4">
            {/* Upcoming Appointments */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 font-bold text-[var(--text-primary)]">
                <Calendar className="h-5 w-5 text-[var(--primary)]" />
                Próximas Citas
              </h3>

              {data.upcomingAppointments.length === 0 ? (
                <p className="mb-4 text-sm text-[var(--text-secondary)]">
                  No tienes citas programadas
                </p>
              ) : (
                <div className="mb-4 space-y-2">
                  {data.upcomingAppointments.map((apt) => (
                    <AppointmentMiniCard key={apt.id} appointment={apt} clinic={clinic} />
                  ))}
                </div>
              )}

              <Link
                href={`/${clinic}/book`}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-dark)]"
              >
                <CalendarPlus className="h-4 w-4" />
                Agendar Cita
              </Link>
            </div>

            {/* Pending Vaccines Alert */}
            {data.pendingVaccines > 0 && (
              <div className="rounded-xl border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--status-warning)]/20">
                    <Syringe className="h-5 w-5 text-[var(--status-warning)]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--status-warning-text)]">
                      {data.pendingVaccines} vacuna{data.pendingVaccines > 1 ? 's' : ''} pendiente
                      {data.pendingVaccines > 1 ? 's' : ''}
                    </p>
                    <Link
                      href={`/${clinic}/portal/pets`}
                      className="text-sm text-[var(--status-warning-text)] underline hover:no-underline"
                    >
                      Ver detalles
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
