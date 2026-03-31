/**
 * Ambassador Dashboard Module
 *
 * Full dashboard for ambassadors to track referrals and earnings.
 *
 * @example
 * ```tsx
 * import { AmbassadorDashboard } from './ambassador-dashboard'
 *
 * <AmbassadorDashboard />
 * ```
 */

export { AmbassadorDashboard, default } from './AmbassadorDashboard'

export type {
  Ambassador,
  Stats,
  Referral,
  TierInfo,
} from './types'

// Sub-components (for advanced usage)
export { ReferralCodeCard } from './ReferralCodeCard'
export { StatsGrid } from './StatsGrid'
export { RecentReferrals } from './RecentReferrals'
export { HowItWorks } from './HowItWorks'

// Hook (for custom implementations)
export { useAmbassadorData } from './use-ambassador-data'

// Utilities
export { formatDate, formatCurrency, tierStyles, tierLabels, statusStyles, statusLabels } from './utils'
