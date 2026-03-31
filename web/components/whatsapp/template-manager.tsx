'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import * as Icons from 'lucide-react'
import {
  templateCategoryConfig,
  type WhatsAppTemplate,
  type TemplateCategory,
} from '@/lib/types/whatsapp'
import { createTemplate, updateTemplate, deleteTemplate } from '@/app/actions/whatsapp'
import { useToast } from '@/components/ui/Toast'

interface TemplateManagerProps {
  templates: WhatsAppTemplate[]
  clinic: string
}

interface TemplateFormData {
  name: string
  category: TemplateCategory
  content: string
  variables: string[]
}

const emptyForm: TemplateFormData = {
  name: '',
  category: 'general',
  content: '',
  variables: [],
}

export function TemplateManager({ templates, clinic: _clinic }: TemplateManagerProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<TemplateFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const extractVariables = (content: string): string[] => {
    const matches = content.match(/\{\{(\w+)\}\}/g) || []
    return [...new Set(matches.map((m) => m.replace(/[{}]/g, '')))]
  }

  const handleContentChange = (content: string) => {
    setForm({
      ...form,
      content,
      variables: extractVariables(content),
    })
  }

  const handleEdit = (template: WhatsAppTemplate) => {
    setEditingId(template.id)
    setForm({
      name: template.name,
      category: template.category || 'general',
      content: template.content,
      variables: template.variables,
    })
    setShowForm(true)
    setError(null)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.content.trim()) return

    setSaving(true)
    setError(null)

    const formData = new FormData()
    formData.append('name', form.name)
    formData.append('category', form.category)
    formData.append('content', form.content)
    formData.append('variables', JSON.stringify(form.variables))

    let result
    if (editingId) {
      result = await updateTemplate(editingId, formData)
    } else {
      result = await createTemplate(formData)
    }

    setSaving(false)

    if (result.success) {
      handleCancel()
      router.refresh()
    } else {
      setError(result.error || 'Error al guardar')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta plantilla?')) return

    setDeleting(id)
    const result = await deleteTemplate(id)
    setDeleting(null)

    if (result.success) {
      router.refresh()
    } else {
      showToast({ title: result.error || 'Error al eliminar', variant: 'error' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Add button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-white hover:opacity-90"
        >
          <Icons.Plus className="h-4 w-4" />
          Nueva Plantilla
        </button>
      )}

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-gray-100 bg-white p-6">
          <h2 className="mb-4 text-lg font-bold text-[var(--text-primary)]">
            {editingId ? 'Editar Plantilla' : 'Nueva Plantilla'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)]">Nombre</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej: Recordatorio de cita"
                className="focus:ring-[var(--primary)]/50 mt-1 w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2"
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)]">Categoría</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as TemplateCategory })}
                className="focus:ring-[var(--primary)]/50 mt-1 w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2"
              >
                {Object.entries(templateCategoryConfig).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Content */}
            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)]">Contenido</label>
              <textarea
                value={form.content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Usa {{variable}} para variables dinámicas"
                rows={5}
                className="focus:ring-[var(--primary)]/50 mt-1 w-full resize-none rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2"
                required
              />
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Variables disponibles: {'{{'} cliente {'}}'}, {'{{'} mascota {'}}'}, {'{{'} fecha{' '}
                {'}}'}, {'{{'} hora {'}}'}
              </p>
            </div>

            {/* Detected variables */}
            {form.variables.length > 0 && (
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">
                  Variables detectadas
                </label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {form.variables.map((v) => (
                    <span key={v} className="rounded bg-blue-100 px-2 py-1 text-sm text-blue-700">
                      {'{{'}
                      {v}
                      {'}}'}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600"
              >
                <Icons.AlertCircle className="h-4 w-4" aria-hidden="true" />
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-[var(--text-secondary)] hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] py-2 text-white hover:opacity-90 disabled:opacity-50"
              >
                {saving && <Icons.Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? 'Guardar Cambios' : 'Crear Plantilla'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Template list */}
      <div className="space-y-4">
        {templates.length === 0 && !showForm ? (
          <div className="rounded-xl border border-gray-100 bg-white p-12 text-center">
            <Icons.FileText className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <h3 className="mb-2 text-lg font-bold text-[var(--text-primary)]">No hay plantillas</h3>
            <p className="text-[var(--text-secondary)]">
              Crea tu primera plantilla para enviar mensajes rápidamente
            </p>
          </div>
        ) : (
          templates.map((template) => {
            const categoryConfig = template.category
              ? templateCategoryConfig[template.category]
              : templateCategoryConfig.general

            return (
              <div key={template.id} className="rounded-xl border border-gray-100 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <span className={categoryConfig.color}>
                        {categoryConfig.icon === 'Calendar' && (
                          <Icons.Calendar className="h-4 w-4" />
                        )}
                        {categoryConfig.icon === 'Syringe' && <Icons.Syringe className="h-4 w-4" />}
                        {categoryConfig.icon === 'MessageCircle' && (
                          <Icons.MessageCircle className="h-4 w-4" />
                        )}
                        {categoryConfig.icon === 'Megaphone' && (
                          <Icons.Megaphone className="h-4 w-4" />
                        )}
                        {categoryConfig.icon === 'RefreshCw' && (
                          <Icons.RefreshCw className="h-4 w-4" />
                        )}
                      </span>
                      <h3 className="font-medium text-[var(--text-primary)]">{template.name}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          template.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {template.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>

                    <p className="whitespace-pre-wrap text-sm text-[var(--text-secondary)]">
                      {template.content}
                    </p>

                    {template.variables.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {template.variables.map((v) => (
                          <span
                            key={v}
                            className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
                          >
                            {v}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(template)}
                      className="rounded-lg p-2 hover:bg-gray-100"
                      title="Editar"
                    >
                      <Icons.Edit className="h-4 w-4 text-[var(--text-secondary)]" />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      disabled={deleting === template.id}
                      className="rounded-lg p-2 hover:bg-red-50"
                      title="Eliminar"
                    >
                      {deleting === template.id ? (
                        <Icons.Loader2 className="h-4 w-4 animate-spin text-red-500" />
                      ) : (
                        <Icons.Trash2 className="h-4 w-4 text-red-500" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
