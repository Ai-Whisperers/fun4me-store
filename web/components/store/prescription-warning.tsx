'use client'

import { AlertTriangle, FileText, Pill, Info } from 'lucide-react'

interface PrescriptionWarningProps {
  /** Product name for context */
  productName?: string
  /** Compact mode for use in lists/cards */
  compact?: boolean
  /** Show additional info about prescription process */
  showDetails?: boolean
  /** Custom class name */
  className?: string
}

/**
 * Warning component displayed on products that require a prescription.
 * Shows different levels of detail based on context (product page vs list).
 *
 * FEAT-013: Store Prescription Verification
 */
export function PrescriptionWarning({
  productName,
  compact = false,
  showDetails = false,
  className = '',
}: PrescriptionWarningProps) {
  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 ${className}`}
      >
        <Pill className="h-3 w-3" />
        <span>Receta Requerida</span>
      </div>
    )
  }

  return (
    <div
      className={`rounded-xl border border-amber-200 bg-amber-50 p-4 ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-amber-800">Receta Médica Requerida</h4>
          <p className="mt-1 text-sm text-amber-700">
            {productName ? (
              <>
                <span className="font-medium">{productName}</span> requiere una receta médica
                vigente para su despacho.
              </>
            ) : (
              'Este producto requiere una receta médica vigente para su despacho.'
            )}
          </p>

          {showDetails && (
            <div className="mt-3 space-y-2 text-sm text-amber-700">
              <div className="flex items-start gap-2">
                <FileText className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Deberá seleccionar la mascota para la cual está comprando y subir la receta al
                  momento del checkout.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Un veterinario verificará que la receta corresponda al producto antes de aprobar
                  el pedido.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Inline badge for prescription products in lists.
 * Minimal footprint for use in product cards/lists.
 */
export function PrescriptionBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 ${className}`}
      title="Este producto requiere receta médica"
    >
      <Pill className="h-3 w-3" />
      Rx
    </span>
  )
}

/**
 * Banner shown at checkout when cart contains prescription items.
 */
export function PrescriptionCheckoutBanner({
  itemCount,
  hasPetSelected,
  hasAllPrescriptions,
  className = '',
}: {
  itemCount: number
  hasPetSelected: boolean
  hasAllPrescriptions: boolean
  className?: string
}) {
  const isReady = hasPetSelected && hasAllPrescriptions

  return (
    <div
      className={`rounded-xl border p-4 ${
        isReady
          ? 'border-green-200 bg-green-50'
          : 'border-amber-200 bg-amber-50'
      } ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            isReady ? 'bg-green-100' : 'bg-amber-100'
          }`}
        >
          {isReady ? (
            <FileText className="h-4 w-4 text-green-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          )}
        </div>
        <div className="flex-1">
          <h4 className={`font-semibold ${isReady ? 'text-green-800' : 'text-amber-800'}`}>
            {isReady ? 'Recetas Verificadas' : 'Receta Médica Requerida'}
          </h4>
          <p className={`mt-1 text-sm ${isReady ? 'text-green-700' : 'text-amber-700'}`}>
            {isReady ? (
              `${itemCount} producto${itemCount > 1 ? 's' : ''} con receta listo${itemCount > 1 ? 's' : ''} para procesar.`
            ) : (
              <>
                {itemCount} producto{itemCount > 1 ? 's requieren' : ' requiere'} receta médica.
                {!hasPetSelected && ' Seleccione una mascota.'}
                {hasPetSelected && !hasAllPrescriptions && ' Suba las recetas requeridas.'}
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
