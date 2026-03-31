/**
 * Pet Summary Tab Module
 *
 * Comprehensive pet profile summary with health alerts and growth tracking.
 *
 * @example
 * ```tsx
 * import { PetSummaryTab } from './pet-summary-tab'
 *
 * <PetSummaryTab
 *   pet={petData}
 *   weightHistory={weightHistory}
 *   clinic="terrapet"
 *   onWeightUpdated={handleRefresh}
 * />
 * ```
 */

export { PetSummaryTab } from './PetSummaryTab'

export type {
  PetSummaryTabProps,
  PetData,
  Vaccine,
  WeightRecord,
  MissingVaccine,
} from './types'

// Sub-components (for advanced usage)
export { QuickStatsGrid } from './QuickStatsGrid'
export { HealthAlerts } from './HealthAlerts'
export { VaccinesSidebar } from './VaccinesSidebar'
export { DietInfo } from './DietInfo'
export { EmergencyContacts } from './EmergencyContacts'

// Hook (for custom implementations)
export { usePetSummaryData } from './use-pet-summary-data'
