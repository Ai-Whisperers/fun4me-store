import { getClinicData } from '@/lib/clinics'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  PawPrint,
  FileText,
  DollarSign,
  MessageSquare,
  Plus,
  ArrowLeft,
  Clock,
  Send,
  StickyNote,
  CheckCircle,
  XCircle,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react'

interface Props {
  params: Promise<{ clinic: string; id: string }>
}

// Supabase join types
interface PetNameJoin {
  name: string
}

interface AppointmentWithPet {
  id: string
  appointment_date: string
  status: string
  notes: string | null
  service_id: string | null
  pet_id: string
  pets: PetNameJoin | PetNameJoin[] | null
}

interface InvoiceWithPet {
  id: string
  invoice_number: string
  total_amount: number
  paid_amount: number | null
  status: string
  issue_date: string
  due_date: string | null
  pet_id: string | null
  pets: PetNameJoin | PetNameJoin[] | null
}

export default async function ClientDetailPage({ params }: Props) {
  const { clinic, id } = await params
  const clinicData = await getClinicData(clinic)
  if (!clinicData) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${clinic}/portal/login`)

  // Check staff role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['vet', 'admin'].includes(profile.role)) {
    redirect(`/${clinic}/portal/dashboard`)
  }

  // Fetch client data
  const { data: client } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)
    .single()

  if (!client) notFound()

  // Fetch client's pets
  const { data: pets } = await supabase
    .from('pets')
    .select('id, name, species, breed, date_of_birth, photo_url, sex, neutered')
    .eq('owner_id', id)
    .eq('tenant_id', profile.tenant_id)
    .order('created_at', { ascending: false })

  // Fetch recent appointments
  const { data: appointments } = await supabase
    .from('appointments')
    .select(
      `
      id,
      appointment_date,
      status,
      notes,
      service_id,
      pet_id,
      pets(name)
    `
    )
    .eq('clinic_slug', clinic)
    .in(
      'pet_id',
      (pets || []).map((p) => p.id)
    )
    .order('appointment_date', { ascending: false })
    .limit(10)

  // Fetch invoices with outstanding balance
  const { data: invoices } = await supabase
    .from('invoices')
    .select(
      `
      id,
      invoice_number,
      total_amount,
      paid_amount,
      status,
      issue_date,
      due_date,
      pet_id,
      pets(name)
    `
    )
    .eq('tenant_id', profile.tenant_id)
    .in(
      'pet_id',
      (pets || []).map((p) => p.id)
    )
    .order('issue_date', { ascending: false })
    .limit(10)

  // Calculate total outstanding balance
  const outstandingBalance = (invoices || [])
    .filter((inv) => inv.status !== 'paid')
    .reduce((sum, inv) => sum + (inv.total_amount - (inv.paid_amount || 0)), 0)

  // Fetch communication history from notification_log
  const { data: communications } = await supabase
    .from('notification_log')
    .select('id, channel, message, status, sent_at, error_message')
    .eq('user_id', id)
    .order('sent_at', { ascending: false })
    .limit(10)

  // Fetch internal notes (we'll use medical_records with type 'note' for now)
  const { data: notes } = await supabase
    .from('medical_records')
    .select('id, notes, created_at, created_by')
    .eq('tenant_id', profile.tenant_id)
    .in(
      'pet_id',
      (pets || []).map((p) => p.id)
    )
    .eq('record_type', 'note')
    .order('created_at', { ascending: false })
    .limit(5)

  // Format date helper
  const formatDate = (date: string | null) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('es-PY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatDateTime = (date: string | null) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleString('es-PY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Calculate age helper
  const calculateAge = (dob: string | null) => {
    if (!dob) return 'Desconocido'
    const birth = new Date(dob)
    const today = new Date()
    const years = today.getFullYear() - birth.getFullYear()
    const months = today.getMonth() - birth.getMonth()

    if (years === 0) {
      return `${months} ${months === 1 ? 'mes' : 'meses'}`
    }
    return `${years} ${years === 1 ? 'año' : 'años'}`
  }

  // Status badge helper
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string; icon: LucideIcon }> = {
      confirmed: {
        label: 'Confirmada',
        className: 'bg-green-100 text-green-800',
        icon: CheckCircle,
      },
      pending: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800', icon: Clock },
      cancelled: { label: 'Cancelada', className: 'bg-red-100 text-red-800', icon: XCircle },
      completed: { label: 'Completada', className: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      paid: { label: 'Pagada', className: 'bg-green-100 text-green-800', icon: CheckCircle },
      partial: { label: 'Parcial', className: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
      unpaid: { label: 'Pendiente', className: 'bg-red-100 text-red-800', icon: XCircle },
      sent: { label: 'Enviado', className: 'bg-green-100 text-green-800', icon: CheckCircle },
      failed: { label: 'Fallido', className: 'bg-red-100 text-red-800', icon: XCircle },
      delivered: { label: 'Entregado', className: 'bg-blue-100 text-blue-800', icon: CheckCircle },
    }

    const config = statusConfig[status] || {
      label: status,
      className: 'bg-gray-100 text-gray-800',
      icon: AlertCircle,
    }
    const Icon = config.icon

    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${config.className}`}
      >
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-subtle)] py-8">
      <div className="container mx-auto max-w-7xl px-4">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/${clinic}/dashboard/clients`}
            className="mb-4 inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--primary)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Clientes
          </Link>

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-bold text-[var(--text-primary)]">
                {client.full_name || 'Sin nombre'}
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Cliente desde {formatDate(client.created_at)}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/${clinic}/dashboard/appointments/new?client=${id}`}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                Nueva Cita
              </Link>
              <Link
                href={`/${clinic}/dashboard/invoices?client=${id}`}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-white px-4 py-2 text-sm font-medium text-[var(--text-primary)] shadow-sm transition-colors hover:bg-[var(--bg-subtle)]"
              >
                <FileText className="h-4 w-4" />
                Ver Facturas
              </Link>
              <button className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-white px-4 py-2 text-sm font-medium text-[var(--text-primary)] shadow-sm transition-colors hover:bg-[var(--bg-subtle)]">
                <Send className="h-4 w-4" />
                Enviar Mensaje
              </button>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column - Client Info */}
          <div className="space-y-6 lg:col-span-1">
            {/* Contact Information */}
            <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)]">
                <User className="h-5 w-5 text-[var(--primary)]" />
                Información de Contacto
              </h2>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-5 w-5 text-[var(--text-secondary)]" />
                  <div>
                    <p className="mb-1 text-xs text-[var(--text-secondary)]">Email</p>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {client.email || 'No registrado'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-5 w-5 text-[var(--text-secondary)]" />
                  <div>
                    <p className="mb-1 text-xs text-[var(--text-secondary)]">Teléfono</p>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {client.phone || 'No registrado'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 text-[var(--text-secondary)]" />
                  <div>
                    <p className="mb-1 text-xs text-[var(--text-secondary)]">Dirección</p>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {client.address || 'No registrada'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-5 w-5 text-[var(--text-secondary)]" />
                  <div>
                    <p className="mb-1 text-xs text-[var(--text-secondary)]">Fecha de Registro</p>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {formatDate(client.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)]">
                <DollarSign className="h-5 w-5 text-[var(--primary)]" />
                Resumen Financiero
              </h2>

              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-[var(--bg-subtle)] p-3">
                  <span className="text-sm text-[var(--text-secondary)]">Saldo Pendiente</span>
                  <span
                    className={`text-lg font-bold ${outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}
                  >
                    {outstandingBalance.toLocaleString('es-PY')} Gs.
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-[var(--bg-subtle)] p-3">
                  <span className="text-sm text-[var(--text-secondary)]">Total Facturas</span>
                  <span className="text-lg font-bold text-[var(--text-primary)]">
                    {invoices?.length || 0}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-[var(--bg-subtle)] p-3">
                  <span className="text-sm text-[var(--text-secondary)]">Mascotas Registradas</span>
                  <span className="text-lg font-bold text-[var(--text-primary)]">
                    {pets?.length || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Internal Notes */}
            <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)]">
                <StickyNote className="h-5 w-5 text-[var(--primary)]" />
                Notas Internas
              </h2>

              {notes && notes.length > 0 ? (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="rounded-lg border-l-4 border-[var(--primary)] bg-[var(--bg-subtle)] p-3"
                    >
                      <p className="mb-2 text-sm text-[var(--text-primary)]">{note.notes}</p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {formatDateTime(note.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-[var(--text-secondary)]">
                  No hay notas registradas
                </p>
              )}

              <button className="mt-4 w-full rounded-lg bg-[var(--bg-subtle)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--border-color)]">
                Agregar Nota
              </button>
            </div>
          </div>

          {/* Right Column - Pets, Appointments, etc. */}
          <div className="space-y-6 lg:col-span-2">
            {/* Pets Section */}
            <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)]">
                  <PawPrint className="h-5 w-5 text-[var(--primary)]" />
                  Mascotas ({pets?.length || 0})
                </h2>
                <Link
                  href={`/${clinic}/dashboard/pets/new?owner=${id}`}
                  className="text-sm font-medium text-[var(--primary)] hover:underline"
                >
                  + Agregar Mascota
                </Link>
              </div>

              {pets && pets.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {pets.map((pet) => (
                    <Link
                      key={pet.id}
                      href={`/${clinic}/dashboard/pets/${pet.id}`}
                      className="flex items-center gap-4 rounded-lg border border-transparent bg-[var(--bg-subtle)] p-4 transition-shadow hover:border-[var(--primary)] hover:shadow-md"
                    >
                      {pet.photo_url ? (
                        <img
                          src={pet.photo_url}
                          alt={pet.name}
                          className="h-16 w-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary)] bg-opacity-10">
                          <PawPrint className="h-8 w-8 text-[var(--primary)]" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold text-[var(--text-primary)]">
                          {pet.name}
                        </h3>
                        <p className="truncate text-sm text-[var(--text-secondary)]">
                          {pet.species} {pet.breed && `• ${pet.breed}`}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                          {calculateAge(pet.date_of_birth)} •{' '}
                          {pet.sex === 'male' ? 'Macho' : 'Hembra'}
                          {pet.neutered && ' • Esterilizado'}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <PawPrint className="mx-auto mb-3 h-12 w-12 text-[var(--text-secondary)] opacity-50" />
                  <p className="text-sm text-[var(--text-secondary)]">
                    No hay mascotas registradas
                  </p>
                </div>
              )}
            </div>

            {/* Recent Appointments */}
            <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)]">
                <Calendar className="h-5 w-5 text-[var(--primary)]" />
                Historial de Citas
              </h2>

              {appointments && appointments.length > 0 ? (
                <div className="space-y-3">
                  {appointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="flex items-center justify-between rounded-lg bg-[var(--bg-subtle)] p-4 transition-shadow hover:shadow-sm"
                    >
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <p className="font-medium text-[var(--text-primary)]">
                            {formatDateTime(apt.appointment_date)}
                          </p>
                          {getStatusBadge(apt.status)}
                        </div>
                        <p className="text-sm text-[var(--text-secondary)]">
                          Mascota: {(() => {
                            const typedApt = apt as AppointmentWithPet
                            const pet = Array.isArray(typedApt.pets) ? typedApt.pets[0] : typedApt.pets
                            return pet?.name || 'N/A'
                          })()}
                        </p>
                        {apt.notes && (
                          <p className="mt-1 line-clamp-1 text-xs text-[var(--text-secondary)]">
                            {apt.notes}
                          </p>
                        )}
                      </div>
                      <Link
                        href={`/${clinic}/dashboard/appointments/${apt.id}`}
                        className="ml-4 text-sm font-medium text-[var(--primary)] hover:underline"
                      >
                        Ver detalles
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Calendar className="mx-auto mb-3 h-12 w-12 text-[var(--text-secondary)] opacity-50" />
                  <p className="text-sm text-[var(--text-secondary)]">No hay citas registradas</p>
                </div>
              )}
            </div>

            {/* Invoice History */}
            <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)]">
                <FileText className="h-5 w-5 text-[var(--primary)]" />
                Historial de Facturas
              </h2>

              {invoices && invoices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--border-color)]">
                        <th className="px-2 py-3 text-left text-xs font-semibold uppercase text-[var(--text-secondary)]">
                          Nº Factura
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-semibold uppercase text-[var(--text-secondary)]">
                          Fecha
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-semibold uppercase text-[var(--text-secondary)]">
                          Mascota
                        </th>
                        <th className="px-2 py-3 text-right text-xs font-semibold uppercase text-[var(--text-secondary)]">
                          Monto
                        </th>
                        <th className="px-2 py-3 text-center text-xs font-semibold uppercase text-[var(--text-secondary)]">
                          Estado
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((invoice) => (
                        <tr
                          key={invoice.id}
                          className="border-b border-[var(--border-color)] transition-colors hover:bg-[var(--bg-subtle)]"
                        >
                          <td className="px-2 py-3 text-sm font-medium text-[var(--text-primary)]">
                            {invoice.invoice_number}
                          </td>
                          <td className="px-2 py-3 text-sm text-[var(--text-secondary)]">
                            {formatDate(invoice.issue_date)}
                          </td>
                          <td className="px-2 py-3 text-sm text-[var(--text-secondary)]">
                            {(() => {
                              const typedInvoice = invoice as InvoiceWithPet
                              const pet = Array.isArray(typedInvoice.pets) ? typedInvoice.pets[0] : typedInvoice.pets
                              return pet?.name || 'N/A'
                            })()}
                          </td>
                          <td className="px-2 py-3 text-right text-sm font-medium text-[var(--text-primary)]">
                            {invoice.total_amount.toLocaleString('es-PY')} Gs.
                          </td>
                          <td className="px-2 py-3 text-center">
                            {getStatusBadge(invoice.status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <FileText className="mx-auto mb-3 h-12 w-12 text-[var(--text-secondary)] opacity-50" />
                  <p className="text-sm text-[var(--text-secondary)]">
                    No hay facturas registradas
                  </p>
                </div>
              )}
            </div>

            {/* Communication History */}
            <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)]">
                <MessageSquare className="h-5 w-5 text-[var(--primary)]" />
                Historial de Comunicaciones
              </h2>

              {communications && communications.length > 0 ? (
                <div className="space-y-3">
                  {communications.map((comm) => (
                    <div
                      key={comm.id}
                      className="flex items-start gap-3 rounded-lg bg-[var(--bg-subtle)] p-4"
                    >
                      <div
                        className={`rounded-full p-2 ${
                          comm.channel === 'email'
                            ? 'bg-blue-100'
                            : comm.channel === 'sms'
                              ? 'bg-green-100'
                              : comm.channel === 'whatsapp'
                                ? 'bg-green-100'
                                : 'bg-gray-100'
                        }`}
                      >
                        {comm.channel === 'email' ? (
                          <Mail className="h-4 w-4 text-blue-600" />
                        ) : comm.channel === 'sms' || comm.channel === 'whatsapp' ? (
                          <MessageSquare className="h-4 w-4 text-green-600" />
                        ) : (
                          <Send className="h-4 w-4 text-gray-600" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="text-xs font-medium uppercase text-[var(--text-primary)]">
                            {comm.channel}
                          </span>
                          {getStatusBadge(comm.status)}
                        </div>
                        <p className="mb-1 line-clamp-2 text-sm text-[var(--text-primary)]">
                          {comm.message}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {formatDateTime(comm.sent_at)}
                        </p>
                        {comm.error_message && (
                          <p className="mt-1 text-xs text-red-600">Error: {comm.error_message}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <MessageSquare className="mx-auto mb-3 h-12 w-12 text-[var(--text-secondary)] opacity-50" />
                  <p className="text-sm text-[var(--text-secondary)]">
                    No hay comunicaciones registradas
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
