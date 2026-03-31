'use client'

import { useState } from 'react'
import { X, Download, Loader2, AlertCircle, CheckCircle, FileSpreadsheet, FileJson } from 'lucide-react'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  selectedCount: number
  selectedIds: string[]
}

const EXPORT_FIELDS = [
  { id: 'full_name', label: 'Nombre', default: true },
  { id: 'email', label: 'Email', default: true },
  { id: 'phone', label: 'Teléfono', default: true },
  { id: 'segment', label: 'Segmento', default: true },
  { id: 'total_orders', label: 'Total Pedidos', default: true },
  { id: 'total_spent', label: 'Total Gastado', default: true },
  { id: 'avg_order_value', label: 'Valor Promedio', default: false },
  { id: 'first_order_date', label: 'Primera Compra', default: false },
  { id: 'last_order_date', label: 'Última Compra', default: true },
  { id: 'days_since_last_order', label: 'Días Sin Comprar', default: false },
  { id: 'loyalty_points', label: 'Puntos', default: false },
  { id: 'created_at', label: 'Fecha Registro', default: false },
]

export function ExportModal({
  isOpen,
  onClose,
  selectedCount,
  selectedIds,
}: ExportModalProps): React.ReactElement | null {
  const [format, setFormat] = useState<'csv' | 'json'>('csv')
  const [selectedFields, setSelectedFields] = useState<Set<string>>(
    new Set(EXPORT_FIELDS.filter((f) => f.default).map((f) => f.id))
  )
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleField = (fieldId: string) => {
    const newSet = new Set(selectedFields)
    if (newSet.has(fieldId)) {
      newSet.delete(fieldId)
    } else {
      newSet.add(fieldId)
    }
    setSelectedFields(newSet)
  }

  const selectAll = () => {
    setSelectedFields(new Set(EXPORT_FIELDS.map((f) => f.id)))
  }

  const selectNone = () => {
    setSelectedFields(new Set())
  }

  const handleExport = async () => {
    if (selectedFields.size === 0) {
      setError('Selecciona al menos un campo para exportar')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/clients/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_ids: selectedIds,
          fields: Array.from(selectedFields),
          format,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.message || 'Error al exportar')
      }

      if (format === 'csv') {
        // Download CSV file
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `clientes-${new Date().toISOString().slice(0, 10)}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        // Download JSON file
        const data = await response.json()
        const blob = new Blob([JSON.stringify(data.data, null, 2)], {
          type: 'application/json',
        })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `clientes-${new Date().toISOString().slice(0, 10)}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormat('csv')
    setSelectedFields(new Set(EXPORT_FIELDS.filter((f) => f.default).map((f) => f.id)))
    setSuccess(false)
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-lg rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2">
              <Download className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Exportar Clientes</h2>
              <p className="text-sm text-gray-500">{selectedCount} clientes seleccionados</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        {success ? (
          <div className="p-6">
            <div className="mb-4 flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="font-semibold text-gray-900">Exportación completada</p>
                <p className="text-sm text-gray-500">
                  {selectedCount} clientes exportados en formato {format.toUpperCase()}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="mt-6 w-full rounded-lg bg-[var(--primary)] py-2 font-medium text-white hover:opacity-90"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <div className="p-6">
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Format Selection */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Formato</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormat('csv')}
                    className={`flex items-center justify-center gap-2 rounded-lg border-2 p-3 transition-colors ${
                      format === 'csv'
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    CSV (Excel)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat('json')}
                    className={`flex items-center justify-center gap-2 rounded-lg border-2 p-3 transition-colors ${
                      format === 'json'
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <FileJson className="h-4 w-4" />
                    JSON
                  </button>
                </div>
              </div>

              {/* Field Selection */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Campos a Exportar ({selectedFields.size})
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAll}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Todos
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={selectNone}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Ninguno
                    </button>
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 p-2">
                  <div className="grid grid-cols-2 gap-2">
                    {EXPORT_FIELDS.map((field) => (
                      <label
                        key={field.id}
                        className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedFields.has(field.id)}
                          onChange={() => toggleField(field.id)}
                          className="rounded border-gray-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                        />
                        <span className="text-sm text-gray-700">{field.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-lg border border-gray-200 py-2 font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleExport}
                disabled={loading || selectedFields.size === 0}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-600 py-2 font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Exportar {format.toUpperCase()}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
