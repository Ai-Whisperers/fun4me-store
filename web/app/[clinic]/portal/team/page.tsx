import { redirect } from 'next/navigation'

// Team management is handled in dashboard for proper security and unified experience
// This redirect ensures admins always use the secure dashboard version

interface Props {
  params: Promise<{ clinic: string }>
}

export default async function PortalTeamPage({ params }: Props) {
  const { clinic } = await params
  redirect(`/${clinic}/dashboard/team`)
}
