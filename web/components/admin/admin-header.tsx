'use client'

/**
 * Platform Admin Header
 *
 * Top header bar for the admin dashboard.
 */

import { Bell, LogOut, User } from 'lucide-react'

interface AdminHeaderProps {
  user: {
    name: string
    email: string
  }
}

export function AdminHeader({ user }: AdminHeaderProps) {
  const handleLogout = async () => {
    // Client-side logout
    window.location.href = '/auth/signout'
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Breadcrumb could go here */}
      <div />

      {/* User menu */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-red-500" />
        </button>

        {/* User info */}
        <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <User className="h-4 w-4" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="ml-2 rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
