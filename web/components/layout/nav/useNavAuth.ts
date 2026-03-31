'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, hasStoredSession } from '@/lib/supabase/client'
import type { User as SupabaseUser } from '@supabase/supabase-js'

export interface UserProfile {
  id: string
  tenant_id: string
  role: 'owner' | 'vet' | 'admin'
  full_name: string | null
  email: string | null
  phone: string | null
}

interface UseNavAuthReturn {
  user: SupabaseUser | null
  profile: UserProfile | null
  isLoading: boolean
  isLoggingOut: boolean
  logoutError: string | null
  handleLogout: () => Promise<void>
}

// Simple in-memory cache for profile (avoids refetching on every mount)
const profileCache = new Map<string, { profile: UserProfile; timestamp: number }>()
const PROFILE_CACHE_TTL = 60000 // 1 minute

function getCachedProfile(userId: string): UserProfile | null {
  const cached = profileCache.get(userId)
  if (cached && Date.now() - cached.timestamp < PROFILE_CACHE_TTL) {
    return cached.profile
  }
  return null
}

function setCachedProfile(userId: string, profile: UserProfile): void {
  profileCache.set(userId, { profile, timestamp: Date.now() })
}

export function useNavAuth(clinic: string): UseNavAuthReturn {
  const router = useRouter()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  // PERF: If there's a stored session, don't show loading skeleton
  // This gives instant UI while we verify in the background
  const [isLoading, setIsLoading] = useState(() => !hasStoredSession())
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState<string | null>(null)

  // Use singleton client
  const supabase = createClient()

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true)
    setLogoutError(null)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        throw error
      }
      // Clear cache on logout
      profileCache.clear()
      setUser(null)
      setProfile(null)
      router.push(`/${clinic}/portal/login`)
      router.refresh()
    } catch (_error: unknown) {
      setLogoutError('Error al cerrar sesión. Intente de nuevo.')
      setTimeout(() => setLogoutError(null), 5000)
    } finally {
      setIsLoggingOut(false)
    }
  }, [supabase, clinic, router])

  useEffect(() => {
    let isMounted = true

    // Safety timeout: if loading takes too long, force show content
    // Only needed when there's no stored session (isLoading started as true)
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        setIsLoading(false)
      }
    }, 5000)

    const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
      // Check cache first
      const cached = getCachedProfile(userId)
      if (cached) return cached

      try {
        const { data: prof, error } = await supabase
          .from('profiles')
          .select('id, tenant_id, role, full_name, email, phone')
          .eq('id', userId)
          .maybeSingle()

        if (error) {
          console.warn('Profile fetch error:', error.message)
          return null
        }
        if (prof) {
          setCachedProfile(userId, prof as UserProfile)
        }
        return prof as UserProfile | null
      } catch (_error: unknown) {
        return null
      }
    }

    const checkUser = async () => {
      try {
        // PERF: Use getSession() for fast initial load (reads from cookie)
        // This is safe because middleware validates the session on protected routes
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!isMounted) return

        if (!session?.user) {
          setUser(null)
          setProfile(null)
          setIsLoading(false)
          return
        }

        // Set user immediately from session (fast)
        setUser(session.user)
        setIsLoading(false)

        // Check profile cache first
        const cachedProfile = getCachedProfile(session.user.id)
        if (cachedProfile) {
          setProfile(cachedProfile)
        } else {
          // Fetch profile in background
          fetchProfile(session.user.id).then((prof) => {
            if (isMounted && prof) setProfile(prof)
          })
        }
      } catch (_error: unknown) {
        if (isMounted) {
          setUser(null)
          setProfile(null)
          setIsLoading(false)
        }
      }
    }

    checkUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          setUser(session.user)
          const prof = await fetchProfile(session.user.id)
          if (isMounted && prof) setProfile(prof)
        }
      } else if (event === 'SIGNED_OUT') {
        profileCache.clear()
        setUser(null)
        setProfile(null)
      }
      setIsLoading(false)
    })

    return () => {
      isMounted = false
      clearTimeout(safetyTimeout)
      subscription.unsubscribe()
    }
    // Run once on mount - supabase is a singleton
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    user,
    profile,
    isLoading,
    isLoggingOut,
    logoutError,
    handleLogout,
  }
}
