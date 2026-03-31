'use client'

/**
 * Import Preview Hook
 *
 * REF-006: Import preview state extracted from client component
 */

import { useState, useCallback } from 'react'

export interface ImportPreviewRow {
  rowNumber: number
  operation: string
  sku: string
  name: string
  status: 'new' | 'update' | 'adjustment' | 'error' | 'skip'
  message: string
  currentStock?: number
  newStock?: number
  priceChange?: { old: number; new: number }
}

export interface ImportPreviewSummary {
  totalRows: number
  newProducts: number
  updates: number
  adjustments: number
  errors: number
  skipped: number
}

export interface ImportPreviewData {
  preview: ImportPreviewRow[]
  summary: ImportPreviewSummary
}

interface UseImportPreviewProps {
  onRefetch: () => void
  onRefetchStats: () => void
  setError: (error: string | null) => void
  setResult: (result: { success: number; errors: string[]; message?: string } | null) => void
}

interface UseImportPreviewReturn {
  showPreview: boolean
  previewData: ImportPreviewData | null
  pendingFile: File | null
  isLoadingPreview: boolean
  isUploading: boolean
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  handleConfirmImport: () => Promise<void>
  handleCancelImport: () => void
}

export function useImportPreview({
  onRefetch,
  onRefetchStats,
  setError,
  setResult,
}: UseImportPreviewProps): UseImportPreviewReturn {
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState<ImportPreviewData | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      setIsLoadingPreview(true)
      setError(null)
      setResult(null)

      const formData = new FormData()
      formData.append('file', file)

      try {
        const res = await fetch('/api/inventory/import/preview', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          const text = await res.text()
          throw new Error(text || 'Error en la vista previa')
        }

        const data = await res.json()
        setPreviewData(data)
        setPendingFile(file)
        setShowPreview(true)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error desconocido')
      } finally {
        setIsLoadingPreview(false)
        // Reset file input
        e.target.value = ''
      }
    },
    [setError, setResult]
  )

  const handleConfirmImport = useCallback(async () => {
    if (!pendingFile) return

    setIsUploading(true)
    setShowPreview(false)
    setError(null)

    const formData = new FormData()
    formData.append('file', pendingFile)

    try {
      const res = await fetch('/api/inventory/import', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Error en la importación')
      }

      const data = await res.json()
      setResult(data)
      onRefetchStats()
      onRefetch()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setIsUploading(false)
      setPendingFile(null)
      setPreviewData(null)
    }
  }, [pendingFile, onRefetch, onRefetchStats, setError, setResult])

  const handleCancelImport = useCallback(() => {
    setShowPreview(false)
    setPendingFile(null)
    setPreviewData(null)
  }, [])

  return {
    showPreview,
    previewData,
    pendingFile,
    isLoadingPreview,
    isUploading,
    handleFileUpload,
    handleConfirmImport,
    handleCancelImport,
  }
}
