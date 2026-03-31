'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import * as Sentry from '@sentry/nextjs'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Global error boundary - catches runtime errors across the app
 */
export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Capture error in Sentry with context
    Sentry.withScope((scope) => {
      scope.setTag('errorBoundary', 'app')
      scope.setTag('errorDigest', error.digest || 'unknown')
      scope.setLevel('error')
      Sentry.captureException(error)
    })

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Application error:', error)
    }
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-red-50 to-gray-100 px-4">
      <div className="w-full max-w-lg text-center">
        {/* Error Icon */}
        <div className="relative mb-8">
          <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-red-400 to-red-500 shadow-xl shadow-red-200">
            <AlertTriangle className="h-16 w-16 text-white" />
          </div>
          <div className="absolute -bottom-4 left-1/2 h-3 w-24 -translate-x-1/2 rounded-full bg-black/10 blur-sm" />
        </div>

        {/* Message */}
        <h1 className="mb-3 text-3xl font-bold text-gray-800">Algo salió mal</h1>
        <p className="mx-auto mb-8 max-w-md text-gray-500">
          Lo sentimos, ocurrió un error inesperado. Puedes intentar recargar la página o volver al
          inicio.
        </p>

        {/* Error Details (development only) */}
        {process.env.NODE_ENV === 'development' && error.message && (
          <div className="mb-8 rounded-xl border border-red-200 bg-red-100 p-4 text-left">
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-red-700">
              Error Details
            </p>
            <p className="break-all font-mono text-sm text-red-600">{error.message}</p>
            {error.digest && <p className="mt-2 text-xs text-red-500">Digest: {error.digest}</p>}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-6 py-3 font-bold text-white shadow-lg shadow-red-200 transition-colors hover:bg-red-600"
          >
            <RefreshCw className="h-5 w-5" />
            Intentar de nuevo
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 font-bold text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Home className="h-5 w-5" />
            Ir al Inicio
          </Link>
        </div>

        {/* Help Text */}
        <p className="mt-12 text-sm text-gray-400">
          Si el problema persiste, contacta con soporte técnico.
        </p>
      </div>
    </div>
  )
}
