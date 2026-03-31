'use client'

import { useState, useEffect, type JSX } from 'react'
import { X, ChevronLeft, ChevronRight, Clock, User, Loader2 } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { createSanitizedHtml } from '@/lib/utils'

interface VersionData {
  id: string
  version_number: number
  version_label: string
  title: string
  content_html: string
  change_summary: string | null
  created_at: string
  creator_name: string | null
}

interface VersionCompareProps {
  templateId: string
  versionNumber: number
  onClose: () => void
  totalVersions: number
  onNavigate: (versionNumber: number) => void
}

export function VersionCompare({
  templateId,
  versionNumber,
  onClose,
  totalVersions,
  onNavigate,
}: VersionCompareProps): JSX.Element {
  const [version, setVersion] = useState<VersionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showRawHtml, setShowRawHtml] = useState(false)

  useEffect(() => {
    fetchVersion()
  }, [templateId, versionNumber])

  const fetchVersion = async (): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/consents/templates/${templateId}/versions/${versionNumber}`
      )
      if (!response.ok) {
        throw new Error('Error al cargar la versión')
      }

      const { data } = await response.json()
      setVersion(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const canGoPrevious = versionNumber > 1
  const canGoNext = versionNumber < totalVersions

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="rounded-lg bg-[var(--bg-paper)] p-8">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--primary)]" />
          <p className="mt-4 text-[var(--text-secondary)]">Cargando versión...</p>
        </div>
      </div>
    )
  }

  if (error || !version) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="rounded-lg bg-[var(--bg-paper)] p-8 text-center">
          <p className="text-red-500">{error || 'Versión no encontrada'}</p>
          <button
            onClick={onClose}
            className="mt-4 rounded-lg bg-[var(--primary)] px-4 py-2 text-white hover:bg-[var(--primary)]/90"
          >
            Cerrar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[90vh] w-full max-w-5xl flex-col rounded-lg bg-[var(--bg-paper)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--primary)]/20 p-4">
          <div className="flex items-center gap-4">
            {/* Navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => canGoPrevious && onNavigate(versionNumber - 1)}
                disabled={!canGoPrevious}
                className="rounded p-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--primary)]/10 disabled:cursor-not-allowed disabled:opacity-30"
                title="Versión anterior"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="min-w-[80px] text-center text-sm">
                Versión {versionNumber} de {totalVersions}
              </span>
              <button
                onClick={() => canGoNext && onNavigate(versionNumber + 1)}
                disabled={!canGoNext}
                className="rounded p-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--primary)]/10 disabled:cursor-not-allowed disabled:opacity-30"
                title="Versión siguiente"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Version Label */}
            <span className="rounded-full bg-[var(--primary)] px-3 py-1 text-sm font-medium text-white">
              v{version.version_label}
            </span>
          </div>

          <button
            onClick={onClose}
            className="rounded p-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--primary)]/10 hover:text-[var(--text-primary)]"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Version Info */}
        <div className="border-b border-[var(--primary)]/20 bg-[var(--bg-default)] p-4">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">{version.title}</h2>

          {version.change_summary && (
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              <span className="font-medium">Cambios:</span> {version.change_summary}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {format(new Date(version.created_at), "d 'de' MMMM, yyyy 'a las' HH:mm", {
                locale: es,
              })}
              <span className="text-xs">
                ({formatDistanceToNow(new Date(version.created_at), { addSuffix: true, locale: es })}
                )
              </span>
            </span>
            {version.creator_name && (
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {version.creator_name}
              </span>
            )}
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 border-b border-[var(--primary)]/10 px-4 py-2">
          <button
            onClick={() => setShowRawHtml(false)}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              !showRawHtml
                ? 'bg-[var(--primary)] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--primary)]/10'
            }`}
          >
            Vista previa
          </button>
          <button
            onClick={() => setShowRawHtml(true)}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              showRawHtml
                ? 'bg-[var(--primary)] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--primary)]/10'
            }`}
          >
            HTML
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {showRawHtml ? (
            <pre className="whitespace-pre-wrap rounded-lg bg-[var(--bg-default)] p-4 font-mono text-sm text-[var(--text-primary)]">
              {version.content_html}
            </pre>
          ) : (
            <div
              className="prose prose-sm max-w-none rounded-lg bg-white p-6 shadow-sm dark:prose-invert"
              dangerouslySetInnerHTML={createSanitizedHtml(version.content_html)}
            />
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Simple diff view for comparing two versions side-by-side
 */
interface VersionDiffProps {
  templateId: string
  oldVersionNumber: number
  newVersionNumber: number
  onClose: () => void
}

export function VersionDiff({
  templateId,
  oldVersionNumber,
  newVersionNumber,
  onClose,
}: VersionDiffProps): JSX.Element {
  const [oldVersion, setOldVersion] = useState<VersionData | null>(null)
  const [newVersion, setNewVersion] = useState<VersionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchVersions()
  }, [templateId, oldVersionNumber, newVersionNumber])

  const fetchVersions = async (): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      const [oldRes, newRes] = await Promise.all([
        fetch(`/api/consents/templates/${templateId}/versions/${oldVersionNumber}`),
        fetch(`/api/consents/templates/${templateId}/versions/${newVersionNumber}`),
      ])

      if (!oldRes.ok || !newRes.ok) {
        throw new Error('Error al cargar versiones')
      }

      const [oldData, newData] = await Promise.all([oldRes.json(), newRes.json()])

      setOldVersion(oldData.data)
      setNewVersion(newData.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="rounded-lg bg-[var(--bg-paper)] p-8">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--primary)]" />
          <p className="mt-4 text-[var(--text-secondary)]">Comparando versiones...</p>
        </div>
      </div>
    )
  }

  if (error || !oldVersion || !newVersion) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="rounded-lg bg-[var(--bg-paper)] p-8 text-center">
          <p className="text-red-500">{error || 'Error al cargar versiones'}</p>
          <button
            onClick={onClose}
            className="mt-4 rounded-lg bg-[var(--primary)] px-4 py-2 text-white hover:bg-[var(--primary)]/90"
          >
            Cerrar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[90vh] w-full max-w-7xl flex-col rounded-lg bg-[var(--bg-paper)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--primary)]/20 p-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Comparación: v{oldVersion.version_label} → v{newVersion.version_label}
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--primary)]/10 hover:text-[var(--text-primary)]"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Side by side comparison */}
        <div className="grid flex-1 grid-cols-2 gap-0 overflow-hidden">
          {/* Old Version */}
          <div className="flex flex-col border-r border-[var(--primary)]/20">
            <div className="border-b border-[var(--primary)]/10 bg-red-50 p-3">
              <span className="font-medium text-red-700">
                Versión Anterior (v{oldVersion.version_label})
              </span>
              <p className="mt-1 text-sm text-red-600">{oldVersion.title}</p>
            </div>
            <div className="flex-1 overflow-y-auto bg-red-50/50 p-4">
              <div
                className="prose prose-sm max-w-none rounded bg-white p-4"
                dangerouslySetInnerHTML={createSanitizedHtml(oldVersion.content_html)}
              />
            </div>
          </div>

          {/* New Version */}
          <div className="flex flex-col">
            <div className="border-b border-[var(--primary)]/10 bg-green-50 p-3">
              <span className="font-medium text-green-700">
                Versión Nueva (v{newVersion.version_label})
              </span>
              <p className="mt-1 text-sm text-green-600">{newVersion.title}</p>
            </div>
            <div className="flex-1 overflow-y-auto bg-green-50/50 p-4">
              <div
                className="prose prose-sm max-w-none rounded bg-white p-4"
                dangerouslySetInnerHTML={createSanitizedHtml(newVersion.content_html)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
