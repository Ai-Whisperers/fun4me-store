'use client'

import { useActionState, use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as Icons from 'lucide-react'
import { updatePassword } from '@/app/auth/actions'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage({ params }: { params: Promise<{ clinic: string }> }) {
  const { clinic } = use(params)
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(updatePassword, null)
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    // Check if user has a valid recovery session
    const checkSession = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      // User should have a session from the recovery link
      setIsValidSession(!!session)
    }

    checkSession()
  }, [])

  useEffect(() => {
    // Redirect to login on success after a short delay
    if (state?.success) {
      const timer = setTimeout(() => {
        router.push(`/${clinic}/portal/login`)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [state?.success, clinic, router])

  // Loading state while checking session
  if (isValidSession === null) {
    return (
      <div className="mx-auto mt-12 max-w-md overflow-hidden rounded-3xl border border-gray-100 bg-white p-8 shadow-xl">
        <div className="flex flex-col items-center justify-center py-8">
          <Icons.Loader2 className="mb-4 h-8 w-8 animate-spin text-[var(--primary)]" />
          <p className="text-[var(--text-secondary)]">Verificando enlace...</p>
        </div>
      </div>
    )
  }

  // Invalid or expired link
  if (!isValidSession) {
    return (
      <div className="mx-auto mt-12 max-w-md overflow-hidden rounded-3xl border border-gray-100 bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-500">
            <Icons.XCircle className="h-8 w-8" />
          </div>

          <h1 className="font-heading text-2xl font-black text-[var(--text-primary)]">
            Enlace Inválido
          </h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            El enlace para restablecer tu contraseña ha expirado o es inválido. Por favor solicita
            uno nuevo.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href={`/${clinic}/portal/forgot-password`}
            className="block w-full rounded-xl bg-[var(--primary)] py-4 text-center font-bold text-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95"
          >
            Solicitar Nuevo Enlace
          </Link>

          <Link
            href={`/${clinic}/portal/login`}
            className="block w-full rounded-xl bg-gray-100 py-4 text-center font-bold text-[var(--text-primary)] transition-all hover:bg-gray-200"
          >
            Volver al Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto mt-12 max-w-md overflow-hidden rounded-3xl border border-gray-100 bg-white p-8 shadow-xl">
      <div className="mb-8 text-center">
        <div className="bg-[var(--primary)]/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-[var(--primary)]">
          <Icons.ShieldCheck className="h-8 w-8" />
        </div>

        <h1 className="font-heading text-2xl font-black text-[var(--text-primary)]">
          Nueva Contraseña
        </h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Ingresa tu nueva contraseña. Debe tener al menos 8 caracteres.
        </p>
      </div>

      {state?.success ? (
        <div className="space-y-6">
          <div className="flex items-start gap-3 rounded-xl bg-green-50 p-4 text-green-700">
            <Icons.CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Contraseña actualizada</p>
              <p className="mt-1 text-sm">
                Tu contraseña ha sido cambiada exitosamente. Serás redirigido al login en unos
                segundos...
              </p>
            </div>
          </div>

          <Link
            href={`/${clinic}/portal/login`}
            className="block w-full rounded-xl bg-[var(--primary)] py-4 text-center font-bold text-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95"
          >
            Ir al Login
          </Link>
        </div>
      ) : (
        <form action={formAction} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-bold text-[var(--text-secondary)]"
            >
              Nueva Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                required
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                minLength={8}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-12 outline-none transition-all focus:border-2 focus:border-[var(--primary)]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <Icons.EyeOff className="h-5 w-5" />
                ) : (
                  <Icons.Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1 block text-sm font-bold text-[var(--text-secondary)]"
            >
              Confirmar Contraseña
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                required
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                minLength={8}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-12 outline-none transition-all focus:border-2 focus:border-[var(--primary)]"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? (
                  <Icons.EyeOff className="h-5 w-5" />
                ) : (
                  <Icons.Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
            <Icons.Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>
              La contraseña debe tener al menos 8 caracteres. Recomendamos usar una combinación de
              letras, números y símbolos.
            </span>
          </div>

          {state?.error && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600"
            >
              <Icons.AlertCircle className="h-4 w-4" />
              {state.error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-4 font-bold text-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95 disabled:pointer-events-none disabled:opacity-70"
          >
            {isPending ? (
              <Icons.Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Icons.Check className="h-5 w-5" />
                Cambiar Contraseña
              </>
            )}
          </button>
        </form>
      )}

      <div className="mt-6 text-center">
        <Link
          href={`/${clinic}/portal/login`}
          className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--primary)]"
        >
          <Icons.ArrowLeft className="h-4 w-4" />
          Volver al Login
        </Link>
      </div>
    </div>
  )
}
