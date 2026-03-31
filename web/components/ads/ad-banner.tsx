'use client'

/**
 * AdBanner Component
 *
 * Displays Google AdSense ads for free tier clinic pages.
 * Includes an upgrade CTA to convert free users to paid tiers.
 *
 * Placements:
 * - top: Full-width banner at top of page
 * - sidebar: Vertical banner for sidebars
 * - footer: Full-width banner at bottom of page
 * - inline: Inline ad within content
 *
 * Usage:
 * <AdBanner placement="top" tenantTier="gratis" tenantId="terrapet" />
 */

import { useEffect, useState } from 'react'
import { X, Sparkles, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { TierId } from '@/lib/pricing/tiers'

export type AdPlacement = 'top' | 'sidebar' | 'footer' | 'inline'

interface AdBannerProps {
  placement: AdPlacement
  tenantTier: TierId
  tenantId: string
  className?: string
  showUpgradeCta?: boolean
}

// Google AdSense slot IDs (replace with actual values in production)
const AD_SLOTS: Record<AdPlacement, string> = {
  top: 'ca-pub-XXXXXXX-top',
  sidebar: 'ca-pub-XXXXXXX-sidebar',
  footer: 'ca-pub-XXXXXXX-footer',
  inline: 'ca-pub-XXXXXXX-inline',
}

// Ad dimensions by placement
const AD_DIMENSIONS: Record<AdPlacement, { width: string; height: string; minHeight: string }> = {
  top: { width: '100%', height: 'auto', minHeight: '90px' },
  sidebar: { width: '300px', height: 'auto', minHeight: '250px' },
  footer: { width: '100%', height: 'auto', minHeight: '90px' },
  inline: { width: '100%', height: 'auto', minHeight: '250px' },
}

export function AdBanner({
  placement,
  tenantTier,
  tenantId,
  className = '',
  showUpgradeCta = true,
}: AdBannerProps) {
  const [isAdLoaded, setIsAdLoaded] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [showFallback, setShowFallback] = useState(false)

  // Determine if we should show ads
  const shouldShowAd = tenantTier === 'gratis' && !isDismissed

  useEffect(() => {
    // Skip if not showing ads
    if (!shouldShowAd) return
    // Check if AdSense script is loaded
    const checkAdSense = () => {
      if (typeof window !== 'undefined' && (window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle) {
        setIsAdLoaded(true)
        // Push ad
        try {
          ((window as unknown as { adsbygoogle: unknown[] }).adsbygoogle = (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle || []).push({})
        } catch (e) {
          console.warn('AdSense push failed:', e)
          setShowFallback(true)
        }
      } else {
        // Fallback if AdSense not available
        setShowFallback(true)
      }
    }

    // Wait a bit for AdSense to initialize
    const timer = setTimeout(checkAdSense, 1000)
    return () => clearTimeout(timer)
  }, [shouldShowAd])

  const dimensions = AD_DIMENSIONS[placement]

  const containerClasses = {
    top: 'w-full border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100',
    sidebar: 'w-[300px] rounded-lg border border-gray-200 bg-white shadow-sm',
    footer: 'w-full border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100',
    inline: 'w-full my-4 rounded-lg border border-gray-200 bg-white',
  }

  // Don't show ads for paid tiers or if dismissed
  if (!shouldShowAd) {
    return null
  }

  return (
    <div
      className={`relative overflow-hidden ${containerClasses[placement]} ${className}`}
      style={{ minHeight: dimensions.minHeight }}
      data-tenant={tenantId}
      data-placement={placement}
    >
      {/* Dismiss button (only for top and inline) */}
      {(placement === 'top' || placement === 'inline') && (
        <button
          onClick={() => setIsDismissed(true)}
          className="absolute right-2 top-2 z-10 rounded-full bg-white/80 p-1 text-gray-500 hover:bg-white hover:text-gray-700 transition-colors"
          aria-label="Cerrar anuncio"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <div className="flex flex-col items-center justify-center p-4">
        {/* AdSense ad slot */}
        {!showFallback ? (
          <ins
            className="adsbygoogle"
            style={{
              display: 'block',
              width: dimensions.width,
              minHeight: dimensions.minHeight,
            }}
            data-ad-client="ca-pub-XXXXXXXXXX"
            data-ad-slot={AD_SLOTS[placement]}
            data-ad-format={placement === 'sidebar' ? 'vertical' : 'horizontal'}
            data-full-width-responsive="true"
          />
        ) : (
          // Fallback: Show upgrade CTA when AdSense not available
          <FallbackUpgradeBanner placement={placement} tenantId={tenantId} />
        )}

        {/* Upgrade CTA (always show below ad) */}
        {showUpgradeCta && !showFallback && (
          <UpgradeCta placement={placement} tenantId={tenantId} />
        )}
      </div>

      {/* "Ad" label */}
      <div className="absolute bottom-1 left-1 text-[10px] text-gray-400">
        Publicidad
      </div>
    </div>
  )
}

// Compact upgrade CTA below the ad
function UpgradeCta({ placement, tenantId }: { placement: AdPlacement; tenantId: string }) {
  if (placement === 'sidebar') {
    return (
      <Link
        href={`/${tenantId}/upgrade`}
        className="mt-3 flex items-center gap-1 text-xs text-[var(--primary)] hover:underline"
      >
        <Sparkles className="h-3 w-3" />
        <span>Eliminar anuncios</span>
      </Link>
    )
  }

  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-gray-600">
      <Sparkles className="h-3 w-3 text-yellow-500" />
      <span>¿Quieres eliminar los anuncios?</span>
      <Link
        href={`/${tenantId}/upgrade`}
        className="inline-flex items-center gap-1 font-medium text-[var(--primary)] hover:underline"
      >
        Actualizar a Básico
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  )
}

// Fallback banner when AdSense is not available
function FallbackUpgradeBanner({ placement, tenantId }: { placement: AdPlacement; tenantId: string }) {
  const isVertical = placement === 'sidebar'

  return (
    <div
      className={`flex ${isVertical ? 'flex-col' : 'flex-row flex-wrap'} items-center justify-center gap-4 p-4 text-center`}
    >
      <div className={`${isVertical ? '' : 'flex items-center gap-3'}`}>
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark,var(--primary))] text-white">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className={isVertical ? 'text-center' : 'text-left'}>
          <h3 className="font-semibold text-gray-900">
            {isVertical ? 'Actualiza tu plan' : 'Experimenta Vetic sin anuncios'}
          </h3>
          <p className="text-sm text-gray-600">
            {isVertical
              ? 'Elimina anuncios y desbloquea más funciones'
              : 'Actualiza a Básico por solo Gs 100.000/mes'}
          </p>
        </div>
      </div>
      <Link
        href={`/${tenantId}/upgrade`}
        className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-dark,var(--primary))]"
      >
        Ver planes
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}

/**
 * Wrapper component that handles showing ads only on pages where appropriate
 * Use this in layouts to automatically inject ads
 */
export function AdBannerWrapper({
  placement,
  tenantTier,
  tenantId,
}: {
  placement: AdPlacement
  tenantTier: TierId
  tenantId: string
}) {
  // List of pages where we should NOT show ads
  const excludedPaths = [
    '/dashboard', // Staff dashboard
    '/portal/appointments', // During appointment booking
    '/portal/medical', // Medical records viewing
    '/checkout', // During checkout
    '/auth', // Auth pages
  ]

  const [shouldShow, setShouldShow] = useState(true)

  useEffect(() => {
    // Check current path
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname
      const isExcluded = excludedPaths.some((path) => currentPath.includes(path))
      setShouldShow(!isExcluded)
    }
  }, [])

  if (!shouldShow) {
    return null
  }

  return <AdBanner placement={placement} tenantTier={tenantTier} tenantId={tenantId} />
}

export default AdBanner
