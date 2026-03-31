'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { ShoppingCart, User, Lock, MessageCircle, Loader2 } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

interface AuthGateProps {
  clinic: string
  /** Current path to redirect to after login */
  redirect: string
  /** WhatsApp number for direct contact option */
  whatsappNumber?: string
  /** Title shown when not authenticated */
  title?: string
  /** Description shown when not authenticated */
  description?: string
  /** Icon to show (defaults to Lock) */
  icon?: 'cart' | 'user' | 'lock'
  /** Content to show when authenticated */
  children: React.ReactNode
  /** Optional preview content to show below the auth gate */
  preview?: React.ReactNode
}

const ICONS = {
  cart: ShoppingCart,
  user: User,
  lock: Lock,
}

export function AuthGate({
  clinic,
  redirect: redirectTo,
  whatsappNumber,
  title,
  description,
  icon = 'lock',
  children,
  preview,
}: AuthGateProps) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const t = useTranslations('auth')

  // Use translations for default values
  const displayTitle = title ?? t('gate.defaultTitle')
  const displayDescription = description ?? t('gate.defaultDescription')

  useEffect(() => {
    const supabase = createClient()

    const checkUser = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()
        if (error) {
          logger.warn('AuthGate session error', {
            error: error.message,
            context: 'AuthGate',
          })
        }
        setUser(session?.user ?? null)
      } catch (err) {
        logger.error('AuthGate failed to get session', {
          error: err instanceof Error ? err.message : 'Unknown',
          context: 'AuthGate',
        })
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  // Authenticated - show children
  if (user) {
    return <>{children}</>
  }

  // Not authenticated - show gate
  const Icon = ICONS[icon]
  const encodedRedirect = encodeURIComponent(redirectTo)

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl">
        {/* Header */}
        <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark,var(--primary))] p-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/20">
            <Icon className="h-10 w-10 text-white" />
          </div>
          <h2 className="mb-2 text-2xl font-black text-white">{displayTitle}</h2>
          <p className="text-white/80">{displayDescription}</p>
        </div>

        {/* Actions */}
        <div className="space-y-4 p-6">
          <Link
            href={`/${clinic}/portal/signup?redirect=${encodedRedirect}`}
            className="block w-full rounded-xl bg-[var(--primary)] px-6 py-4 text-center font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:opacity-90 hover:shadow-xl"
          >
            {t('gate.createAccount')}
          </Link>

          <Link
            href={`/${clinic}/portal/login?redirect=${encodedRedirect}`}
            className="block w-full rounded-xl bg-gray-100 px-6 py-4 text-center font-bold text-gray-700 transition-all hover:bg-gray-200"
          >
            {t('gate.haveAccount')}
          </Link>

          {/* WhatsApp Option */}
          {whatsappNumber && (
            <>
              <div className="relative flex items-center py-3">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="mx-4 flex-shrink-0 text-xs font-bold uppercase text-gray-400">
                  {t('gate.orWithoutAccount')}
                </span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              <a
                href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(t('gate.whatsappMessage'))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-green-500 px-6 py-4 font-bold text-white transition-all hover:bg-green-600"
              >
                <MessageCircle className="h-5 w-5" />
                {t('gate.whatsappContact')}
              </a>
              <p className="text-center text-xs text-gray-400">
                {t('gate.clinicCanHelp')}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Preview Content */}
      {preview && (
        <div className="pointer-events-none mt-8 w-full max-w-2xl opacity-60">
          <p className="mb-4 text-center text-sm font-medium text-gray-500">
            {t('gate.cartPreview')}
          </p>
          {preview}
        </div>
      )}
    </div>
  )
}
