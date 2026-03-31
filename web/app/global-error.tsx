'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import * as Sentry from '@sentry/nextjs'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Global error boundary for the entire application.
 * This catches errors in the root layout itself.
 * Must include its own <html> and <body> tags since root layout won't render.
 */
export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    // Capture error in Sentry with context
    Sentry.withScope((scope) => {
      scope.setTag('errorBoundary', 'global')
      scope.setTag('errorDigest', error.digest || 'unknown')
      scope.setLevel('fatal')
      Sentry.captureException(error)
    })

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Global app error:', {
        message: error.message,
        digest: error.digest,
        stack: error.stack,
      })
    }
  }, [error])

  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-50">
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-12 w-12 text-red-600" />
          </div>

          <div className="space-y-3 text-center">
            <h1 className="text-3xl font-bold text-gray-900">Error Crítico</h1>
            <p className="max-w-md text-gray-600">
              Ha ocurrido un error grave en la aplicación. Nuestro equipo ha sido notificado.
            </p>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 max-w-lg text-left">
                <summary className="cursor-pointer text-sm text-red-600">
                  Detalles del error (desarrollo)
                </summary>
                <pre className="mt-2 overflow-auto rounded bg-red-50 p-3 font-mono text-xs text-red-800">
                  {error.message}
                  {error.stack && `\n\n${error.stack}`}
                </pre>
              </details>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={reset}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4" />
              Reintentar
            </button>
            <a
              href="/"
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Home className="h-4 w-4" />
              Ir al inicio
            </a>
          </div>

          {error.digest && (
            <p className="text-xs text-gray-400">
              Error ID: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
