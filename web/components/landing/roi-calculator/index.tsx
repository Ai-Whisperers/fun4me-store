/**
 * ROI Calculator Module
 *
 * Interactive ROI calculator for landing page.
 *
 * @example
 * ```tsx
 * import { ROICalculator } from './roi-calculator'
 *
 * <ROICalculator />
 * ```
 */

export { ROICalculator } from './ROICalculator'

export type {
  DerivedPlanConfig,
  ROICalculations,
} from './types'

// Sub-components (for advanced usage)
export { InputPanel } from './InputPanel'
export { ResultsPanel } from './ResultsPanel'

// Hook (for custom implementations)
export { useROICalculator } from './use-roi-calculator'

// Utilities
export { formatCurrency, formatCurrencyShort, plans } from './utils'
