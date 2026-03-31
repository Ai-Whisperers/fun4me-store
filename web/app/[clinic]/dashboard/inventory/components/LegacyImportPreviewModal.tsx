'use client'

/**
 * Legacy Import Preview Modal Component
 *
 * REF-006: Import preview modal extracted from client component
 */

import { X, Upload, AlertCircle } from 'lucide-react'
import type { ImportPreviewData } from '../hooks/use-import-preview'

interface LegacyImportPreviewModalProps {
  isOpen: boolean
  previewData: ImportPreviewData | null
  onConfirm: () => void
  onCancel: () => void
}

export function LegacyImportPreviewModal({
  isOpen,
  previewData,
  onConfirm,
  onCancel,
}: LegacyImportPreviewModalProps): React.ReactElement | null {
  if (!isOpen || !previewData) return null

  const canConfirm =
    previewData.summary.newProducts > 0 ||
    previewData.summary.updates > 0 ||
    previewData.summary.adjustments > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-[var(--bg-default)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] p-6">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Vista Previa de Importación</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Revisa los cambios antes de confirmar</p>
          </div>
          <button
            onClick={onCancel}
            className="rounded-lg p-2 transition-colors hover:bg-[var(--bg-muted)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Summary Cards */}
        <div className="border-b border-[var(--border)] bg-[var(--bg-subtle)] p-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <SummaryCard value={previewData.summary.totalRows} label="Total Filas" />
            <SummaryCard value={previewData.summary.newProducts} label="Nuevos" variant="success" />
            <SummaryCard value={previewData.summary.updates} label="Actualizaciones" variant="info" />
            <SummaryCard value={previewData.summary.adjustments} label="Ajustes Stock" variant="warning" />
            <SummaryCard value={previewData.summary.errors} label="Errores" variant="error" />
            <SummaryCard value={previewData.summary.skipped} label="Omitidos" variant="muted" />
          </div>

          {previewData.summary.errors > 0 && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-[var(--status-error-light)] bg-[var(--status-error-bg)] p-3 text-sm text-[var(--status-error)]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                Hay {previewData.summary.errors} errores que no se procesarán. Revisa la tabla
                para más detalles.
              </span>
            </div>
          )}
        </div>

        {/* Preview Table */}
        <div className="flex-1 overflow-auto p-6">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[var(--bg-subtle)]">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-bold uppercase text-[var(--text-muted)]">Fila</th>
                <th className="px-3 py-2 text-left text-xs font-bold uppercase text-[var(--text-muted)]">Estado</th>
                <th className="px-3 py-2 text-left text-xs font-bold uppercase text-[var(--text-muted)]">Operación</th>
                <th className="px-3 py-2 text-left text-xs font-bold uppercase text-[var(--text-muted)]">SKU</th>
                <th className="px-3 py-2 text-left text-xs font-bold uppercase text-[var(--text-muted)]">Nombre</th>
                <th className="px-3 py-2 text-left text-xs font-bold uppercase text-[var(--text-muted)]">Stock</th>
                <th className="px-3 py-2 text-left text-xs font-bold uppercase text-[var(--text-muted)]">Mensaje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {previewData.preview.map((row, idx) => (
                <tr
                  key={idx}
                  className={`${row.status === 'error' ? 'bg-[var(--status-error-bg)]' : ''} ${row.status === 'skip' ? 'bg-[var(--bg-subtle)] text-[var(--text-muted)]' : ''}`}
                >
                  <td className="px-3 py-2 font-mono text-[var(--text-muted)]">{row.rowNumber}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-3 py-2 capitalize">{row.operation || '-'}</td>
                  <td className="px-3 py-2 font-mono">{row.sku || '-'}</td>
                  <td className="max-w-[200px] truncate px-3 py-2">{row.name || '-'}</td>
                  <td className="px-3 py-2">
                    <StockChange currentStock={row.currentStock} newStock={row.newStock} />
                  </td>
                  <td className="max-w-[250px] truncate px-3 py-2 text-[var(--text-muted)]">
                    {row.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-[var(--border)] bg-[var(--bg-subtle)] p-6">
          <button
            onClick={onCancel}
            className="flex-1 py-3 font-bold text-[var(--text-muted)] transition hover:text-[var(--text-secondary)]"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={!canConfirm}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-3 font-bold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            <Upload className="h-5 w-5" />
            Confirmar Importación
          </button>
        </div>
      </div>
    </div>
  )
}

// Summary Card Component
function SummaryCard({
  value,
  label,
  variant = 'default',
}: {
  value: number
  label: string
  variant?: 'default' | 'success' | 'info' | 'warning' | 'error' | 'muted'
}): React.ReactElement {
  const borderClass = {
    default: 'border-[var(--border)]',
    success: 'border-[var(--status-success-light)]',
    info: 'border-[var(--status-info-light)]',
    warning: 'border-[var(--status-warning-light)]',
    error: 'border-[var(--status-error-light)]',
    muted: 'border-[var(--border)]',
  }[variant]

  const textClass = {
    default: 'text-[var(--text-primary)]',
    success: 'text-[var(--status-success)]',
    info: 'text-[var(--status-info)]',
    warning: 'text-[var(--status-warning)]',
    error: 'text-[var(--status-error)]',
    muted: 'text-[var(--text-muted)]',
  }[variant]

  return (
    <div className={`rounded-xl border bg-[var(--bg-default)] p-4 text-center ${borderClass}`}>
      <div className={`text-2xl font-bold ${textClass}`}>{value}</div>
      <div className="text-xs text-[var(--text-muted)]">{label}</div>
    </div>
  )
}

// Status Badge Component
function StatusBadge({
  status,
}: {
  status: 'new' | 'update' | 'adjustment' | 'error' | 'skip'
}): React.ReactElement {
  const classes = {
    new: 'bg-[var(--status-success-bg)] text-[var(--status-success)]',
    update: 'bg-[var(--status-info-bg)] text-[var(--status-info)]',
    adjustment: 'bg-[var(--status-warning-bg)] text-[var(--status-warning)]',
    error: 'bg-[var(--status-error-bg)] text-[var(--status-error)]',
    skip: 'bg-[var(--bg-muted)] text-[var(--text-muted)]',
  }

  const labels = {
    new: 'Nuevo',
    update: 'Actualizar',
    adjustment: 'Ajuste',
    error: 'Error',
    skip: 'Omitir',
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${classes[status]}`}>
      {labels[status]}
    </span>
  )
}

// Stock Change Component
function StockChange({
  currentStock,
  newStock,
}: {
  currentStock?: number
  newStock?: number
}): React.ReactElement {
  if (currentStock !== undefined && newStock !== undefined) {
    const changeClass =
      newStock > currentStock
        ? 'font-medium text-[var(--status-success)]'
        : newStock < currentStock
          ? 'font-medium text-[var(--status-error)]'
          : ''

    return (
      <span className="flex items-center gap-1">
        <span className="text-[var(--text-muted)]">{currentStock}</span>
        <span className="text-[var(--text-muted)]">→</span>
        <span className={changeClass}>{newStock}</span>
      </span>
    )
  }

  if (newStock !== undefined) {
    return <span className="text-[var(--status-success)]">{newStock}</span>
  }

  return <span>-</span>
}
