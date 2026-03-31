'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Calendar,
  Plus,
  Users,
  Wallet,
  X,
  CalendarPlus,
  FileText,
  PawPrint,
  Syringe,
} from 'lucide-react'

interface BottomNavigationProps {
  clinic: string
}

export function BottomNavigation({ clinic }: BottomNavigationProps): React.ReactElement {
  const pathname = usePathname()
  const [showQuickActions, setShowQuickActions] = useState(false)

  const isActive = (path: string): boolean => {
    if (path === '/dashboard' && pathname === `/${clinic}/dashboard`) return true
    if (path !== '/dashboard' && pathname.startsWith(`/${clinic}${path}`)) return true
    return false
  }

  const navItems = [
    {
      icon: LayoutDashboard,
      label: 'Inicio',
      href: '/dashboard',
    },
    {
      icon: Calendar,
      label: 'Agenda',
      href: '/dashboard/calendar',
    },
    {
      icon: null, // Placeholder for center button
      label: 'Nuevo',
      href: null,
    },
    {
      icon: Users,
      label: 'Clientes',
      href: '/dashboard/clients',
    },
    {
      icon: Wallet,
      label: 'Finanzas',
      href: '/dashboard/invoices',
    },
  ]

  const quickActions = [
    {
      icon: CalendarPlus,
      label: 'Nueva cita',
      href: `/${clinic}/dashboard/appointments?action=new`,
      color: 'bg-blue-500',
    },
    {
      icon: FileText,
      label: 'Nueva factura',
      href: `/${clinic}/dashboard/invoices?action=new`,
      color: 'bg-green-500',
    },
    {
      icon: PawPrint,
      label: 'Nuevo paciente',
      href: `/${clinic}/dashboard/clients?action=new-pet`,
      color: 'bg-purple-500',
    },
    {
      icon: Syringe,
      label: 'Registrar vacuna',
      href: `/${clinic}/dashboard/vaccines?action=new`,
      color: 'bg-orange-500',
    },
  ]

  return (
    <>
      {/* Quick Actions Modal */}
      <AnimatePresence>
        {showQuickActions && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
              onClick={() => setShowQuickActions(false)}
            />

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-24 left-0 right-0 z-50 px-4 lg:hidden"
            >
              <div className="mx-auto max-w-sm rounded-3xl bg-[var(--bg-paper)] p-4 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-bold text-[var(--text-primary)]">Acciones rápidas</h3>
                  <button
                    onClick={() => setShowQuickActions(false)}
                    className="p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {quickActions.map((action) => {
                    const Icon = action.icon
                    return (
                      <Link
                        key={action.label}
                        href={action.href}
                        onClick={() => setShowQuickActions(false)}
                        className="hover:bg-[var(--bg-subtle)]/80 flex items-center gap-3 rounded-2xl bg-[var(--bg-subtle)] p-3 transition-colors"
                      >
                        <span
                          className={`h-10 w-10 ${action.color} flex items-center justify-center rounded-xl text-white`}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {action.label}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden">
        <div className="pb-safe border-t border-[var(--border-light)] bg-[var(--bg-paper)] px-2">
          <div className="flex h-16 items-center justify-around">
            {navItems.map((item, index) => {
              // Center button (FAB)
              if (index === 2) {
                return (
                  <button
                    key="fab"
                    onClick={() => setShowQuickActions(!showQuickActions)}
                    className={`relative -mt-6 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all ${
                      showQuickActions ? 'rotate-45 bg-gray-900' : 'bg-[var(--primary)]'
                    }`}
                  >
                    <Plus className="h-6 w-6 text-white" />
                  </button>
                )
              }

              // Non-null assertions safe: center item (index 2) handled above, all others have icon and href
              /* eslint-disable @typescript-eslint/no-non-null-assertion */
              const Icon = item.icon!
              const active = isActive(item.href!)
              /* eslint-enable @typescript-eslint/no-non-null-assertion */

              return (
                <Link
                  key={item.label}
                  href={`/${clinic}${item.href}`}
                  className={`flex h-full w-16 flex-col items-center justify-center transition-colors ${
                    active
                      ? 'text-[var(--primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${active ? 'stroke-[2.5]' : ''}`} />
                  <span className={`mt-1 text-xs ${active ? 'font-bold' : ''}`}>{item.label}</span>
                  {active && (
                    <motion.div
                      layoutId="bottomNavIndicator"
                      className="absolute -bottom-0 h-1 w-8 rounded-full bg-[var(--primary)]"
                    />
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>
    </>
  )
}
