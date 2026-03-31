import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SmsSettings from './client'

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

  // Admin check
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role, phone')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect(`/${clinic}/dashboard`)
  }

  return <SmsSettings clinic={clinic} userPhone={profile.phone} />
}
