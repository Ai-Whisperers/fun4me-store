/**
 * Tenant Features System
 *
 * Provides runtime feature gating based on tenant subscription tier.
 * Used to check if a tenant has access to specific features before
 * rendering UI components or processing API requests.
 *
 * This integrates with the pricing tiers configuration but adds
 * runtime-specific functionality like database lookup and caching.
 *
 * @see lib/pricing/tiers.ts for tier definitions
 */

import {
  TierId,
  TierFeatures,
  TierSupport,
  getTierById,
  getMinimumTierForFeature,
  commissionConfig,
} from '@/lib/pricing/tiers'

// ============ Types ============

/**
 * Tenant subscription status from database
 */
export interface TenantSubscription {
  tenantId: string
  tierId: TierId
  status: 'active' | 'trial' | 'past_due' | 'canceled' | 'paused'
  trialEndsAt: Date | null
  currentPeriodStart: Date
  currentPeriodEnd: Date
  ecommerceStartDate: Date | null
  commissionTier: 'initial' | 'standard' | 'enterprise' | null
  userCount: number
}

/**
 * Resolved tenant features with computed values
 */
export interface ResolvedTenantFeatures extends TierFeatures {
  tierId: TierId
  tierName: string
  isActive: boolean
  isTrial: boolean
  trialDaysRemaining: number | null
  commissionRate: number
  support: TierSupport
}

/**
 * Feature gate result with upgrade info
 */
export interface FeatureGateResult {
  allowed: boolean
  reason?: 'not_in_tier' | 'subscription_inactive' | 'trial_expired' | 'feature_disabled'
  requiredTier?: TierId
  upgradeUrl?: string
}

// ============ Feature Resolution ============

/**
 * Resolve tenant features from subscription data
 *
 * @param subscription - Tenant subscription from database
 * @returns Fully resolved feature set with computed values
 */
export function resolveTenantFeatures(
  subscription: TenantSubscription
): ResolvedTenantFeatures {
  const tier = getTierById(subscription.tierId)

  if (!tier) {
    // Fallback to free tier if invalid tier ID
    const freeTier = getTierById('gratis')
    if (!freeTier) {
      // This should never happen, but TypeScript wants us to handle it
      throw new Error('Free tier not found in pricing configuration')
    }
    return {
      ...freeTier.features,
      tierId: 'gratis',
      tierName: 'Gratis',
      isActive: false,
      isTrial: false,
      trialDaysRemaining: null,
      commissionRate: 0,
      support: freeTier.support,
    }
  }

  // Check if subscription is active
  const isActive =
    subscription.status === 'active' ||
    subscription.status === 'trial' ||
    (subscription.status === 'past_due' &&
      new Date() < new Date(subscription.currentPeriodEnd))

  // Check trial status
  const isTrial = subscription.status === 'trial' && subscription.trialEndsAt !== null
  const trialDaysRemaining = isTrial && subscription.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  // Calculate commission rate based on e-commerce tenure
  let commissionRate = 0
  if (tier.features.ecommerce && subscription.ecommerceStartDate) {
    const monthsActive = Math.floor(
      (Date.now() - new Date(subscription.ecommerceStartDate).getTime()) /
        (1000 * 60 * 60 * 24 * 30)
    )

    if (subscription.commissionTier === 'enterprise') {
      commissionRate = commissionConfig.enterpriseRate
    } else if (monthsActive < commissionConfig.monthsUntilIncrease) {
      commissionRate = commissionConfig.initialRate
    } else {
      commissionRate = commissionConfig.standardRate
    }
  }

  return {
    ...tier.features,
    tierId: tier.id,
    tierName: tier.name,
    isActive,
    isTrial,
    trialDaysRemaining,
    commissionRate,
    support: tier.support,
  }
}

// ============ Feature Gating ============

/**
 * Check if a tenant can use a specific feature
 *
 * @param features - Resolved tenant features
 * @param feature - Feature to check
 * @returns Gate result with reason and upgrade path
 */
export function checkFeatureAccess(
  features: ResolvedTenantFeatures,
  feature: keyof TierFeatures
): FeatureGateResult {
  // Check if subscription is active
  if (!features.isActive) {
    return {
      allowed: false,
      reason: 'subscription_inactive',
      upgradeUrl: '/pricing',
    }
  }

  // Check if trial expired (only if in trial mode)
  if (features.isTrial && features.trialDaysRemaining !== null && features.trialDaysRemaining <= 0) {
    return {
      allowed: false,
      reason: 'trial_expired',
      upgradeUrl: '/pricing',
    }
  }

  // Check if feature is in tier
  if (!features[feature]) {
    const requiredTier = getMinimumTierForFeature(feature)
    return {
      allowed: false,
      reason: 'not_in_tier',
      requiredTier: requiredTier ?? undefined,
      upgradeUrl: requiredTier ? `/pricing?highlight=${requiredTier}` : '/pricing',
    }
  }

  return { allowed: true }
}

/**
 * Simple boolean check for feature access
 *
 * @param features - Resolved tenant features
 * @param feature - Feature to check
 * @returns true if feature is accessible
 */
export function canUseFeature(
  features: ResolvedTenantFeatures,
  feature: keyof TierFeatures
): boolean {
  return checkFeatureAccess(features, feature).allowed
}

// ============ Feature Groups ============

/**
 * Check if tenant has access to e-commerce features
 */
export function hasEcommerceAccess(features: ResolvedTenantFeatures): boolean {
  return features.isActive && features.ecommerce
}

/**
 * Check if tenant has access to clinical modules (hospitalization, lab)
 */
export function hasClinicalModulesAccess(features: ResolvedTenantFeatures): boolean {
  return features.isActive && (features.hospitalization || features.laboratory)
}

/**
 * Check if tenant has access to analytics
 */
export function hasAnalyticsAccess(features: ResolvedTenantFeatures): 'none' | 'basic' | 'advanced' | 'ai' {
  if (!features.isActive) return 'none'
  if (features.analyticsAI) return 'ai'
  if (features.analyticsAdvanced) return 'advanced'
  if (features.analyticsBasic) return 'basic'
  return 'none'
}

/**
 * Check if tenant has enterprise features
 */
export function hasEnterpriseAccess(features: ResolvedTenantFeatures): boolean {
  return features.isActive && features.multiLocation && features.apiAccess
}

// ============ UI Helpers ============

/**
 * Feature names for display (Spanish)
 */
export const featureDisplayNames: Record<keyof TierFeatures, string> = {
  website: 'Sitio web profesional',
  petPortal: 'Portal de mascotas',
  appointments: 'Citas en línea',
  medicalRecords: 'Historiales médicos',
  vaccineTracking: 'Control de vacunas',
  clinicalTools: 'Herramientas clínicas',
  adFree: 'Sin anuncios',
  ecommerce: 'Tienda en línea',
  qrTags: 'Etiquetas QR',
  bulkOrdering: 'Pedidos mayoristas',
  analyticsBasic: 'Reportes básicos',
  analyticsAdvanced: 'Reportes avanzados',
  analyticsAI: 'Análisis con IA',
  whatsappApi: 'WhatsApp Business API',
  hospitalization: 'Módulo hospitalización',
  laboratory: 'Módulo laboratorio',
  multiLocation: 'Múltiples sucursales',
  apiAccess: 'Acceso API',
  slaGuarantee: 'Garantía SLA',
  dedicatedSupport: 'Soporte dedicado',
}

/**
 * Get upgrade message for a blocked feature (Spanish)
 */
export function getUpgradeMessage(result: FeatureGateResult): string {
  switch (result.reason) {
    case 'subscription_inactive':
      return 'Tu suscripción no está activa. Por favor, actualiza tu plan para continuar.'
    case 'trial_expired':
      return 'Tu período de prueba ha terminado. Elige un plan para continuar usando todas las funciones.'
    case 'not_in_tier':
      if (result.requiredTier) {
        const tier = getTierById(result.requiredTier)
        return `Esta función requiere el plan ${tier?.name || result.requiredTier}. ¿Deseas actualizar?`
      }
      return 'Esta función no está incluida en tu plan actual. Actualiza para desbloquearla.'
    default:
      return 'Esta función no está disponible en tu plan actual.'
  }
}

// ============ Default/Mock Values ============

/**
 * Default features for unauthenticated or new tenants
 */
export const defaultFeatures: ResolvedTenantFeatures = {
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
  tierId: 'gratis',
  tierName: 'Gratis',
  isActive: true,
  isTrial: false,
  trialDaysRemaining: null,
  commissionRate: 0,
  support: {
    communityForum: true,
    emailSupport: false,
    whatsappSupport: false,
    phoneSupport: false,
    prioritySupport: false,
    responseTimeHours: null,
  },
}

/**
 * Create mock features for a specific tier (useful for testing)
 */
export function createMockFeatures(
  tierId: TierId,
  overrides: Partial<ResolvedTenantFeatures> = {}
): ResolvedTenantFeatures {
  const tier = getTierById(tierId)
  if (!tier) {
    return { ...defaultFeatures, ...overrides }
  }

  return {
    ...tier.features,
    tierId: tier.id,
    tierName: tier.name,
    isActive: true,
    isTrial: false,
    trialDaysRemaining: null,
    commissionRate: tier.ecommerceCommission,
    support: tier.support,
    ...overrides,
  }
}

// ============ API Helper ============

/**
 * Check feature access and return 403 response if not allowed
 * For use in API routes
 */
export function requireFeature(
  features: ResolvedTenantFeatures,
  feature: keyof TierFeatures
): { error: string; status: number } | null {
  const result = checkFeatureAccess(features, feature)

  if (!result.allowed) {
    return {
      error: getUpgradeMessage(result),
      status: 403,
    }
  }

  return null
}
