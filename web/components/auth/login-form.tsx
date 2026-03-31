'use client'

import { useActionState, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import * as Icons from 'lucide-react'
import { useTranslations } from 'next-intl'
import { login, loginWithGoogle } from '@/app/auth/actions'
import { PasswordInput } from '@/components/ui/password-input'

// Error message keys for URL error params
const ERROR_KEYS: Record<string, string> = {
  no_profile: 'noProfile',
  profile_creation_failed: 'profileCreationFailed',
  tenant_assignment_failed: 'tenantAssignmentFailed',
  tenant_mismatch: 'tenantMismatch',
  session_expired: 'sessionExpired',
}

interface LoginFormProps {
  clinic: string
  redirectTo: string
}

export function LoginForm({ clinic, redirectTo }: LoginFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')
  const [state, formAction, isPending] = useActionState(login, null)
  const [urlError, setUrlError] = useState<string | null>(null)
  const t = useTranslations('auth')

  // Handle URL error params
  useEffect(() => {
    if (errorParam && ERROR_KEYS[errorParam]) {
      setUrlError(t(`loginForm.errors.${ERROR_KEYS[errorParam]}`))
      // Clean URL without losing other params
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('error')
      router.replace(newUrl.pathname + newUrl.search, { scroll: false })
    }
  }, [errorParam, router, t])

  const googleLoginAction = loginWithGoogle.bind(null, clinic)

  return (
    <div className="mx-auto mt-4 max-w-md overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-xl sm:mt-8 sm:p-8 md:mt-12">
      <div className="mb-8 text-center">
        <div className="bg-[var(--primary)]/10 mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-[var(--primary)] sm:h-16 sm:w-16">
          <Icons.Lock className="h-7 w-7 sm:h-8 sm:w-8" />
        </div>

        <h1 className="font-heading text-xl font-black text-[var(--text-primary)] sm:text-2xl">
          {t('loginForm.title')}
        </h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          {t('loginForm.subtitle')}
        </p>
      </div>

      <div className="space-y-4">
        {/* Google Button */}
        <form action={googleLoginAction}>
          <button
            type="submit"
            className="relative flex min-h-[48px] w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white py-3 font-bold text-gray-700 transition-colors hover:bg-gray-50"
          >
            {/* Google Icon SVG */}
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {t('loginForm.continueWithGoogle')}
          </button>
        </form>

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="mx-4 flex-shrink-0 text-xs font-bold uppercase text-gray-400">
            {t('loginForm.orWithEmail')}
          </span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="clinic" value={clinic} />
          <input type="hidden" name="redirect" value={redirectTo} />
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-bold text-[var(--text-secondary)]"
            >
              {t('loginForm.emailLabel')}
            </label>
            <input
              id="email"
              name="email"
              required
              type="email"
              placeholder={t('loginForm.emailPlaceholder')}
              className="min-h-[48px] w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-2 focus:border-[var(--primary)]"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-bold text-[var(--text-secondary)]"
            >
              {t('loginForm.passwordLabel')}
            </label>
            <PasswordInput
              id="password"
              name="password"
              required
              placeholder="••••••••"
              error={!!state?.error}
            />
          </div>

          {(state?.error || urlError) && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg bg-[var(--status-error-bg)] p-3 text-sm text-[var(--status-error-text)]"
            >
              <Icons.AlertCircle className="h-4 w-4 flex-shrink-0" />
              {state?.error || urlError}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-4 font-bold text-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95 disabled:pointer-events-none disabled:opacity-70"
          >
            {isPending ? <Icons.Loader2 className="h-5 w-5 animate-spin" /> : t('loginForm.loginButton')}
          </button>

          <div className="text-center">
            <Link
              href={`/${clinic}/portal/forgot-password`}
              className="text-sm text-[var(--primary)] hover:underline"
            >
              {t('forgotPassword')}
            </Link>
          </div>
        </form>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          {t('noAccount')}{' '}
          <Link
            href={`/${clinic}/portal/signup${redirectTo !== `/${clinic}/portal/dashboard` ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}
            className="font-bold text-[var(--primary)] hover:underline"
          >
            {t('loginForm.signUp')}
          </Link>
        </p>
      </div>
    </div>
  )
}
