'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Camera,
  X,
  Loader2,
  AlertCircle,
  Check,
  Keyboard,
  ScanLine,
} from 'lucide-react'

// =============================================================================
// TYPES
// =============================================================================

// Local type definition for html5-qrcode (avoids bundling issues)
interface Html5QrcodeInstance {
  start(
    cameraId: string | { facingMode: string },
    config: { fps: number; qrbox: { width: number; height: number }; aspectRatio?: number },
    onSuccess: (decodedText: string) => void,
    onError?: (error: string) => void
  ): Promise<null>
  stop(): Promise<void>
  clear(): void
}

interface BarcodeScannerProps {
  isOpen: boolean
  onClose: () => void
  onScan: (barcode: string) => void
  title?: string
  description?: string
}

interface ProductResult {
  id: string
  sku: string
  name: string
  base_price: number
  stock_quantity: number
}

interface BarcodeScanModalProps {
  isOpen: boolean
  onClose: () => void
  onProductFound: (product: ProductResult, barcode: string) => void
  clinic: string
}

// =============================================================================
// BARCODE SCANNER COMPONENT
// =============================================================================

/**
 * Camera-based barcode scanner using html5-qrcode
 * Supports EAN-13, UPC-A, Code128 and other common formats
 */
export function BarcodeScanner({
  isOpen,
  onClose,
  onScan,
  title = 'Escanear Código de Barras',
  description,
}: BarcodeScannerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [manualMode, setManualMode] = useState(false)
  const [manualInput, setManualInput] = useState('')
  const scannerRef = useRef<Html5QrcodeInstance | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const startScanner = useCallback(async () => {
    if (!containerRef.current) return

    setIsLoading(true)
    setError(null)

    try {
      // Dynamically import html5-qrcode (client-side only)
      const { Html5Qrcode } = await import('html5-qrcode')

      // Clear any existing scanner
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop()
          scannerRef.current.clear()
        } catch (_error: unknown) {
          // Ignore cleanup errors
        }
      }

      const html5Qrcode = new Html5Qrcode('barcode-scanner-container')
      scannerRef.current = html5Qrcode

      await html5Qrcode.start(
        { facingMode: 'environment' }, // Use back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.5,
        },
        (decodedText) => {
          // Barcode scanned successfully
          onScan(decodedText)
        },
        (errorMessage) => {
          // Scan error - ignore, keep scanning
          // eslint-disable-next-line no-console
          console.debug('Scanning...', errorMessage)
        }
      )

      setIsLoading(false)
    } catch (e) {
      // Client-side error logging - only in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Camera error:', e)
      }
      setError(
        e instanceof Error
          ? e.message.includes('NotAllowedError') || e.message.includes('Permission')
            ? 'Permiso de cámara denegado. Por favor permite el acceso a la cámara.'
            : e.message.includes('NotFoundError')
              ? 'No se encontró cámara en este dispositivo.'
              : e.message
          : 'Error al iniciar la cámara'
      )
      setIsLoading(false)
      setManualMode(true)
    }
  }, [onScan])

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
      } catch (_error: unknown) {
        // Ignore cleanup errors
      }
      scannerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (isOpen && !manualMode) {
      startScanner()
    }

    return () => {
      stopScanner()
    }
  }, [isOpen, manualMode, startScanner, stopScanner])

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualInput.trim()) {
      onScan(manualInput.trim())
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <div>
            <h3 className="font-bold text-gray-900">{title}</h3>
            {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
          </div>
          <button
            onClick={() => {
              stopScanner()
              onClose()
            }}
            className="rounded-lg p-2 hover:bg-gray-100"
            aria-label="Cerrar escáner"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {manualMode ? (
            /* Manual Entry Mode */
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="mb-4 text-center">
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                  <Keyboard className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">Ingresa el código de barras manualmente</p>
              </div>

              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Ej: 7891234567890"
                className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 px-4 py-3 text-center font-mono text-lg outline-none focus:border-[var(--primary)] focus:ring-2"
                autoFocus
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setManualMode(false)
                    setManualInput('')
                  }}
                  className="flex flex-1 items-center justify-center gap-2 py-3 font-medium text-gray-500 hover:text-gray-700"
                >
                  <Camera className="h-4 w-4" />
                  Usar Cámara
                </button>
                <button
                  type="submit"
                  disabled={!manualInput.trim()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-3 font-bold text-white hover:opacity-90 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  Buscar
                </button>
              </div>
            </form>
          ) : (
            /* Camera Mode */
            <div className="space-y-4">
              {/* Scanner Container */}
              <div
                ref={containerRef}
                className="relative aspect-[4/3] overflow-hidden rounded-xl bg-black"
              >
                <div id="barcode-scanner-container" className="h-full w-full" />

                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="text-center text-white">
                      <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin" />
                      <p className="text-sm">Iniciando cámara...</p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4">
                    <div className="text-center text-white">
                      <AlertCircle className="mx-auto mb-3 h-12 w-12 text-[var(--status-error)]" />
                      <p className="text-sm">{error}</p>
                    </div>
                  </div>
                )}

                {/* Scan Guide Overlay */}
                {!isLoading && !error && (
                  <div className="pointer-events-none absolute inset-0">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative h-24 w-64 rounded-lg border-2 border-white/50">
                        {/* Corner marks */}
                        <div className="absolute -left-1 -top-1 h-4 w-4 border-l-2 border-t-2 border-[var(--primary)]" />
                        <div className="absolute -right-1 -top-1 h-4 w-4 border-r-2 border-t-2 border-[var(--primary)]" />
                        <div className="absolute -bottom-1 -left-1 h-4 w-4 border-b-2 border-l-2 border-[var(--primary)]" />
                        <div className="absolute -bottom-1 -right-1 h-4 w-4 border-b-2 border-r-2 border-[var(--primary)]" />
                        {/* Scan line animation */}
                        <div className="absolute left-0 right-0 top-1/2 h-0.5 animate-pulse bg-red-500/70" />
                      </div>
                    </div>
                    <p className="absolute bottom-4 left-0 right-0 text-center text-sm text-white">
                      Centra el código de barras en el recuadro
                    </p>
                  </div>
                )}
              </div>

              {/* Manual entry button */}
              <button
                onClick={() => setManualMode(true)}
                className="flex w-full items-center justify-center gap-2 py-3 font-medium text-gray-500 hover:text-gray-700"
              >
                <Keyboard className="h-4 w-4" />
                Ingresar código manualmente
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// BARCODE SCAN MODAL (WITH PRODUCT LOOKUP)
// =============================================================================

/**
 * Complete barcode scan modal with product lookup
 * Shows scanner, looks up product, and returns result
 */
export function BarcodeScanModal({
  isOpen,
  onClose,
  onProductFound,
  clinic,
}: BarcodeScanModalProps) {
  const [isSearching, setIsSearching] = useState(false)
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleScan = async (barcode: string) => {
    setScannedBarcode(barcode)
    setIsSearching(true)
    setNotFound(false)
    setError(null)

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
      onProductFound(product, barcode)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al buscar producto')
    } finally {
      setIsSearching(false)
    }
  }

  const handleClose = () => {
    setScannedBarcode(null)
    setNotFound(false)
    setError(null)
    onClose()
  }

  const handleScanAgain = () => {
    setScannedBarcode(null)
    setNotFound(false)
    setError(null)
  }

  if (!isOpen) return null

  // Show result screen if we have a scanned barcode
  if (scannedBarcode) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="p-6 text-center">
            {isSearching ? (
              <div>
                <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-[var(--primary)]" />
                <p className="font-medium text-gray-900">Buscando producto...</p>
                <p className="mt-1 font-mono text-sm text-gray-500">{scannedBarcode}</p>
              </div>
            ) : notFound ? (
              <div>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--status-warning-bg)]">
                  <ScanLine className="h-8 w-8 text-[var(--status-warning)]" />
                </div>
                <h3 className="mb-2 font-bold text-gray-900">Producto No Encontrado</h3>
                <p className="mb-1 text-sm text-gray-500">
                  No se encontró un producto con el código:
                </p>
                <p className="font-mono text-lg text-gray-900">{scannedBarcode}</p>
              </div>
            ) : error ? (
              <div>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--status-error-bg)]">
                  <AlertCircle className="h-8 w-8 text-[var(--status-error)]" />
                </div>
                <h3 className="mb-2 font-bold text-gray-900">Error</h3>
                <p className="text-sm text-[var(--status-error)]">{error}</p>
              </div>
            ) : null}
          </div>

          {!isSearching && (notFound || error) && (
            <div className="flex gap-3 border-t bg-gray-50 p-6">
              <button
                onClick={handleClose}
                className="flex-1 py-3 font-medium text-gray-500 hover:text-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleScanAgain}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-3 font-bold text-white hover:opacity-90"
              >
                <Camera className="h-4 w-4" />
                Escanear Otro
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <BarcodeScanner
      isOpen={isOpen}
      onClose={handleClose}
      onScan={handleScan}
      title="Escanear Producto"
      description="Escanea el código de barras para buscar el producto"
    />
  )
}
