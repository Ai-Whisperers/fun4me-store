'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { LogOut } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { ClinicConfig } from '@/lib/clinics'

interface UserMenuProps {
  clinic: string
  config: ClinicConfig
  user: SupabaseUser | null
  isLoading: boolean
  isActive: (href: string, exact?: boolean) => boolean
  isLoggingOut: boolean
  logoutError: string | null
  handleLogout: () => Promise<void>
}

export function UserMenu({
  clinic,
  config,
  user,
  isLoading,
  isActive,
  isLoggingOut,
  logoutError,
  handleLogout,
}: Readonly<UserMenuProps>) {
  const tNav = useTranslations('nav')
  const tAuth = useTranslations('auth')

  // Show loading skeleton while checking auth to prevent flash of wrong state
  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-5 w-20 animate-pulse rounded bg-gray-200" />
      </div>
    )
  }

  return (
    <>
      <Link
        href={user ? `/${clinic}/portal/dashboard` : `/${clinic}/portal/login`}
        className={`group relative text-base font-bold uppercase tracking-wide transition-colors ${
          isActive(`/${clinic}/portal`)
            ? 'text-[var(--primary)]'
            : 'text-[var(--text-secondary)] hover:text-[var(--primary)]'
        }`}
      >
        {user
          ? config.ui_labels?.nav.my_account || tNav('portal')
          : config.ui_labels?.nav.login || tAuth('login')}
        <span
          className={`absolute -bottom-1 left-0 h-0.5 bg-[var(--primary)] transition-all duration-300 ${
            isActive(`/${clinic}/portal`) ? 'w-full' : 'w-0 group-hover:w-full'
          }`}
        ></span>
      </Link>

      {user && (
        <div className="relative">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--status-error-bg,#fef2f2)] hover:text-[var(--status-error,#dc2626)] disabled:opacity-50"
            title={tAuth('logout')}
            aria-label={tAuth('logout')}
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
          </button>
          {logoutError && (
            <div
              className="absolute right-0 top-full z-50 mt-2 whitespace-nowrap rounded-lg bg-[var(--status-error,#ef4444)] px-4 py-2 text-sm font-medium text-white shadow-lg"
              role="alert"
            >
              {logoutError}
            </div>
          )}
        </div>
      )}
    </>
  )
}
