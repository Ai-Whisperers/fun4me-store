'use client'

import { useState } from 'react'
import { Save, Send, Loader2 } from 'lucide-react'
import type { PrivacyPolicy, CreatePrivacyPolicyInput, UpdatePrivacyPolicyInput } from '@/lib/privacy'
import { isValidVersion, incrementVersion } from '@/lib/privacy'

interface PolicyEditorProps {
  /** Existing policy to edit (null for new) */
  policy?: PrivacyPolicy | null
  /** Previous version for auto-increment */
  previousVersion?: string
  /** Callback after save */
  onSave: (policy: PrivacyPolicy) => void
  /** Callback on cancel */
  onCancel: () => void
}

/**
 * Privacy Policy Editor
 *
 * COMP-002: Admin component for creating and editing privacy policies.
 */
export function PolicyEditor({
  policy,
  previousVersion,
  onSave,
  onCancel,
}: PolicyEditorProps) {
  const isEditing = !!policy

  // Form state
  const [version, setVersion] = useState(
    policy?.version || (previousVersion ? incrementVersion(previousVersion) : '1.0')
  )
  const [effectiveDate, setEffectiveDate] = useState(
    policy?.effectiveDate || new Date().toISOString().split('T')[0]
  )
  const [contentEs, setContentEs] = useState(policy?.contentEs || '')
  const [contentEn, setContentEn] = useState(policy?.contentEn || '')
  const [changeSummary, setChangeSummary] = useState<string[]>(
    policy?.changeSummary || []
  )
  const [newChange, setNewChange] = useState('')
  const [requiresReacceptance, setRequiresReacceptance] = useState(
    policy?.requiresReacceptance || false
  )

  // UI state
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'es' | 'en'>('es')

  const addChange = () => {
    if (newChange.trim()) {
      setChangeSummary([...changeSummary, newChange.trim()])
      setNewChange('')
    }
  }

  const removeChange = (index: number) => {
    setChangeSummary(changeSummary.filter((_, i) => i !== index))
  }

  const validate = (): string | null => {
    if (!isValidVersion(version)) {
      return 'Formato de versión inválido. Use formato semántico (ej: 1.0, 2.1.3)'
    }
    if (!effectiveDate) {
      return 'La fecha de vigencia es requerida'
    }
    if (!contentEs.trim()) {
      return 'El contenido en español es requerido'
    }
    return null
  }

  const handleSave = async () => {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const url = isEditing ? `/api/privacy/${policy.id}` : '/api/privacy'
      const method = isEditing ? 'PATCH' : 'POST'

      const body: CreatePrivacyPolicyInput | UpdatePrivacyPolicyInput = {
        version,
        effectiveDate,
        contentEs,
        contentEn: contentEn || undefined,
        changeSummary,
        requiresReacceptance,
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.details?.message || 'Error al guardar')
      }

      const savedPolicy = await response.json()
      onSave(savedPolicy)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!isEditing) return

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsPublishing(true)
    setError(null)

    try {
      // First save any changes
      await handleSave()

      // Then publish
      const response = await fetch(`/api/privacy/${policy.id}/publish`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.details?.message || 'Error al publicar')
      }

      const publishedPolicy = await response.json()
      onSave(publishedPolicy)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">
          {isEditing ? 'Editar Política' : 'Nueva Política de Privacidad'}
        </h2>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
          Borrador
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Version and Date */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
            Versión
          </label>
          <input
            type="text"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="1.0"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-default)] px-4 py-3 text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Formato semántico: 1.0, 2.1.3, etc.
          </p>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
            Fecha de Vigencia
          </label>
          <input
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-default)] px-4 py-3 text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
        </div>
      </div>

      {/* Content Tabs */}
      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
          Contenido
        </label>
        <div className="mb-2 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('es')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'es'
                ? 'bg-[var(--primary)] text-white'
                : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]'
            }`}
          >
            Español *
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('en')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'en'
                ? 'bg-[var(--primary)] text-white'
                : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]'
            }`}
          >
            Inglés (opcional)
          </button>
        </div>
        <textarea
          value={activeTab === 'es' ? contentEs : contentEn}
          onChange={(e) =>
            activeTab === 'es' ? setContentEs(e.target.value) : setContentEn(e.target.value)
          }
          rows={12}
          placeholder={
            activeTab === 'es'
              ? 'Escribe el contenido de la política en español...'
              : 'Write the policy content in English...'
          }
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-default)] px-4 py-3 text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
        />
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Puedes usar HTML para formato (negrita, listas, enlaces, etc.)
        </p>
      </div>

      {/* Change Summary */}
      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
          Resumen de Cambios
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newChange}
            onChange={(e) => setNewChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addChange())}
            placeholder="Describe un cambio..."
            className="flex-grow rounded-xl border border-[var(--border)] bg-[var(--bg-default)] px-4 py-3 text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
          <button
            type="button"
            onClick={addChange}
            className="rounded-xl bg-[var(--bg-subtle)] px-4 py-3 font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)]"
          >
            Agregar
          </button>
        </div>
        {changeSummary.length > 0 && (
          <ul className="mt-3 space-y-2">
            {changeSummary.map((change, index) => (
              <li
                key={index}
                className="flex items-center justify-between rounded-lg bg-[var(--bg-subtle)] px-4 py-2"
              >
                <span className="text-sm text-[var(--text-secondary)]">{change}</span>
                <button
                  type="button"
                  onClick={() => removeChange(index)}
                  className="ml-2 text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Re-acceptance requirement */}
      <label className="flex cursor-pointer items-center gap-3 rounded-xl p-4 transition-colors hover:bg-[var(--bg-subtle)]">
        <input
          type="checkbox"
          checked={requiresReacceptance}
          onChange={(e) => setRequiresReacceptance(e.target.checked)}
          className="h-5 w-5 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
        />
        <div>
          <span className="font-medium text-[var(--text-primary)]">
            Requiere re-aceptación
          </span>
          <p className="text-sm text-[var(--text-muted)]">
            Los usuarios existentes deberán aceptar esta versión
          </p>
        </div>
      </label>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-[var(--border-light)] pt-6">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving || isPublishing}
          className="rounded-xl px-4 py-2 font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-subtle)] disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || isPublishing}
          className="flex items-center gap-2 rounded-xl bg-[var(--bg-subtle)] px-4 py-2 font-bold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-muted)] disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Guardar Borrador
        </button>
        {isEditing && (
          <button
            type="button"
            onClick={handlePublish}
            disabled={isSaving || isPublishing}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-2 font-bold text-white transition-all hover:brightness-110 disabled:opacity-50"
          >
            {isPublishing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Publicar
          </button>
        )}
      </div>
    </div>
  )
}
