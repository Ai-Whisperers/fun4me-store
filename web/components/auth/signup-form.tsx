'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import * as Icons from 'lucide-react'
import { useTranslations } from 'next-intl'
import { signup } from '@/app/auth/actions'
import { PasswordInput } from '@/components/ui/password-input'

interface SignupFormProps {
  clinic: string
  redirectTo: string
}

export function SignupForm({ clinic, redirectTo }: SignupFormProps) {
  const [state, formAction, isPending] = useActionState(signup, null)
  const t = useTranslations('auth')

  if (state?.success) {
    return (
      <div className="animate-in fade-in zoom-in mx-auto mt-4 max-w-md overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 text-center shadow-xl sm:mt-8 sm:p-8 md:mt-12">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--status-success-bg)] text-[var(--status-success)]">
          <Icons.MailCheck className="h-10 w-10" />
        </div>
        <h2 className="font-heading text-xl font-black text-[var(--text-primary)] sm:text-2xl">
          {t('signupForm.success.title')}
        </h2>
        <p className="mb-2 mt-4 text-[var(--text-secondary)]">
          {t('signupForm.success.emailSent')}
        </p>
        <p className="text-sm text-gray-500">{t('signupForm.success.checkInbox')}</p>
        <Link
          href={`/${clinic}/portal/login${redirectTo !== `/${clinic}/portal/dashboard` ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}
          className="mt-8 block font-bold text-[var(--primary)] hover:underline"
        >
          {t('signupForm.success.backToLogin')}
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto mt-4 max-w-md overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-xl sm:mt-8 sm:p-8 md:mt-12">
      <div className="mb-8 text-center">
        <div className="bg-[var(--primary)]/10 mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-[var(--primary)] sm:h-16 sm:w-16">
          <Icons.UserPlus className="h-7 w-7 sm:h-8 sm:w-8" />
        </div>
        <h1 className="font-heading text-xl font-black text-[var(--text-primary)] sm:text-2xl">
          {t('signupForm.title')}
        </h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          {t('signupForm.subtitle')}
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="clinic" value={clinic} />
        <input type="hidden" name="redirect" value={redirectTo} />

        <div>
          <label
            htmlFor="fullName"
            className="mb-1 block text-sm font-bold text-[var(--text-secondary)]"
          >
            {t('signupForm.fullNameLabel')}
          </label>
          <div className="relative">
            <Icons.User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              id="fullName"
              name="fullName"
              required
              type="text"
              placeholder={t('signupForm.fullNamePlaceholder')}
              className="min-h-[48px] w-full rounded-xl border border-gray-200 py-3 pl-12 pr-4 outline-none transition-all focus:border-2 focus:border-[var(--primary)]"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="signup-email"
            className="mb-1 block text-sm font-bold text-[var(--text-secondary)]"
          >
            {t('signupForm.emailLabel')}
          </label>
          <div className="relative">
            <Icons.Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              id="signup-email"
              name="email"
              required
              type="email"
              placeholder={t('signupForm.emailPlaceholder')}
              className="min-h-[48px] w-full rounded-xl border border-gray-200 py-3 pl-12 pr-4 outline-none transition-all focus:border-2 focus:border-[var(--primary)]"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="signup-password"
            className="mb-1 block text-sm font-bold text-[var(--text-secondary)]"
          >
            {t('signupForm.passwordLabel')}
          </label>
          <div className="relative">
            <Icons.Lock className="absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <PasswordInput
              id="signup-password"
              name="password"
              required
              placeholder="••••••••"
              className="pl-12"
              showStrength
            />
          </div>
        </div>

        {state?.error && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-lg bg-[var(--status-error-bg)] p-3 text-sm text-[var(--status-error-text)]"
          >
            <Icons.AlertCircle className="h-4 w-4" aria-hidden="true" />
            {state.error}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-4 font-bold text-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95 disabled:pointer-events-none disabled:opacity-70"
        >
          {isPending ? <Icons.Loader2 className="h-5 w-5 animate-spin" /> : t('signupForm.signupButton')}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          {t('hasAccount')}{' '}
          <Link
            href={`/${clinic}/portal/login${redirectTo !== `/${clinic}/portal/dashboard` ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}
            className="font-bold text-[var(--primary)] hover:underline"
          >
            {t('signupForm.loginLink')}
          </Link>
        </p>
      </div>
    </div>
  )
}
