'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, FileCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { logger } from '@/lib/logger'
import { useParams } from 'next/navigation'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Error boundary for consent routes.
 * Catches runtime errors in consent form pages.
 */
export default function ConsentError({ error, reset }: Props) {
  const params = useParams()
  const clinic = params?.clinic as string

  useEffect(() => {
    logger.error('Consent error', {
      message: error.message,
      digest: error.digest,
      clinic,
      stack: error.stack?.slice(0, 1000),
    })
  }, [error, clinic])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-8">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
        <AlertTriangle className="h-10 w-10 text-red-600" />
      </div>

      <div className="space-y-3 text-center">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Error en Formulario de Consentimiento</h1>
        <p className="max-w-md text-[var(--text-secondary)]">
          Ocurrió un error al cargar el formulario de consentimiento. Por favor intenta de nuevo o contacta con la clínica.
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
        <Link href={`/${clinic}`}>
          <Button variant="outline">
            <FileCheck className="mr-2 h-4 w-4" />
            Ir a la Clínica
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