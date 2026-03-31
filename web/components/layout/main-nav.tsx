'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ClinicConfig } from '@/lib/clinics'
import { ShoppingCart, Home, Briefcase, Users, Store } from 'lucide-react'
import { NotificationBell } from './notification-bell'
import { useCart } from '@/context/cart-context'
import { useNavAuth } from './nav/useNavAuth'
import { ToolsDropdown } from './nav/ToolsDropdown'
import { UserMenu } from './nav/UserMenu'
import { MobileMenu, type NavItem } from './nav/MobileMenu'
import { LanguageSelector } from '@/components/ui/language-selector'
import { useLocale } from '@/i18n/hooks'

interface MainNavProps {
  clinic: string
  config: ClinicConfig
}

export function MainNav({ clinic, config }: Readonly<MainNavProps>) {
  const pathname = usePathname()
  const { itemCount } = useCart()
  const { user, profile, isLoading, isLoggingOut, logoutError, handleLogout } = useNavAuth(clinic)
  const currentLocale = useLocale()
  const tNav = useTranslations('nav')
  const tStore = useTranslations('store')

  // Check if services page is enabled (default true for backwards compatibility)
  const servicesPageEnabled = config.settings?.modules?.services_page !== false

  const navItems: NavItem[] = [
    {
      label: config.ui_labels?.nav.home || tNav('home'),
      href: `/${clinic}`,
      exact: true,
      icon: Home,
    },
    // Only show services if enabled
    ...(servicesPageEnabled
      ? [
          {
            label: config.ui_labels?.nav.services || tNav('services'),
            href: `/${clinic}/services`,
            icon: Briefcase,
          },
        ]
      : []),
    {
      label: config.ui_labels?.nav.about || tNav('about'),
      href: `/${clinic}/about`,
      icon: Users,
    },
    {
      label: config.ui_labels?.nav.store || tNav('store'),
      href: `/${clinic}/store`,
      icon: Store,
    },
    ...(profile?.role === 'admin' || profile?.role === 'vet'
      ? [
          {
            label: tNav('inventory'),
            href: `/${clinic}/portal/inventory`,
            icon: Briefcase,
          },
        ]
      : []),
  ]

  const isActive = (href: string, exact: boolean = false): boolean => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <>
      <nav className="hidden items-center gap-8 md:flex" aria-label={tNav('mainNavigation')}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`group relative text-base font-bold uppercase tracking-wide transition-colors ${
              isActive(item.href, item.exact)
                ? 'text-[var(--primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--primary)]'
            }`}
          >
            {item.label}
            <span
              className={`absolute -bottom-1 left-0 h-0.5 bg-[var(--primary)] transition-all duration-300 ${
                isActive(item.href, item.exact) ? 'w-full' : 'w-0 group-hover:w-full'
              }`}
            ></span>
          </Link>
        ))}

        <ToolsDropdown clinic={clinic} config={config} isActive={isActive} pathname={pathname} />

        <UserMenu
          clinic={clinic}
          config={config}
          user={user}
          isLoading={isLoading}
          isActive={isActive}
          isLoggingOut={isLoggingOut}
          logoutError={logoutError}
          handleLogout={handleLogout}
        />

        {user && <NotificationBell clinic={clinic} />}

        {/* Cart icon - only show for logged-in users */}
        {user && (
          <Link
            href={`/${clinic}/cart`}
            className="relative flex min-h-[44px] min-w-[44px] items-center justify-center p-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--primary)]"
            aria-label={
              itemCount > 0
                ? tStore('cartWithItems', { count: itemCount })
                : tStore('cartLabel')
            }
          >
            <ShoppingCart className="h-6 w-6" aria-hidden="true" />
            {itemCount > 0 && (
              <span
                className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--status-error,#dc2626)] text-xs font-bold text-white"
                aria-hidden="true"
              >
                {itemCount}
              </span>
            )}
          </Link>
        )}

        <LanguageSelector currentLocale={currentLocale} />
      </nav>

      <div className="flex items-center gap-3 md:hidden">
        {user && <NotificationBell clinic={clinic} />}

        {/* Cart icon - only show for logged-in users */}
        {user && (
          <Link
            href={`/${clinic}/cart`}
            className="relative flex min-h-[44px] min-w-[44px] items-center justify-center p-2 text-[var(--primary)]"
            aria-label={
              itemCount > 0
                ? tStore('cartWithItems', { count: itemCount })
                : tStore('cartLabel')
            }
          >
            <ShoppingCart className="h-6 w-6" aria-hidden="true" />
            {itemCount > 0 && (
              <span
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--status-error,#dc2626)] text-xs font-bold text-white"
                aria-hidden="true"
              >
                {itemCount}
              </span>
            )}
          </Link>
        )}

        <MobileMenu
          clinic={clinic}
          config={config}
          user={user}
          profile={profile}
          navItems={navItems}
          isLoading={isLoading}
          isActive={isActive}
          isLoggingOut={isLoggingOut}
          handleLogout={handleLogout}
        />
      </div>
    </>
  )
}
