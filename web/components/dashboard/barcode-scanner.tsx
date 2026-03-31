'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  ScanLine,
  Flashlight,
  SwitchCamera,
} from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
// Import browser API types for BarcodeDetector and torch
import '@/lib/types/browser-apis'

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onClose: () => void
  isOpen: boolean
}

interface ScannedProduct {
  id: string
  sku: string
  name: string
  stock: number
  price: number
}

export function BarcodeScanner({
  onScan,
  onClose,
  isOpen,
}: BarcodeScannerProps): React.ReactElement {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scannedCode, setScannedCode] = useState<string | null>(null)
  const [scannedProduct, setScannedProduct] = useState<ScannedProduct | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [torchEnabled, setTorchEnabled] = useState(false)
  const t = useTranslations('dashboard.barcodeScanner')
  const locale = useLocale()

  const startCamera = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setIsLoading(false)
    } catch (err) {
      // Client-side error logging - only in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Camera error:', err)
      }
      setError(t('cameraError'))
      setIsLoading(false)
    }
  }, [facingMode, t])

  const stopCamera = useCallback((): void => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      startCamera()
    } else {
      stopCamera()
    }

    return () => {
      stopCamera()
    }
  }, [isOpen, startCamera, stopCamera])

  // Simulated barcode detection (in production, use a library like quagga2 or zxing)
  useEffect(() => {
    if (!isOpen || isLoading || error) return

    const detectBarcode = async (): Promise<void> => {
      if (!videoRef.current || !canvasRef.current) return

      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // In production, use BarcodeDetector API or a library
      if ('BarcodeDetector' in window && window.BarcodeDetector) {
        try {
          const barcodeDetector = new window.BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code'],
          })
          const barcodes = await barcodeDetector.detect(canvas)

          if (barcodes.length > 0) {
            const code = barcodes[0].rawValue
            handleBarcodeDetected(code)
          }
        } catch (err) {
          // Client-side error logging - only in development
          if (process.env.NODE_ENV === 'development') {
            console.error('Barcode detection error:', err)
          }
        }
      }
    }

    const interval = setInterval(detectBarcode, 500)
    return () => clearInterval(interval)
  }, [isOpen, isLoading, error])

  const handleBarcodeDetected = async (code: string): Promise<void> => {
    if (scannedCode === code || isSearching) return

    setScannedCode(code)
    setIsSearching(true)

    // Vibrate if supported
    if (navigator.vibrate) {
      navigator.vibrate(100)
    }

    try {
      // Search for product by barcode
      const response = await fetch(`/api/inventory/barcode/${code}`)
      if (response.ok) {
        const product = await response.json()
        setScannedProduct(product)
      } else {
        setScannedProduct(null)
      }
    } catch (err) {
      // Client-side error logging - only in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Error searching product:', err)
      }
    } finally {
      setIsSearching(false)
    }
  }

  const handleConfirmScan = (): void => {
    if (scannedCode) {
      onScan(scannedCode)
      onClose()
    }
  }

  const handleManualEntry = (): void => {
    const code = prompt(t('enterManually'))
    if (code) {
      handleBarcodeDetected(code)
    }
  }

  const toggleTorch = async (): Promise<void> => {
    if (!streamRef.current) return

    const track = streamRef.current.getVideoTracks()[0]
    // Cast to extended type that includes torch capability
    const capabilities = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean }

    if (capabilities.torch) {
      try {
        // Apply torch constraint using advanced constraints
        await track.applyConstraints({
          advanced: [{ torch: !torchEnabled } as MediaTrackConstraintSet],
        })
        setTorchEnabled(!torchEnabled)
      } catch (err) {
        // Client-side error logging - only in development
        if (process.env.NODE_ENV === 'development') {
          console.error('Torch error:', err)
        }
      }
    }
  }

  const switchCamera = (): void => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
  }

  const resetScan = (): void => {
    setScannedCode(null)
    setScannedProduct(null)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/80"
          />

          {/* Scanner Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-4 z-50 flex flex-col overflow-hidden rounded-2xl bg-black md:inset-auto md:left-1/2 md:top-1/2 md:h-[600px] md:w-[500px] md:-translate-x-1/2 md:-translate-y-1/2"
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-black/50 px-4 py-3">
              <div className="flex items-center gap-2 text-white">
                <ScanLine className="h-5 w-5" />
                <span className="font-semibold">{t('title')}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleTorch}
                  className={`rounded-full p-2 transition-colors ${
                    torchEnabled
                      ? 'bg-yellow-500 text-black'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                  title={t('flashlight')}
                >
                  <Flashlight className="h-5 w-5" />
                </button>
                <button
                  onClick={switchCamera}
                  className="rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/30"
                  title={t('switchCamera')}
                >
                  <SwitchCamera className="h-5 w-5" />
                </button>
                <button
                  onClick={onClose}
                  className="rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/30"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Camera View */}
            <div className="relative flex-1">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}

              {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black p-4">
                  <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
                  <p className="mb-4 text-center text-white">{error}</p>
                  <button
                    onClick={startCamera}
                    className="rounded-lg bg-white px-4 py-2 font-medium text-black"
                  >
                    {t('retry')}
                  </button>
                </div>
              )}

              <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
              <canvas ref={canvasRef} className="hidden" />

              {/* Scan Frame Overlay */}
              {!isLoading && !error && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative h-48 w-64">
                    {/* Corners */}
                    <div className="absolute left-0 top-0 h-8 w-8 rounded-tl-lg border-l-4 border-t-4 border-white" />
                    <div className="absolute right-0 top-0 h-8 w-8 rounded-tr-lg border-r-4 border-t-4 border-white" />
                    <div className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-lg border-b-4 border-l-4 border-white" />
                    <div className="absolute bottom-0 right-0 h-8 w-8 rounded-br-lg border-b-4 border-r-4 border-white" />

                    {/* Scan Line Animation */}
                    <motion.div
                      className="absolute left-2 right-2 h-0.5 bg-[var(--primary)]"
                      animate={{ top: ['10%', '90%', '10%'] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Scanned Result Overlay */}
              {scannedCode && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white p-4"
                >
                  {isSearching ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" />
                      <span className="ml-2 text-gray-600">
                        {t('searching')}
                      </span>
                    </div>
                  ) : scannedProduct ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-green-100 p-2">
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{scannedProduct.name}</p>
                          <p className="text-sm text-gray-500">SKU: {scannedProduct.sku}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                        <span className="text-sm text-gray-600">
                          {t('stockAvailable')}
                        </span>
                        <span
                          className={`font-bold ${scannedProduct.stock > 0 ? 'text-green-600' : 'text-red-600'}`}
                        >
                          {scannedProduct.stock} {t('units')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                        <span className="text-sm text-gray-600">
                          {t('price')}
                        </span>
                        <span className="font-bold text-gray-900">
                          {scannedProduct.price.toLocaleString(locale === 'es' ? 'es-PY' : 'en-US')} Gs.
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleConfirmScan}
                          className="flex-1 rounded-lg bg-[var(--primary)] py-2.5 font-medium text-white transition-colors hover:opacity-90"
                        >
                          {t('useCode')}
                        </button>
                        <button
                          onClick={resetScan}
                          className="rounded-lg border border-gray-300 px-4 py-2.5 font-medium transition-colors hover:bg-gray-50"
                        >
                          {t('scanAnother')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-yellow-100 p-2">
                          <AlertCircle className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{t('code')}: {scannedCode}</p>
                          <p className="text-sm text-gray-500">
                            {t('notFound')}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleConfirmScan}
                          className="flex-1 rounded-lg bg-[var(--primary)] py-2.5 font-medium text-white transition-colors hover:opacity-90"
                        >
                          {t('useCode')}
                        </button>
                        <button
                          onClick={resetScan}
                          className="rounded-lg border border-gray-300 px-4 py-2.5 font-medium transition-colors hover:bg-gray-50"
                        >
                          {t('scanAnother')}
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            {/* Footer */}
            {!scannedCode && (
              <div className="bg-black/50 p-4">
                <button
                  onClick={handleManualEntry}
                  className="w-full rounded-lg bg-white/20 py-3 font-medium text-white transition-colors hover:bg-white/30"
                >
                  {t('manualEntry')}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
