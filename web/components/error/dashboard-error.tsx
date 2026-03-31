'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'
import { logger } from '@/lib/logger'

interface DashboardErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  useEffect(() => {
    // Log to error reporting service
    logger.error('Dashboard error occurred', {
      error: error.message,
      digest: error.digest,
      context: 'DashboardError',
    })
  }, [error])

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 p-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
        <AlertTriangle className="h-8 w-8 text-red-600" />
      </div>

      <div className="space-y-2 text-center">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Algo salió mal</h2>
        <p className="max-w-md text-[var(--text-secondary)]">
          Ocurrió un error al cargar esta página. Por favor intenta de nuevo.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <p className="mt-2 font-mono text-sm text-red-500">{error.message}</p>
        )}
      </div>

      <div className="flex gap-3">
        <Button onClick={reset} variant="primary" leftIcon={<RefreshCw className="h-4 w-4" />}>
          Intentar de nuevo
        </Button>
        <Link href="/dashboard">
          <Button variant="outline" leftIcon={<Home className="h-4 w-4" />}>
            Ir al inicio
          </Button>
        </Link>
      </div>
    </div>
  )
}
