/**
 * Ambassador Dashboard
 *
 * Re-export from modular implementation for backward compatibility.
 *
 * @deprecated Import from './ambassador-dashboard' directory instead:
 * ```typescript
 * import { AmbassadorDashboard } from './ambassador-dashboard'
 * ```
 */

'use client'

export { AmbassadorDashboard, default } from './ambassador-dashboard/index'
export type { Ambassador, Stats, Referral, TierInfo } from './ambassador-dashboard/index'
