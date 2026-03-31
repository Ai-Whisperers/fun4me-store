'use client'

/**
 * AdSense Script Component
 *
 * Loads the Google AdSense script. Include this in the root layout
 * or in a head component for pages that should show ads.
 *
 * Only loads for free tier tenants (configured via environment variable).
 *
 * Environment variables:
 * - NEXT_PUBLIC_ADSENSE_CLIENT_ID: Your AdSense publisher ID (ca-pub-XXXXXXXXXX)
 * - NEXT_PUBLIC_ENABLE_ADS: Set to 'true' to enable ads in production
 */

import Script from 'next/script'

interface AdSenseScriptProps {
  enableAds?: boolean
}

export function AdSenseScript({ enableAds = true }: AdSenseScriptProps) {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID
  const isAdsEnabled = process.env.NEXT_PUBLIC_ENABLE_ADS === 'true'

  // Don't load script if ads are disabled or no client ID
  if (!enableAds || !isAdsEnabled || !clientId) {
    return null
  }

  return (
    <Script
      id="google-adsense"
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
      crossOrigin="anonymous"
      strategy="lazyOnload"
      onError={(e) => {
        console.warn('AdSense script failed to load:', e)
      }}
    />
  )
}

export default AdSenseScript
