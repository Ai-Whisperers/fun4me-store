'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu,
  X,
  Calendar,
  Phone,
  PawPrint,
  User,
  Settings,
  LogOut,
  Calculator,
  Apple,
  HelpCircle,
  Globe,
  LayoutDashboard,
  Package,
} from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { ClinicConfig } from '@/lib/clinics'
import type { UserProfile } from './useNavAuth'
import type { LucideIcon } from 'lucide-react'
import { LanguageSelector } from '@/components/ui/language-selector'
import { useLocale } from '@/i18n/hooks'

interface MobileMenuProps {
  clinic: string
  config: ClinicConfig
  user: SupabaseUser | null
  profile: UserProfile | null
  navItems: NavItem[]
  isLoading: boolean
  isActive: (href: string, exact?: boolean) => boolean
  isLoggingOut: boolean
  handleLogout: () => Promise<void>
}

export interface NavItem {
  label: string
  href: string
  exact?: boolean
  icon: LucideIcon
}

export function MobileMenu({
  clinic,
  config,
  user,
  profile,
  navItems,
  isLoading,
  isActive,
  isLoggingOut,
  handleLogout,
}: Readonly<MobileMenuProps>) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null)
  const currentLocale = useLocale()
  const tNav = useTranslations('nav')
  const tAuth = useTranslations('auth')

  const toolsItems = [
    {
      label: config.ui_labels?.tools?.age_calculator?.title || tNav('ageCalculator'),
      href: `/${clinic}/tools/age-calculator`,
      icon: Calculator,
    },
    {
      label: config.ui_labels?.tools?.toxic_food?.title || tNav('toxicFood'),
      href: `/${clinic}/tools/toxic-food`,
      icon: Apple,
    },
    {
      label: config.ui_labels?.nav?.faq || tNav('faq'),
      href: `/${clinic}/faq`,
      icon: HelpCircle,
    },
  ]

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const menuElement = mobileMenuRef.current
    if (!menuElement) return

    const focusableElements = menuElement.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    firstElement?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        mobileMenuTriggerRef.current?.focus()
        return
      }

      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement?.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement?.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const mobileMenuContent = mounted
    ? createPortal(
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm md:hidden"
              />
              <motion.div
                ref={mobileMenuRef}
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="border-[var(--primary)]/10 fixed right-0 top-0 z-[10000] flex h-full w-[85%] max-w-sm flex-col overflow-y-auto border-l bg-[var(--bg-default)] shadow-2xl md:hidden"
                role="dialog"
                aria-modal="true"
                aria-label={tNav('navigationMenu')}
              >
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-4">
                  <span className="text-lg font-bold text-[var(--text-primary)]">
                    {config.ui_labels?.nav?.menu || tNav('menu')}
                  </span>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-2 text-[var(--text-secondary)] transition-colors hover:bg-gray-100 hover:text-[var(--primary)]"
                    aria-label={tNav('closeMenu')}
                  >
                    <X size={24} />
                  </button>
                </div>

                {isLoading ? (
                  <div className="bg-[var(--primary)]/5 border-[var(--primary)]/10 border-b px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 animate-pulse rounded-full bg-gray-200" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                        <div className="h-3 w-32 animate-pulse rounded bg-gray-200" />
                      </div>
                    </div>
                  </div>
                ) : user && profile ? (
                  <div className="bg-[var(--primary)]/5 border-[var(--primary)]/10 border-b px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)] text-lg font-bold text-white">
                        {profile.full_name?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-[var(--text-primary)]">
                          {profile.full_name || tNav('user')}
                        </p>
                        <p className="truncate text-xs text-[var(--text-muted)]">{user.email}</p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="px-4 py-4 sm:px-6">
                  <Link
                    href={`/${clinic}/book`}
                    onClick={() => setIsOpen(false)}
                    className="flex min-h-[52px] w-full items-center justify-center gap-3 rounded-xl bg-[var(--primary)] py-4 font-bold text-white shadow-lg transition-opacity hover:opacity-90"
                  >
                    <Calendar className="h-5 w-5" />
                    {config.ui_labels?.nav.book_btn || tNav('bookAppointment')}
                  </Link>
                </div>

                <div className="flex-1 px-4 sm:px-6">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    {config.ui_labels?.nav?.navigation || tNav('navigation')}
                  </p>
                  <div className="flex flex-col gap-1">
                    {navItems.map((item) => {
                      const Icon = item.icon
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className={`flex min-h-[48px] items-center gap-4 rounded-xl px-4 py-4 transition-colors ${
                            isActive(item.href, item.exact)
                              ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="font-bold">{item.label}</span>
                        </Link>
                      )
                    })}
                  </div>

                  <p className="mb-3 mt-6 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    {config.ui_labels?.nav?.tools || tNav('tools')}
                  </p>
                  <div className="flex flex-col gap-1">
                    {toolsItems.map((tool) => {
                      const ToolIcon = tool.icon
                      return (
                        <Link
                          key={tool.href}
                          href={tool.href}
                          onClick={() => setIsOpen(false)}
                          className={`flex min-h-[48px] items-center gap-4 rounded-xl px-4 py-4 transition-colors ${
                            isActive(tool.href)
                              ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                          }`}
                        >
                          <ToolIcon className="h-5 w-5" />
                          <span className="font-bold">{tool.label}</span>
                        </Link>
                      )
                    })}
                  </div>

                  <p className="mb-3 mt-6 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    {config.ui_labels?.nav?.my_account || tAuth('myAccount')}
                  </p>
                  <div className="flex flex-col gap-1">
                    {isLoading ? (
                      <div className="flex min-h-[48px] items-center gap-4 rounded-xl px-4 py-4">
                        <div className="h-5 w-5 animate-pulse rounded bg-gray-200" />
                        <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                      </div>
                    ) : (
                      <Link
                        href={user ? `/${clinic}/portal/dashboard` : `/${clinic}/portal/login`}
                        onClick={() => setIsOpen(false)}
                        className={`flex min-h-[48px] items-center gap-4 rounded-xl px-4 py-4 transition-colors ${
                          isActive(`/${clinic}/portal/dashboard`)
                            ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                        }`}
                      >
                        <PawPrint className="h-5 w-5" />
                        <span className="font-bold">
                          {user
                            ? config.ui_labels?.nav.my_pets || tNav('myPets')
                            : config.ui_labels?.nav.login || tAuth('login')}
                        </span>
                      </Link>
                    )}

                    {user && (
                      <>
                        <Link
                          href={`/${clinic}/portal/profile`}
                          onClick={() => setIsOpen(false)}
                          className={`flex min-h-[48px] items-center gap-4 rounded-xl px-4 py-4 transition-colors ${
                            isActive(`/${clinic}/portal/profile`)
                              ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                          }`}
                        >
                          <User className="h-5 w-5" />
                          <span className="font-bold">
                            {config.ui_labels?.nav.profile || tNav('myProfile')}
                          </span>
                        </Link>
                        <Link
                          href={`/${clinic}/portal/settings`}
                          onClick={() => setIsOpen(false)}
                          className={`flex min-h-[48px] items-center gap-4 rounded-xl px-4 py-4 transition-colors ${
                            isActive(`/${clinic}/portal/settings`)
                              ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                          }`}
                        >
                          <Settings className="h-5 w-5" />
                          <span className="font-bold">
                            {config.ui_labels?.nav?.settings || tNav('settings')}
                          </span>
                        </Link>
                      </>
                    )}
                  </div>

                  {/* Staff-only section: Dashboard & Inventory */}
                  {user && profile && (profile.role === 'admin' || profile.role === 'vet') && (
                    <>
                      <p className="mb-3 mt-6 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        {tNav('staff')}
                      </p>
                      <div className="flex flex-col gap-1">
                        <Link
                          href={`/${clinic}/dashboard`}
                          onClick={() => setIsOpen(false)}
                          className={`flex min-h-[48px] items-center gap-4 rounded-xl px-4 py-4 transition-colors ${
                            isActive(`/${clinic}/dashboard`)
                              ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                          }`}
                        >
                          <LayoutDashboard className="h-5 w-5" />
                          <span className="font-bold">{tNav('dashboard')}</span>
                        </Link>
                        <Link
                          href={`/${clinic}/portal/inventory`}
                          onClick={() => setIsOpen(false)}
                          className={`flex min-h-[48px] items-center gap-4 rounded-xl px-4 py-4 transition-colors ${
                            isActive(`/${clinic}/portal/inventory`)
                              ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                          }`}
                        >
                          <Package className="h-5 w-5" />
                          <span className="font-bold">{tNav('inventory')}</span>
                        </Link>
                      </div>
                    </>
                  )}

                  {user && (
                    <button
                      onClick={() => {
                        setIsOpen(false)
                        handleLogout()
                      }}
                      disabled={isLoggingOut}
                      className="mt-2 flex min-h-[48px] w-full items-center gap-4 rounded-xl px-4 py-4 text-left text-[var(--status-error,#ef4444)] transition-colors hover:bg-[var(--status-error-bg,#fef2f2)] disabled:opacity-50"
                    >
                      <LogOut className="h-5 w-5" />
                      <span className="font-bold">{tAuth('logout')}</span>
                    </button>
                  )}

                  {/* Language Selection */}
                  <p className="mb-3 mt-6 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    <Globe className="mr-2 inline-block h-4 w-4" />
                    {tNav('language')}
                  </p>
                  <div className="py-2">
                    <LanguageSelector currentLocale={currentLocale} variant="inline" />
                  </div>
                </div>

                <div className="mt-auto border-t border-[var(--border,#e5e7eb)] bg-[var(--bg-subtle)] px-4 py-6 sm:px-6">
                  {config.settings?.emergency_24h && (
                    <a
                      href={`tel:${config.contact?.whatsapp_number}`}
                      className="mb-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--status-error,#ef4444)] py-4 font-bold text-white"
                    >
                      <Phone className="h-4 w-4" />
                      {config.ui_labels?.nav.emergency_btn || tNav('emergency')}
                    </a>
                  )}
                  <p className="text-center text-xs text-[var(--text-muted)]">
                    © {new Date().getFullYear()} {config.name}
                  </p>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )
    : null

  return (
    <>
      <button
        ref={mobileMenuTriggerRef}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center p-2 text-[var(--primary)]"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? tNav('closeMenu') : tNav('openMenu')}
        aria-expanded={isOpen}
      >
        <Menu size={28} />
      </button>
      {mobileMenuContent}
    </>
  )
}
