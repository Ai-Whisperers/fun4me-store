'use client'

import { useState, useCallback, useRef } from 'react'
import { ClipboardPaste, Loader2, Check, AlertCircle, X } from 'lucide-react'

interface ClipboardImportProps {
  onDataParsed: (headers: string[], rows: string[][]) => void
}

/**
 * Component for pasting spreadsheet data (from Excel or Google Sheets)
 * Parses tab-separated values from clipboard
 */
export function ClipboardImport({ onDataParsed }: ClipboardImportProps) {
  const [isPasting, setIsPasting] = useState(false)
  const [showPasteArea, setShowPasteArea] = useState(false)
  const [pasteValue, setPasteValue] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)
  const [rowCount, setRowCount] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const parseClipboardData = useCallback(
    (text: string): { headers: string[]; rows: string[][] } | null => {
      if (!text.trim()) {
        return null
      }

      // Split by lines, handling both \r\n and \n
      const lines = text.trim().split(/\r?\n/)

      if (lines.length < 2) {
        throw new Error('Se necesitan al menos 2 filas (encabezados + datos)')
      }

      // Parse each line as tab-separated values
      const parseLine = (line: string): string[] => {
        // Handle quoted values with tabs inside
        const values: string[] = []
        let current = ''
        let inQuotes = false

        for (let i = 0; i < line.length; i++) {
          const char = line[i]

          if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
              // Escaped quote
              current += '"'
              i++
            } else {
              inQuotes = !inQuotes
            }
          } else if (char === '\t' && !inQuotes) {
            values.push(current.trim())
            current = ''
          } else {
            current += char
          }
        }
        values.push(current.trim())

        return values
      }

      const headers = parseLine(lines[0])
      const rows = lines
        .slice(1)
        .map((line) => parseLine(line))
        .filter((row) => row.some((cell) => cell.length > 0)) // Filter empty rows

      if (headers.length === 0) {
        throw new Error('No se detectaron columnas')
      }

      if (rows.length === 0) {
        throw new Error('No se detectaron filas de datos')
      }

      // Normalize row lengths to match headers
      const normalizedRows = rows.map((row) => {
        while (row.length < headers.length) {
          row.push('')
        }
        return row.slice(0, headers.length)
      })

      return { headers, rows: normalizedRows }
    },
    []
  )

  const handlePasteFromClipboard = async () => {
    setIsPasting(true)
    setParseError(null)

    try {
      const text = await navigator.clipboard.readText()

      if (!text.trim()) {
        throw new Error('El portapapeles está vacío')
      }

      const result = parseClipboardData(text)
      if (result) {
        onDataParsed(result.headers, result.rows)
      }
    } catch (e) {
      if (e instanceof Error) {
        if (e.name === 'NotAllowedError') {
          // Clipboard API not allowed, show paste area instead
          setShowPasteArea(true)
          setTimeout(() => textareaRef.current?.focus(), 100)
        } else {
          setParseError(e.message)
        }
      } else {
        setParseError('Error al leer el portapapeles')
      }
    } finally {
      setIsPasting(false)
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    setPasteValue(text)
    setParseError(null)

    // Count rows for preview
    const lines = text
      .trim()
      .split(/\r?\n/)
      .filter((l) => l.trim())
    setRowCount(Math.max(0, lines.length - 1)) // -1 for header
  }

  const handleTextareaPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text')
    setPasteValue(text)
    setParseError(null)

    // Count rows
    const lines = text
      .trim()
      .split(/\r?\n/)
      .filter((l) => l.trim())
    setRowCount(Math.max(0, lines.length - 1))
  }

  const handleProcessPastedData = () => {
    setParseError(null)

    try {
      const result = parseClipboardData(pasteValue)
      if (result) {
        onDataParsed(result.headers, result.rows)
        setShowPasteArea(false)
        setPasteValue('')
      }
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Error al procesar datos')
    }
  }

  const handleCancelPaste = () => {
    setShowPasteArea(false)
    setPasteValue('')
    setParseError(null)
    setRowCount(0)
  }

  if (showPasteArea) {
    return (
      <div className="bg-[var(--primary)]/5 rounded-2xl border-2 border-dashed border-[var(--primary)] p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardPaste className="h-5 w-5 text-[var(--primary)]" />
            <h4 className="font-bold text-gray-900">Pegar Datos</h4>
          </div>
          <button onClick={handleCancelPaste} className="rounded p-1 hover:bg-gray-100" aria-label="Cancelar pegado">
            <X className="h-4 w-4 text-gray-400" aria-hidden="true" />
          </button>
        </div>

        <div className="mb-4">
          <p className="mb-3 text-sm text-gray-500">
            Copia las celdas desde Excel o Google Sheets y pégalas aquí:
          </p>
          <textarea
            ref={textareaRef}
            value={pasteValue}
            onChange={handleTextareaChange}
            onPaste={handleTextareaPaste}
            placeholder="Pega los datos aquí (Ctrl+V o Cmd+V)..."
            className="focus:ring-[var(--primary)]/20 h-32 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 font-mono text-sm outline-none focus:border-[var(--primary)] focus:ring-2"
          />
        </div>

        {parseError && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-[var(--status-error-border)] bg-[var(--status-error-bg)] p-3 text-sm text-[var(--status-error)]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {parseError}
          </div>
        )}

        {rowCount > 0 && !parseError && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-[var(--status-success-border)] bg-[var(--status-success-bg)] p-3 text-sm text-[var(--status-success)]">
            <Check className="h-4 w-4" />
            {rowCount} filas de datos detectadas
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleCancelPaste}
            className="flex-1 py-2.5 font-medium text-gray-500 hover:text-gray-700"
          >
            Cancelar
          </button>
          <button
            onClick={handleProcessPastedData}
            disabled={!pasteValue.trim() || rowCount === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] py-2.5 font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            Procesar Datos
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={handlePasteFromClipboard}
      disabled={isPasting}
      className="rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center transition-all hover:border-[var(--primary)] hover:bg-gray-50"
    >
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary)]/10">
        {isPasting ? (
          <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
        ) : (
          <ClipboardPaste className="h-8 w-8 text-[var(--primary)]" />
        )}
      </div>
      <h4 className="mb-2 font-bold text-gray-900">Pegar desde Hoja de Cálculo</h4>
      <p className="mb-4 text-sm text-gray-500">Excel, Google Sheets, etc.</p>
      <span className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-white">
        <ClipboardPaste className="h-4 w-4" />
        {isPasting ? 'Leyendo...' : 'Pegar del Portapapeles'}
      </span>
      <p className="mt-3 text-xs text-gray-400">Copia las celdas en Excel y haz clic aquí</p>
    </button>
  )
}
