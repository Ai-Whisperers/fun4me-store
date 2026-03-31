'use client'

/**
 * Template List Component
 *
 * Grid of template cards with empty state.
 */

import { FileText, Plus } from 'lucide-react'
import type { ConsentTemplate } from './types'
import { TemplateCard } from './TemplateCard'

interface TemplateListProps {
  templates: ConsentTemplate[]
  onPreview: (template: ConsentTemplate) => void
  onEdit: (template: ConsentTemplate) => void
  onCreateNew: () => void
}

export function TemplateList({
  templates,
  onPreview,
  onEdit,
  onCreateNew,
}: TemplateListProps): React.ReactElement {
  if (templates.length === 0) {
    return (
      <div className="border-[var(--primary)]/20 rounded-lg border bg-[var(--bg-paper)] p-12 text-center">
        <FileText className="mx-auto mb-4 h-12 w-12 text-[var(--text-secondary)]" />
        <p className="text-[var(--text-secondary)]">No hay plantillas disponibles</p>
        <button
          onClick={onCreateNew}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-white transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Crear primera plantilla
        </button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          onPreview={() => onPreview(template)}
          onEdit={() => onEdit(template)}
        />
      ))}
    </div>
  )
}
