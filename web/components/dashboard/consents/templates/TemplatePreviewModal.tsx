'use client'

/**
 * Template Preview Modal Component
 *
 * Displays a read-only preview of a consent template.
 */

import { XCircle, CheckCircle, Globe, Building } from 'lucide-react'
import { createSanitizedHtml } from '@/lib/utils'
import type { ConsentTemplate } from './types'
import { CATEGORY_LABELS } from './types'

interface TemplatePreviewModalProps {
  template: ConsentTemplate
  onClose: () => void
}

export function TemplatePreviewModal({
  template,
  onClose,
}: TemplatePreviewModalProps): React.ReactElement {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-[var(--bg-paper)]">
        <div className="border-[var(--primary)]/20 sticky top-0 border-b bg-[var(--bg-paper)] p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">{template.name}</h2>
            <button
              onClick={onClose}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>
          <div className="mt-2 flex items-center gap-4">
            <span className="text-sm text-[var(--text-secondary)]">
              Categoría: {CATEGORY_LABELS[template.category] || template.category}
            </span>
            {template.tenant_id ? (
              <span className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)]">
                <Building className="h-4 w-4" />
                Plantilla de clínica
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)]">
                <Globe className="h-4 w-4" />
                Plantilla global
              </span>
            )}
          </div>
        </div>

        <div className="space-y-6 p-6">
          {/* Template Properties */}
          <div className="grid grid-cols-2 gap-4 rounded-lg bg-[var(--bg-default)] p-4">
            <div className="flex items-center gap-2">
              {template.requires_witness ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-gray-400" />
              )}
              <span className="text-sm text-[var(--text-primary)]">Requiere testigo</span>
            </div>
            <div className="flex items-center gap-2">
              {template.requires_id_verification ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-gray-400" />
              )}
              <span className="text-sm text-[var(--text-primary)]">Requiere verificación ID</span>
            </div>
            <div className="flex items-center gap-2">
              {template.can_be_revoked ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-gray-400" />
              )}
              <span className="text-sm text-[var(--text-primary)]">Puede ser revocado</span>
            </div>
            <div className="text-sm text-[var(--text-primary)]">
              Expiración:{' '}
              {template.default_expiry_days
                ? `${template.default_expiry_days} días`
                : 'Sin expiración'}
            </div>
          </div>

          {/* Custom Fields */}
          {template.fields && template.fields.length > 0 && (
            <div>
              <h3 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">
                Campos personalizados
              </h3>
              <div className="space-y-2">
                {template.fields.map((field) => (
                  <div
                    key={field.id}
                    className="flex items-center justify-between rounded-lg bg-[var(--bg-default)] p-3"
                  >
                    <div>
                      <span className="font-medium text-[var(--text-primary)]">
                        {field.field_label}
                      </span>
                      <span className="ml-2 text-xs text-[var(--text-secondary)]">
                        ({field.field_type})
                      </span>
                      {field.is_required && (
                        <span className="ml-2 text-xs text-red-600">*requerido</span>
                      )}
                    </div>
                    <code className="bg-[var(--primary)]/10 rounded px-2 py-1 text-xs text-[var(--primary)]">
                      {`{{${field.field_name}}}`}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content Preview */}
          <div>
            <h3 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">
              Contenido de la plantilla
            </h3>
            <div
              className="prose max-w-none rounded-lg bg-[var(--bg-default)] p-4 text-[var(--text-primary)]"
              dangerouslySetInnerHTML={createSanitizedHtml(template.content, 'consent')}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
