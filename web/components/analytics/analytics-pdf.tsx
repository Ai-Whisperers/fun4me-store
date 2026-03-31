/**
 * Analytics PDF Export
 *
 * Re-export from modular implementation for backward compatibility.
 *
 * @deprecated Import from './analytics-pdf' directory instead:
 * ```typescript
 * import {
 *   AnalyticsPDFButton,
 *   AnalyticsExportModal,
 *   AnalyticsPDFDocument,
 * } from './analytics-pdf'
 * ```
 */

'use client'

export {
  AnalyticsPDFDocument,
  AnalyticsPDFButton,
  AnalyticsExportModal,
} from './analytics-pdf/index'

export type {
  ExportType,
  ExportColumn,
  AnalyticsExportData,
} from './analytics-pdf/index'
