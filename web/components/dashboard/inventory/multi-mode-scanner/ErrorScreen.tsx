'use client'

/**
 * Error Screen
 *
 * Displays error state when product lookup fails or product is not found.
 * Offers retry and mode change options.
 */

import { Camera, ScanLine, AlertCircle } from 'lucide-react'
import type { ErrorScreenProps } from './types'

export function ErrorScreen({ notFound, error, onChangeMode, onRetry }: ErrorScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Error Content */}
        <div className="p-6 text-center">
          <div
            className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
              notFound ? 'bg-[var(--status-warning-bg)]' : 'bg-[var(--status-error-bg)]'
            }`}
          >
            {notFound ? (
              <ScanLine className="h-8 w-8 text-[var(--status-warning)]" />
            ) : (
              <AlertCircle className="h-8 w-8 text-[var(--status-error)]" />
            )}
          </div>
          <h3 className="mb-2 font-bold text-gray-900">
            {notFound ? 'Producto No Encontrado' : 'Error'}
          </h3>
          <p className="text-sm text-gray-500">
            {notFound ? 'No existe un producto con ese código de barras' : error}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 border-t bg-gray-50 p-4">
          <button
            onClick={onChangeMode}
            className="flex-1 py-3 font-medium text-gray-500 hover:text-gray-700"
          >
            Cambiar Modo
          </button>
          <button
            onClick={onRetry}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-3 font-bold text-white hover:opacity-90"
          >
            <Camera className="h-4 w-4" />
            Reintentar
          </button>
        </div>
      </div>
    </div>
  )
}
