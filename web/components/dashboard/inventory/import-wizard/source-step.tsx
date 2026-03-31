'use client'

import { Upload, FileSpreadsheet, Loader2 } from 'lucide-react'
import { ClipboardImport } from '../clipboard-import'

interface SourceStepProps {
  isParsingFile: boolean
  onFileSelect: (file: File) => Promise<void>
  onClipboardData: (headers: string[], rows: string[][]) => void
}

export function SourceStep({ isParsingFile, onFileSelect, onClipboardData }: SourceStepProps) {
  return (
    <div className="space-y-6">
      <div className="mb-8 text-center">
        <h3 className="mb-2 text-lg font-bold text-gray-900">Elige el origen de los datos</h3>
        <p className="text-gray-500">
          Sube un archivo Excel/CSV o pega datos desde una hoja de cálculo
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* File Upload */}
        <label
          className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
            isParsingFile
              ? 'border-[var(--primary)] bg-[var(--primary)]/5'
              : 'border-gray-200 hover:border-[var(--primary)] hover:bg-gray-50'
          }`}
        >
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
            disabled={isParsingFile}
          />
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary)]/10">
            {isParsingFile ? (
              <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
            ) : (
              <FileSpreadsheet className="h-8 w-8 text-[var(--primary)]" />
            )}
          </div>
          <h4 className="mb-2 font-bold text-gray-900">Subir Archivo</h4>
          <p className="mb-4 text-sm text-gray-500">Excel (.xlsx, .xls) o CSV</p>
          <span className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-white">
            <Upload className="h-4 w-4" />
            Seleccionar Archivo
          </span>
        </label>

        {/* Clipboard Paste */}
        <ClipboardImport onDataParsed={onClipboardData} />
      </div>
    </div>
  )
}
