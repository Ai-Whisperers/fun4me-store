'use client'

/**
 * Template Field Editor Component
 *
 * Manages custom fields for consent templates.
 */

import { Plus, Trash2 } from 'lucide-react'
import type { TemplateField } from './types'
import { FIELD_TYPES } from './types'

interface TemplateFieldEditorProps {
  fields: TemplateField[]
  onFieldsChange: (fields: TemplateField[]) => void
}

export function TemplateFieldEditor({
  fields,
  onFieldsChange,
}: TemplateFieldEditorProps): React.ReactElement {
  const handleAddField = () => {
    const newField: TemplateField = {
      id: `new-${Date.now()}`,
      field_name: '',
      field_type: 'text',
      field_label: '',
      is_required: false,
      field_options: null,
      display_order: fields.length,
    }
    onFieldsChange([...fields, newField])
  }

  const handleDeleteField = (index: number) => {
    onFieldsChange(fields.filter((_, i) => i !== index))
  }

  const handleFieldChange = (index: number, updates: Partial<TemplateField>) => {
    const newFields = [...fields]
    newFields[index] = { ...newFields[index], ...updates }
    onFieldsChange(newFields)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Campos Personalizados</h3>
        <button
          onClick={handleAddField}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-3 py-1 text-sm text-white transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Agregar Campo
        </button>
      </div>

      {fields.length > 0 ? (
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="border-[var(--primary)]/20 rounded-lg border bg-[var(--bg-default)] p-4"
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                    Nombre del campo (variable)
                  </label>
                  <input
                    type="text"
                    value={field.field_name}
                    onChange={(e) => handleFieldChange(index, { field_name: e.target.value })}
                    className="border-[var(--primary)]/20 w-full rounded border bg-[var(--bg-paper)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                    placeholder="nombre_campo"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                    Etiqueta
                  </label>
                  <input
                    type="text"
                    value={field.field_label}
                    onChange={(e) => handleFieldChange(index, { field_label: e.target.value })}
                    className="border-[var(--primary)]/20 w-full rounded border bg-[var(--bg-paper)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                    placeholder="Etiqueta visible"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                    Tipo de campo
                  </label>
                  <select
                    value={field.field_type}
                    onChange={(e) => handleFieldChange(index, { field_type: e.target.value })}
                    className="border-[var(--primary)]/20 w-full rounded border bg-[var(--bg-paper)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  >
                    {FIELD_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end gap-2">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={field.is_required}
                      onChange={(e) => handleFieldChange(index, { is_required: e.target.checked })}
                      className="h-4 w-4 rounded text-[var(--primary)] focus:ring-[var(--primary)]"
                    />
                    <span className="text-xs text-[var(--text-primary)]">Requerido</span>
                  </label>

                  <button
                    onClick={() => handleDeleteField(index)}
                    className="ml-auto rounded p-2 text-red-600 transition-colors hover:bg-red-50"
                    title="Eliminar campo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-4 text-center text-sm text-[var(--text-secondary)]">
          No hay campos personalizados. Haz clic en &quot;Agregar Campo&quot; para crear uno.
        </p>
      )}
    </div>
  )
}
