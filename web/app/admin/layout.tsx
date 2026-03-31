/**
 * Platform Admin Layout
 *
 * Layout for Vetic platform administration pages.
 * Only accessible to users with platform_admin role.
 */

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { AdminHeader } from '@/components/admin/admin-header'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    // Platform admins should log in through their clinic's portal first
    // then navigate to /admin. Redirect to home for guidance.
    redirect('/?returnTo=/admin')
  }

  // Check for platform_admin role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || profile.role !== 'platform_admin') {
    redirect('/?error=unauthorized')
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader user={{ name: profile.full_name, email: profile.email }} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
