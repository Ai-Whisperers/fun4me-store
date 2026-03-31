'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { logger } from '@/lib/logger'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Error boundary for [clinic] routes.
 * Catches runtime errors and displays a user-friendly message.
 */
export default function ClinicError({ error, reset }: Props) {
  useEffect(() => {
    // Log error to our logger
    logger.error('Clinic page error', {
      message: error.message,
      digest: error.digest,
      stack: error.stack?.slice(0, 1000),
    })
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-8">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
        <AlertTriangle className="h-10 w-10 text-red-600" />
      </div>

      <div className="space-y-3 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Algo salió mal</h1>
        <p className="max-w-md text-gray-600">
          Ocurrió un error inesperado. Nuestro equipo ha sido notificado. Por favor intenta de nuevo.
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
        <Button
          onClick={reset}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700"
        >
          <RefreshCw className="h-4 w-4" />
          Intentar de nuevo
        </Button>
        <Link href="/">
          <Button
            variant="outline"
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
          >
            <Home className="h-4 w-4" />
            Ir al inicio
          </Button>
        </Link>
      </div>

      {error.digest && (
        <p className="text-xs text-gray-400">
          Error ID: {error.digest}
        </p>
      )}
    </div>
  )
}
