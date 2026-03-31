'use client'

import { useState } from 'react'
import { FileText, Eye, Edit, Archive, BarChart3, Loader2, ChevronRight } from 'lucide-react'
import type { PrivacyPolicy } from '@/lib/privacy'

interface PolicyListProps {
  /** List of policies */
  policies: PrivacyPolicy[]
  /** Callback when viewing a policy */
  onView: (policy: PrivacyPolicy) => void
  /** Callback when editing a policy */
  onEdit: (policy: PrivacyPolicy) => void
  /** Callback when viewing stats */
  onStats: (policy: PrivacyPolicy) => void
  /** Callback when archiving a policy */
  onArchive: (policy: PrivacyPolicy) => void
  /** Whether the list is loading */
  isLoading?: boolean
}

/**
 * Privacy Policy List
 *
 * COMP-002: Admin component showing all privacy policies.
 */
export function PolicyList({
  policies,
  onView,
  onEdit,
  onStats,
  onArchive,
  isLoading = false,
}: PolicyListProps) {
  const [archivingId, setArchivingId] = useState<string | null>(null)

  const handleArchive = async (policy: PrivacyPolicy) => {
    if (policy.status !== 'published') return

    setArchivingId(policy.id)
    try {
      await onArchive(policy)
    } finally {
      setArchivingId(null)
    }
  }

  const getStatusBadge = (status: PrivacyPolicy['status']) => {
    switch (status) {
      case 'draft':
        return (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
            Borrador
          </span>
        )
      case 'published':
        return (
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
            Publicada
          </span>
        )
      case 'archived':
        return (
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
            Archivada
          </span>
        )
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  if (policies.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--border)] p-8 text-center">
        <FileText className="mb-3 h-12 w-12 text-[var(--text-muted)]" />
        <h3 className="font-bold text-[var(--text-primary)]">
          No hay políticas de privacidad
        </h3>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Crea tu primera política para comenzar
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {policies.map((policy) => (
        <div
          key={policy.id}
          className="group rounded-xl border border-[var(--border)] bg-[var(--bg-paper)] p-4 transition-shadow hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-[var(--primary)]/10 p-2">
                <FileText className="h-5 w-5 text-[var(--primary)]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-[var(--text-primary)]">
                    Versión {policy.version}
                  </h3>
                  {getStatusBadge(policy.status)}
                </div>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Vigente desde: {new Date(policy.effectiveDate).toLocaleDateString('es-PY')}
                </p>
                {policy.publishedAt && (
                  <p className="text-xs text-[var(--text-muted)]">
                    Publicada: {new Date(policy.publishedAt).toLocaleDateString('es-PY')}
                  </p>
                )}
                {policy.changeSummary && policy.changeSummary.length > 0 && (
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    {policy.changeSummary.length} cambio
                    {policy.changeSummary.length > 1 ? 's' : ''} documentado
                    {policy.changeSummary.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={() => onView(policy)}
                className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-secondary)]"
                title="Ver"
              >
                <Eye className="h-4 w-4" />
              </button>

              {policy.status === 'draft' && (
                <button
                  type="button"
                  onClick={() => onEdit(policy)}
                  className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-secondary)]"
                  title="Editar"
                >
                  <Edit className="h-4 w-4" />
                </button>
              )}

              {policy.status === 'published' && (
                <>
                  <button
                    type="button"
                    onClick={() => onStats(policy)}
                    className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-secondary)]"
                    title="Estadísticas"
                  >
                    <BarChart3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleArchive(policy)}
                    disabled={archivingId === policy.id}
                    className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    title="Archivar"
                  >
                    {archivingId === policy.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}
                  </button>
                </>
              )}

              <ChevronRight className="ml-2 h-4 w-4 text-[var(--text-muted)]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
