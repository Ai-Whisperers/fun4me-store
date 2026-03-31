import { getClinicData } from '@/lib/clinics'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { requireStaff } from '@/lib/auth'
import { logger } from '@/lib/logger'
import Link from 'next/link'
import {
  Users,
  Phone,
  Mail,
  PawPrint,
  UserPlus,
  Calendar,
  CheckCircle,
  AlertCircle,
  MessageCircle,
} from 'lucide-react'
import ClientSearch from './client-search'

interface Props {
  params: Promise<{ clinic: string }>
  searchParams: Promise<{ q?: string }>
}

export async function generateStaticParams() {
  return [{ clinic: 'terrapet' }, { clinic: 'petlife' }]
}

interface Client {
  id: string
  full_name: string
  email: string
  phone: string | null
  created_at: string
  pet_count: number
  last_visit: string | null
}

interface RawAppointment {
  start_time: string
  status: string
}

interface RawPet {
  id: string
  appointments: RawAppointment[]
}

interface RawClient {
  id: string
  full_name: string | null
  email: string
  phone: string | null
  created_at: string
  pets: RawPet[]
}

export default async function ClientsPage({ params, searchParams }: Props) {
  const { clinic } = await params
  const { q } = await searchParams

  // SEC-007: Require staff authentication with tenant verification
  const { profile } = await requireStaff(clinic)

  const clinicData = await getClinicData(clinic)
  if (!clinicData) notFound()

  const supabase = await createClient()

  // Fetch clients (pet owners) for this tenant
  // NOTE: Using !owner_id hint to specify the FK relationship since pets has multiple FKs to profiles
  // Appointments are fetched through pets since there's no direct client_id on appointments
  let query = supabase
    .from('profiles')
    .select(
      `
      id,
      full_name,
      email,
      phone,
      created_at,
      pets:pets!owner_id(
        id,
        appointments(start_time, status)
      )
    `
    )
    .eq('tenant_id', profile.tenant_id)
    .eq('role', 'owner')
    .order('full_name', { ascending: true })

  // Apply search filter if provided
  if (q && q.trim()) {
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
  }

  const { data: rawClients, error } = await query

  if (error) {
    logger.error('Error fetching clients', { error: error.message })
    return (
      <div className="container mx-auto px-4 py-8">
        <div
          className="rounded-lg p-4"
          style={{
            backgroundColor: 'var(--status-error-bg)',
            border: '1px solid var(--status-error-light)',
          }}
        >
          <p style={{ color: 'var(--status-error-dark)' }}>
            Error al cargar clientes. Por favor, intente nuevamente.
          </p>
        </div>
      </div>
    )
  }

  // Transform data to get pet count and last visit
  const clients: Client[] = ((rawClients || []) as RawClient[]).map((client: RawClient) => {
    const pets = Array.isArray(client.pets) ? client.pets : []
    const petCount = pets.length

    // Collect all appointments from all pets and find the most recent COMPLETED one
    const allAppointments: RawAppointment[] = pets.flatMap((pet: RawPet) =>
      Array.isArray(pet.appointments) ? pet.appointments : []
    )
    // Filter to only completed appointments (excludes scheduled/future appointments)
    const completedAppointments = allAppointments.filter((appt) => appt.status === 'completed')
    const lastVisit =
      completedAppointments.length > 0
        ? completedAppointments.sort(
            (a: RawAppointment, b: RawAppointment) =>
              new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
          )[0]?.start_time
        : null

    return {
      id: client.id,
      full_name: client.full_name || 'Sin nombre',
      email: client.email,
      phone: client.phone,
      created_at: client.created_at,
      pet_count: petCount,
      last_visit: lastVisit,
    }
  })

  // Determine if client is active (visited in last 90 days)
  const isClientActive = (lastVisit: string | null): boolean => {
    if (!lastVisit) return false
    const daysSinceVisit = Math.floor(
      (Date.now() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24)
    )
    return daysSinceVisit <= 90
  }

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Nunca'
    const date = new Date(dateString)
    return date.toLocaleDateString('es-PY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatPhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '')
    // Format Paraguay numbers: +595 XXX XXX XXX
    if (cleaned.startsWith('595') && cleaned.length === 12) {
      return `+595 ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`
    }
    // Fallback: add spaces every 3 digits after country code
    if (cleaned.length > 3) {
      const countryCode = cleaned.slice(0, 3)
      const rest =
        cleaned
          .slice(3)
          .match(/.{1,3}/g)
          ?.join(' ') || cleaned.slice(3)
      return `+${countryCode} ${rest}`
    }
    return phone
  }

  const activeClients = clients.filter((c) => isClientActive(c.last_visit))
  const inactiveClients = clients.filter((c) => !isClientActive(c.last_visit))

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-3">
          <div className="rounded-lg bg-[var(--primary)] bg-opacity-10 p-2">
            <Users className="h-6 w-6 text-[var(--primary)]" />
          </div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Directorio de Clientes</h1>
        </div>
        <p className="text-[var(--text-secondary)]">
          Gestiona la información de todos los propietarios de mascotas
        </p>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl bg-[var(--bg-default)] p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-[var(--text-secondary)]">Total Clientes</p>
              <p className="text-3xl font-bold text-[var(--text-primary)]">{clients.length}</p>
            </div>
            <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--accent-blue-light)' }}>
              <Users className="h-8 w-8" style={{ color: 'var(--accent-blue)' }} />
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-[var(--bg-default)] p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-[var(--text-secondary)]">Clientes Activos</p>
              <p className="text-3xl font-bold text-[var(--text-primary)]">
                {activeClients.length}
              </p>
            </div>
            <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--status-success-bg)' }}>
              <CheckCircle className="h-8 w-8" style={{ color: 'var(--status-success)' }} />
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-[var(--bg-default)] p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-[var(--text-secondary)]">Clientes Inactivos</p>
              <p className="text-3xl font-bold text-[var(--text-primary)]">
                {inactiveClients.length}
              </p>
            </div>
            <div
              className="rounded-lg p-3"
              style={{ backgroundColor: 'var(--accent-orange-light)' }}
            >
              <AlertCircle className="h-8 w-8" style={{ color: 'var(--accent-orange)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Actions */}
      <div className="mb-6 rounded-xl bg-[var(--bg-default)] p-6 shadow-md">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <ClientSearch clinic={clinic} initialQuery={q} />

          <Link
            href={`/${clinic}/dashboard/clients/invite`}
            className="flex items-center gap-2 whitespace-nowrap rounded-lg bg-[var(--primary)] px-4 py-2 text-white transition-opacity hover:opacity-90"
          >
            <UserPlus className="h-5 w-5" />
            Agregar Cliente
          </Link>
        </div>
      </div>

      {/* Clients Table */}
      {clients.length === 0 ? (
        <div className="rounded-xl bg-[var(--bg-default)] p-12 text-center shadow-md">
          <Users className="mx-auto mb-4 h-16 w-16 text-[var(--text-secondary)] opacity-50" />
          <h3 className="mb-2 text-xl font-semibold text-[var(--text-primary)]">
            {q ? 'No se encontraron clientes' : 'No hay clientes registrados'}
          </h3>
          <p className="mb-6 text-[var(--text-secondary)]">
            {q
              ? 'Intenta con otro término de búsqueda'
              : 'Comienza agregando tu primer cliente al sistema'}
          </p>
          {!q && (
            <Link
              href={`/${clinic}/dashboard/clients/invite`}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-3 text-white transition-opacity hover:opacity-90"
            >
              <UserPlus className="h-5 w-5" />
              Agregar Primer Cliente
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-[var(--bg-default)] shadow-md">
          {/* Desktop Table View */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead className="border-b border-[var(--primary)] border-opacity-10 bg-[var(--primary)] bg-opacity-5">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--text-primary)]">
                    Cliente
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--text-primary)]">
                    Contacto
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--text-primary)]">
                    Mascotas
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--text-primary)]">
                    Última Visita
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--text-primary)]">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--text-primary)]">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--primary)] divide-opacity-5">
                {clients.map((client) => (
                  <tr
                    key={client.id}
                    className="group transition-colors hover:bg-[var(--bg-subtle)]"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)] bg-opacity-10">
                          <span className="font-semibold text-[var(--primary)]">
                            {client.full_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">
                            {client.full_name}
                          </p>
                          <p className="text-sm text-[var(--text-secondary)]">
                            Cliente desde {formatDate(client.created_at)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                          <Mail className="h-4 w-4" />
                          <span>{client.email}</span>
                        </div>
                        {client.phone && (
                          <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              <span>{formatPhoneNumber(client.phone)}</span>
                            </div>
                            <a
                              href={`https://wa.me/${client.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 transition-colors hover:text-green-700"
                              title="Abrir WhatsApp"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </a>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <PawPrint className="h-5 w-5 text-[var(--primary)]" />
                        <span className="font-medium text-[var(--text-primary)]">
                          {client.pet_count}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(client.last_visit)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {isClientActive(client.last_visit) ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium"
                          style={{
                            backgroundColor: 'var(--status-success-bg)',
                            color: 'var(--status-success-dark)',
                          }}
                        >
                          <CheckCircle className="h-3 w-3" />
                          Activo
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium"
                          style={{
                            backgroundColor: 'var(--accent-orange-light)',
                            color: 'var(--accent-orange-dark)',
                          }}
                        >
                          <AlertCircle className="h-3 w-3" />
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/${clinic}/dashboard/clients/${client.id}`}
                        className="text-sm font-medium text-[var(--primary)] hover:underline"
                      >
                        Ver detalles
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="divide-y divide-[var(--primary)] divide-opacity-5 md:hidden">
            {clients.map((client) => (
              <Link
                key={client.id}
                href={`/${clinic}/dashboard/clients/${client.id}`}
                className="block p-4 transition-colors hover:bg-[var(--primary)] hover:bg-opacity-5"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)] bg-opacity-10">
                      <span className="text-lg font-semibold text-[var(--primary)]">
                        {client.full_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-[var(--text-primary)]">{client.full_name}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <PawPrint className="h-4 w-4 text-[var(--primary)]" />
                        <span className="text-sm text-[var(--text-secondary)]">
                          {client.pet_count} mascota{client.pet_count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  {isClientActive(client.last_visit) ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium"
                      style={{
                        backgroundColor: 'var(--status-success-bg)',
                        color: 'var(--status-success-dark)',
                      }}
                    >
                      <CheckCircle className="h-3 w-3" />
                      Activo
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium"
                      style={{
                        backgroundColor: 'var(--accent-orange-light)',
                        color: 'var(--accent-orange-dark)',
                      }}
                    >
                      <AlertCircle className="h-3 w-3" />
                      Inactivo
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <Mail className="h-4 w-4" />
                    <span>{client.email}</span>
                  </div>
                  {client.phone && (
                    <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span>{formatPhoneNumber(client.phone)}</span>
                      </div>
                      <a
                        href={`https://wa.me/${client.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 transition-colors hover:text-green-700"
                        title="Abrir WhatsApp"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <Calendar className="h-4 w-4" />
                    <span>Última visita: {formatDate(client.last_visit)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Results Summary */}
      {clients.length > 0 && (
        <div className="mt-6 text-center text-sm text-[var(--text-secondary)]">
          Mostrando {clients.length} cliente{clients.length !== 1 ? 's' : ''}
          {q && ` para "${q}"`}
        </div>
      )}
    </div>
  )
}
