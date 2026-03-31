/**
 * Server-side Feature Flags
 *
 * Use these functions in API routes and server components to check feature access.
 */

import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { getTierById, pricingTiers, type TierId, type TierFeatures } from '@/lib/pricing/tiers'
import type { TenantFeatureAccess, FeatureName, FeatureCheckResult } from './types'
import { NextResponse } from 'next/server'

// Cache for tenant features (short TTL for API routes)
const featureCache = new Map<string, { data: TenantFeatureAccess; expires: number }>()
const CACHE_TTL_MS = 60 * 1000 // 1 minute

/**
 * Get all features for a tenant based on their subscription tier
 */
export async function getTenantFeatures(tenantId: string): Promise<TenantFeatureAccess | null> {
  // Check cache
  const cached = featureCache.get(tenantId)
  if (cached && cached.expires > Date.now()) {
    return cached.data
  }

  const supabase = await createClient()

  const { data: tenant, error } = await supabase
    .from('tenants')
    .select(`
      id,
      subscription_tier,
      is_trial,
      trial_end_date,
      subscription_expires_at,
      feature_overrides,
      referral_discount_percent
    `)
    .eq('id', tenantId)
    .eq('is_active', true)
    .single()

  if (error || !tenant) {
    return null
  }

  // Determine effective tier (considering trial and expiration)
  let effectiveTier: TierId = (tenant.subscription_tier as TierId) || 'gratis'
  const now = new Date()

  // Trial gives profesional tier
  if (tenant.is_trial && tenant.trial_end_date && new Date(tenant.trial_end_date) >= now) {
    effectiveTier = 'profesional'
  }
  // Expired subscription falls back to gratis
  else if (tenant.subscription_expires_at && new Date(tenant.subscription_expires_at) < now) {
    effectiveTier = 'gratis'
  }

  const tier = getTierById(effectiveTier)
  if (!tier) {
    return null
  }

  // Apply feature overrides
  const overrides = (tenant.feature_overrides || {}) as Partial<Record<FeatureName, boolean>>
  const features: TierFeatures = { ...tier.features }

  for (const [feature, value] of Object.entries(overrides)) {
    if (feature in features && typeof value === 'boolean') {
      (features as unknown as Record<string, boolean>)[feature] = value
    }
  }

  const result: TenantFeatureAccess = {
    tenantId: tenant.id,
    tierId: effectiveTier,
    tierName: tier.name,
    isOnTrial: tenant.is_trial && tenant.trial_end_date && new Date(tenant.trial_end_date) >= now,
    trialEndsAt: tenant.trial_end_date ? new Date(tenant.trial_end_date) : null,
    subscriptionExpiresAt: tenant.subscription_expires_at ? new Date(tenant.subscription_expires_at) : null,
    features,
    featureOverrides: overrides,
    referralDiscount: tenant.referral_discount_percent || 0,
  }

  // Cache the result
  featureCache.set(tenantId, { data: result, expires: Date.now() + CACHE_TTL_MS })

  return result
}

/**
 * Check if a tenant has access to a specific feature
 */
export async function checkFeatureAccess(
  tenantId: string,
  feature: FeatureName
): Promise<FeatureCheckResult> {
  const tenantFeatures = await getTenantFeatures(tenantId)

  if (!tenantFeatures) {
    return {
      allowed: false,
      reason: 'tier_restriction',
      currentTier: 'gratis',
    }
  }

  const hasAccess = tenantFeatures.features[feature]

  if (!hasAccess) {
    // Find minimum tier that has this feature
    const requiredTier = pricingTiers.find((t) => t.features[feature])?.id

    return {
      allowed: false,
      reason: 'tier_restriction',
      requiredTier,
      currentTier: tenantFeatures.tierId,
    }
  }

  return {
    allowed: true,
    currentTier: tenantFeatures.tierId,
  }
}

/**
 * Middleware helper to check feature access in API routes
 * Returns NextResponse error if access denied, null if allowed
 */
export async function requireFeature(
  tenantId: string,
  feature: FeatureName
): Promise<NextResponse | null> {
  const result = await checkFeatureAccess(tenantId, feature)

  if (!result.allowed) {
    const tier = getTierById(result.requiredTier || 'profesional')

    return NextResponse.json(
      {
        error: 'Función no disponible en tu plan actual',
        code: 'FEATURE_RESTRICTED',
        feature,
        currentTier: result.currentTier,
        requiredTier: result.requiredTier,
        upgradeMessage: tier
          ? `Actualiza a ${tier.name} para acceder a esta función`
          : 'Actualiza tu plan para acceder a esta función',
      },
      { status: 403 }
    )
  }

  return null
}

/**
 * Get all features with their availability for a tenant
 * Useful for displaying feature comparison UI
 */
export async function getAllFeatures(tenantId: string): Promise<{
  current: TierFeatures
  available: Record<FeatureName, { available: boolean; requiredTier?: TierId }>
} | null> {
  const tenantFeatures = await getTenantFeatures(tenantId)

  if (!tenantFeatures) {
    return null
  }

  const available: Record<string, { available: boolean; requiredTier?: TierId }> = {}

  const allFeatures = Object.keys(tenantFeatures.features) as FeatureName[]

  for (const feature of allFeatures) {
    const hasFeature = tenantFeatures.features[feature]
    if (hasFeature) {
      available[feature] = { available: true }
    } else {
      const requiredTier = pricingTiers.find((t) => t.features[feature])?.id
      available[feature] = { available: false, requiredTier }
    }
  }

  return {
    current: tenantFeatures.features,
    available: available as Record<FeatureName, { available: boolean; requiredTier?: TierId }>,
  }
}

/**
 * Clear the feature cache for a tenant
 * Call this when a tenant's subscription changes
 */
export function clearFeatureCache(tenantId: string): void {
  featureCache.delete(tenantId)
}

/**
 * Clear entire feature cache
 */
export function clearAllFeatureCache(): void {
  featureCache.clear()
}
