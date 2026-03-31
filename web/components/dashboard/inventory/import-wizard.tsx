/**
 * Import Wizard Component
 *
 * Re-exports from the modular import-wizard directory.
 * The wizard has been split into step components for better maintainability.
 *
 * @see ./import-wizard/wizard.tsx - Main wizard component
 * @see ./import-wizard/source-step.tsx - Source selection step
 * @see ./import-wizard/preview-step.tsx - Data preview step
 * @see ./import-wizard/mapping-step.tsx - Column mapping step
 * @see ./import-wizard/review-step.tsx - Review changes step
 * @see ./import-wizard/complete-step.tsx - Import complete step
 */

export { ImportWizard } from './import-wizard/wizard'
export type { ImportMapping, PreviewResult, ImportResult } from './import-wizard/types'
