'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { logger } from '@/lib/logger'

interface PortalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function PortalError({ error, reset }: PortalErrorProps) {
  useEffect(() => {
    logger.error('Portal error occurred', {
      error: error.message,
      digest: error.digest,
      context: 'PortalError',
    })
  }, [error])

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 p-8 text-center">
      <AlertCircle className="h-16 w-16 text-[var(--primary)]" />

      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Error al cargar</h2>
        <p className="text-[var(--text-secondary)]">
          No pudimos cargar esta página. Intenta de nuevo.
        </p>
      </div>

      <div className="flex gap-3">
        <Button onClick={reset} leftIcon={<RefreshCw className="h-4 w-4" />}>
          Reintentar
        </Button>
        <Link href="/">
          <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Volver
          </Button>
        </Link>
      </div>
    </div>
  )
}
