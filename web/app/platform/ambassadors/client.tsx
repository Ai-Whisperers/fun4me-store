'use client'

import { useState } from 'react'
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  Mail,
  Phone,
  Award,
  Search,
  ChevronDown,
  Eye,
  BadgeCheck,
  Ban,
} from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

interface Ambassador {
  id: string
  email: string
  full_name: string
  phone: string
  type: string
  university: string | null
  institution: string | null
  status: 'pending' | 'active' | 'suspended' | 'inactive'
  tier: 'embajador' | 'promotor' | 'super'
  referral_code: string
  referrals_count: number
  conversions_count: number
  commission_rate: number
  total_earned: number
  total_paid: number
  pending_payout: number
  bank_name: string | null
  bank_account: string | null
  bank_holder_name: string | null
  notes: string | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
}

interface AmbassadorAdminClientProps {
  ambassadors: Ambassador[]
}

const TYPE_LABELS: Record<string, string> = {
  student: 'Estudiante',
  assistant: 'Asistente',
  teacher: 'Docente',
  other: 'Otro',
}

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  embajador: { label: 'Embajador', color: 'bg-blue-100 text-blue-700' },
  promotor: { label: 'Promotor', color: 'bg-purple-100 text-purple-700' },
  super: { label: 'Super', color: 'bg-yellow-100 text-yellow-700' },
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  pending: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700', icon: Clock },
  active: { label: 'Activo', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  suspended: { label: 'Suspendido', color: 'bg-red-100 text-red-700', icon: Ban },
  inactive: { label: 'Inactivo', color: 'bg-gray-100 text-gray-700', icon: XCircle },
}

export function AmbassadorAdminClient({ ambassadors: initialAmbassadors }: AmbassadorAdminClientProps) {
  const { toast } = useToast()
  const [ambassadors, setAmbassadors] = useState(initialAmbassadors)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedAmbassador, setSelectedAmbassador] = useState<Ambassador | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Filter ambassadors
  const filtered = ambassadors.filter((a) => {
    const matchesSearch =
      search === '' ||
      a.full_name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      a.referral_code.toLowerCase().includes(search.toLowerCase())

    const matchesStatus = statusFilter === 'all' || a.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Pending approvals first
  const sorted = [...filtered].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1
    if (b.status === 'pending' && a.status !== 'pending') return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const handleApprove = async (ambassador: Ambassador) => {
    setActionLoading(ambassador.id)
    try {
      const response = await fetch(`/api/platform/ambassadors/${ambassador.id}/approve`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al aprobar')
      }

      // Update local state
      setAmbassadors((prev) =>
        prev.map((a) =>
          a.id === ambassador.id
            ? { ...a, status: 'active' as const, approved_at: new Date().toISOString() }
            : a
        )
      )
      setSelectedAmbassador(null)
      toast({ title: `${ambassador.full_name} ha sido aprobado como embajador`, variant: 'default' })
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : 'Error al aprobar embajador', variant: 'destructive' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (ambassador: Ambassador) => {
    setActionLoading(ambassador.id)
    try {
      const response = await fetch(`/api/platform/ambassadors/${ambassador.id}/reject`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al rechazar')
      }

      // Update local state
      setAmbassadors((prev) =>
        prev.map((a) => (a.id === ambassador.id ? { ...a, status: 'inactive' as const } : a))
      )
      setSelectedAmbassador(null)
      toast({ title: `Aplicación de ${ambassador.full_name} ha sido rechazada`, variant: 'default' })
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : 'Error al rechazar', variant: 'destructive' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleSuspend = async (ambassador: Ambassador) => {
    setActionLoading(ambassador.id)
    try {
      const response = await fetch(`/api/platform/ambassadors/${ambassador.id}/suspend`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al suspender')
      }

      setAmbassadors((prev) =>
        prev.map((a) => (a.id === ambassador.id ? { ...a, status: 'suspended' as const } : a))
      )
      setSelectedAmbassador(null)
      toast({ title: `${ambassador.full_name} ha sido suspendido`, variant: 'default' })
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : 'Error al suspender', variant: 'destructive' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleReactivate = async (ambassador: Ambassador) => {
    setActionLoading(ambassador.id)
    try {
      const response = await fetch(`/api/platform/ambassadors/${ambassador.id}/approve`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al reactivar')
      }

      setAmbassadors((prev) =>
        prev.map((a) => (a.id === ambassador.id ? { ...a, status: 'active' as const } : a))
      )
      setSelectedAmbassador(null)
      toast({ title: `${ambassador.full_name} ha sido reactivado`, variant: 'default' })
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : 'Error al reactivar', variant: 'destructive' })
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Buscar por nombre, email o código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--border-light)] bg-[var(--bg-primary)] py-2 pl-10 pr-4 text-sm focus:border-[var(--primary)] focus:outline-none"
          />
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none rounded-lg border border-[var(--border-light)] bg-[var(--bg-primary)] py-2 pl-4 pr-10 text-sm focus:border-[var(--primary)] focus:outline-none"
          >
            <option value="all">Todos los estados</option>
            <option value="pending">Pendientes</option>
            <option value="active">Activos</option>
            <option value="suspended">Suspendidos</option>
            <option value="inactive">Inactivos</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-[var(--text-muted)]">
        Mostrando {sorted.length} de {ambassadors.length} embajadores
      </p>

      {/* Ambassador Cards */}
      <div className="space-y-4">
        {sorted.length === 0 ? (
          <div className="rounded-lg bg-[var(--bg-primary)] p-8 text-center">
            <User className="mx-auto h-12 w-12 text-[var(--text-muted)]" />
            <p className="mt-2 text-[var(--text-muted)]">No se encontraron embajadores</p>
          </div>
        ) : (
          sorted.map((ambassador) => {
            const StatusIcon = STATUS_LABELS[ambassador.status].icon
            const isLoading = actionLoading === ambassador.id

            return (
              <div
                key={ambassador.id}
                className={`rounded-xl border bg-[var(--bg-primary)] p-4 shadow-sm transition ${
                  ambassador.status === 'pending' ? 'border-amber-300' : 'border-[var(--border-light)]'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  {/* Ambassador Info */}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-[var(--text-primary)]">
                        {ambassador.full_name}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_LABELS[ambassador.status].color}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {STATUS_LABELS[ambassador.status].label}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${TIER_LABELS[ambassador.tier].color}`}
                      >
                        {TIER_LABELS[ambassador.tier].label}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
                      <span className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        {ambassador.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        {ambassador.phone}
                      </span>
                      <span className="flex items-center gap-1">
                        <Award className="h-4 w-4" />
                        {TYPE_LABELS[ambassador.type]}
                      </span>
                    </div>

                    {(ambassador.university || ambassador.institution) && (
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        {ambassador.university || ambassador.institution}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-4 text-sm">
                      <span className="text-[var(--text-secondary)]">
                        Código: <span className="font-mono font-semibold">{ambassador.referral_code}</span>
                      </span>
                      <span className="text-[var(--text-secondary)]">
                        Referidos: <span className="font-semibold">{ambassador.referrals_count}</span>
                      </span>
                      <span className="text-[var(--text-secondary)]">
                        Conversiones: <span className="font-semibold text-green-600">{ambassador.conversions_count}</span>
                      </span>
                      {ambassador.pending_payout > 0 && (
                        <span className="text-purple-600">
                          Pendiente: <span className="font-semibold">Gs {ambassador.pending_payout.toLocaleString()}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedAmbassador(ambassador)}
                      className="rounded-lg border border-[var(--border-light)] px-3 py-1.5 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--bg-secondary)]"
                    >
                      <Eye className="h-4 w-4" />
                    </button>

                    {ambassador.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(ambassador)}
                          disabled={isLoading}
                          className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Aprobar
                        </button>
                        <button
                          onClick={() => handleReject(ambassador)}
                          disabled={isLoading}
                          className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                        >
                          <XCircle className="h-4 w-4" />
                          Rechazar
                        </button>
                      </>
                    )}

                    {ambassador.status === 'active' && (
                      <button
                        onClick={() => handleSuspend(ambassador)}
                        disabled={isLoading}
                        className="flex items-center gap-1 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        <Ban className="h-4 w-4" />
                        Suspender
                      </button>
                    )}

                    {(ambassador.status === 'suspended' || ambassador.status === 'inactive') && (
                      <button
                        onClick={() => handleReactivate(ambassador)}
                        disabled={isLoading}
                        className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                      >
                        <BadgeCheck className="h-4 w-4" />
                        Reactivar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Detail Modal */}
      {selectedAmbassador && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedAmbassador(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  {selectedAmbassador.full_name}
                </h2>
                <p className="text-[var(--text-muted)]">{selectedAmbassador.email}</p>
              </div>
              <button
                onClick={() => setSelectedAmbassador(null)}
                className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <DetailSection title="Información Personal">
                <DetailRow label="Teléfono" value={selectedAmbassador.phone} />
                <DetailRow label="Tipo" value={TYPE_LABELS[selectedAmbassador.type]} />
                {selectedAmbassador.university && (
                  <DetailRow label="Universidad" value={selectedAmbassador.university} />
                )}
                {selectedAmbassador.institution && (
                  <DetailRow label="Institución" value={selectedAmbassador.institution} />
                )}
              </DetailSection>

              <DetailSection title="Estado del Programa">
                <DetailRow label="Estado" value={STATUS_LABELS[selectedAmbassador.status].label} />
                <DetailRow label="Tier" value={TIER_LABELS[selectedAmbassador.tier].label} />
                <DetailRow label="Código de Referido" value={selectedAmbassador.referral_code} mono />
                <DetailRow
                  label="Comisión"
                  value={`${selectedAmbassador.commission_rate}%`}
                />
              </DetailSection>

              <DetailSection title="Rendimiento">
                <DetailRow
                  label="Total Referidos"
                  value={selectedAmbassador.referrals_count.toString()}
                />
                <DetailRow
                  label="Conversiones"
                  value={selectedAmbassador.conversions_count.toString()}
                />
                <DetailRow
                  label="Tasa de Conversión"
                  value={
                    selectedAmbassador.referrals_count > 0
                      ? `${((selectedAmbassador.conversions_count / selectedAmbassador.referrals_count) * 100).toFixed(1)}%`
                      : 'N/A'
                  }
                />
              </DetailSection>

              <DetailSection title="Comisiones">
                <DetailRow
                  label="Total Ganado"
                  value={`Gs ${selectedAmbassador.total_earned.toLocaleString()}`}
                />
                <DetailRow
                  label="Total Pagado"
                  value={`Gs ${selectedAmbassador.total_paid.toLocaleString()}`}
                />
                <DetailRow
                  label="Pendiente de Pago"
                  value={`Gs ${selectedAmbassador.pending_payout.toLocaleString()}`}
                  highlight={selectedAmbassador.pending_payout > 0}
                />
              </DetailSection>

              {selectedAmbassador.bank_name && (
                <DetailSection title="Datos Bancarios">
                  <DetailRow label="Banco" value={selectedAmbassador.bank_name} />
                  <DetailRow label="Cuenta" value={selectedAmbassador.bank_account || 'N/A'} />
                  <DetailRow label="Titular" value={selectedAmbassador.bank_holder_name || 'N/A'} />
                </DetailSection>
              )}

              <DetailSection title="Fechas">
                <DetailRow
                  label="Registro"
                  value={new Date(selectedAmbassador.created_at).toLocaleDateString('es-PY')}
                />
                {selectedAmbassador.approved_at && (
                  <DetailRow
                    label="Aprobado"
                    value={new Date(selectedAmbassador.approved_at).toLocaleDateString('es-PY')}
                  />
                )}
              </DetailSection>

              {selectedAmbassador.notes && (
                <DetailSection title="Notas">
                  <p className="text-sm text-[var(--text-secondary)]">{selectedAmbassador.notes}</p>
                </DetailSection>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-[var(--bg-secondary)] p-4">
      <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function DetailRow({
  label,
  value,
  mono,
  highlight,
}: {
  label: string
  value: string
  mono?: boolean
  highlight?: boolean
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span
        className={`${mono ? 'font-mono' : ''} ${highlight ? 'font-semibold text-purple-600' : 'text-[var(--text-primary)]'}`}
      >
        {value}
      </span>
    </div>
  )
}
