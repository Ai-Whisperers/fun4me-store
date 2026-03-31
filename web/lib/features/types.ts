/**
 * Feature Flags Type Definitions
 */

import type { TierFeatures, TierId } from '@/lib/pricing/tiers'

// All feature names from the pricing tiers
export type FeatureName = keyof TierFeatures

// Tenant feature access information
export interface TenantFeatureAccess {
  tenantId: string
  tierId: TierId
  tierName: string
  isOnTrial: boolean
  trialEndsAt: Date | null
  subscriptionExpiresAt: Date | null
  features: TierFeatures
  featureOverrides: Partial<Record<FeatureName, boolean>>
  referralDiscount: number
}

// Feature check result
export interface FeatureCheckResult {
  allowed: boolean
  reason?: 'tier_restriction' | 'trial_expired' | 'subscription_expired' | 'feature_disabled'
  requiredTier?: TierId
  currentTier: TierId
}

// API response for feature check
export interface FeatureCheckResponse {
  hasAccess: boolean
  feature: FeatureName
  tenant: {
    id: string
    tier: TierId
    isOnTrial: boolean
  }
  upgradeUrl?: string
}
