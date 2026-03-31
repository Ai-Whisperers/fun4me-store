'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { logger } from '@/lib/logger'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Error boundary for tag routes.
 * Catches runtime errors in tag lookup pages.
 */
export default function TagError({ error, reset }: Props) {
  useEffect(() => {
    logger.error('Tag error', {
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
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Error de Etiqueta</h1>
        <p className="max-w-md text-[var(--text-secondary)]">
          Ocurrió un error al buscar la etiqueta. Por favor intenta de nuevo o contacta con el dueño de la mascota.
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
        <Button onClick={reset} variant="primary">
          <RefreshCw className="mr-2 h-4 w-4" />
          Reintentar
        </Button>
        <Link href="/">
          <Button variant="outline">
            <Tag className="mr-2 h-4 w-4" />
            Ir al Inicio
          </Button>
        </Link>
      </div>

      {error.digest && (
        <p className="text-xs text-[var(--text-tertiary)]">
          Error ID: {error.digest}
        </p>
      )}
    </div>
  )
}