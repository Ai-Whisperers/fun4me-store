import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import * as Icons from 'lucide-react'
import Link from 'next/link'
import { ProfileForm } from './profile-form'

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ clinic: string }>
  searchParams: Promise<{ success?: string }>
}) {
  const supabase = await createClient()
  const { clinic } = await params
  const { success } = await searchParams

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${clinic}/portal/login`)

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  return (
    <div className="mx-auto max-w-3xl px-4 pb-20">
      <div className="mb-8 flex items-center gap-4">
        <Link
          href={`/${clinic}/portal/dashboard`}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-2 transition-colors hover:bg-white"
        >
          <Icons.ArrowLeft className="h-6 w-6 text-[var(--text-secondary)]" />
        </Link>
        <div>
          <h1 className="text-3xl font-black text-[var(--text-primary)]">Mi Perfil</h1>
          <p className="font-medium text-[var(--text-secondary)]">
            Gestiona tu información personal y de contacto
          </p>
        </div>
      </div>

      <ProfileForm clinic={clinic} profile={profile} success={!!success} />
    </div>
  )
}
