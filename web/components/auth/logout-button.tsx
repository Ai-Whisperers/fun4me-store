'use client'

import { useTransition } from 'react'
import { LogOut, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { logout } from '@/app/auth/actions'

interface LogoutButtonProps {
  clinic: string
  variant?: 'default' | 'text' | 'icon'
  className?: string
}

export function LogoutButton({ clinic, variant = 'default', className = '' }: LogoutButtonProps) {
  const t = useTranslations('auth')
  const [isPending, startTransition] = useTransition()

  const handleLogout = () => {
    startTransition(async () => {
      await logout(clinic)
    })
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={handleLogout}
        disabled={isPending}
        className={`rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--status-error-bg,#fef2f2)] hover:text-[var(--status-error,#dc2626)] disabled:opacity-50 ${className}`}
        title={t('logout')}
        aria-label={t('logout')}
      >
        {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
      </button>
    )
  }

  if (variant === 'text') {
    return (
      <button
        onClick={handleLogout}
        disabled={isPending}
        className={`flex items-center gap-2 font-bold uppercase tracking-wide text-[var(--text-muted)] transition-colors hover:text-[var(--status-error,#dc2626)] disabled:opacity-50 ${className}`}
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
        {t('logout')}
      </button>
    )
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isPending}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-[var(--text-secondary)] transition-colors hover:bg-[var(--status-error-bg,#fef2f2)] hover:text-[var(--status-error,#dc2626)] disabled:opacity-50 ${className}`}
    >
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      <span className="hidden sm:inline">{t('logout')}</span>
    </button>
  )
}
