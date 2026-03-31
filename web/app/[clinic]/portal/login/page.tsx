import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/auth/login-form'
import { getReturnUrl } from '@/lib/auth'

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ clinic: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { clinic } = await params
  const sp = await searchParams
  // BUG-002: Use centralized redirect URL handling (supports redirect, returnTo, next)
  const redirectTo = getReturnUrl(sp, `/${clinic}/portal`)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect(redirectTo)
  }

  return <LoginForm clinic={clinic} redirectTo={redirectTo} />
}
