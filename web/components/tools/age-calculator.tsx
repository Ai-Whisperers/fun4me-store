/**
 * DEPRECATED: This file is kept for backward compatibility.
 * The age calculator has been refactored into modular components.
 *
 * New structure:
 * - C:\Users\Alejandro\Documents\Ivan\Adris\Vete\web\lib\age-calculator\configs.ts - Configuration data
 * - C:\Users\Alejandro\Documents\Ivan\Adris\Vete\web\hooks\use-age-calculation.ts - Calculation logic hook
 * - C:\Users\Alejandro\Documents\Ivan\Adris\Vete\web\components\tools\age-calculator\ - Modular UI components
 *
 * Components:
 * - species-selector.tsx (~60 lines)
 * - sub-species-selector.tsx (~180 lines)
 * - age-input.tsx (~80 lines)
 * - result-display.tsx (~150 lines)
 * - life-stage-card.tsx (~40 lines)
 * - health-tips.tsx (~25 lines)
 * - methodology-panel.tsx (~70 lines)
 * - milestones-panel.tsx (~40 lines)
 *
 * Total: ~650 lines across 8 focused components vs 1,397 lines in single file
 */
export { AgeCalculator } from './age-calculator-refactored'
