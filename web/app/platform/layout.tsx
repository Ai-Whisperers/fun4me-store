/**
 * Platform Admin Layout
 *
 * Protected layout for platform administrators with cross-tenant access.
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Building2, BarChart3, Megaphone, Settings, LogOut, Activity, FileJson, Users } from 'lucide-react'

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Platform admins should log in through their clinic's portal first
    // then navigate to /platform. Redirect to home for guidance.
    redirect('/?returnTo=/platform')
  }

  // Get profile and verify platform admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, is_platform_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_platform_admin) {
    redirect('/')
  }

  const navItems = [
    { href: '/platform', label: 'Dashboard', icon: BarChart3 },
    { href: '/platform/clinics', label: 'Clínicas', icon: Building2 },
    { href: '/platform/ambassadors', label: 'Embajadores', icon: Users },
    { href: '/platform/monitoring', label: 'Monitoreo', icon: Activity },
    { href: '/platform/api-docs', label: 'API Docs', icon: FileJson },
    { href: '/platform/announcements', label: 'Anuncios', icon: Megaphone },
    { href: '/platform/settings', label: 'Configuración', icon: Settings },
  ]

  return (
    <div className="flex min-h-screen bg-[var(--bg-secondary,#f3f4f6)]">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)]">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b border-[var(--border-light,#e5e7eb)] px-6">
            <span className="text-xl font-bold text-[var(--primary)]">Vete Platform</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-secondary,#f3f4f6)] hover:text-[var(--text-primary)]"
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* User info */}
          <div className="border-t border-[var(--border-light,#e5e7eb)] p-4">
            <div className="mb-2">
              <p className="text-sm font-medium text-[var(--text-primary)]">{profile.full_name}</p>
              <p className="text-xs text-[var(--text-muted)]">{profile.email}</p>
            </div>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--text-muted)] transition hover:bg-[var(--bg-secondary,#f3f4f6)] hover:text-[var(--status-error,#dc2626)]"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 flex-1 p-8">{children}</main>
    </div>
  )
}
