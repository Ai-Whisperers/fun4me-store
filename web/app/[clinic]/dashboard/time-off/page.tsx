import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
} from 'lucide-react'
import { TimeOffActions } from '@/components/dashboard/time-off-actions'

interface Props {
  params: Promise<{ clinic: string }>
}

interface TimeOffRequest {
  id: string
  type: string
  start_date: string
  end_date: string
  status: 'pending' | 'approved' | 'rejected'
  reason: string | null
  created_at: string
  staff_profiles: {
    profiles: {
      full_name: string
    }
  }
}

const statusConfig = {
  pending: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700', icon: Clock },
  approved: { label: 'Aprobado', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  rejected: { label: 'Rechazado', color: 'bg-red-100 text-red-700', icon: XCircle },
}

export default async function TimeOffPage({ params }: Props): Promise<React.ReactElement> {
  const { clinic } = await params
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

  const isAdmin = profile.role === 'admin'

  // Fetch time-off requests
  let query = supabase
    .from('staff_time_off')
    .select(
      `
      id,
      type,
      start_date,
      end_date,
      status,
      reason,
      created_at,
      staff_profiles!inner (
        profiles!inner (
          full_name
        )
      )
    `
    )
    .order('created_at', { ascending: false })

  // Non-admins only see their own requests
  if (!isAdmin) {
    const { data: staffProfile } = await supabase
      .from('staff_profiles')
      .select('id')
      .eq('profile_id', user.id)
      .single()

    if (staffProfile) {
      query = query.eq('staff_id', staffProfile.id)
    }
  }

  const { data: requests } = await query
  const typedRequests = (requests || []) as unknown as TimeOffRequest[]

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString('es-PY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const getDaysCount = (start: string, end: string): number => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link
            href={`/${clinic}/dashboard/schedules`}
            className="mb-2 inline-flex items-center gap-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--primary)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Horarios
          </Link>
          <h1 className="text-2xl font-black text-[var(--text-primary)]">
            {isAdmin ? 'Solicitudes de Ausencia' : 'Mis Ausencias'}
          </h1>
          <p className="text-[var(--text-secondary)]">
            {isAdmin ? 'Gestiona las solicitudes del equipo' : 'Solicita días libres o vacaciones'}
          </p>
        </div>
        <Link
          href={`/${clinic}/dashboard/time-off/new`}
          className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 font-bold text-white transition-opacity hover:opacity-90"
        >
          <Plus className="h-5 w-5" />
          Nueva Solicitud
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <p className="mb-1 text-xs font-bold uppercase text-gray-400">Pendientes</p>
          <p className="text-2xl font-black text-amber-600">
            {typedRequests.filter((r) => r.status === 'pending').length}
          </p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <p className="mb-1 text-xs font-bold uppercase text-gray-400">Aprobadas</p>
          <p className="text-2xl font-black text-green-600">
            {typedRequests.filter((r) => r.status === 'approved').length}
          </p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <p className="mb-1 text-xs font-bold uppercase text-gray-400">Rechazadas</p>
          <p className="text-2xl font-black text-red-600">
            {typedRequests.filter((r) => r.status === 'rejected').length}
          </p>
        </div>
      </div>

      {/* Empty State */}
      {typedRequests.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 text-gray-400">
            <Calendar className="h-8 w-8" />
          </div>
          <h3 className="mb-2 text-lg font-bold text-gray-600">No hay solicitudes</h3>
          <p className="mb-6 text-gray-500">
            {isAdmin
              ? 'No hay solicitudes de ausencia pendientes'
              : 'Aún no has solicitado días libres'}
          </p>
        </div>
      )}

      {/* Requests List */}
      {typedRequests.length > 0 && (
        <div className="space-y-4">
          {typedRequests.map((request) => {
            const status = statusConfig[request.status]
            const StatusIcon = status.icon
            const days = getDaysCount(request.start_date, request.end_date)

            return (
              <div
                key={request.id}
                className="rounded-xl border border-gray-100 bg-white p-5 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="bg-[var(--primary)]/10 flex h-12 w-12 items-center justify-center rounded-xl">
                      <Calendar className="h-6 w-6 text-[var(--primary)]" />
                    </div>
                    <div>
                      <div className="mb-1 flex items-center gap-3">
                        <h3 className="font-bold text-[var(--text-primary)]">{request.type}</h3>
                        <span
                          className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${status.color}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </span>
                      </div>
                      {isAdmin && (
                        <p className="mb-2 flex items-center gap-1 text-sm text-[var(--text-secondary)]">
                          <User className="h-3 w-3" />
                          {request.staff_profiles?.profiles?.full_name || 'Sin nombre'}
                        </p>
                      )}
                      <p className="text-sm text-[var(--text-secondary)]">
                        {formatDate(request.start_date)} - {formatDate(request.end_date)}
                        <span className="ml-2 text-gray-400">
                          ({days} {days === 1 ? 'día' : 'días'})
                        </span>
                      </p>
                      {request.reason && (
                        <p className="mt-2 text-sm italic text-gray-500">
                          &quot;{request.reason}&quot;
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Admin Actions */}
                  {isAdmin && request.status === 'pending' && (
                    <TimeOffActions requestId={request.id} clinic={clinic} />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Info */}
      <div className="mt-8 flex items-start gap-3 rounded-xl bg-blue-50 p-4">
        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
        <div className="text-sm text-blue-700">
          <p className="mb-1 font-bold">Política de Ausencias</p>
          <p>
            Las solicitudes deben realizarse con al menos 7 días de anticipación. Las emergencias
            serán evaluadas caso por caso.
          </p>
        </div>
      </div>
    </div>
  )
}
