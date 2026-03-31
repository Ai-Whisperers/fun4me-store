import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Clock, User, Stethoscope, AlertCircle } from 'lucide-react'

interface Props {
  params: Promise<{ clinic: string }>
  searchParams: Promise<{ client_id?: string; pet_id?: string }>
}

interface Pet {
  id: string
  name: string
  species: string
  breed: string | null
  photo_url: string | null
  owner_id: string
}

interface Client {
  id: string
  full_name: string
  email: string
  phone: string | null
  pets: Pet[]
}

interface StaffMember {
  id: string
  profile_id: string
  profiles: {
    full_name: string
  }
  specialization: string | null
}

interface Service {
  id: string
  name: string
  duration_minutes: number
  base_price: number
  category: string
}

export default async function NewStaffAppointmentPage({
  params,
  searchParams,
}: Props): Promise<React.ReactElement> {
  const { clinic } = await params
  const { client_id, pet_id } = await searchParams
  const supabase = await createClient()

  // Auth & staff check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/${clinic}/portal/login`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['vet', 'admin'].includes(profile.role) || profile.tenant_id !== clinic) {
    redirect(`/${clinic}/portal/dashboard`)
  }

  // Fetch clients with their pets
  const { data: clients } = await supabase
    .from('profiles')
    .select(
      `
      id,
      full_name,
      email,
      phone,
      pets (id, name, species, breed, photo_url, owner_id)
    `
    )
    .eq('tenant_id', clinic)
    .eq('role', 'owner')
    .order('full_name')

  const typedClients = (clients || []) as unknown as Client[]

  // Fetch staff members (vets)
  const { data: staffMembers } = await supabase
    .from('staff_profiles')
    .select(
      `
      id,
      profile_id,
      profiles (full_name),
      specialization
    `
    )
    .eq('tenant_id', clinic)

  const typedStaff = (staffMembers || []) as unknown as StaffMember[]

  // Fetch services
  const { data: services } = await supabase
    .from('services')
    .select('id, name, duration_minutes, base_price, category')
    .eq('tenant_id', clinic)
    .eq('is_active', true)
    .order('category')
    .order('name')

  const typedServices = (services || []) as Service[]

  // Get pre-selected client and pet
  const selectedClient = client_id ? typedClients.find((c) => c.id === client_id) : null
  const selectedPet = pet_id
    ? typedClients.flatMap((c) => c.pets || []).find((p) => p.id === pet_id)
    : null

  // Server action to create appointment
  async function createStaffAppointment(formData: FormData): Promise<void> {
    'use server'

    const supabaseServer = (await import('@/lib/supabase/server')).createClient
    const supabase = await supabaseServer()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    // Verify staff
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single()

    if (!userProfile || !['vet', 'admin'].includes(userProfile.role)) return

    const petId = formData.get('pet_id') as string
    const vetId = formData.get('vet_id') as string | null
    const serviceId = formData.get('service_id') as string | null
    const startTime = formData.get('start_time') as string
    const duration = parseInt(formData.get('duration') as string) || 30
    const reason = formData.get('reason') as string
    const notes = formData.get('notes') as string | null
    const status = formData.get('status') as string

    // Calculate end time
    const start = new Date(startTime)
    const end = new Date(start.getTime() + duration * 60000)

    // Get pet's tenant_id to ensure correct clinic
    const { data: pet } = await supabase.from('pets').select('tenant_id').eq('id', petId).single()

    if (!pet || pet.tenant_id !== clinic) return

    // Insert appointment
    const { error } = await supabase.from('appointments').insert({
      tenant_id: clinic,
      pet_id: petId,
      vet_id: vetId || null,
      service_id: serviceId || null,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      status: status || 'confirmed',
      reason: reason,
      notes: notes || null,
      created_by: user.id,
    })

    if (error) {
      const { logger } = await import('@/lib/logger')
      logger.error('Error creating appointment', { error: error.message })
      return
    }

    // Redirect to appointments list
    const { redirect: redirectFn } = await import('next/navigation')
    redirectFn(`/${clinic}/dashboard/appointments?date=${start.toISOString().split('T')[0]}`)
  }

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0,
    }).format(price)
  }

  // Get minimum datetime (now)
  const now = new Date()
  const minDateTime = now.toISOString().slice(0, 16)

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/${clinic}/dashboard/appointments`}
          className="mb-4 inline-flex items-center gap-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Citas
        </Link>

        <div className="flex items-center gap-4">
          <div className="bg-[var(--primary)]/10 flex h-12 w-12 items-center justify-center rounded-xl">
            <Calendar className="h-6 w-6 text-[var(--primary)]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[var(--text-primary)]">Nueva Cita</h1>
            <p className="text-[var(--text-secondary)]">Agendar cita para un paciente</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form
        action={createStaffAppointment}
        className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
      >
        {/* Client & Pet Selection */}
        <div className="border-b border-gray-100 p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-400">
            <User className="h-4 w-4" />
            Paciente
          </h3>

          {typedClients.length === 0 ? (
            <div className="rounded-xl bg-gray-50 py-6 text-center">
              <AlertCircle className="mx-auto mb-2 h-8 w-8 text-gray-300" />
              <p className="text-gray-500">No hay clientes registrados</p>
              <Link
                href={`/${clinic}/dashboard/clients/invite`}
                className="mt-2 inline-block text-sm font-medium text-[var(--primary)] hover:underline"
              >
                Invitar cliente
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Client Select */}
              <div>
                <label
                  htmlFor="client_select"
                  className="mb-1 block text-sm font-medium text-gray-600"
                >
                  Cliente
                </label>
                <select
                  id="client_select"
                  name="client_id"
                  defaultValue={selectedClient?.id || ''}
                  className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[var(--primary)] focus:ring-2"
                  required
                >
                  <option value="">Seleccionar cliente...</option>
                  {typedClients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.full_name} - {client.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pet Select */}
              <div>
                <label htmlFor="pet_id" className="mb-1 block text-sm font-medium text-gray-600">
                  Mascota *
                </label>
                <select
                  id="pet_id"
                  name="pet_id"
                  defaultValue={selectedPet?.id || ''}
                  className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[var(--primary)] focus:ring-2"
                  required
                >
                  <option value="">Seleccionar mascota...</option>
                  {typedClients.flatMap((client) =>
                    (client.pets || []).map((pet) => (
                      <option key={pet.id} value={pet.id}>
                        {pet.name} ({pet.species}) - {client.full_name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Vet Selection */}
        <div className="border-b border-gray-100 p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-400">
            <Stethoscope className="h-4 w-4" />
            Asignar Veterinario
          </h3>
          <select
            id="vet_id"
            name="vet_id"
            className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[var(--primary)] focus:ring-2"
          >
            <option value="">Sin asignar</option>
            {typedStaff.map((staff) => (
              <option key={staff.id} value={staff.profile_id}>
                {staff.profiles?.full_name || 'Sin nombre'}
                {staff.specialization && ` - ${staff.specialization}`}
              </option>
            ))}
          </select>
        </div>

        {/* Service & Duration */}
        <div className="grid gap-4 border-b border-gray-100 p-6 sm:grid-cols-2">
          <div>
            <label htmlFor="service_id" className="mb-1 block text-sm font-medium text-gray-600">
              Servicio (opcional)
            </label>
            <select
              id="service_id"
              name="service_id"
              className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[var(--primary)] focus:ring-2"
            >
              <option value="">Sin servicio específico</option>
              {typedServices.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} - {service.duration_minutes}min - {formatPrice(service.base_price)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="duration" className="mb-1 block text-sm font-medium text-gray-600">
              Duración (minutos)
            </label>
            <select
              id="duration"
              name="duration"
              defaultValue="30"
              className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[var(--primary)] focus:ring-2"
            >
              <option value="15">15 minutos</option>
              <option value="30">30 minutos</option>
              <option value="45">45 minutos</option>
              <option value="60">1 hora</option>
              <option value="90">1.5 horas</option>
              <option value="120">2 horas</option>
            </select>
          </div>
        </div>

        {/* Date, Time & Status */}
        <div className="grid gap-4 border-b border-gray-100 p-6 sm:grid-cols-2">
          <div>
            <label htmlFor="start_time" className="mb-1 block text-sm font-medium text-gray-600">
              Fecha y Hora *
            </label>
            <div className="relative">
              <Clock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="datetime-local"
                id="start_time"
                name="start_time"
                required
                min={minDateTime}
                className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 py-3 pl-12 pr-4 outline-none focus:border-[var(--primary)] focus:ring-2"
              />
            </div>
          </div>
          <div>
            <label htmlFor="status" className="mb-1 block text-sm font-medium text-gray-600">
              Estado inicial
            </label>
            <select
              id="status"
              name="status"
              defaultValue="confirmed"
              className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[var(--primary)] focus:ring-2"
            >
              <option value="pending">Pendiente de confirmación</option>
              <option value="confirmed">Confirmada</option>
            </select>
          </div>
        </div>

        {/* Reason & Notes */}
        <div className="space-y-4 border-b border-gray-100 p-6">
          <div>
            <label htmlFor="reason" className="mb-1 block text-sm font-medium text-gray-600">
              Motivo de la cita *
            </label>
            <select
              id="reason"
              name="reason"
              required
              className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[var(--primary)] focus:ring-2"
            >
              <option value="Consulta General">Consulta General</option>
              <option value="Vacunación">Vacunación</option>
              <option value="Control">Control / Seguimiento</option>
              <option value="Desparasitación">Desparasitación</option>
              <option value="Cirugía">Cirugía</option>
              <option value="Emergencia">Emergencia</option>
              <option value="Grooming">Grooming / Estética</option>
              <option value="Laboratorio">Laboratorio</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
          <div>
            <label htmlFor="notes" className="mb-1 block text-sm font-medium text-gray-600">
              Notas adicionales
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="Información adicional sobre la cita..."
              className="focus:ring-[var(--primary)]/20 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[var(--primary)] focus:ring-2"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 p-6">
          <Link
            href={`/${clinic}/dashboard/appointments`}
            className="rounded-xl px-6 py-3 font-medium text-[var(--text-secondary)] transition-colors hover:bg-gray-100"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-8 py-3 font-bold text-white transition-opacity hover:opacity-90"
          >
            <Calendar className="h-4 w-4" />
            Crear Cita
          </button>
        </div>
      </form>
    </div>
  )
}
