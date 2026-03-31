'use client'

import { useState } from 'react'
import { Download, Loader2, Check, FileSpreadsheet, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useToast } from '@/components/ui/Toast'

interface ExportField {
  key: string
  label: string
  selected: boolean
}

interface ExportCSVButtonProps {
  endpoint: string
  filename: string
  clinic: string
  defaultFields?: ExportField[]
  buttonText?: string
  compact?: boolean
}

export function ExportCSVButton({
  endpoint,
  filename,
  clinic,
  defaultFields,
  buttonText,
  compact = false,
}: ExportCSVButtonProps): React.ReactElement {
  const t = useTranslations('dashboard.exportCsv')
  const displayButtonText = buttonText ?? t('title')
  const [isExporting, setIsExporting] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [exported, setExported] = useState(false)
  const { showToast } = useToast()
  const [fields, setFields] = useState<ExportField[]>(
    defaultFields || [
      { key: 'full_name', label: t('fields.fullName'), selected: true },
      { key: 'email', label: t('fields.email'), selected: true },
      { key: 'phone', label: t('fields.phone'), selected: true },
      { key: 'address', label: t('fields.address'), selected: true },
      { key: 'created_at', label: t('fields.createdAt'), selected: true },
      { key: 'pets_count', label: t('fields.petsCount'), selected: true },
      { key: 'last_visit', label: t('fields.lastVisit'), selected: false },
      { key: 'total_spent', label: t('fields.totalSpent'), selected: false },
      { key: 'loyalty_points', label: t('fields.loyaltyPoints'), selected: false },
    ]
  )

  const handleExport = async (): Promise<void> => {
    setIsExporting(true)
    try {
      const selectedFields = fields.filter((f) => f.selected).map((f) => f.key)
      const params = new URLSearchParams({
        clinic,
        fields: selectedFields.join(','),
        format: 'csv',
      })

      const response = await fetch(`${endpoint}?${params}`)

      if (!response.ok) {
        throw new Error('Export error')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      setExported(true)
      setTimeout(() => setExported(false), 3000)
      setShowOptions(false)
    } catch (error) {
      // Client-side error logging - only in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Export error:', error)
      }
      showToast(t('exportError'))
    } finally {
      setIsExporting(false)
    }
  }

  const toggleField = (key: string): void => {
    setFields((prev) => prev.map((f) => (f.key === key ? { ...f, selected: !f.selected } : f)))
  }

  const selectAll = (): void => {
    setFields((prev) => prev.map((f) => ({ ...f, selected: true })))
  }

  const selectNone = (): void => {
    setFields((prev) => prev.map((f) => ({ ...f, selected: false })))
  }

  if (compact) {
    return (
      <button
        onClick={handleExport}
        disabled={isExporting}
        className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
        title={t('title')}
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : exported ? (
          <Check className="h-4 w-4 text-[var(--status-success)]" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {!compact && <span>{displayButtonText}</span>}
      </button>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowOptions(!showOptions)}
        className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        <FileSpreadsheet className="h-4 w-4" />
        <span>{displayButtonText}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${showOptions ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {showOptions && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute right-0 z-10 mt-2 w-72 rounded-xl border border-gray-200 bg-white shadow-lg"
          >
            <div className="border-b border-gray-100 p-3">
              <p className="mb-2 text-sm font-semibold text-gray-700">
                {t('fieldsToExport')}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="text-xs text-[var(--primary)] hover:underline"
                >
                  {t('selectAll')}
                </button>
                <span className="text-gray-300">|</span>
                <button onClick={selectNone} className="text-xs text-gray-500 hover:underline">
                  {t('none')}
                </button>
              </div>
            </div>

            <div className="max-h-64 space-y-2 overflow-y-auto p-3">
              {fields.map((field) => (
                <label
                  key={field.key}
                  className="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={field.selected}
                    onChange={() => toggleField(field.key)}
                    className="h-4 w-4 rounded border-gray-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  <span className="text-sm text-gray-700">{field.label}</span>
                </label>
              ))}
            </div>

            <div className="rounded-b-xl border-t border-gray-100 bg-gray-50 p-3">
              <button
                onClick={handleExport}
                disabled={isExporting || fields.filter((f) => f.selected).length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('exporting')}
                  </>
                ) : exported ? (
                  <>
                    <Check className="h-4 w-4" />
                    {t('exported')}
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    {t('download')}
                  </>
                )}
              </button>
              <p className="mt-2 text-center text-xs text-gray-500">
                {t('fieldsSelected', { count: fields.filter((f) => f.selected).length })}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
