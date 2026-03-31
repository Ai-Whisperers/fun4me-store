'use client'

/**
 * Templates Client Component
 *
 * Main orchestrator for the consent templates page.
 */

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useConsentTemplates } from './hooks'
import { TemplateList } from './TemplateList'
import { TemplateFormModal } from './TemplateFormModal'
import { TemplatePreviewModal } from './TemplatePreviewModal'
import { FeedbackNotification } from './FeedbackNotification'
import type { ConsentTemplate, NewTemplateData } from './types'

export function TemplatesClient(): React.ReactElement {
  const {
    templates,
    loading,
    saving,
    feedback,
    fetchTemplates,
    saveTemplate,
    createTemplate,
    clearFeedback,
  } = useConsentTemplates()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ConsentTemplate | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<ConsentTemplate | null>(null)

  const handleSave = async (data: ConsentTemplate | NewTemplateData): Promise<boolean> => {
    if ('id' in data) {
      const success = await saveTemplate(data as ConsentTemplate)
      if (success) {
        await fetchTemplates()
      }
      return success
    } else {
      const success = await createTemplate(data)
      if (success) {
        await fetchTemplates()
      }
      return success
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-[var(--primary)]"></div>
            <p className="mt-4 text-[var(--text-secondary)]">Cargando plantillas...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Feedback Notification */}
      {feedback && <FeedbackNotification feedback={feedback} onDismiss={clearFeedback} />}

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] md:text-3xl">
              Plantillas de Consentimiento
            </h1>
            <p className="mt-1 text-[var(--text-secondary)]">
              Administra plantillas de consentimientos informados
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-white transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Nueva Plantilla
          </button>
        </div>
      </div>

      {/* Templates Grid */}
      <TemplateList
        templates={templates}
        onPreview={setPreviewTemplate}
        onEdit={setEditingTemplate}
        onCreateNew={() => setShowCreateModal(true)}
      />

      {/* Edit Modal */}
      {editingTemplate && (
        <TemplateFormModal
          mode="edit"
          template={editingTemplate}
          saving={saving}
          onSave={handleSave}
          onClose={() => setEditingTemplate(null)}
        />
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
        />
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <TemplateFormModal
          mode="create"
          saving={saving}
          onSave={handleSave}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  )
}
