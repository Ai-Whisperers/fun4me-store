'use client'

/**
 * Tenant Providers
 *
 * Client-side wrapper that provides feature flags context and
 * conditionally renders ad banners for free tier.
 */

import { ReactNode } from 'react'
import { FeatureFlagsProvider } from '@/lib/features/client'
import { AdBanner } from '@/components/ads/ad-banner'
import { AdSenseScript } from '@/components/ads/adsense-script'
import type { TierId, TierFeatures } from '@/lib/pricing/tiers'

interface TenantProvidersProps {
  children: ReactNode
  tenantId: string
  tier: TierId
  tierFeatures: TierFeatures
  isOnTrial?: boolean
  trialEndsAt?: string | null
  showAds?: boolean
}

export function TenantProviders({
  children,
  tenantId,
  tier,
  tierFeatures,
  isOnTrial = false,
  trialEndsAt = null,
  showAds = false,
}: TenantProvidersProps) {
  // Build initial features for the provider
  const initialFeatures = {
    tenantId,
    tierId: tier,
    tierName: getTierName(tier),
    isOnTrial,
    trialEndsAt: trialEndsAt ? new Date(trialEndsAt) : null,
    subscriptionExpiresAt: null,
    features: tierFeatures,
    featureOverrides: {},
    referralDiscount: 0,
  }

  return (
    <FeatureFlagsProvider tenantId={tenantId} initialFeatures={initialFeatures}>
      {/* AdSense Script - only load for free tier */}
      {showAds && <AdSenseScript />}

      {/* Top Ad Banner - only show on free tier public pages */}
      {showAds && (
        <AdBanner
          placement="top"
          tenantTier={tier}
          tenantId={tenantId}
          className="sticky top-20 z-40"
        />
      )}

      {children}

      {/* Footer Ad Banner - only show on free tier */}
      {showAds && (
        <AdBanner
          placement="footer"
          tenantTier={tier}
          tenantId={tenantId}
        />
      )}
    </FeatureFlagsProvider>
  )
}

function getTierName(tier: TierId): string {
  const names: Record<TierId, string> = {
    gratis: 'Gratis',
    profesional: 'Profesional',
  }
  return names[tier] || tier
}

export default TenantProviders
