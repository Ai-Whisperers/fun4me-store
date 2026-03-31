/**
 * Barcode Scanner Hook
 *
 * Provides barcode scanning functionality using html5-qrcode.
 * Handles camera initialization, scanning, and cleanup.
 */

'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

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

interface UseBarcodeScanner {
  isLoading: boolean
  error: string | null
  isManualMode: boolean
  manualInput: string
  containerRef: React.RefObject<HTMLDivElement | null>
  setManualMode: (mode: boolean) => void
  setManualInput: (input: string) => void
  startScanner: () => Promise<void>
  stopScanner: () => Promise<void>
  handleManualSubmit: (onScan: (barcode: string) => void) => (e: React.FormEvent) => void
}

export function useBarcodeScanner(
  containerId: string,
  onScan: (barcode: string) => void,
  isOpen: boolean
): UseBarcodeScanner {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isManualMode, setManualMode] = useState(false)
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

      const html5Qrcode = new Html5Qrcode(containerId)
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
    } catch (e: unknown) {
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
  }, [containerId, onScan])

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

  const handleManualSubmit = useCallback(
    (onScanCallback: (barcode: string) => void) => (e: React.FormEvent) => {
      e.preventDefault()
      if (manualInput.trim()) {
        onScanCallback(manualInput.trim())
      }
    },
    [manualInput]
  )

  // Auto-start scanner when opened and not in manual mode
  useEffect(() => {
    if (isOpen && !isManualMode) {
      startScanner()
    }

    return () => {
      stopScanner()
    }
  }, [isOpen, isManualMode, startScanner, stopScanner])

  return {
    isLoading,
    error,
    isManualMode,
    manualInput,
    containerRef,
    setManualMode,
    setManualInput,
    startScanner,
    stopScanner,
    handleManualSubmit,
  }
}
