'use client'

/**
 * Analytics PDF Button
 *
 * Download button component for generating analytics PDF reports.
 */

import { useState } from 'react'
import { Loader2, Download, FileText } from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import { AnalyticsPDFDocument } from './AnalyticsPDFDocument'
import { REPORT_TITLES, getDefaultColumns } from './utils'
import type { AnalyticsPDFButtonProps, AnalyticsExportData } from './types'

export function AnalyticsPDFButton({
  exportType,
  startDate,
  endDate,
  clinicName,
  variant = 'button',
  className = '',
}: AnalyticsPDFButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    setLoading(true)
    try {
      // Fetch data from API
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

      // Build export data
      const exportData: AnalyticsExportData = {
        type: exportType,
        title: REPORT_TITLES[exportType],
        columns: result.columns || getDefaultColumns(exportType),
        data: result.data || [],
        period: { startDate, endDate },
        clinicName,
        generatedAt: new Date().toLocaleString('es-PY'),
      }

      // Generate PDF
      const blob = await pdf(<AnalyticsPDFDocument exportData={exportData} />).toBlob()

      // Trigger download
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${exportType}-${startDate}-${endDate}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (_error: unknown) {
      // Fallback: try CSV export
      window.open(
        `/api/analytics/export?type=${exportType}&format=csv&startDate=${startDate}&endDate=${endDate}`
      )
    } finally {
      setLoading(false)
    }
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={handleDownload}
        disabled={loading}
        className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 transition-colors hover:bg-gray-100 disabled:opacity-50 ${className}`}
        title="Descargar PDF"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-[var(--text-secondary)]" />
        ) : (
          <FileText className="h-5 w-5 text-[var(--text-secondary)]" />
        )}
      </button>
    )
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-3 text-[var(--text-primary)] hover:bg-gray-50 disabled:opacity-50 ${className}`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Exportar PDF
    </button>
  )
}
