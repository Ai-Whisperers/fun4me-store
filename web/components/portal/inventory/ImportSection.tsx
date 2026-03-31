'use client'

/**
 * Import Section Component
 *
 * Excel file upload area with results display and instructions panel.
 */

import { Upload, Loader2, AlertCircle, CheckCircle2, Info } from 'lucide-react'
import type { ImportResult } from './types'

interface ImportSectionProps {
  isUploading: boolean
  result: ImportResult | null
  error: string | null
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function ImportSection({
  isUploading,
  result,
  error,
  onFileUpload,
}: ImportSectionProps): React.ReactElement {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Upload Section */}
      <div className="group relative flex min-h-[400px] flex-col items-center justify-center overflow-hidden rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
        <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent opacity-0 transition-opacity group-hover:opacity-100"></div>

        <div className="bg-[var(--primary)]/10 mb-6 flex h-20 w-20 items-center justify-center rounded-full transition-transform group-hover:scale-110">
          <Upload className="h-10 w-10 text-[var(--primary)]" />
        </div>

        <h2 className="mb-2 text-2xl font-bold text-gray-900">Importar Actualizaciones</h2>
        <p className="mb-8 max-w-sm text-center text-gray-400">
          Arrastra tu archivo Excel o haz clic abajo para procesar los cambios de stock y nuevos
          productos.
        </p>

        <label
          className={`relative inline-flex cursor-pointer items-center gap-3 rounded-2xl bg-gray-900 px-8 py-4 font-bold text-white shadow-xl transition-all hover:-translate-y-1 active:scale-95 ${isUploading ? 'pointer-events-none opacity-50' : ''} `}
        >
          {isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Upload className="h-5 w-5" />
          )}
          {isUploading ? 'Procesando...' : 'Seleccionar Archivo'}
          <input
            type="file"
            className="hidden"
            accept=".xlsx, .xls"
            onChange={onFileUpload}
            disabled={isUploading}
          />
        </label>
      </div>

      {/* Results & Help */}
      <div className="space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="animate-in fade-in slide-in-from-top-4 flex items-start gap-4 rounded-3xl border border-red-100 bg-red-50 p-6">
            <AlertCircle className="h-6 w-6 shrink-0 text-red-500" />
            <div>
              <h3 className="font-bold text-red-900">Error en la importación</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {result && (
          <div className="animate-in fade-in slide-in-from-top-4 space-y-4 rounded-3xl border border-green-100 bg-green-50 p-6">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-green-500" />
              <div>
                <h3 className="font-bold text-green-900">Importación exitosa</h3>
                <p className="mt-1 text-sm text-green-700">
                  Se han procesado **{result.success}** filas correctamente.
                </p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="rounded-2xl bg-white/50 p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-red-500">
                  Observaciones ({result.errors.length}):
                </p>
                <ul className="max-h-40 list-inside list-disc space-y-1 overflow-y-auto text-xs text-gray-600">
                  {result.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Instructions Card */}
        <div className="h-full space-y-6 rounded-3xl bg-gray-900 p-8 text-white shadow-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
              <Info className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold">Guía de Operaciones</h3>
          </div>

          <div className="grid gap-4">
            <div className="flex gap-3">
              <div className="h-fit shrink-0 rounded bg-[var(--primary)] px-2 py-1 text-xs font-black text-white">
                NEW
              </div>
              <p className="text-sm text-gray-400">
                <span className="font-bold text-white">New Product:</span> Deja el SKU vacío para
                crear un nuevo item.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="h-fit shrink-0 rounded bg-blue-500 px-2 py-1 text-xs font-black text-white">
                BUY
              </div>
              <p className="text-sm text-gray-400">
                <span className="font-bold text-white">Purchase:</span> Agrega cantidad positiva y
                costo por unidad.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="h-fit shrink-0 rounded bg-red-500 px-2 py-1 text-xs font-black text-white">
                LOS
              </div>
              <p className="text-sm text-gray-400">
                <span className="font-bold text-white">Damage/Theft:</span> Usa cantidad negativa
                para descontar stock.
              </p>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4">
            <p className="text-xs italic text-gray-500">
              Cada compra (Purchase) actualiza automáticamente el Costo Promedio Ponderado para
              tus reportes de utilidad.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
