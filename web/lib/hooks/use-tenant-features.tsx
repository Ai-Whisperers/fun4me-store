/**
 * useTenantFeatures Hook
 *
 * React hook for checking tenant feature access in components.
 * Provides easy feature gating with loading states and upgrade prompts.
 *
 * @example
 * ```tsx
 * function EcommerceButton() {
 *   const { canUse, FeatureGate } = useTenantFeatures()
 *
 *   return (
 *     <FeatureGate feature="ecommerce" fallback={<UpgradePrompt />}>
 *       <StoreButton />
 *     </FeatureGate>
 *   )
 * }
 * ```
 */

'use client'

import { createContext, useContext, useMemo, ReactNode } from 'react'
import Link from 'next/link'
import type { TierFeatures } from '@/lib/pricing/tiers'
import {
  ResolvedTenantFeatures,
  defaultFeatures,
  checkFeatureAccess,
  canUseFeature,
  getUpgradeMessage,
  hasEcommerceAccess,
  hasClinicalModulesAccess,
  hasAnalyticsAccess,
  hasEnterpriseAccess,
  featureDisplayNames,
  FeatureGateResult,
} from '@/lib/tenant-features'

// ============ Context ============

interface TenantFeaturesContextValue {
  features: ResolvedTenantFeatures
  isLoading: boolean
}

const TenantFeaturesContext = createContext<TenantFeaturesContextValue>({
  features: defaultFeatures,
  isLoading: false,
})

// ============ Provider ============

interface TenantFeaturesProviderProps {
  features: ResolvedTenantFeatures
  isLoading?: boolean
  children: ReactNode
}

/**
 * Provider for tenant features context
 *
 * Should be placed in the layout that has access to tenant subscription data.
 */
export function TenantFeaturesProvider({
  features,
  isLoading = false,
  children,
}: TenantFeaturesProviderProps): React.ReactElement {
  const value = useMemo(
    () => ({ features, isLoading }),
    [features, isLoading]
  )

  return (
    <TenantFeaturesContext.Provider value={value}>
      {children}
    </TenantFeaturesContext.Provider>
  )
}

// ============ Hook ============

interface UseTenantFeaturesReturn {
  /**
   * Resolved features for the current tenant
   */
  features: ResolvedTenantFeatures

  /**
   * Whether features are still loading
   */
  isLoading: boolean

  /**
   * Check if a feature is available
   */
  canUse: (feature: keyof TierFeatures) => boolean

  /**
   * Get detailed check result with upgrade info
   */
  checkFeature: (feature: keyof TierFeatures) => FeatureGateResult

  /**
   * Get human-readable upgrade message
   */
  getUpgradeMessage: (result: FeatureGateResult) => string

  /**
   * Quick access checks
   */
  hasEcommerce: boolean
  hasClinicalModules: boolean
  analyticsLevel: 'none' | 'basic' | 'advanced' | 'ai'
  hasEnterprise: boolean

  /**
   * Current tier info
   */
  tierId: string
  tierName: string
  isActive: boolean
  isTrial: boolean
  trialDaysRemaining: number | null
  commissionRate: number

  /**
   * Feature display names (Spanish)
   */
  featureNames: typeof featureDisplayNames
}

/**
 * Hook to access tenant features in components
 */
export function useTenantFeatures(): UseTenantFeaturesReturn {
  const { features, isLoading } = useContext(TenantFeaturesContext)

  return useMemo(
    () => ({
      features,
      isLoading,
      canUse: (feature: keyof TierFeatures) => canUseFeature(features, feature),
      checkFeature: (feature: keyof TierFeatures) => checkFeatureAccess(features, feature),
      getUpgradeMessage,
      hasEcommerce: hasEcommerceAccess(features),
      hasClinicalModules: hasClinicalModulesAccess(features),
      analyticsLevel: hasAnalyticsAccess(features),
      hasEnterprise: hasEnterpriseAccess(features),
      tierId: features.tierId,
      tierName: features.tierName,
      isActive: features.isActive,
      isTrial: features.isTrial,
      trialDaysRemaining: features.trialDaysRemaining,
      commissionRate: features.commissionRate,
      featureNames: featureDisplayNames,
    }),
    [features, isLoading]
  )
}

// ============ Gate Components ============

interface FeatureGateProps {
  /**
   * Feature to check
   */
  feature: keyof TierFeatures

  /**
   * Content to show if feature is available
   */
  children: ReactNode

  /**
   * Content to show if feature is not available
   */
  fallback?: ReactNode

  /**
   * Whether to render nothing instead of fallback
   */
  hideIfBlocked?: boolean
}

/**
 * Component that conditionally renders based on feature access
 */
export function FeatureGate({
  feature,
  children,
  fallback,
  hideIfBlocked = false,
}: FeatureGateProps): React.ReactElement | null {
  const { canUse, isLoading } = useTenantFeatures()

  if (isLoading) {
    return null
  }

  if (canUse(feature)) {
    return <>{children}</>
  }

  if (hideIfBlocked) {
    return null
  }

  return <>{fallback}</> || null
}

interface RequireFeatureProps {
  /**
   * Feature(s) to check - all must be available
   */
  features: (keyof TierFeatures)[]

  /**
   * Content to show if all features are available
   */
  children: ReactNode

  /**
   * Custom fallback - receives missing features info
   */
  fallback?: (missingFeatures: (keyof TierFeatures)[]) => ReactNode
}

/**
 * Component that requires multiple features
 */
export function RequireFeatures({
  features: requiredFeatures,
  children,
  fallback,
}: RequireFeatureProps): React.ReactElement | null {
  const { canUse, isLoading } = useTenantFeatures()

  if (isLoading) {
    return null
  }

  const missingFeatures = requiredFeatures.filter((f) => !canUse(f))

  if (missingFeatures.length === 0) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback(missingFeatures)}</>
  }

  return null
}

// ============ Utility Components ============

interface UpgradePromptProps {
  /**
   * Feature that requires upgrade
   */
  feature: keyof TierFeatures

  /**
   * Custom message (uses default if not provided)
   */
  message?: string

  /**
   * Style variant
   */
  variant?: 'inline' | 'banner' | 'modal'

  /**
   * Custom className
   */
  className?: string
}

/**
 * Default upgrade prompt component
 */
export function UpgradePrompt({
  feature,
  message,
  variant = 'inline',
  className = '',
}: UpgradePromptProps): React.ReactElement {
  const { checkFeature, featureNames } = useTenantFeatures()
  const result = checkFeature(feature)
  const displayMessage = message || getUpgradeMessage(result)
  const featureName = featureNames[feature]

  if (variant === 'banner') {
    return (
      <div
        className={`rounded-lg bg-gradient-to-r from-[var(--primary)]/10 to-[var(--secondary)]/10 p-4 ${className}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-[var(--text-primary)]">
              Desbloquea {featureName}
            </h4>
            <p className="text-sm text-[var(--text-secondary)]">{displayMessage}</p>
          </div>
          <Link
            href={result.upgradeUrl || '/pricing'}
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-dark)]"
          >
            Ver planes
          </Link>
        </div>
      </div>
    )
  }

  if (variant === 'modal') {
    return (
      <div className={`text-center ${className}`}>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary)]/10">
          <svg
            className="h-8 w-8 text-[var(--primary)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">
          {featureName}
        </h3>
        <p className="mb-4 text-sm text-[var(--text-secondary)]">{displayMessage}</p>
        <Link
          href={result.upgradeUrl || '/pricing'}
          className="inline-block rounded-lg bg-[var(--primary)] px-6 py-2 font-medium text-white transition-colors hover:bg-[var(--primary-dark)]"
        >
          Actualizar plan
        </Link>
      </div>
    )
  }

  // Default: inline
  return (
    <div className={`flex items-center gap-2 text-sm text-[var(--text-muted)] ${className}`}>
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
      <span>{displayMessage}</span>
      <Link
        href={result.upgradeUrl || '/pricing'}
        className="font-medium text-[var(--primary)] hover:underline"
      >
        Actualizar
      </Link>
    </div>
  )
}

// ============ Trial Banner ============

interface TrialBannerProps {
  className?: string
}

/**
 * Banner showing trial status and days remaining
 */
export function TrialBanner({ className = '' }: TrialBannerProps): React.ReactElement | null {
  const { isTrial, trialDaysRemaining, tierName } = useTenantFeatures()

  if (!isTrial || trialDaysRemaining === null) {
    return null
  }

  const isUrgent = trialDaysRemaining <= 7
  const bgColor = isUrgent
    ? 'bg-[var(--status-warning-bg)]'
    : 'bg-[var(--primary)]/10'
  const textColor = isUrgent
    ? 'text-[var(--status-warning)]'
    : 'text-[var(--primary)]'

  return (
    <div className={`rounded-lg ${bgColor} p-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className={`h-5 w-5 ${textColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className={`text-sm font-medium ${textColor}`}>
            {trialDaysRemaining > 0
              ? `Te quedan ${trialDaysRemaining} día${trialDaysRemaining !== 1 ? 's' : ''} de prueba del plan ${tierName}`
              : 'Tu período de prueba termina hoy'}
          </span>
        </div>
        <Link
          href="/pricing"
          className={`rounded-lg px-3 py-1 text-sm font-medium ${
            isUrgent
              ? 'bg-[var(--status-warning)] text-white'
              : 'bg-[var(--primary)] text-white'
          }`}
        >
          Elegir plan
        </Link>
      </div>
    </div>
  )
}

// Re-export types for convenience
export type { ResolvedTenantFeatures, FeatureGateResult, TierFeatures }
