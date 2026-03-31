import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import * as Icons from 'lucide-react'
import { CancelButton, RescheduleDialog } from '@/components/appointments'
import {
  statusConfig,
  formatAppointmentDate,
  formatAppointmentTime,
  canCancelAppointment,
  canRescheduleAppointment,
} from '@/lib/types/appointments'

interface PageProps {
  params: Promise<{ clinic: string; id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { clinic } = await params
  return {
    title: `Detalle de Cita - ${clinic}`,
    description: 'Ver detalle de tu cita veterinaria',
  }
}

export default async function AppointmentDetailPage({ params }: PageProps) {
  const { clinic, id } = await params
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/${clinic}/portal/login`)
  }

  // Fetch appointment with pet details
  const { data: appointment, error } = await supabase
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
      created_at,
      pets!inner(
        id,
        name,
        species,
        breed,
        photo_url,
        owner_id
      )
    `
    )
    .eq('id', id)
    .eq('tenant_id', clinic)
    .single()

  if (error || !appointment) {
    notFound()
  }

  // Transform pets array to single object (Supabase returns array from join)
  const pet = Array.isArray(appointment.pets) ? appointment.pets[0] : appointment.pets
  const appointmentWithPet = { ...appointment, pets: pet }

  // Check ownership
  if (pet.owner_id !== user.id) {
    redirect(`/${clinic}/portal/appointments`)
  }

  const status = statusConfig[appointmentWithPet.status] || statusConfig.pending
  const canCancel = canCancelAppointment(appointmentWithPet)
  const canReschedule = canRescheduleAppointment(appointmentWithPet)
  const isPast = new Date(appointmentWithPet.start_time) < new Date()

  const speciesIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    dog: Icons.Dog,
    cat: Icons.Cat,
    bird: Icons.Bird,
    rabbit: Icons.Rabbit,
    fish: Icons.Fish,
    default: Icons.PawPrint,
  }
  const SpeciesIcon = speciesIcons[pet.species] || speciesIcons.default

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Link
          href={`/${clinic}/portal/appointments`}
          className="rounded-xl p-2 transition-colors hover:bg-white"
        >
          <Icons.ArrowLeft className="h-6 w-6 text-[var(--text-secondary)]" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-[var(--text-primary)]">Detalle de Cita</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Creada el {new Date(appointmentWithPet.created_at).toLocaleDateString('es-PY')}
          </p>
        </div>
        <span className={`rounded-full px-4 py-2 text-sm font-bold ${status.className}`}>
          {status.label}
        </span>
      </div>

      {/* Main Card */}
      <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl">
        {/* Pet Info Header */}
        <div className="from-[var(--primary)]/5 border-b border-gray-100 bg-gradient-to-r to-transparent p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg">
              {pet.photo_url ? (
                <Image 
                  src={pet.photo_url} 
                  alt={pet.name} 
                  fill
                  sizes="64px"
                  className="object-cover" 
                />
              ) : (
                <SpeciesIcon className="h-8 w-8 text-[var(--primary)]" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">{pet.name}</h2>
              <p className="text-sm capitalize text-[var(--text-secondary)]">
                {pet.species}
                {pet.breed && ` - ${pet.breed}`}
              </p>
            </div>
          </div>
        </div>

        {/* Appointment Details */}
        <div className="space-y-6 p-6">
          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Icons.Calendar className="h-5 w-5 text-[var(--primary)]" />
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Fecha
                </span>
              </div>
              <p className="font-bold text-[var(--text-primary)]">
                {formatAppointmentDate(appointmentWithPet.start_time)}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Icons.Clock className="h-5 w-5 text-[var(--primary)]" />
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Hora
                </span>
              </div>
              <p className="font-bold text-[var(--text-primary)]">
                {formatAppointmentTime(appointmentWithPet.start_time)} -{' '}
                {formatAppointmentTime(appointmentWithPet.end_time)}
              </p>
            </div>
          </div>

          {/* Reason */}
          <div className="rounded-xl bg-gray-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Icons.Stethoscope className="h-5 w-5 text-[var(--primary)]" />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Motivo
              </span>
            </div>
            <p className="font-medium capitalize text-[var(--text-primary)]">
              {appointmentWithPet.reason}
            </p>
          </div>

          {/* Notes */}
          {appointmentWithPet.notes && !appointmentWithPet.notes.startsWith('[Cancelado') && (
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Icons.FileText className="h-5 w-5 text-[var(--primary)]" />
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Notas
                </span>
              </div>
              <p className="text-[var(--text-secondary)]">{appointmentWithPet.notes}</p>
            </div>
          )}

          {/* Cancellation info */}
          {appointmentWithPet.status === 'cancelled' &&
            appointmentWithPet.notes?.startsWith('[Cancelado') && (
              <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Icons.XCircle className="h-5 w-5 text-red-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-red-400">
                    Cancelación
                  </span>
                </div>
                <p className="text-red-600">
                  {appointmentWithPet.notes
                    .replace('[Cancelado] ', '')
                    .replace('[Cancelado por el cliente]', 'Cancelada por el propietario')}
                </p>
              </div>
            )}

          {/* Past appointment notice */}
          {isPast && appointmentWithPet.status !== 'cancelled' && (
            <div className="flex items-center gap-3 rounded-xl bg-gray-100 p-4">
              <Icons.CheckCircle className="h-5 w-5 text-gray-500" />
              <p className="text-sm text-gray-600">Esta cita ya ha pasado.</p>
            </div>
          )}
        </div>

        {/* Actions Footer */}
        {(canCancel || canReschedule) && (
          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 p-6">
            <p className="text-sm text-[var(--text-secondary)]">Acciones disponibles</p>
            <div className="flex items-center gap-3">
              {canReschedule && (
                <RescheduleDialog
                  appointmentId={appointmentWithPet.id}
                  clinicId={clinic}
                  currentDate={appointmentWithPet.start_time.split('T')[0]}
                  currentTime={formatAppointmentTime(appointmentWithPet.start_time)}
                />
              )}
              {canCancel && <CancelButton appointmentId={appointmentWithPet.id} variant="button" />}
            </div>
          </div>
        )}
      </div>

      {/* Back Link */}
      <div className="mt-8 text-center">
        <Link
          href={`/${clinic}/portal/appointments`}
          className="inline-flex items-center gap-2 font-medium text-[var(--primary)] hover:underline"
        >
          <Icons.ArrowLeft className="h-4 w-4" />
          Volver a Mis Citas
        </Link>
      </div>
    </div>
  )
}
