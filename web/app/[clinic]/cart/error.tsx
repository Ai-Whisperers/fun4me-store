'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, ShoppingCart } from 'lucide-react'
import * as Sentry from '@sentry/nextjs'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function CartError({ error, reset }: ErrorProps) {
  useEffect(() => {
    Sentry.withScope((scope) => {
      scope.setTag('errorBoundary', 'cart')
      scope.setTag('errorDigest', error.digest || 'unknown')
      Sentry.captureException(error)
    })
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-10 w-10 text-red-500" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-gray-800">Error en el carrito</h1>
        <p className="mb-6 text-gray-500">No pudimos procesar tu carrito. Por favor, intenta de nuevo.</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button onClick={reset} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-5 py-2.5 font-medium text-white hover:opacity-90">
            <RefreshCw className="h-4 w-4" />Reintentar
          </button>
          <Link href="../store" className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-50">
            <ShoppingCart className="h-4 w-4" />Volver a la tienda
          </Link>
        </div>
      </div>
    </div>
  )
}
