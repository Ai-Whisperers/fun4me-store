'use client'

import { useState, useEffect, type JSX } from 'react'
import { History, RotateCcw, Eye, ChevronRight, Clock, User, FileText, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface TemplateVersion {
  id: string
  version_number: number
  version_label: string
  title: string
  change_summary: string | null
  is_published: boolean
  published_at: string | null
  created_at: string
  documents_count: number
  creator_name: string | null
}

interface VersionHistoryProps {
  templateId: string
  onViewVersion: (version: TemplateVersion) => void
  onRollback: (versionNumber: number) => Promise<void>
  isAdmin: boolean
}

export function VersionHistory({
  templateId,
  onViewVersion,
  onRollback,
  isAdmin,
}: VersionHistoryProps): JSX.Element {
  const [versions, setVersions] = useState<TemplateVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rollingBack, setRollingBack] = useState<number | null>(null)

  useEffect(() => {
    fetchVersions()
  }, [templateId])

  const fetchVersions = async (): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/consents/templates/${templateId}/versions`)
      if (!response.ok) {
        throw new Error('Error al cargar versiones')
      }

      const { data } = await response.json()
      setVersions(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const handleRollback = async (versionNumber: number): Promise<void> => {
    if (rollingBack) return

    const confirmRollback = window.confirm(
      `¿Estás seguro de que deseas restaurar la versión ${versionNumber}? Se creará una nueva versión con el contenido anterior.`
    )

    if (!confirmRollback) return

    setRollingBack(versionNumber)
    try {
      await onRollback(versionNumber)
      await fetchVersions()
    } finally {
      setRollingBack(null)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        <p>{error}</p>
        <button
          onClick={fetchVersions}
          className="mt-2 text-sm text-[var(--primary)] hover:underline"
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (versions.length === 0) {
    return (
      <div className="p-4 text-center text-[var(--text-secondary)]">
        <History className="mx-auto mb-2 h-8 w-8 opacity-50" />
        <p>No hay versiones registradas</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-[var(--primary)]/20 p-4">
        <h3 className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
          <History className="h-5 w-5" />
          Historial de Versiones
        </h3>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {versions.length} versión{versions.length !== 1 ? 'es' : ''}
        </p>
      </div>

      {/* Versions List */}
      <div className="flex-1 overflow-y-auto">
        {versions.map((version, index) => (
          <div
            key={version.id}
            className={`border-b border-[var(--primary)]/10 p-4 ${
              index === 0 ? 'bg-[var(--primary)]/5' : ''
            }`}
          >
            {/* Version Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[var(--primary)] px-2 py-0.5 text-xs font-medium text-white">
                  v{version.version_label}
                </span>
                {index === 0 && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                    Actual
                  </span>
                )}
              </div>
              {version.documents_count > 0 && (
                <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                  <FileText className="h-3 w-3" />
                  {version.documents_count}
                </span>
              )}
            </div>

            {/* Title */}
            <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{version.title}</p>

            {/* Change Summary */}
            {version.change_summary && (
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{version.change_summary}</p>
            )}

            {/* Metadata */}
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(version.created_at), {
                  addSuffix: true,
                  locale: es,
                })}
              </span>
              {version.creator_name && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {version.creator_name}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => onViewVersion(version)}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/10"
              >
                <Eye className="h-3 w-3" />
                Ver
              </button>
              {isAdmin && index !== 0 && (
                <button
                  onClick={() => handleRollback(version.version_number)}
                  disabled={rollingBack !== null}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-orange-600 transition-colors hover:bg-orange-50 disabled:opacity-50"
                >
                  {rollingBack === version.version_number ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3 w-3" />
                  )}
                  Restaurar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Button to toggle version history sidebar
 */
interface VersionHistoryButtonProps {
  onClick: () => void
  versionCount?: number
}

export function VersionHistoryButton({
  onClick,
  versionCount,
}: VersionHistoryButtonProps): JSX.Element {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg border border-[var(--primary)]/20 bg-[var(--bg-paper)] px-3 py-2 text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--primary)]/5"
    >
      <History className="h-4 w-4" />
      Historial
      {versionCount !== undefined && versionCount > 0 && (
        <span className="rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-xs">
          {versionCount}
        </span>
      )}
      <ChevronRight className="h-4 w-4" />
    </button>
  )
}
