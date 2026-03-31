'use client'

/**
 * Import Section Component
 *
 * REF-006: Import section extracted from client component
 */

import { Upload, Loader2, AlertCircle, CheckCircle2, X, Info } from 'lucide-react'

interface ImportResult {
  success: number
  errors: string[]
  message?: string
}

interface ImportSectionProps {
  isUploading: boolean
  isLoadingPreview: boolean
  error: string | null
  result: ImportResult | null
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClearError: () => void
  onClearResult: () => void
}

export function ImportSection({
  isUploading,
  isLoadingPreview,
  error,
  result,
  onFileUpload,
  onClearError,
  onClearResult,
}: ImportSectionProps): React.ReactElement {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-default)] p-6">
        <div className="bg-[var(--primary)]/10 mb-4 flex h-16 w-16 items-center justify-center rounded-full">
          <Upload className="h-8 w-8 text-[var(--primary)]" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-[var(--text-primary)]">Importar Actualizaciones</h2>
        <p className="mb-6 max-w-sm text-center text-sm text-[var(--text-muted)]">
          Sube tu archivo Excel para actualizar stock, precios o agregar productos.
        </p>
        <label
          className={`inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[var(--bg-dark)] px-6 py-3 font-bold text-white transition-all hover:bg-[var(--bg-inverse)] ${isUploading || isLoadingPreview ? 'pointer-events-none opacity-50' : ''} `}
        >
          {isUploading || isLoadingPreview ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Upload className="h-5 w-5" />
          )}
          {isLoadingPreview
            ? 'Analizando...'
            : isUploading
              ? 'Importando...'
              : 'Seleccionar Archivo'}
          <input
            type="file"
            className="hidden"
            accept=".xlsx,.xls,.csv"
            onChange={onFileUpload}
            disabled={isUploading || isLoadingPreview}
          />
        </label>
        <p className="mt-3 text-center text-xs text-[var(--text-muted)]">
          Se mostrará una vista previa antes de importar
        </p>
      </div>

      <div className="space-y-4">
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-[var(--status-error-border)] bg-[var(--status-error-bg)] p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--status-error)]" />
            <div>
              <h3 className="font-bold text-[var(--status-error-text)]">Error</h3>
              <p className="mt-1 text-sm text-[var(--status-error-text)]">{error}</p>
            </div>
            <button
              onClick={onClearError}
              className="ml-auto text-[var(--status-error)] hover:text-[var(--status-error-text)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {result && (
          <div className="rounded-xl border border-[var(--status-success-border)] bg-[var(--status-success-bg)] p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--status-success)]" />
              <div className="flex-1">
                <h3 className="font-bold text-[var(--status-success-text)]">Importación Exitosa</h3>
                <p className="mt-1 text-sm text-[var(--status-success-text)]">
                  Se procesaron <strong>{result.success}</strong> filas correctamente.
                </p>
              </div>
              <button
                onClick={onClearResult}
                className="text-[var(--status-success)] hover:text-[var(--status-success-text)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {result.errors?.length > 0 && (
              <div className="mt-3 rounded-lg bg-[var(--bg-default)]/50 p-3">
                <p className="mb-2 text-xs font-bold uppercase text-[var(--status-warning)]">
                  Observaciones ({result.errors.length}):
                </p>
                <ul className="max-h-32 list-inside list-disc space-y-1 overflow-y-auto text-xs text-[var(--text-secondary)]">
                  {result.errors.map((err: string, i: number) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="rounded-xl bg-[var(--bg-dark)] p-5 text-white">
          <div className="mb-4 flex items-center gap-2">
            <Info className="h-5 w-5" />
            <h3 className="font-bold">Guía Rápida</h3>
          </div>
          <div className="grid gap-2 text-sm">
            <div className="flex gap-2">
              <span className="rounded bg-[var(--primary)] px-2 py-0.5 text-xs font-bold text-white">
                NEW
              </span>
              <span className="text-[var(--text-muted)]">Crear producto (SKU vacío)</span>
            </div>
            <div className="flex gap-2">
              <span className="rounded bg-[var(--status-info-bg)]0 px-2 py-0.5 text-xs font-bold text-white">
                BUY
              </span>
              <span className="text-[var(--text-muted)]">Compra (cantidad + costo)</span>
            </div>
            <div className="flex gap-2">
              <span className="rounded bg-[var(--status-error-bg)]0 px-2 py-0.5 text-xs font-bold text-white">
                ADJ
              </span>
              <span className="text-[var(--text-muted)]">Ajuste de inventario (+/-)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
