'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import { logger } from '@/lib/logger'
import { useEffect, useState } from 'react'
import * as Icons from 'lucide-react'

export default function LogoutPage() {
  const router = useRouter()
  const { clinic } = useParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    const supabase = createClient()

    const doLogout = async () => {
      try {
        const { error } = await supabase.auth.signOut()
        if (error) {
          logger.error('Logout error', {
            error: error.message,
            clinic
          })
          setStatus('error')
          return
        }
        // Refresh to clear server-side cache
        router.refresh()
        setStatus('success')
        // Short delay to show success message, then redirect
        setTimeout(() => {
          router.push(`/${clinic}/portal/login`)
        }, 1500)
      } catch (err) {
        logger.error('Logout error', {
          error: err instanceof Error ? err.message : 'Unknown error',
          clinic
        })
        setStatus('error')
      }
    }

    doLogout()
  }, [router, clinic])

  return (
    <div className="mx-auto mt-12 max-w-md overflow-hidden rounded-3xl border border-gray-100 bg-white p-8 shadow-xl">
      <div className="text-center">
        {status === 'loading' && (
          <>
            <div className="bg-[var(--primary)]/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-[var(--primary)]">
              <Icons.Loader2 className="h-8 w-8 animate-spin" />
            </div>
            <h1 className="font-heading text-2xl font-black text-[var(--text-primary)]">
              Cerrando sesión...
            </h1>
            <p className="mt-2 text-[var(--text-secondary)]">
              Espera un momento mientras cerramos tu sesión de forma segura.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
              <Icons.CheckCircle className="h-8 w-8" />
            </div>
            <h1 className="font-heading text-2xl font-black text-[var(--text-primary)]">
              Sesión cerrada
            </h1>
            <p className="mt-2 text-[var(--text-secondary)]">
              Tu sesión ha sido cerrada correctamente. Redirigiendo...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
              <Icons.AlertCircle className="h-8 w-8" />
            </div>
            <h1 className="font-heading text-2xl font-black text-[var(--text-primary)]">
              Error al cerrar sesión
            </h1>
            <p className="mb-4 mt-2 text-[var(--text-secondary)]">
              Hubo un problema al cerrar tu sesión. Por favor intenta de nuevo.
            </p>
            <button
              onClick={() => router.push(`/${clinic}/portal/login`)}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 font-bold text-white transition-opacity hover:opacity-90"
            >
              Ir al inicio de sesión
            </button>
          </>
        )}
      </div>
    </div>
  )
}
