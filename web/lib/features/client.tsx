'use client'

/**
 * Client-side Feature Flags
 *
 * @deprecated This module is deprecated. Use `lib/hooks/use-tenant-features.tsx` instead.
 *
 * Migration Guide:
 * - Replace `useFeatureFlags()` with `useTenantFeatures()`
 * - Replace `FeatureFlagsProvider` with `TenantFeaturesProvider`
 * - Replace `FeatureGate` with `FeatureGate` from use-tenant-features.tsx
 *
 * This file is kept for backwards compatibility and will be removed in a future version.
 *
 * Old Usage:
 *
 * // In a component
 * const { hasFeature, tier, isLoading } = useFeatureFlags()
 * if (hasFeature('ecommerce')) { ... }
 *
 * // Gating content
 * <FeatureGate feature="hospitalization" fallback={<UpgradePrompt />}>
 *   <HospitalizationModule />
 * </FeatureGate>
 *
 * New Usage (lib/hooks/use-tenant-features.tsx):
 *
 * // In a component
 * const { hasFeature, tierId, isLoading } = useTenantFeatures()
 * if (hasFeature('ecommerce')) { ... }
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { TierFeatures, TierId } from '@/lib/pricing/tiers'
import type { FeatureName, TenantFeatureAccess } from './types'

// ============================================================================
// Context
// ============================================================================

export interface FeatureFlagsContextValue {
  tenantId: string | null
  tierId: TierId
  tierName: string
  isOnTrial: boolean
  trialEndsAt: Date | null
  features: TierFeatures | null
  isLoading: boolean
  error: Error | null
  hasFeature: (feature: FeatureName) => boolean
  refetch: () => Promise<void>
}

const defaultFeatures: TierFeatures = {
  website: true,
  petPortal: true,
  appointments: true,
  medicalRecords: true,
  vaccineTracking: true,
  clinicalTools: true,
  adFree: false,
  ecommerce: false,
  qrTags: false,
  bulkOrdering: false,
  analyticsBasic: false,
  analyticsAdvanced: false,
  analyticsAI: false,
  whatsappApi: false,
  hospitalization: false,
  laboratory: false,
  multiLocation: false,
  apiAccess: false,
  slaGuarantee: false,
  dedicatedSupport: false,
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue>({
  tenantId: null,
  tierId: 'gratis',
  tierName: 'Gratis',
  isOnTrial: false,
  trialEndsAt: null,
  features: defaultFeatures,
  isLoading: false,
  error: null,
  hasFeature: () => false,
  refetch: async () => {},
})

// ============================================================================
// Provider
// ============================================================================

interface FeatureFlagsProviderProps {
  children: ReactNode
  tenantId: string
  initialFeatures?: TenantFeatureAccess
}

export function FeatureFlagsProvider({
  children,
  tenantId,
  initialFeatures,
}: FeatureFlagsProviderProps) {
  const [features, setFeatures] = useState<TenantFeatureAccess | null>(initialFeatures || null)
  const [isLoading, setIsLoading] = useState(!initialFeatures)
  const [error, setError] = useState<Error | null>(null)

  const fetchFeatures = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/tenant/features?tenantId=${encodeURIComponent(tenantId)}`)

      if (!response.ok) {
        throw new Error('Failed to fetch features')
      }

      const data = await response.json()
      setFeatures(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!initialFeatures) {
      fetchFeatures()
    }
  }, [tenantId])

  const hasFeature = (feature: FeatureName): boolean => {
    if (!features) return false
    return features.features[feature] ?? false
  }

  const value: FeatureFlagsContextValue = {
    tenantId,
    tierId: features?.tierId || 'gratis',
    tierName: features?.tierName || 'Gratis',
    isOnTrial: features?.isOnTrial || false,
    trialEndsAt: features?.trialEndsAt || null,
    features: features?.features || null,
    isLoading,
    error,
    hasFeature,
    refetch: fetchFeatures,
  }

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  )
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to access feature flags in client components
 * @deprecated Use `useTenantFeatures()` from `lib/hooks/use-tenant-features.tsx` instead
 */
export function useFeatureFlags(): FeatureFlagsContextValue {
  return useContext(FeatureFlagsContext)
}

/**
 * Hook to get just the tenant tier information
 */
export function useTenantTier() {
  const { tierId, tierName, isOnTrial, trialEndsAt, isLoading } = useFeatureFlags()

  return {
    tierId,
    tierName,
    isOnTrial,
    trialEndsAt,
    isLoading,
    isPaid: tierId !== 'gratis',
    isProfessional: tierId === 'profesional',
  }
}

/**
 * Hook to check a single feature
 */
export function useHasFeature(feature: FeatureName): { hasAccess: boolean; isLoading: boolean } {
  const { hasFeature, isLoading } = useFeatureFlags()

  return {
    hasAccess: hasFeature(feature),
    isLoading,
  }
}

// ============================================================================
// Components
// ============================================================================

interface FeatureGateProps {
  feature: FeatureName
  children: ReactNode
  fallback?: ReactNode
  showUpgradePrompt?: boolean
}

/**
 * Component to conditionally render content based on feature access
 */
export function FeatureGate({
  feature,
  children,
  fallback = null,
  showUpgradePrompt = false,
}: FeatureGateProps) {
  const { hasFeature, isLoading, tierId } = useFeatureFlags()

  if (isLoading) {
    return null // Or a loading skeleton
  }

  if (hasFeature(feature)) {
    return <>{children}</>
  }

  if (showUpgradePrompt) {
    return <UpgradePrompt feature={feature} currentTier={tierId} />
  }

  return <>{fallback}</>
}

interface UpgradePromptProps {
  feature: FeatureName
  currentTier: TierId
  className?: string
}

/**
 * Upgrade prompt shown when user tries to access a restricted feature
 */
export function UpgradePrompt({ feature, currentTier, className = '' }: UpgradePromptProps) {
  const featureNames: Record<FeatureName, string> = {
    website: 'Sitio web',
    petPortal: 'Portal de mascotas',
    appointments: 'Citas',
    medicalRecords: 'Historial médico',
    vaccineTracking: 'Seguimiento de vacunas',
    clinicalTools: 'Herramientas clínicas',
    adFree: 'Sin anuncios',
    ecommerce: 'Tienda online',
    qrTags: 'Etiquetas QR',
    bulkOrdering: 'Pedidos mayoristas',
    analyticsBasic: 'Análisis básico',
    analyticsAdvanced: 'Análisis avanzado',
    analyticsAI: 'Análisis con IA',
    whatsappApi: 'API de WhatsApp',
    hospitalization: 'Hospitalización',
    laboratory: 'Laboratorio',
    multiLocation: 'Multi-sucursal',
    apiAccess: 'Acceso API',
    slaGuarantee: 'Garantía SLA',
    dedicatedSupport: 'Soporte dedicado',
  }

  return (
    <div className={`rounded-lg border border-yellow-200 bg-yellow-50 p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-yellow-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m0 0v2m0-2h2m-2 0H9m3-4V7a3 3 0 00-6 0v2"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            Función no disponible
          </h3>
          <p className="mt-1 text-sm text-yellow-700">
            <strong>{featureNames[feature]}</strong> no está incluido en tu plan actual ({currentTier}).
            Actualiza tu plan para acceder a esta función.
          </p>
          <div className="mt-3">
            <a
              href="/pricing"
              className="inline-flex items-center rounded-md bg-yellow-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-yellow-700"
            >
              Ver planes
              <svg
                className="ml-1.5 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FeatureFlagsProvider
