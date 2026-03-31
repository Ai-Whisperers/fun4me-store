'use client'

/**
 * Template Card Component
 *
 * Individual template card in the grid.
 */

import { FileText, Eye, Edit, Globe, Building, CheckCircle } from 'lucide-react'
import type { ConsentTemplate } from './types'
import { CATEGORY_LABELS } from './types'

interface TemplateCardProps {
  template: ConsentTemplate
  onPreview: () => void
  onEdit: () => void
}

export function TemplateCard({
  template,
  onPreview,
  onEdit,
}: TemplateCardProps): React.ReactElement {
  return (
    <div className="border-[var(--primary)]/20 rounded-lg border bg-[var(--bg-paper)] p-6 transition-shadow hover:shadow-lg">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-[var(--primary)]" />
          <h3 className="font-semibold text-[var(--text-primary)]">{template.name}</h3>
        </div>
        {template.tenant_id ? (
          <Building className="h-4 w-4 text-[var(--text-secondary)]" />
        ) : (
          <Globe className="h-4 w-4 text-[var(--text-secondary)]" />
        )}
      </div>

      <div className="mb-4 space-y-2">
        <div className="bg-[var(--primary)]/10 inline-block rounded px-2 py-1 text-xs font-medium text-[var(--primary)]">
          {CATEGORY_LABELS[template.category] || template.category}
        </div>

        <div className="space-y-1 text-sm text-[var(--text-secondary)]">
          {template.requires_witness && (
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              <span>Requiere testigo</span>
            </div>
          )}
          {template.requires_id_verification && (
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              <span>Requiere ID</span>
            </div>
          )}
          {template.default_expiry_days && (
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              <span>Expira en {template.default_expiry_days} días</span>
            </div>
          )}
        </div>

        {template.fields && template.fields.length > 0 && (
          <div className="text-xs text-[var(--text-secondary)]">
            {template.fields.length} campo{template.fields.length !== 1 ? 's' : ''} personalizado
            {template.fields.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onPreview}
          className="hover:bg-[var(--primary)]/10 border-[var(--primary)]/20 inline-flex flex-1 items-center justify-center gap-2 rounded-lg border bg-[var(--bg-default)] px-3 py-2 text-[var(--text-primary)] transition-colors"
        >
          <Eye className="h-4 w-4" />
          Vista previa
        </button>
        {template.tenant_id && (
          <button
            onClick={onEdit}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-3 py-2 text-white transition-opacity hover:opacity-90"
          >
            <Edit className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
