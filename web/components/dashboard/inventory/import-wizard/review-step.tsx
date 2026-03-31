'use client'

import { AlertCircle } from 'lucide-react'
import type { PreviewResult } from './types'

interface ReviewStepProps {
  previewResult: PreviewResult
  showOnlyErrors: boolean
  onShowOnlyErrorsChange: (show: boolean) => void
}

export function ReviewStep({
  previewResult,
  showOnlyErrors,
  onShowOnlyErrorsChange,
}: ReviewStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-900">Revisar Cambios</h3>
        <p className="text-sm text-gray-500">
          Verifica los cambios antes de confirmar la importación
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl bg-gray-50 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">
            {previewResult.summary.totalRows}
          </div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
        <div className="rounded-xl bg-[var(--status-success-bg)] p-4 text-center">
          <div className="text-2xl font-bold text-[var(--status-success)]">
            {previewResult.summary.newProducts}
          </div>
          <div className="text-xs text-gray-500">Nuevos</div>
        </div>
        <div className="rounded-xl bg-[var(--status-info-bg)] p-4 text-center">
          <div className="text-2xl font-bold text-[var(--status-info)]">
            {previewResult.summary.updates}
          </div>
          <div className="text-xs text-gray-500">Actualizaciones</div>
        </div>
        <div className="rounded-xl bg-[var(--status-warning-bg)] p-4 text-center">
          <div className="text-2xl font-bold text-[var(--status-warning)]">
            {previewResult.summary.adjustments}
          </div>
          <div className="text-xs text-gray-500">Ajustes</div>
        </div>
        <div className="rounded-xl bg-[var(--status-error-bg)] p-4 text-center">
          <div className="text-2xl font-bold text-[var(--status-error)]">
            {previewResult.summary.errors}
          </div>
          <div className="text-xs text-gray-500">Errores</div>
        </div>
        <div className="rounded-xl bg-gray-50 p-4 text-center">
          <div className="text-2xl font-bold text-gray-400">
            {previewResult.summary.skipped}
          </div>
          <div className="text-xs text-gray-500">Omitidos</div>
        </div>
      </div>

      {/* Filter Bar */}
      {previewResult.summary.errors > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-[var(--status-error-border)] bg-[var(--status-error-bg)] p-3">
          <div className="flex items-center gap-2 text-[var(--status-error-text)]">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">
              {previewResult.summary.errors} error
              {previewResult.summary.errors > 1 ? 'es' : ''} encontrado
              {previewResult.summary.errors > 1 ? 's' : ''}
            </span>
          </div>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlyErrors}
              onChange={(e) => onShowOnlyErrorsChange(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[var(--status-error)] focus:ring-[var(--status-error)]"
            />
            <span className="text-sm text-[var(--status-error-text)]">Mostrar solo errores</span>
          </label>
        </div>
      )}

      {/* Preview Table */}
      <div className="overflow-hidden rounded-xl border">
        <div className="max-h-[300px] overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-bold uppercase text-gray-400">
                  Fila
                </th>
                <th className="px-3 py-2 text-left text-xs font-bold uppercase text-gray-400">
                  Estado
                </th>
                <th className="px-3 py-2 text-left text-xs font-bold uppercase text-gray-400">
                  SKU
                </th>
                <th className="px-3 py-2 text-left text-xs font-bold uppercase text-gray-400">
                  Nombre
                </th>
                <th className="px-3 py-2 text-left text-xs font-bold uppercase text-gray-400">
                  Stock
                </th>
                <th className="px-3 py-2 text-left text-xs font-bold uppercase text-gray-400">
                  Mensaje
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {previewResult.preview
                .filter((row) => !showOnlyErrors || row.status === 'error')
                .map((row, idx) => (
                  <tr
                    key={idx}
                    className={
                      row.status === 'error'
                        ? 'bg-[var(--status-error-bg)]'
                        : row.status === 'skip'
                          ? 'bg-gray-50 opacity-60'
                          : ''
                    }
                  >
                    <td className="px-3 py-2 font-mono text-gray-500">{row.rowNumber}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-3 py-2 font-mono">{row.sku || '—'}</td>
                    <td className="max-w-[200px] truncate px-3 py-2">{row.name || '—'}</td>
                    <td className="px-3 py-2">
                      {row.currentStock !== undefined && row.newStock !== undefined ? (
                        <span className="flex items-center gap-1">
                          <span className="text-gray-400">{row.currentStock}</span>
                          <span className="text-gray-300">→</span>
                          <span
                            className={
                              row.newStock > row.currentStock
                                ? 'font-medium text-[var(--status-success)]'
                                : 'font-medium text-[var(--status-error)]'
                            }
                          >
                            {row.newStock}
                          </span>
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="max-w-[200px] truncate px-3 py-2 text-gray-500">
                      {row.message}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    new: 'bg-[var(--status-success-bg)] text-[var(--status-success-text)]',
    update: 'bg-[var(--status-info-bg)] text-[var(--status-info-text)]',
    adjustment: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]',
    error: 'bg-[var(--status-error-bg)] text-[var(--status-error-text)]',
    skip: 'bg-gray-100 text-gray-500',
  }

  const labels: Record<string, string> = {
    new: 'Nuevo',
    update: 'Actualizar',
    adjustment: 'Ajuste',
    error: 'Error',
    skip: 'Omitir',
  }

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}
