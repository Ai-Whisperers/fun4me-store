import { redirect } from 'next/navigation'

// Audit logs are handled in dashboard for proper security (tenant_id filtering)
// This redirect ensures admins always use the secure dashboard version

interface Props {
  params: Promise<{ clinic: string }>
}

export default async function PortalAuditPage({ params }: Props) {
  const { clinic } = await params
  redirect(`/${clinic}/dashboard/audit`)
}
