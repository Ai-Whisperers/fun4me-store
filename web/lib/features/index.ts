/**
 * Feature Flags System
 *
 * Centralized feature access control based on tenant subscription tier.
 * Works with the pricing tiers defined in @/lib/pricing/tiers.
 *
 * Usage:
 * - Server: Import from '@/lib/features/server' in API routes and server components
 * - Client: Import from '@/lib/features' (this barrel) or '@/lib/features/client'
 * - Types: Available from this barrel
 *
 * NOTE: Server functions are NOT exported from this barrel to prevent
 * accidental imports in client components. Import them explicitly:
 *   import { getTenantFeatures, requireFeature } from '@/lib/features/server'
 */

// Client-safe exports only
export {
  useFeatureFlags,
  useTenantTier,
  useHasFeature,
  FeatureGate,
  UpgradePrompt,
  FeatureFlagsProvider,
  type FeatureFlagsContextValue,
} from './client'

// Types are safe to export
export type { TenantFeatureAccess, FeatureName, FeatureCheckResult } from './types'
