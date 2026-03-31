/**
 * Consent Templates Components
 *
 * Exports all components for the consent templates module.
 */

// Main component
export { TemplatesClient } from './TemplatesClient'

// Sub-components
export { TemplateList } from './TemplateList'
export { TemplateCard } from './TemplateCard'
export { TemplateFormModal } from './TemplateFormModal'
export { TemplatePreviewModal } from './TemplatePreviewModal'
export { TemplateFieldEditor } from './TemplateFieldEditor'
export { FeedbackNotification } from './FeedbackNotification'

// Hooks
export { useConsentTemplates } from './hooks'

// Types and constants
export type {
  ConsentTemplate,
  TemplateField,
  NewTemplateData,
  FeedbackState,
} from './types'

export {
  CATEGORIES,
  FIELD_TYPES,
  CATEGORY_LABELS,
  DEFAULT_NEW_TEMPLATE,
} from './types'
