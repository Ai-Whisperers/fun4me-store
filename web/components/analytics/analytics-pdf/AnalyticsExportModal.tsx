'use client'

/**
 * Analytics Export Modal
 *
 * Modal component for selecting export options (type, date range, format).
 */

import { useState } from 'react'
import { Loader2, Download } from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import { AnalyticsPDFDocument } from './AnalyticsPDFDocument'
import { REPORT_TITLES, getDefaultColumns } from './utils'
import type { ExportModalProps, ExportType, AnalyticsExportData } from './types'

export function AnalyticsExportModal({
  isOpen,
  onClose,
  clinicName,
  defaultType = 'revenue',
}: ExportModalProps) {
  const [exportType, setExportType] = useState<ExportType>(defaultType)
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setMonth(date.getMonth() - 1)
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [format, setFormat] = useState<'pdf' | 'csv'>('pdf')
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    setLoading(true)
    try {
      if (format === 'csv') {
        // Direct CSV download
        window.location.href = `/api/analytics/export?type=${exportType}&format=csv&startDate=${startDate}&endDate=${endDate}`
      } else {
        // PDF generation
        const params = new URLSearchParams({
          type: exportType,
          format: 'json',
          startDate,
          endDate,
        })

        const response = await fetch(`/api/analytics/export?${params}`)

        if (!response.ok) {
          throw new Error('Error al obtener datos')
        }

        const result = await response.json()

        const exportData: AnalyticsExportData = {
          type: exportType,
          title: REPORT_TITLES[exportType],
          columns: result.columns || getDefaultColumns(exportType),
          data: result.data || [],
          period: { startDate, endDate },
          clinicName,
          generatedAt: new Date().toLocaleString('es-PY'),
        }

        const blob = await pdf(<AnalyticsPDFDocument exportData={exportData} />).toBlob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${exportType}-${startDate}-${endDate}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
      onClose()
    } catch (_error: unknown) {
      // Error handled silently - could add toast notification
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold text-[var(--text-primary)]">Exportar Datos</h2>

        {/* Export Type */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
            Tipo de Reporte
          </label>
          <select
            value={exportType}
            onChange={(e) => setExportType(e.target.value as ExportType)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[var(--primary)] focus:outline-none"
          >
            <option value="revenue">Ingresos</option>
            <option value="appointments">Citas</option>
            <option value="clients">Clientes</option>
            <option value="services">Servicios</option>
            <option value="inventory">Inventario</option>
            <option value="customers">Segmentacion de Clientes</option>
          </select>
        </div>

        {/* Date Range */}
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
              Desde
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[var(--primary)] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
              Hasta
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[var(--primary)] focus:outline-none"
            />
          </div>
        </div>

        {/* Format */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
            Formato
          </label>
          <div className="flex gap-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                value="pdf"
                checked={format === 'pdf'}
                onChange={() => setFormat('pdf')}
                className="text-[var(--primary)]"
              />
              <span className="text-sm">PDF</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                value="csv"
                checked={format === 'csv'}
                onChange={() => setFormat('csv')}
                className="text-[var(--primary)]"
              />
              <span className="text-sm">CSV</span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-[var(--text-secondary)] hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            onClick={handleExport}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Exportar
          </button>
        </div>
      </div>
    </div>
  )
}
