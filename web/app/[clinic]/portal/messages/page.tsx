import { getClinicData } from '@/lib/clinics'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { MessageSquare, Plus, Clock, CheckCircle2, AlertCircle, Search, Filter } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { getConversations } from '@/app/actions/messages'
import { AuthService } from '@/lib/auth/core'

interface Props {
  params: Promise<{ clinic: string }>
  searchParams: Promise<{ status?: string; search?: string }>
}

interface Conversation {
  id: string
  subject: string
  status: 'open' | 'closed' | 'pending'
  last_message_at: string | null
  last_message_preview: string | null
  created_at: string
  client_name: string
  staff_name: string | null
  unread_count: number
}

export async function generateStaticParams() {
  return [{ clinic: 'terrapet' }, { clinic: 'petlife' }]
}

export default async function MessagesPage({ params, searchParams }: Props) {
  const { clinic } = await params
  const { status, search } = await searchParams

  const clinicData = await getClinicData(clinic)
  if (!clinicData) {
    notFound()
  }

  // Fetch conversations using Server Action
  const result = await getConversations(clinic, { status, search })

  if (!result.success) {
    if (result.error === 'Authentication required') {
      redirect(`/${clinic}/portal/login`)
    }
    return (
      <div className="mx-auto mt-8 max-w-5xl rounded-2xl bg-red-50 p-8 text-center text-red-600">
        <p className="font-bold">Error al cargar mensajes</p>
        <p className="text-sm">{result.error}</p>
      </div>
    )
  }

  const conversations = result.data as Conversation[]

  // Get context for isStaff check
  const authContext = await AuthService.getContext()
  const isStaff = authContext.isAuthenticated && ['vet', 'admin'].includes(authContext.profile.role)

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="container mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-bold text-[var(--text-primary)]">Mensajes</h1>
              <p className="text-[var(--text-secondary)]">
                {isStaff
                  ? 'Gestiona las conversaciones con tus clientes'
                  : 'Comunícate con la clínica'}
              </p>
            </div>
            <Link
              href={`/${clinic}/portal/messages/new`}
              className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-white shadow-md transition-opacity hover:opacity-90"
            >
              <Plus className="h-5 w-5" />
              <span className="font-medium">Nueva Conversación</span>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-xl bg-white p-4 shadow-md">
          <div className="flex flex-col gap-4 md:flex-row">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-[var(--text-tertiary)]" />
                <input
                  type="text"
                  placeholder="Buscar por asunto o mensaje..."
                  defaultValue={search || ''}
                  className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const target = e.target as HTMLInputElement
                      const params = new URLSearchParams(window.location.search)
                      if (target.value) {
                        params.set('search', target.value)
                      } else {
                        params.delete('search')
                      }
                      window.location.search = params.toString()
                    }
                  }}
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-[var(--text-tertiary)]" />
              <select
                defaultValue={status || 'all'}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                onChange={(e) => {
                  const params = new URLSearchParams(window.location.search)
                  if (e.target.value !== 'all') {
                    params.set('status', e.target.value)
                  } else {
                    params.delete('status')
                  }
                  window.location.search = params.toString()
                }}
              >
                <option value="all">Todos los estados</option>
                <option value="open">Abierto</option>
                <option value="pending">Pendiente</option>
                <option value="closed">Cerrado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Conversations List */}
        <div className="space-y-3">
          {conversations.length === 0 ? (
            <div className="rounded-xl bg-white p-12 text-center shadow-md">
              <MessageSquare className="mx-auto mb-4 h-16 w-16 text-[var(--text-tertiary)]" />
              <h3 className="mb-2 text-xl font-semibold text-[var(--text-primary)]">
                No hay conversaciones
              </h3>
              <p className="mb-6 text-[var(--text-secondary)]">
                {search
                  ? 'No se encontraron conversaciones con ese criterio de búsqueda.'
                  : 'Inicia una nueva conversación para comenzar.'}
              </p>
              <Link
                href={`/${clinic}/portal/messages/new`}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-3 text-white shadow-md transition-opacity hover:opacity-90"
              >
                <Plus className="h-5 w-5" />
                <span className="font-medium">Nueva Conversación</span>
              </Link>
            </div>
          ) : (
            conversations.map((conversation) => (
              <Link
                key={conversation.id}
                href={`/${clinic}/portal/messages/${conversation.id}`}
                className="block rounded-xl bg-white p-5 shadow-md transition-shadow hover:shadow-lg"
              >
                <div className="flex items-start gap-4">
                  {/* Unread Indicator */}
                  <div className="mt-1 flex-shrink-0">
                    {conversation.unread_count > 0 ? (
                      <div className="h-3 w-3 rounded-full bg-blue-500" />
                    ) : (
                      <div className="h-3 w-3 rounded-full border-2 border-gray-200 bg-transparent" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    {/* Header Row */}
                    <div className="mb-2 flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="mb-1 truncate text-lg font-semibold text-[var(--text-primary)]">
                          {conversation.subject}
                        </h3>
                        <p className="text-sm text-[var(--text-secondary)]">
                          {isStaff ? (
                            <span className="font-medium">{conversation.client_name}</span>
                          ) : (
                            <span className="font-medium">Clínica {clinicData.config.name}</span>
                          )}
                          {isStaff && conversation.staff_name && (
                            <span className="text-[var(--text-tertiary)]">
                              {' '}
                              · Asignado a {conversation.staff_name}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Status Badge */}
                      <div className="flex-shrink-0">
                        {conversation.status === 'open' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                            <CheckCircle2 className="h-4 w-4" />
                            Abierto
                          </span>
                        )}
                        {conversation.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-700">
                            <Clock className="h-4 w-4" />
                            Pendiente
                          </span>
                        )}
                        {conversation.status === 'closed' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                            <AlertCircle className="h-4 w-4" />
                            Cerrado
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Last Message Preview */}
                    {conversation.last_message_preview && (
                      <p className="mb-2 line-clamp-2 text-sm text-[var(--text-secondary)]">
                        {conversation.last_message_preview}
                      </p>
                    )}

                    {/* Footer Row */}
                    <div className="flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {conversation.last_message_at
                            ? formatDistanceToNow(new Date(conversation.last_message_at), {
                                addSuffix: true,
                                locale: es,
                              })
                            : formatDistanceToNow(new Date(conversation.created_at), {
                                addSuffix: true,
                                locale: es,
                              })}
                        </span>
                      </div>
                      {conversation.unread_count > 0 && (
                        <div className="flex items-center gap-1 font-medium text-blue-600">
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>
                            {conversation.unread_count} nuevo
                            {conversation.unread_count > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Stats Summary */}
        {conversations.length > 0 && (
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-white p-4 text-center shadow-md">
              <div className="mb-1 text-2xl font-bold text-[var(--primary)]">
                {conversations.filter((c) => c.status === 'open').length}
              </div>
              <div className="text-sm text-[var(--text-secondary)]">Abiertos</div>
            </div>
            <div className="rounded-xl bg-white p-4 text-center shadow-md">
              <div className="mb-1 text-2xl font-bold text-yellow-600">
                {conversations.filter((c) => c.status === 'pending').length}
              </div>
              <div className="text-sm text-[var(--text-secondary)]">Pendientes</div>
            </div>
            <div className="rounded-xl bg-white p-4 text-center shadow-md">
              <div className="mb-1 text-2xl font-bold text-blue-600">
                {conversations.reduce((sum, c) => sum + c.unread_count, 0)}
              </div>
              <div className="text-sm text-[var(--text-secondary)]">Mensajes sin leer</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
