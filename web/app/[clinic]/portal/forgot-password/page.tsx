'use client'

import { useActionState, use } from 'react'
import Link from 'next/link'
import * as Icons from 'lucide-react'
import { requestPasswordReset } from '@/app/auth/actions'

export default function ForgotPasswordPage({ params }: { params: Promise<{ clinic: string }> }) {
  const { clinic } = use(params)
  const [state, formAction, isPending] = useActionState(requestPasswordReset, null)

  return (
    <div className="mx-auto mt-12 max-w-md overflow-hidden rounded-3xl border border-gray-100 bg-white p-8 shadow-xl">
      <div className="mb-8 text-center">
        <div className="bg-[var(--primary)]/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-[var(--primary)]">
          <Icons.KeyRound className="h-8 w-8" />
        </div>

        <h1 className="font-heading text-2xl font-black text-[var(--text-primary)]">
          Recuperar Contraseña
        </h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
        </p>
      </div>

      {state?.success ? (
        <div className="space-y-6">
          <div className="flex items-start gap-3 rounded-xl bg-green-50 p-4 text-green-700">
            <Icons.CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Revisa tu correo</p>
              <p className="mt-1 text-sm">
                Si existe una cuenta con ese email, recibirás un enlace para restablecer tu
                contraseña. Revisa también la carpeta de spam.
              </p>
            </div>
          </div>

          <Link
            href={`/${clinic}/portal/login`}
            className="block w-full rounded-xl bg-[var(--primary)] py-4 text-center font-bold text-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95"
          >
            Volver al Login
          </Link>
        </div>
      ) : (
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="clinic" value={clinic} />

          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-bold text-[var(--text-secondary)]"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              required
              type="email"
              placeholder="tu@email.com"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-2 focus:border-[var(--primary)]"
            />
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
                <Icons.Mail className="h-5 w-5" />
                Enviar Enlace
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
