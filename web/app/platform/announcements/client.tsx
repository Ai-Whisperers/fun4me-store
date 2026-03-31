'use client'

/**
 * Platform Announcements Client Component
 *
 * Create and manage platform-wide announcements for all tenants.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Megaphone,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  Info,
  AlertTriangle,
  CheckCircle,
  Bell,
  ExternalLink,
  Calendar,
  Users,
} from 'lucide-react'
import { formatInTimeZone } from 'date-fns-tz'
import { es } from 'date-fns/locale'

interface Announcement {
  id: string
  title: string
  content: string
  announcement_type: 'info' | 'warning' | 'success' | 'urgent'
  target_roles: string[]
  target_tenant_ids: string[] | null
  is_active: boolean
  is_dismissible: boolean
  priority: number
  action_url: string | null
  action_label: string | null
  starts_at: string
  ends_at: string | null
  created_at: string
  created_by: string
}

interface AnnouncementFormData {
  title: string
  content: string
  announcement_type: 'info' | 'warning' | 'success' | 'urgent'
  target_roles: string[]
  is_dismissible: boolean
  priority: number
  action_url: string
  action_label: string
  starts_at: string
  ends_at: string
}

const ANNOUNCEMENT_TYPES = [
  { value: 'info', label: 'Información', icon: Info, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  { value: 'warning', label: 'Advertencia', icon: AlertTriangle, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  { value: 'success', label: 'Éxito', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
  { value: 'urgent', label: 'Urgente', icon: Bell, color: 'text-red-600', bgColor: 'bg-red-100' },
]

const ROLES = [
  { value: 'owner', label: 'Propietarios' },
  { value: 'vet', label: 'Veterinarios' },
  { value: 'admin', label: 'Administradores' },
]

export function PlatformAnnouncementsClient() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)

  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (showInactive) {
        params.set('include_inactive', 'true')
      }

      const res = await fetch(`/api/platform/announcements?${params}`)
      if (!res.ok) {
        throw new Error('Error al cargar anuncios')
      }
      const data = await res.json()
      setAnnouncements(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [showInactive])

  useEffect(() => {
    fetchAnnouncements()
  }, [fetchAnnouncements])

  const formatDate = (dateStr: string) => {
    return formatInTimeZone(new Date(dateStr), 'America/Asuncion', 'd MMM yyyy HH:mm', { locale: es })
  }

  const handleToggleActive = async (announcement: Announcement) => {
    try {
      const res = await fetch(`/api/platform/announcements/${announcement.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !announcement.is_active }),
      })

      if (!res.ok) {
        throw new Error('Error al actualizar')
      }

      fetchAnnouncements()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este anuncio?')) return

    try {
      const res = await fetch(`/api/platform/announcements/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Error al eliminar')
      }

      fetchAnnouncements()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    }
  }

  const getTypeConfig = (type: string) => {
    return ANNOUNCEMENT_TYPES.find((t) => t.value === type) || ANNOUNCEMENT_TYPES[0]
  }

  if (loading && announcements.length === 0) {
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
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Anuncios</h1>
          <p className="text-[var(--text-muted)]">
            Comunicados para todas las clínicas
          </p>
        </div>
        <button
          onClick={() => {
            setEditingAnnouncement(null)
            setShowModal(true)
          }}
          className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Nuevo Anuncio
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-[var(--border-light,#e5e7eb)]"
          />
          Mostrar inactivos
        </label>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.map((announcement) => {
          const typeConfig = getTypeConfig(announcement.announcement_type)
          const TypeIcon = typeConfig.icon

          return (
            <div
              key={announcement.id}
              className={`rounded-xl border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] p-6 ${
                !announcement.is_active ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`rounded-lg p-2 ${typeConfig.bgColor}`}>
                    <TypeIcon className={`h-5 w-5 ${typeConfig.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <h3 className="font-semibold text-[var(--text-primary)]">
                        {announcement.title}
                      </h3>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${typeConfig.bgColor} ${typeConfig.color}`}>
                        {typeConfig.label}
                      </span>
                      {!announcement.is_active && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <p className="mb-3 text-sm text-[var(--text-secondary)]">
                      {announcement.content}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-muted)]">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(announcement.starts_at)}
                        {announcement.ends_at && ` - ${formatDate(announcement.ends_at)}`}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {announcement.target_roles.map((r) =>
                          ROLES.find((role) => role.value === r)?.label || r
                        ).join(', ')}
                      </div>
                      {announcement.action_url && (
                        <a
                          href={announcement.action_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[var(--primary)] hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {announcement.action_label || 'Ver más'}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(announcement)}
                    className="rounded p-2 text-[var(--text-muted)] hover:bg-[var(--bg-secondary,#f3f4f6)] hover:text-[var(--text-primary)]"
                    title={announcement.is_active ? 'Desactivar' : 'Activar'}
                  >
                    {announcement.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => {
                      setEditingAnnouncement(announcement)
                      setShowModal(true)
                    }}
                    className="rounded p-2 text-[var(--text-muted)] hover:bg-[var(--bg-secondary,#f3f4f6)] hover:text-[var(--text-primary)]"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(announcement.id)}
                    className="rounded p-2 text-[var(--text-muted)] hover:bg-[var(--status-error-bg,#fef2f2)] hover:text-[var(--status-error,#dc2626)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {announcements.length === 0 && (
          <div className="rounded-xl border border-dashed border-[var(--border-light,#e5e7eb)] bg-[var(--bg-secondary,#f3f4f6)] p-12 text-center">
            <Megaphone className="mx-auto mb-4 h-12 w-12 text-[var(--text-muted)]" />
            <p className="text-[var(--text-muted)]">No hay anuncios</p>
            <button
              onClick={() => {
                setEditingAnnouncement(null)
                setShowModal(true)
              }}
              className="mt-4 text-sm font-medium text-[var(--primary)] hover:underline"
            >
              Crear primer anuncio
            </button>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showModal && (
        <AnnouncementFormModal
          announcement={editingAnnouncement}
          onClose={() => {
            setShowModal(false)
            setEditingAnnouncement(null)
          }}
          onSuccess={() => {
            setShowModal(false)
            setEditingAnnouncement(null)
            fetchAnnouncements()
          }}
        />
      )}
    </div>
  )
}

// Form Modal Component
interface AnnouncementFormModalProps {
  announcement: Announcement | null
  onClose: () => void
  onSuccess: () => void
}

function AnnouncementFormModal({ announcement, onClose, onSuccess }: AnnouncementFormModalProps) {
  const [formData, setFormData] = useState<AnnouncementFormData>(() => {
    if (announcement) {
      return {
        title: announcement.title,
        content: announcement.content,
        announcement_type: announcement.announcement_type,
        target_roles: announcement.target_roles,
        is_dismissible: announcement.is_dismissible,
        priority: announcement.priority,
        action_url: announcement.action_url || '',
        action_label: announcement.action_label || '',
        starts_at: announcement.starts_at.slice(0, 16),
        ends_at: announcement.ends_at?.slice(0, 16) || '',
      }
    }
    return {
      title: '',
      content: '',
      announcement_type: 'info',
      target_roles: ['admin'],
      is_dismissible: true,
      priority: 0,
      action_url: '',
      action_label: '',
      starts_at: new Date().toISOString().slice(0, 16),
      ends_at: '',
    }
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const url = announcement
        ? `/api/platform/announcements/${announcement.id}`
        : '/api/platform/announcements'
      const method = announcement ? 'PUT' : 'POST'

      const body = {
        ...formData,
        action_url: formData.action_url || null,
        action_label: formData.action_label || null,
        ends_at: formData.ends_at || null,
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

  const toggleRole = (role: string) => {
    setFormData((prev) => ({
      ...prev,
      target_roles: prev.target_roles.includes(role)
        ? prev.target_roles.filter((r) => r !== role)
        : [...prev.target_roles, role],
    }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-[var(--bg-primary,#fff)] p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold text-[var(--text-primary)]">
          {announcement ? 'Editar Anuncio' : 'Nuevo Anuncio'}
        </h2>

        {error && (
          <div className="mb-4 rounded-lg border border-[var(--status-error,#dc2626)] bg-[var(--status-error-bg,#fef2f2)] p-3 text-sm text-[var(--status-error,#dc2626)]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
              Título
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full rounded-lg border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] px-3 py-2 text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
              Contenido
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] px-3 py-2 text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
              Tipo
            </label>
            <select
              value={formData.announcement_type}
              onChange={(e) => setFormData({ ...formData, announcement_type: e.target.value as AnnouncementFormData['announcement_type'] })}
              className="w-full rounded-lg border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] px-3 py-2 text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
            >
              {ANNOUNCEMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
              Dirigido a
            </label>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => toggleRole(role.value)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                    formData.target_roles.includes(role.value)
                      ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                      : 'border-[var(--border-light,#e5e7eb)] text-[var(--text-secondary)] hover:border-[var(--primary)]'
                  }`}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                Fecha inicio
              </label>
              <input
                type="datetime-local"
                value={formData.starts_at}
                onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                className="w-full rounded-lg border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] px-3 py-2 text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                Fecha fin (opcional)
              </label>
              <input
                type="datetime-local"
                value={formData.ends_at}
                onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                className="w-full rounded-lg border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] px-3 py-2 text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                Prioridad
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                className="w-full rounded-lg border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] px-3 py-2 text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 pb-2 text-sm text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={formData.is_dismissible}
                  onChange={(e) => setFormData({ ...formData, is_dismissible: e.target.checked })}
                  className="rounded border-[var(--border-light,#e5e7eb)]"
                />
                Puede descartarse
              </label>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
              URL de acción (opcional)
            </label>
            <input
              type="url"
              value={formData.action_url}
              onChange={(e) => setFormData({ ...formData, action_url: e.target.value })}
              placeholder="https://..."
              className="w-full rounded-lg border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] px-3 py-2 text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
            />
          </div>

          {formData.action_url && (
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                Texto del botón
              </label>
              <input
                type="text"
                value={formData.action_label}
                onChange={(e) => setFormData({ ...formData, action_label: e.target.value })}
                placeholder="Ver más"
                className="w-full rounded-lg border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] px-3 py-2 text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
              />
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
              {announcement ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
