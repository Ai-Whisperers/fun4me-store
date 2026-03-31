'use client'

/**
 * Template Form Modal Component
 *
 * Unified modal for creating and editing consent templates.
 */

import { useState } from 'react'
import { X, Save, Plus, XCircle } from 'lucide-react'
import type { ConsentTemplate, NewTemplateData, TemplateField } from './types'
import { CATEGORIES, DEFAULT_NEW_TEMPLATE } from './types'
import { TemplateFieldEditor } from './TemplateFieldEditor'

interface TemplateFormModalProps {
  mode: 'create' | 'edit'
  template?: ConsentTemplate
  saving: boolean
  onSave: (data: ConsentTemplate | NewTemplateData) => Promise<boolean>
  onClose: () => void
}

export function TemplateFormModal({
  mode,
  template,
  saving,
  onSave,
  onClose,
}: TemplateFormModalProps): React.ReactElement {
  const initialData: NewTemplateData =
    mode === 'edit' && template
      ? {
          name: template.name,
          category: template.category,
          content: template.content,
          requires_witness: template.requires_witness,
          requires_id_verification: template.requires_id_verification,
          can_be_revoked: template.can_be_revoked,
          default_expiry_days: template.default_expiry_days,
          fields: template.fields || [],
        }
      : DEFAULT_NEW_TEMPLATE

  const [formData, setFormData] = useState<NewTemplateData>(initialData)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!formData.name || !formData.category || !formData.content) {
      setError('Nombre, categoría y contenido son requeridos')
      return
    }

    setError(null)

    const dataToSave =
      mode === 'edit' && template
        ? { ...template, ...formData }
        : formData

    const success = await onSave(dataToSave)
    if (success) {
      onClose()
    }
  }

  const handleFieldsChange = (fields: TemplateField[]) => {
    setFormData({ ...formData, fields })
  }

  const title = mode === 'edit' ? 'Editar Plantilla' : 'Nueva Plantilla'
  const submitLabel = mode === 'edit' ? 'Guardar Cambios' : 'Crear Plantilla'
  const loadingLabel = mode === 'edit' ? 'Guardando...' : 'Creando...'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-5xl rounded-lg bg-[var(--bg-paper)]">
        {/* Header */}
        <div className="border-[var(--primary)]/20 sticky top-0 rounded-t-lg border-b bg-[var(--bg-paper)] p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">{title}</h2>
            <button
              onClick={onClose}
              disabled={saving}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="max-h-[calc(90vh-200px)] space-y-6 overflow-y-auto p-6">
          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
              <XCircle className="h-5 w-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Información Básica</h3>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                Nombre de la plantilla *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="border-[var(--primary)]/20 w-full rounded-lg border bg-[var(--bg-default)] px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="Ej: Consentimiento de Cirugía General"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                Categoría *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="border-[var(--primary)]/20 w-full rounded-lg border bg-[var(--bg-default)] px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                Contenido de la plantilla *
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={10}
                className="border-[var(--primary)]/20 w-full rounded-lg border bg-[var(--bg-default)] px-4 py-2 font-mono text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="Contenido HTML del consentimiento..."
              />
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Usa etiquetas HTML y variables como {`{{field_name}}`} para campos personalizados
              </p>
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Configuración</h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.requires_witness}
                  onChange={(e) =>
                    setFormData({ ...formData, requires_witness: e.target.checked })
                  }
                  className="h-4 w-4 rounded text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <span className="text-sm text-[var(--text-primary)]">Requiere testigo</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.requires_id_verification}
                  onChange={(e) =>
                    setFormData({ ...formData, requires_id_verification: e.target.checked })
                  }
                  className="h-4 w-4 rounded text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <span className="text-sm text-[var(--text-primary)]">
                  Requiere verificación de ID
                </span>
              </label>

              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.can_be_revoked}
                  onChange={(e) =>
                    setFormData({ ...formData, can_be_revoked: e.target.checked })
                  }
                  className="h-4 w-4 rounded text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <span className="text-sm text-[var(--text-primary)]">Puede ser revocado</span>
              </label>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                  Días de expiración
                </label>
                <input
                  type="number"
                  value={formData.default_expiry_days || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      default_expiry_days: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  className="border-[var(--primary)]/20 w-full rounded-lg border bg-[var(--bg-default)] px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  placeholder="Dejar vacío para sin expiración"
                  min="1"
                />
              </div>
            </div>
          </div>

          {/* Custom Fields */}
          <TemplateFieldEditor fields={formData.fields} onFieldsChange={handleFieldsChange} />
        </div>

        {/* Footer */}
        <div className="border-[var(--primary)]/20 sticky bottom-0 rounded-b-lg border-t bg-[var(--bg-paper)] p-6">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="hover:bg-[var(--primary)]/10 rounded-lg bg-[var(--bg-default)] px-6 py-2 text-[var(--text-primary)] transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !formData.name || !formData.category || !formData.content}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-2 text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                  {loadingLabel}
                </>
              ) : (
                <>
                  {mode === 'edit' ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {submitLabel}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
