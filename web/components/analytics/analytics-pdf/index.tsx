/**
 * Analytics PDF Export Module
 *
 * Components for generating and exporting analytics reports as PDF documents.
 *
 * @example
 * ```tsx
 * import {
 *   AnalyticsPDFButton,
 *   AnalyticsExportModal,
 *   AnalyticsPDFDocument,
 * } from './analytics-pdf'
 *
 * // Simple button for PDF download
 * <AnalyticsPDFButton
 *   exportType="revenue"
 *   startDate="2024-01-01"
 *   endDate="2024-12-31"
 *   clinicName="Veterinaria Adris"
 * />
 *
 * // Full export modal with format selection
 * <AnalyticsExportModal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   clinicName="Veterinaria Adris"
 * />
 * ```
 */

// Components
export { AnalyticsPDFDocument } from './AnalyticsPDFDocument'
export { AnalyticsPDFButton } from './AnalyticsPDFButton'
export { AnalyticsExportModal } from './AnalyticsExportModal'

// Types
export type {
  ExportType,
  ExportColumn,
  AnalyticsExportData,
  AnalyticsPDFButtonProps,
  ExportModalProps,
} from './types'

// Utilities (for advanced usage)
export { REPORT_TITLES, getNestedValue, formatValue, getDefaultColumns } from './utils'
export { pdfStyles } from './styles'
