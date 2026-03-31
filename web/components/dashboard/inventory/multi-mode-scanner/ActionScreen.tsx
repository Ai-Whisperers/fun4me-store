'use client'

/**
 * Action Screen
 *
 * Displays product information and action form for the selected scanner mode.
 * Handles quantity input, notes, and action submission.
 */

import {
  Camera,
  Loader2,
  AlertCircle,
  Check,
  Package,
  Minus,
  Plus,
} from 'lucide-react'
import { MODE_CONFIG } from './mode-config'
import type { ActionScreenProps } from './types'

export function ActionScreen({
  mode,
  product,
  quantity,
  setQuantity,
  notes,
  setNotes,
  error,
  isSubmitting,
  actionSuccess,
  continuousMode,
  scannedCount,
  onAction,
  onClose,
  onScanAnother,
}: ActionScreenProps) {
  const config = MODE_CONFIG[mode]
  const Icon = config.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header with mode indicator */}
        <div className={`${config.bgColor} p-4`}>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white/80 p-2">
              <Icon className={`h-5 w-5 ${config.color}`} />
            </div>
            <div>
              <p className={`text-sm font-medium ${config.color}`}>{config.label}</p>
              {continuousMode && scannedCount > 0 && (
                <p className="text-xs opacity-70">
                  {scannedCount} producto{scannedCount !== 1 ? 's' : ''} procesado
                  {scannedCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Product Info */}
        <div className="border-b p-4">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gray-100">
              <Package className="h-8 w-8 text-gray-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-bold text-gray-900">{product.name}</h3>
              <p className="text-sm text-gray-500">SKU: {product.sku || 'N/A'}</p>
              <div className="mt-2 flex items-center gap-4">
                <span className="text-sm text-gray-500">
                  Stock actual:{' '}
                  <span className="font-bold text-gray-900">{product.stock_quantity}</span>
                </span>
                <span className="text-sm text-gray-500">
                  Precio:{' '}
                  <span className="font-bold text-gray-900">
                    {new Intl.NumberFormat('es-PY', {
                      style: 'currency',
                      currency: 'PYG',
                      minimumFractionDigits: 0,
                    }).format(product.base_price)}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Form */}
        {mode !== 'lookup' && !actionSuccess && (
          <div className="space-y-4 p-4">
            <QuantityInput
              mode={mode}
              quantity={quantity}
              setQuantity={setQuantity}
              stockQuantity={product.stock_quantity}
            />

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Notas (opcional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={mode === 'receive' ? 'Ej: Factura #1234' : 'Ej: Conteo semanal'}
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 focus:border-[var(--primary)] focus:outline-none"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-[var(--status-error-bg)] p-3 text-sm text-[var(--status-error)]">
                <AlertCircle className="mr-2 inline h-4 w-4" />
                {error}
              </div>
            )}
          </div>
        )}

        {/* Success State */}
        {actionSuccess && (
          <div className="p-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--status-success-bg)]">
              <Check className="h-8 w-8 text-[var(--status-success)]" />
            </div>
            <h3 className="mb-2 font-bold text-gray-900">¡Operación Exitosa!</h3>
            <p className="text-sm text-gray-500">
              {mode === 'receive'
                ? `Se agregaron ${quantity} unidades al stock`
                : `Stock actualizado a ${quantity} unidades`}
            </p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex gap-3 border-t bg-gray-50 p-4">
          {actionSuccess ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 py-3 font-medium text-gray-500 hover:text-gray-700"
              >
                Cerrar
              </button>
              <button
                onClick={onScanAnother}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-3 font-bold text-white hover:opacity-90"
              >
                <Camera className="h-4 w-4" />
                Escanear Otro
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onScanAnother}
                className="flex-1 py-3 font-medium text-gray-500 hover:text-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={onAction}
                disabled={isSubmitting || (mode !== 'lookup' && quantity < 1)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-3 font-bold text-white hover:opacity-90 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {config.actionLabel}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Quantity Input Sub-component
// =============================================================================

interface QuantityInputProps {
  mode: 'receive' | 'count'
  quantity: number
  setQuantity: (q: number | ((prev: number) => number)) => void
  stockQuantity: number
}

function QuantityInput({ mode, quantity, setQuantity, stockQuantity }: QuantityInputProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {mode === 'receive' ? 'Cantidad a agregar' : 'Cantidad contada'}
      </label>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-gray-200 hover:border-gray-300"
          aria-label="Disminuir cantidad"
        >
          <Minus className="h-5 w-5" />
        </button>
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
          className="h-12 flex-1 rounded-xl border-2 border-gray-200 text-center text-xl font-bold focus:border-[var(--primary)] focus:outline-none"
          min={0}
        />
        <button
          onClick={() => setQuantity((q) => q + 1)}
          className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-gray-200 hover:border-gray-300"
          aria-label="Aumentar cantidad"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Quick quantity buttons */}
      <div className="mt-2 flex gap-2">
        {[1, 5, 10, 25, 50].map((q) => (
          <button
            key={q}
            onClick={() => setQuantity(q)}
            className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors ${
              quantity === q
                ? 'bg-[var(--primary)] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Difference indicator for count mode */}
      {mode === 'count' && (
        <p className="mt-2 text-sm text-gray-500">
          Diferencia:{' '}
          <span
            className={`font-bold ${
              quantity - stockQuantity > 0
                ? 'text-[var(--status-success)]'
                : quantity - stockQuantity < 0
                  ? 'text-[var(--status-error)]'
                  : 'text-gray-600'
            }`}
          >
            {quantity - stockQuantity > 0 ? '+' : ''}
            {quantity - stockQuantity}
          </span>
        </p>
      )}
    </div>
  )
}
