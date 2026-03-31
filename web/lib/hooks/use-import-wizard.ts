/**
 * Import Wizard State Hook
 *
 * Manages state and actions for the inventory import wizard.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'

// =============================================================================
// TYPES
// =============================================================================

export interface ImportMapping {
  id?: string
  name: string
  description?: string
  mapping: Record<string, string>
}

export interface PreviewResult {
  preview: Array<{
    rowNumber: number
    operation: string
    sku: string
    name: string
    status: 'new' | 'update' | 'adjustment' | 'error' | 'skip'
    message: string
    currentStock?: number
    newStock?: number
    priceChange?: { old: number; new: number }
  }>
  summary: {
    totalRows: number
    newProducts: number
    updates: number
    adjustments: number
    errors: number
    skipped: number
  }
}

export interface ImportResult {
  success: number
  errors: string[]
}

export interface UseImportWizardOptions {
  clinic: string
  isOpen: boolean
  onClose: () => void
  onImportComplete: () => void
}

export interface UseImportWizardReturn {
  // Step management
  currentStep: number
  steps: string[]
  setCurrentStep: (step: number) => void

  // Source selection (Step 0)
  sourceType: 'file' | 'clipboard' | null
  file: File | null
  isParsingFile: boolean
  handleFileSelect: (file: File) => Promise<void>
  handleClipboardData: (headers: string[], rows: string[][]) => void

  // Data preview (Step 1)
  rawHeaders: string[]
  rawRows: string[][]

  // Column mapping (Step 2)
  columnMapping: Record<string, string>
  savedMappings: ImportMapping[]
  selectedMappingId: string | null
  newMappingName: string
  showSaveMapping: boolean
  isSavingMapping: boolean
  handleMappingChange: (colKey: string, targetField: string) => void
  applyPresetMapping: (mappingId: string) => void
  saveCurrentMapping: () => Promise<void>
  deleteMapping: (mappingId: string) => Promise<void>
  setNewMappingName: (name: string) => void
  setShowSaveMapping: (show: boolean) => void

  // Preview (Step 3)
  previewResult: PreviewResult | null
  isLoadingPreview: boolean
  showOnlyErrors: boolean
  setShowOnlyErrors: (show: boolean) => void
  runPreview: () => Promise<void>

  // Import (Step 4)
  isImporting: boolean
  importResult: ImportResult | null
  executeImport: () => Promise<void>

  // General
  error: string | null
  setError: (error: string | null) => void
  handleClose: () => void
  handleFinish: () => void
}

// Column auto-detection patterns
const COLUMN_PATTERNS: Record<string, RegExp[]> = {
  operation: [/operaci[oó]n/i, /^op$/i, /tipo/i],
  sku: [/sku/i, /c[oó]digo/i, /^id$/i, /product.*id/i],
  barcode: [/barcode/i, /c[oó]digo.*barra/i, /ean/i, /upc/i],
  name: [/nombre/i, /producto/i, /descripci[oó]n.*corta/i, /^name$/i],
  category: [/categor[ií]a/i, /^cat$/i],
  description: [/descripci[oó]n/i, /^desc$/i, /detalle/i],
  price: [/precio.*venta/i, /^precio$/i, /price/i, /venta/i],
  unit_cost: [/costo/i, /cost/i, /precio.*compra/i],
  quantity: [/cantidad/i, /stock/i, /qty/i, /quantity/i],
  min_stock: [/m[ií]nimo/i, /min.*stock/i, /reorder/i],
  expiry_date: [/vencimiento/i, /expir/i, /fecha.*exp/i],
  batch_number: [/lote/i, /batch/i],
}

// =============================================================================
// HOOK
// =============================================================================

export function useImportWizard({
  clinic,
  isOpen,
  onClose,
  onImportComplete,
}: UseImportWizardOptions): UseImportWizardReturn {
  const steps = ['Origen', 'Vista Previa', 'Mapear Columnas', 'Revisar', 'Confirmar']
  const [currentStep, setCurrentStep] = useState(0)

  // Step 1: Source selection
  const [sourceType, setSourceType] = useState<'file' | 'clipboard' | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isParsingFile, setIsParsingFile] = useState(false)

  // Step 2: Raw data preview
  const [rawHeaders, setRawHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<string[][]>([])

  // Step 3: Column mapping
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
  const [savedMappings, setSavedMappings] = useState<ImportMapping[]>([])
  const [selectedMappingId, setSelectedMappingId] = useState<string | null>(null)
  const [newMappingName, setNewMappingName] = useState('')
  const [showSaveMapping, setShowSaveMapping] = useState(false)
  const [isSavingMapping, setIsSavingMapping] = useState(false)

  // Step 4: Preview results
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [showOnlyErrors, setShowOnlyErrors] = useState(false)

  // Step 5: Import
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load saved mappings
  const loadSavedMappings = useCallback(async () => {
    try {
      const res = await fetch(`/api/inventory/mappings?clinic=${clinic}`)
      if (res.ok) {
        const data = await res.json()
        setSavedMappings(data.mappings || [])
      }
    } catch (e: unknown) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error loading mappings:', e)
      }
    }
  }, [clinic])

  useEffect(() => {
    if (isOpen) {
      loadSavedMappings()
    }
  }, [isOpen, loadSavedMappings])

  // Auto-detect column mappings
  const autoDetectMappings = useCallback((headers: string[]) => {
    const mapping: Record<string, string> = {}

    headers.forEach((header, idx) => {
      const headerKey = `col_${idx}`
      for (const [field, regexes] of Object.entries(COLUMN_PATTERNS)) {
        if (regexes.some((regex) => regex.test(header))) {
          if (!Object.values(mapping).includes(field)) {
            mapping[headerKey] = field
            break
          }
        }
      }
    })

    setColumnMapping(mapping)
  }, [])

  // Handle file selection
  const handleFileSelect = useCallback(
    async (selectedFile: File) => {
      setFile(selectedFile)
      setSourceType('file')
      setIsParsingFile(true)
      setError(null)

      try {
        const formData = new FormData()
        formData.append('file', selectedFile)

        const res = await fetch('/api/inventory/import/preview?parseOnly=true', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          throw new Error(await res.text())
        }

        const data = await res.json()
        setRawHeaders(data.headers || [])
        setRawRows(data.rows || [])
        autoDetectMappings(data.headers || [])
        setCurrentStep(1)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error al leer el archivo')
      } finally {
        setIsParsingFile(false)
      }
    },
    [autoDetectMappings]
  )

  // Handle clipboard data
  const handleClipboardData = useCallback(
    (headers: string[], rows: string[][]) => {
      setRawHeaders(headers)
      setRawRows(rows)
      setSourceType('clipboard')
      autoDetectMappings(headers)
      setCurrentStep(1)
    },
    [autoDetectMappings]
  )

  // Handle mapping change
  const handleMappingChange = useCallback((colKey: string, targetField: string) => {
    setColumnMapping((prev) => ({
      ...prev,
      [colKey]: targetField,
    }))
    setSelectedMappingId(null)
  }, [])

  // Apply preset mapping
  const applyPresetMapping = useCallback(
    (mappingId: string) => {
      const preset = savedMappings.find((m) => m.id === mappingId)
      if (preset) {
        setColumnMapping(preset.mapping)
        setSelectedMappingId(mappingId)
      }
    },
    [savedMappings]
  )

  // Save current mapping
  const saveCurrentMapping = useCallback(async () => {
    if (!newMappingName.trim()) return

    setIsSavingMapping(true)
    try {
      const res = await fetch(`/api/inventory/mappings?clinic=${clinic}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newMappingName.trim(),
          mapping: columnMapping,
        }),
      })

      if (res.ok) {
        await loadSavedMappings()
        setNewMappingName('')
        setShowSaveMapping(false)
      } else {
        throw new Error(await res.text())
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar mapeo')
    } finally {
      setIsSavingMapping(false)
    }
  }, [clinic, columnMapping, loadSavedMappings, newMappingName])

  // Delete mapping
  const deleteMapping = useCallback(
    async (mappingId: string) => {
      try {
        const res = await fetch(`/api/inventory/mappings/${mappingId}?clinic=${clinic}`, {
          method: 'DELETE',
        })
        if (res.ok) {
          await loadSavedMappings()
          if (selectedMappingId === mappingId) {
            setSelectedMappingId(null)
          }
        }
      } catch (e: unknown) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error deleting mapping:', e)
        }
      }
    },
    [clinic, loadSavedMappings, selectedMappingId]
  )

  // Run preview
  const runPreview = useCallback(async () => {
    setIsLoadingPreview(true)
    setError(null)

    try {
      const mappedRows = rawRows.map((row, idx) => {
        const mapped: Record<string, string> = {}
        rawHeaders.forEach((_, colIdx) => {
          const colKey = `col_${colIdx}`
          const targetField = columnMapping[colKey]
          if (targetField) {
            mapped[targetField] = row[colIdx] || ''
          }
        })
        return { rowNumber: idx + 2, ...mapped }
      })

      const res = await fetch('/api/inventory/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: mappedRows }),
      })

      if (!res.ok) {
        throw new Error(await res.text())
      }

      const data = await res.json()
      setPreviewResult(data)
      setCurrentStep(3)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error en vista previa')
    } finally {
      setIsLoadingPreview(false)
    }
  }, [columnMapping, rawHeaders, rawRows])

  // Execute import
  const executeImport = useCallback(async () => {
    setIsImporting(true)
    setError(null)

    try {
      const mappedRows = rawRows.map((row) => {
        const mapped: Record<string, string> = {}
        rawHeaders.forEach((_, colIdx) => {
          const colKey = `col_${colIdx}`
          const targetField = columnMapping[colKey]
          if (targetField) {
            mapped[targetField] = row[colIdx] || ''
          }
        })
        return mapped
      })

      const res = await fetch('/api/inventory/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: mappedRows }),
      })

      if (!res.ok) {
        throw new Error(await res.text())
      }

      const data = await res.json()
      setImportResult(data)
      setCurrentStep(4)

      // Update mapping usage count
      if (selectedMappingId) {
        await fetch(`/api/inventory/mappings/${selectedMappingId}/use?clinic=${clinic}`, {
          method: 'POST',
        })
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error en importación')
    } finally {
      setIsImporting(false)
    }
  }, [clinic, columnMapping, rawHeaders, rawRows, selectedMappingId])

  // Reset state
  const resetState = useCallback(() => {
    setCurrentStep(0)
    setSourceType(null)
    setFile(null)
    setRawHeaders([])
    setRawRows([])
    setColumnMapping({})
    setSelectedMappingId(null)
    setPreviewResult(null)
    setImportResult(null)
    setError(null)
    setShowSaveMapping(false)
    setNewMappingName('')
    setShowOnlyErrors(false)
  }, [])

  // Handle close
  const handleClose = useCallback(() => {
    resetState()
    onClose()
  }, [onClose, resetState])

  // Handle finish
  const handleFinish = useCallback(() => {
    handleClose()
    onImportComplete()
  }, [handleClose, onImportComplete])

  return {
    // Step management
    currentStep,
    steps,
    setCurrentStep,

    // Source selection
    sourceType,
    file,
    isParsingFile,
    handleFileSelect,
    handleClipboardData,

    // Data preview
    rawHeaders,
    rawRows,

    // Column mapping
    columnMapping,
    savedMappings,
    selectedMappingId,
    newMappingName,
    showSaveMapping,
    isSavingMapping,
    handleMappingChange,
    applyPresetMapping,
    saveCurrentMapping,
    deleteMapping,
    setNewMappingName,
    setShowSaveMapping,

    // Preview
    previewResult,
    isLoadingPreview,
    showOnlyErrors,
    setShowOnlyErrors,
    runPreview,

    // Import
    isImporting,
    importResult,
    executeImport,

    // General
    error,
    setError,
    handleClose,
    handleFinish,
  }
}
