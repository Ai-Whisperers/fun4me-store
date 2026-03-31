'use client'

import { useState } from 'react'
import { Download, FileSpreadsheet, FileText, Loader2, ChevronDown } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

interface ExportButtonProps {
  endpoint: string
  params?: Record<string, string>
  filename?: string
  className?: string
}

type ExportFormat = 'csv' | 'pdf'

export function ExportButton({
  endpoint,
  params = {},
  filename = 'export',
  className = '',
}: ExportButtonProps): React.ReactElement {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const handleExport = async (format: ExportFormat) => {
    setLoading(true)
    setIsOpen(false)

    try {
      const queryParams = new URLSearchParams({
        ...params,
        format,
      })

      const res = await fetch(`${endpoint}?${queryParams}`)

      if (!res.ok) {
        throw new Error('Error al exportar')
      }

      const contentType = res.headers.get('content-type')

      if (format === 'csv' || contentType?.includes('text/csv')) {
        // Handle CSV download
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } else if (format === 'pdf' || contentType?.includes('application/pdf')) {
        // Handle PDF download
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${filename}-${new Date().toISOString().split('T')[0]}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } else {
        // Fallback: try to download as blob
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${filename}-${new Date().toISOString().split('T')[0]}.${format}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }

      toast({
        title: 'Exportación completada',
        description: `Archivo ${format.toUpperCase()} descargado`,
      })
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: 'Error',
        description: 'No se pudo exportar los datos',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:border-gray-300 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        Exportar
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !loading && (
        <div className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-gray-200 bg-white py-2 shadow-lg">
          <button
            onClick={() => handleExport('csv')}
            className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
          >
            <FileSpreadsheet className="h-4 w-4 text-green-600" />
            Exportar a CSV
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
          >
            <FileText className="h-4 w-4 text-red-600" />
            Exportar a PDF
          </button>
        </div>
      )}
    </div>
  )
}
