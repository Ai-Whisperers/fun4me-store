import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SignupForm } from '@/components/auth/signup-form'
import { getReturnUrl } from '@/lib/auth'

export default async function SignupPage({
  params,
  searchParams,
}: {
  params: Promise<{ clinic: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { clinic } = await params
  const sp = await searchParams
  // BUG-002: Use centralized redirect URL handling
  const redirectTo = getReturnUrl(sp, `/${clinic}/portal/dashboard`)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect(redirectTo)
  }

  return <SignupForm clinic={clinic} redirectTo={redirectTo} />
}
