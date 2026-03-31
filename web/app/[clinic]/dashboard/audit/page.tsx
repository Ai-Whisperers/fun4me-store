import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AuditLogsList } from './audit-logs-list'

interface Props {
  params: Promise<{ clinic: string }>
}

export default async function DashboardAuditPage({ params }: Props) {
  const { clinic } = await params
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/${clinic}/portal/login`)
  }

  // Admin check - audit logs are admin only
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin' || profile.tenant_id !== clinic) {
    redirect(`/${clinic}/dashboard`)
  }

  // Fetch audit logs server-side with tenant filter
  const { data: logs } = await supabase
    .from('audit_logs')
    .select(
      `
      *,
      profiles:user_id (email, full_name, role)
    `
    )
    .eq('tenant_id', clinic)
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="p-6">
      <AuditLogsList logs={logs || []} />
    </div>
  )
}
