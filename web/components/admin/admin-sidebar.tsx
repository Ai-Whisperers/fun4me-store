'use client'

/**
 * Platform Admin Sidebar
 *
 * Navigation sidebar for the admin dashboard.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Wallet,
  Users,
  Gift,
  Settings,
  BarChart3,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Clínicas', href: '/admin/tenants', icon: Building2 },
  { name: 'Pasarelas de Pago', href: '/admin/payment-gateways', icon: Wallet },
  { name: 'Suscripciones', href: '/admin/subscriptions', icon: CreditCard },
  { name: 'Comisiones', href: '/admin/commissions', icon: BarChart3 },
  { name: 'Referidos', href: '/admin/referrals', icon: Gift },
  { name: 'Usuarios', href: '/admin/users', icon: Users },
  { name: 'Mensajes', href: '/admin/messages', icon: MessageSquare },
  { name: 'Auditoría', href: '/admin/audit', icon: ShieldCheck },
  { name: 'Configuración', href: '/admin/settings', icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <div className="flex w-64 flex-col bg-gray-900">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-gray-800">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold">
            V
          </div>
          <span className="text-lg font-semibold text-white">Vetic Admin</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }
              `}
            >
              <item.icon className={`h-5 w-5 ${isActive ? 'text-blue-400' : 'text-gray-400 group-hover:text-gray-300'}`} />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-800 p-4">
        <div className="text-xs text-gray-500">
          Vetic Platform v1.0
        </div>
      </div>
    </div>
  )
}
