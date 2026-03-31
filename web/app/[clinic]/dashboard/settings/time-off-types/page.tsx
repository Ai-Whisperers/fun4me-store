'use client'

/**
 * Time Off Types Page
 *
 * RES-001: Migrated to React Query for data fetching
 */

import type { JSX } from 'react'
import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { staleTimes, gcTimes } from '@/lib/queries/utils'
import {
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Clock,
  Calendar,
  DollarSign,
  AlertCircle,
  Globe,
} from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

interface TimeOffType {
  id: string
  tenant_id: string | null
  code: string
  name: string
  description: string | null
  is_paid: boolean
  requires_approval: boolean
  max_days_per_year: number | null
  min_notice_days: number
  color_code: string
  is_active: boolean
  created_at: string
}

interface FormData {
  code: string
  name: string
  description: string
  is_paid: boolean
  requires_approval: boolean
  max_days_per_year: string
  min_notice_days: string
  color_code: string
}

const DEFAULT_FORM: FormData = {
  code: '',
  name: '',
  description: '',
  is_paid: true,
  requires_approval: true,
  max_days_per_year: '',
  min_notice_days: '1',
  color_code: '#3B82F6',
}

const COLOR_OPTIONS = [
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#22C55E', // Green
  '#3B82F6', // Blue
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#6B7280', // Gray
]

export default function TimeOffTypesPage(): JSX.Element {
  const params = useParams()
  const clinic = params?.clinic as string
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM)
  const [formError, setFormError] = useState<string | null>(null)

  // React Query: Fetch types
  const {
    data: types = [],
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ['time-off-types', clinic],
    queryFn: async (): Promise<TimeOffType[]> => {
      const response = await fetch(
        `/api/staff/time-off/types?clinic=${clinic}&include_inactive=true`
      )
      if (!response.ok) throw new Error('Error al cargar')
      const result = await response.json()
      return result.data || []
    },
    staleTime: staleTimes.MEDIUM,
    gcTime: gcTimes.MEDIUM,
  })

  // Mutation: Save type (create/update)
  const saveMutation = useMutation({
    mutationFn: async (params: { formData: FormData; editingId: string | null }) => {
      const payload = {
        ...params.formData,
        max_days_per_year: params.formData.max_days_per_year ? parseInt(params.formData.max_days_per_year) : null,
        min_notice_days: parseInt(params.formData.min_notice_days) || 1,
      }

      if (params.editingId) {
        const response = await fetch('/api/staff/time-off/types', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: params.editingId, ...payload }),
        })
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Error al actualizar')
        }
        return response.json()
      } else {
        const response = await fetch('/api/staff/time-off/types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Error al crear')
        }
        return response.json()
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-off-types', clinic] })
      setShowForm(false)
      setEditingId(null)
      setFormData(DEFAULT_FORM)
      setFormError(null)
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : 'Error al guardar')
    },
  })

  // Mutation: Delete type
  const deleteMutation = useMutation({
    mutationFn: async (typeId: string) => {
      const response = await fetch(`/api/staff/time-off/types?id=${typeId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al eliminar')
      }
      return response.json()
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['time-off-types', clinic] })
      showToast({ title: result.message, variant: 'success' })
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : 'Error al eliminar')
    },
  })

  // Mutation: Toggle active
  const toggleMutation = useMutation({
    mutationFn: async (params: { typeId: string; isActive: boolean }) => {
      const response = await fetch('/api/staff/time-off/types', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: params.typeId, is_active: params.isActive }),
      })
      if (!response.ok) throw new Error('Error al actualizar')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-off-types', clinic] })
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : 'Error al actualizar')
    },
  })

  const error = queryError?.message || formError
  const saving = saveMutation.isPending

  const handleSubmit = async (): Promise<void> => {
    if (!formData.code.trim() || !formData.name.trim()) {
      setFormError('Código y nombre son requeridos')
      return
    }
    setFormError(null)
    await saveMutation.mutateAsync({ formData, editingId })
  }

  const handleEdit = (type: TimeOffType): void => {
    if (type.tenant_id === null) {
      setFormError('No puedes editar tipos globales del sistema')
      return
    }
    setEditingId(type.id)
    setFormData({
      code: type.code,
      name: type.name,
      description: type.description || '',
      is_paid: type.is_paid,
      requires_approval: type.requires_approval,
      max_days_per_year: type.max_days_per_year?.toString() || '',
      min_notice_days: type.min_notice_days.toString(),
      color_code: type.color_code,
    })
    setShowForm(true)
  }

  const handleDelete = async (type: TimeOffType): Promise<void> => {
    if (type.tenant_id === null) {
      setFormError('No puedes eliminar tipos globales del sistema')
      return
    }
    if (!confirm(`¿Eliminar el tipo "${type.name}"?`)) return
    await deleteMutation.mutateAsync(type.id)
  }

  const handleToggleActive = async (type: TimeOffType): Promise<void> => {
    if (type.tenant_id === null) return
    await toggleMutation.mutateAsync({ typeId: type.id, isActive: !type.is_active })
  }

  const globalTypes = types.filter((t) => t.tenant_id === null)
  const customTypes = types.filter((t) => t.tenant_id !== null)

  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Tipos de Ausencia</h1>
          <p className="text-[var(--text-secondary)]">
            Administrar tipos de ausencias y permisos del personal
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(true)
            setEditingId(null)
            setFormData(DEFAULT_FORM)
          }}
          className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-white transition-opacity hover:opacity-90"
        >
          <Plus className="h-5 w-5" />
          Nuevo Tipo
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
          <p className="text-red-700">{error}</p>
          <button onClick={() => setFormError(null)} className="ml-auto">
            <X className="h-5 w-5 text-red-600" />
          </button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="border-b p-6">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                {editingId ? 'Editar Tipo de Ausencia' : 'Nuevo Tipo de Ausencia'}
              </h2>
            </div>

            <div className="space-y-4 p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                    Código *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    placeholder="EJ: COMP_OFF"
                    disabled={!!editingId}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-default)] px-3 py-2 disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Compensatorio"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-default)] px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción opcional del tipo de ausencia..."
                  rows={2}
                  className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--bg-default)] px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                    Máximo días/año
                  </label>
                  <input
                    type="number"
                    value={formData.max_days_per_year}
                    onChange={(e) =>
                      setFormData({ ...formData, max_days_per_year: e.target.value })
                    }
                    placeholder="Sin límite"
                    min="1"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-default)] px-3 py-2"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                    Aviso previo (días)
                  </label>
                  <input
                    type="number"
                    value={formData.min_notice_days}
                    onChange={(e) => setFormData({ ...formData, min_notice_days: e.target.value })}
                    min="0"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-default)] px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                  Color
                </label>
                <div className="flex gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setFormData({ ...formData, color_code: color })}
                      className={`h-8 w-8 rounded-full transition-transform ${
                        formData.color_code === color
                          ? 'scale-110 ring-2 ring-gray-400 ring-offset-2'
                          : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-6">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_paid}
                    onChange={(e) => setFormData({ ...formData, is_paid: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-[var(--text-primary)]">Con goce de sueldo</span>
                </label>

                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.requires_approval}
                    onChange={(e) =>
                      setFormData({ ...formData, requires_approval: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-[var(--text-primary)]">Requiere aprobación</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t p-6">
              <button
                onClick={() => {
                  setShowForm(false)
                  setEditingId(null)
                  setFormData(DEFAULT_FORM)
                  setFormError(null)
                }}
                className="rounded-lg px-4 py-2 text-[var(--text-secondary)] hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="rounded-lg bg-[var(--primary)] px-4 py-2 text-white hover:opacity-90 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Crear Tipo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="py-12 text-center">
          <p className="text-[var(--text-secondary)]">Cargando...</p>
        </div>
      ) : (
        <>
          {/* Global Types */}
          <div className="mb-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)]">
              <Globe className="h-5 w-5 text-[var(--text-secondary)]" />
              Tipos del Sistema
            </h2>
            <p className="mb-4 text-sm text-[var(--text-secondary)]">
              Estos tipos están disponibles para todas las clínicas y no se pueden modificar.
            </p>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="divide-y divide-gray-100">
                {globalTypes.map((type) => (
                  <div key={type.id} className="flex items-center gap-4 p-4">
                    <div
                      className="h-4 w-4 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: type.color_code }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--text-primary)]">{type.name}</span>
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-[var(--text-tertiary)]">
                          {type.code}
                        </span>
                      </div>
                      {type.description && (
                        <p className="truncate text-sm text-[var(--text-secondary)]">
                          {type.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
                      {type.is_paid && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          Pagado
                        </span>
                      )}
                      {type.max_days_per_year && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {type.max_days_per_year} días/año
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Custom Types */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
              Tipos Personalizados
            </h2>
            <p className="mb-4 text-sm text-[var(--text-secondary)]">
              Tipos de ausencia específicos para tu clínica.
            </p>

            {customTypes.length === 0 ? (
              <div className="rounded-xl bg-[var(--bg-secondary)] p-8 text-center">
                <Clock className="mx-auto mb-4 h-12 w-12 text-[var(--text-tertiary)]" />
                <p className="text-[var(--text-secondary)]">
                  No has creado tipos personalizados aún
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-4 font-medium text-[var(--primary)] hover:underline"
                >
                  Crear el primero
                </button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <div className="divide-y divide-gray-100">
                  {customTypes.map((type) => (
                    <div
                      key={type.id}
                      className={`flex items-center gap-4 p-4 ${!type.is_active ? 'opacity-50' : ''}`}
                    >
                      <div
                        className="h-4 w-4 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: type.color_code }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[var(--text-primary)]">
                            {type.name}
                          </span>
                          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-[var(--text-tertiary)]">
                            {type.code}
                          </span>
                          {!type.is_active && (
                            <span className="rounded bg-red-50 px-2 py-0.5 text-xs text-red-600">
                              Inactivo
                            </span>
                          )}
                        </div>
                        {type.description && (
                          <p className="truncate text-sm text-[var(--text-secondary)]">
                            {type.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
                        {type.is_paid && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            Pagado
                          </span>
                        )}
                        {type.max_days_per_year && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {type.max_days_per_year} días/año
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleActive(type)}
                          className={`rounded-lg p-2 transition-colors ${
                            type.is_active
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-gray-400 hover:bg-gray-100'
                          }`}
                          title={type.is_active ? 'Desactivar' : 'Activar'}
                        >
                          {type.is_active ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleEdit(type)}
                          className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-gray-100"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(type)}
                          className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
