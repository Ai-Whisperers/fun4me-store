/**
 * Ambassador Data Hook
 *
 * Manages data fetching and copy/share actions for ambassador dashboard.
 */

'use client'

import { useState, useEffect } from 'react'
import { useCopyTimeout } from '@/lib/hooks'
import type { Ambassador, Stats, Referral } from './types'

export function useAmbassadorData() {
  const [ambassador, setAmbassador] = useState<Ambassador | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // BUG-008: Safe timeout with cleanup for copy feedback
  useCopyTimeout(copied, () => setCopied(false))

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [ambassadorRes, statsRes, referralsRes] = await Promise.all([
        fetch('/api/ambassador'),
        fetch('/api/ambassador/stats'),
        fetch('/api/ambassador/referrals?limit=5'),
      ])

      if (!ambassadorRes.ok) {
        const data = await ambassadorRes.json()
        throw new Error(data.error || 'Error al cargar perfil')
      }

      setAmbassador(await ambassadorRes.json())

      if (statsRes.ok) {
        setStats(await statsRes.json())
      }

      if (referralsRes.ok) {
        const data = await referralsRes.json()
        setReferrals(data.referrals || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const copyCode = async () => {
    if (!ambassador) return
    try {
      await navigator.clipboard.writeText(ambassador.referral_code)
      setCopied(true)
    } catch (_error: unknown) {
      const textArea = document.createElement('textarea')
      textArea.value = ambassador.referral_code
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
    }
  }

  const shareCode = async () => {
    if (!ambassador) return
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Únete a Vetic',
          text: ambassador.share_message,
          url: ambassador.share_url,
        })
      } catch (_error: unknown) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(ambassador.share_message)
      setCopied(true)
    }
  }

  return {
    ambassador,
    stats,
    referrals,
    isLoading,
    copied,
    error,
    fetchData,
    copyCode,
    shareCode,
  }
}
