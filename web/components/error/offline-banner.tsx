'use client'

import { useState, useEffect } from 'react'
import { WifiOff, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OfflineBannerProps {
  /** Position of the banner */
  position?: 'top' | 'bottom'
  /** Whether to show a retry button */
  showRetry?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * OfflineBanner - Shows when the user loses internet connection
 *
 * @example
 * // In layout.tsx
 * <OfflineBanner />
 *
 * @example
 * // With custom position
 * <OfflineBanner position="top" showRetry />
 */
export function OfflineBanner({
  position = 'bottom',
  showRetry = true,
  className,
}: OfflineBannerProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [wasOffline, setWasOffline] = useState(false)
  const [showReconnected, setShowReconnected] = useState(false)

  useEffect(() => {
    // Check initial state
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      if (wasOffline) {
        setShowReconnected(true)
        // Hide the "reconnected" message after 3 seconds
        setTimeout(() => setShowReconnected(false), 3000)
      }
      setWasOffline(false)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setWasOffline(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [wasOffline])

  // Show reconnected message
  if (isOnline && showReconnected) {
    return (
      <div
        className={cn(
          'fixed left-0 right-0 z-50 flex items-center justify-center gap-2 bg-green-500 px-4 py-3 text-white shadow-lg transition-all duration-300',
          position === 'top' ? 'top-0' : 'bottom-0',
          className
        )}
        role="status"
        aria-live="polite"
      >
        <span className="font-medium">Conexión restaurada</span>
      </div>
    )
  }

  // Don't show anything if online
  if (isOnline) return null

  return (
    <div
      className={cn(
        'fixed left-0 right-0 z-50 flex items-center justify-center gap-3 bg-amber-500 px-4 py-3 text-amber-900 shadow-lg transition-all duration-300',
        position === 'top' ? 'top-0' : 'bottom-0',
        className
      )}
      role="alert"
      aria-live="assertive"
    >
      <WifiOff className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
        <span className="font-medium">Sin conexión a internet</span>
        <span className="text-sm opacity-90">Algunas funciones no están disponibles</span>
      </div>
      {showRetry && (
        <button
          onClick={() => window.location.reload()}
          className="ml-2 flex items-center gap-1 rounded-md bg-amber-600 px-3 py-1 text-sm font-medium text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-300"
        >
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </button>
      )}
    </div>
  )
}

/**
 * useOnlineStatus - Hook to track online/offline status
 *
 * @example
 * const { isOnline, wasOffline } = useOnlineStatus()
 *
 * if (!isOnline) {
 *   return <div>You're offline</div>
 * }
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      setWasOffline(false)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setWasOffline(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline, wasOffline }
}
