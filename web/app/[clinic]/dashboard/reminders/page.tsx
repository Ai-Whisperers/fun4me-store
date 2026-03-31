import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RemindersDashboard from './client'

interface Props {
  params: Promise<{ clinic: string }>
}

export default async function Page({ params }: Props) {
  const { clinic } = await params
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/${clinic}/portal/login`)
  }

  // Staff check
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !['vet', 'admin'].includes(profile.role)) {
    redirect(`/${clinic}/portal`)
  }

  return <RemindersDashboard clinic={clinic} isAdmin={profile.role === 'admin'} />
}
