'use client'

/**
 * Multi-Mode Scanner
 *
 * Barcode scanner component for inventory operations.
 * Supports three modes: lookup, receive stock, and physical count.
 *
 * @example
 * ```tsx
 * <MultiModeScanner
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   clinic="terrapet"
 *   onActionComplete={(action) => console.log(action)}
 * />
 * ```
 */

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { BarcodeScanner } from '../barcode-scanner'
import { ModeSelectionScreen } from './ModeSelectionScreen'
import { ErrorScreen } from './ErrorScreen'
import { ActionScreen } from './ActionScreen'
import { MODE_CONFIG } from './mode-config'
import type { ScannerMode, ScannedProduct, MultiModeScannerProps } from './types'

// Re-export types for external use
export type { ScannerMode, ScannedProduct, MultiModeScannerProps } from './types'

export function MultiModeScanner({
  isOpen,
  onClose,
  clinic,
  initialMode = 'lookup',
  onActionComplete,
}: MultiModeScannerProps) {
  // Scanner state
  const [mode, setMode] = useState<ScannerMode>(initialMode)
  const [step, setStep] = useState<'select-mode' | 'scanning' | 'action'>('select-mode')
  const [scannedProduct, setScannedProduct] = useState<ScannedProduct | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  // Action form state
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionSuccess, setActionSuccess] = useState(false)

  // Continuous scanning for batch operations
  const [continuousMode, setContinuousMode] = useState(false)
  const [scannedCount, setScannedCount] = useState(0)

  // =============================================================================
  // Handlers
  // =============================================================================

  const resetState = () => {
    setScannedProduct(null)
    setError(null)
    setNotFound(false)
    setQuantity(1)
    setNotes('')
    setIsSubmitting(false)
    setActionSuccess(false)
  }

  const handleModeSelect = (selectedMode: ScannerMode) => {
    setMode(selectedMode)
    setStep('scanning')
    resetState()
  }

  const handleScan = async (barcode: string) => {
    setIsSearching(true)
    setError(null)
    setNotFound(false)

    try {
      const res = await fetch(
        `/api/inventory/barcode-lookup?barcode=${encodeURIComponent(barcode)}&clinic=${clinic}`
      )

      if (res.status === 404) {
        setNotFound(true)
        return
      }

      if (!res.ok) {
        throw new Error(await res.text())
      }

      const product = await res.json()
      setScannedProduct({ ...product, barcode })
      setStep('action')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al buscar producto')
    } finally {
      setIsSearching(false)
    }
  }

  const handleAction = async () => {
    if (!scannedProduct) return

    setIsSubmitting(true)
    setError(null)

    try {
      if (mode === 'lookup') {
        onActionComplete?.({ mode, product: scannedProduct, quantity: 0 })
        handleClose()
        return
      }

      const endpoint = mode === 'receive' ? '/api/inventory/receive' : '/api/inventory/adjust'

      const body =
        mode === 'receive'
          ? {
              product_id: scannedProduct.id,
              quantity: quantity,
              notes: notes || `Recepción via escáner - ${scannedProduct.barcode}`,
            }
          : {
              product_id: scannedProduct.id,
              new_quantity: quantity,
              reason: 'physical_count',
              notes: notes || `Conteo físico via escáner - ${scannedProduct.barcode}`,
            }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.details?.message || 'Error al procesar')
      }

      setActionSuccess(true)
      setScannedCount((c) => c + 1)

      onActionComplete?.({ mode, product: scannedProduct, quantity, notes })

      if (continuousMode) {
        setTimeout(() => {
          resetState()
          setStep('scanning')
        }, 1500)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setStep('select-mode')
    setMode(initialMode)
    resetState()
    setScannedCount(0)
    setContinuousMode(false)
    onClose()
  }

  const handleScanAnother = () => {
    resetState()
    setStep('scanning')
  }

  // =============================================================================
  // Render
  // =============================================================================

  if (!isOpen) return null

  // Mode selection screen
  if (step === 'select-mode') {
    return (
      <ModeSelectionScreen
        onModeSelect={handleModeSelect}
        onClose={handleClose}
        continuousMode={continuousMode}
        setContinuousMode={setContinuousMode}
      />
    )
  }

  // Scanning screen
  if (step === 'scanning') {
    const config = MODE_CONFIG[mode]

    if (isSearching) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 text-center shadow-2xl">
            <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-[var(--primary)]" />
            <p className="font-medium text-gray-900">Buscando producto...</p>
          </div>
        </div>
      )
    }

    if (notFound || error) {
      return (
        <ErrorScreen
          notFound={notFound}
          error={error}
          onChangeMode={() => setStep('select-mode')}
          onRetry={() => {
            setError(null)
            setNotFound(false)
          }}
        />
      )
    }

    return (
      <BarcodeScanner
        isOpen={true}
        onClose={() => setStep('select-mode')}
        onScan={handleScan}
        title={config.label}
        description={config.description}
      />
    )
  }

  // Action screen
  if (step === 'action' && scannedProduct) {
    return (
      <ActionScreen
        mode={mode}
        product={scannedProduct}
        quantity={quantity}
        setQuantity={setQuantity}
        notes={notes}
        setNotes={setNotes}
        error={error}
        isSubmitting={isSubmitting}
        actionSuccess={actionSuccess}
        continuousMode={continuousMode}
        scannedCount={scannedCount}
        onAction={handleAction}
        onClose={handleClose}
        onScanAnother={handleScanAnother}
      />
    )
  }

  return null
}
