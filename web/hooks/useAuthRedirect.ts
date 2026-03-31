import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

/**
 * Hook that checks Supabase auth status and redirects to login if not authenticated.
 * Returns the current user (or null) and a loading flag.
 */
export function useAuthRedirect() {
  const router = useRouter()
  const { clinic } = useParams<{ clinic: string }>()
  const supabase = createClient()

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setUser(session?.user || null)
      setLoading(false)
    }
    checkAuth()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/${clinic}/portal/login`)
    }
  }, [loading, user, router, clinic])

  return { user, loading }
}
