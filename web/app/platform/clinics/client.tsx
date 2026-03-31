'use client'

/**
 * Platform Clinics Client Component
 *
 * Manages tenant clinics - view, edit, suspend, and create new clinics.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Building2,
  Plus,
  Search,
  MoreVertical,
  Users,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  Eye,
  Edit,
  Power,
  ExternalLink,
} from 'lucide-react'
import { formatInTimeZone } from 'date-fns-tz'
import { es } from 'date-fns/locale'

interface TenantStats {
  total_users: number
  appointments_30d: number
  revenue_30d: number
}

interface Tenant {
  id: string
  name: string
  slug: string
  is_active: boolean
  created_at: string
  settings?: Record<string, unknown>
  stats?: TenantStats
}

interface TenantFormData {
  name: string
  slug: string
  is_active: boolean
}

export function PlatformClinicsClient() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null)

  const fetchTenants = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('include_stats', 'true')
      if (showInactive) {
        params.set('include_inactive', 'true')
      }

      const res = await fetch(`/api/platform/tenants?${params}`)
      if (!res.ok) {
        throw new Error('Error al cargar clínicas')
      }
      const data = await res.json()
      setTenants(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [showInactive])

  useEffect(() => {
    fetchTenants()
  }, [fetchTenants])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'decimal',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return formatInTimeZone(new Date(dateStr), 'America/Asuncion', 'd MMM yyyy', { locale: es })
  }

  const filteredTenants = tenants.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.slug.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleToggleActive = async (tenant: Tenant) => {
    try {
      const res = await fetch(`/api/platform/tenants/${tenant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !tenant.is_active }),
      })

      if (!res.ok) {
        throw new Error('Error al actualizar estado')
      }

      fetchTenants()
      setActionMenuOpen(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    }
  }

  if (loading && tenants.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[var(--status-error,#dc2626)] bg-[var(--status-error-bg,#fef2f2)] p-4 text-[var(--status-error,#dc2626)]">
        <AlertCircle className="mr-2 inline h-5 w-5" />
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Clínicas</h1>
          <p className="text-[var(--text-muted)]">
            {tenants.length} clínicas registradas
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Nueva Clínica
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Buscar clínicas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] py-2 pl-10 pr-4 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-[var(--border-light,#e5e7eb)]"
          />
          Mostrar inactivas
        </label>
      </div>

      {/* Clinics Table */}
      <div className="overflow-hidden rounded-xl border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)]">
        <table className="w-full">
          <thead className="bg-[var(--bg-secondary,#f3f4f6)]">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">
                Clínica
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">
                Estado
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-[var(--text-secondary)]">
                <Users className="mx-auto h-4 w-4" />
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-[var(--text-secondary)]">
                <Calendar className="mx-auto h-4 w-4" />
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-[var(--text-secondary)]">
                <DollarSign className="mx-auto h-4 w-4" />
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">
                Creada
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-[var(--text-secondary)]">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-light,#e5e7eb)]">
            {filteredTenants.map((tenant) => (
              <tr key={tenant.id} className="hover:bg-[var(--bg-secondary,#f3f4f6)]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary)] text-white">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">{tenant.name}</p>
                      <p className="text-sm text-[var(--text-muted)]">/{tenant.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                      tenant.is_active
                        ? 'bg-[var(--status-success-bg,#dcfce7)] text-[var(--status-success,#16a34a)]'
                        : 'bg-[var(--status-error-bg,#fef2f2)] text-[var(--status-error,#dc2626)]'
                    }`}
                  >
                    {tenant.is_active ? (
                      <>
                        <CheckCircle className="h-3 w-3" />
                        Activa
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3" />
                        Inactiva
                      </>
                    )}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-sm text-[var(--text-primary)]">
                  {tenant.stats?.total_users ?? '-'}
                </td>
                <td className="px-4 py-3 text-center text-sm text-[var(--text-primary)]">
                  {tenant.stats?.appointments_30d ?? '-'}
                </td>
                <td className="px-4 py-3 text-center text-sm text-[var(--text-primary)]">
                  {tenant.stats?.revenue_30d != null
                    ? `${formatCurrency(tenant.stats.revenue_30d)} Gs`
                    : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-muted)]">
                  {formatDate(tenant.created_at)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="relative inline-block">
                    <button
                      onClick={() =>
                        setActionMenuOpen(actionMenuOpen === tenant.id ? null : tenant.id)
                      }
                      className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-secondary,#f3f4f6)] hover:text-[var(--text-primary)]"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>
                    {actionMenuOpen === tenant.id && (
                      <div className="absolute right-0 z-10 mt-1 w-48 rounded-lg border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] py-1 shadow-lg">
                        <a
                          href={`/${tenant.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary,#f3f4f6)]"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Ver sitio
                        </a>
                        <a
                          href={`/${tenant.slug}/dashboard`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary,#f3f4f6)]"
                        >
                          <Eye className="h-4 w-4" />
                          Ver dashboard
                        </a>
                        <button
                          onClick={() => {
                            setSelectedTenant(tenant)
                            setShowEditModal(true)
                            setActionMenuOpen(null)
                          }}
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary,#f3f4f6)]"
                        >
                          <Edit className="h-4 w-4" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleToggleActive(tenant)}
                          className={`flex w-full items-center gap-2 px-4 py-2 text-sm ${
                            tenant.is_active
                              ? 'text-[var(--status-error,#dc2626)]'
                              : 'text-[var(--status-success,#16a34a)]'
                          } hover:bg-[var(--bg-secondary,#f3f4f6)]`}
                        >
                          <Power className="h-4 w-4" />
                          {tenant.is_active ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredTenants.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[var(--text-muted)]">
                  No se encontraron clínicas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <TenantFormModal
          mode="create"
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            fetchTenants()
          }}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && selectedTenant && (
        <TenantFormModal
          mode="edit"
          tenant={selectedTenant}
          onClose={() => {
            setShowEditModal(false)
            setSelectedTenant(null)
          }}
          onSuccess={() => {
            setShowEditModal(false)
            setSelectedTenant(null)
            fetchTenants()
          }}
        />
      )}

      {/* Click outside to close action menu */}
      {actionMenuOpen && (
        <div className="fixed inset-0 z-0" onClick={() => setActionMenuOpen(null)} />
      )}
    </div>
  )
}

// Tenant Form Modal Component
interface TenantFormModalProps {
  mode: 'create' | 'edit'
  tenant?: Tenant
  onClose: () => void
  onSuccess: () => void
}

function TenantFormModal({ mode, tenant, onClose, onSuccess }: TenantFormModalProps) {
  const [formData, setFormData] = useState<TenantFormData>({
    name: tenant?.name ?? '',
    slug: tenant?.slug ?? '',
    is_active: tenant?.is_active ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const url = mode === 'create' ? '/api/platform/tenants' : `/api/platform/tenants/${tenant?.id}`
      const method = mode === 'create' ? 'POST' : 'PUT'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al guardar')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSaving(false)
    }
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-[var(--bg-primary,#fff)] p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold text-[var(--text-primary)]">
          {mode === 'create' ? 'Nueva Clínica' : 'Editar Clínica'}
        </h2>

        {error && (
          <div className="mb-4 rounded-lg border border-[var(--status-error,#dc2626)] bg-[var(--status-error-bg,#fef2f2)] p-3 text-sm text-[var(--status-error,#dc2626)]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
              Nombre
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                const name = e.target.value
                setFormData({
                  ...formData,
                  name,
                  slug: mode === 'create' ? generateSlug(name) : formData.slug,
                })
              }}
              className="w-full rounded-lg border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] px-3 py-2 text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
              Slug (URL)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-muted)]">/</span>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: generateSlug(e.target.value) })}
                className="flex-1 rounded-lg border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] px-3 py-2 text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
                required
                pattern="[a-z0-9-]+"
                title="Solo letras minúsculas, números y guiones"
              />
            </div>
          </div>

          {mode === 'edit' && (
            <div>
              <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-[var(--border-light,#e5e7eb)]"
                />
                Clínica activa
              </label>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--border-light,#e5e7eb)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary,#f3f4f6)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {saving && <RefreshCw className="h-4 w-4 animate-spin" />}
              {mode === 'create' ? 'Crear' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
