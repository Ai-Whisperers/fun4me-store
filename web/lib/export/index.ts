/**
 * Data Export Module
 *
 * DATA-002: Self-service data export functionality for tenants.
 *
 * Features:
 * - Export to CSV, JSON, or XLSX formats
 * - Date range filtering
 * - Anonymization option for GDPR compliance
 * - Background processing for large exports
 * - Email notification when export is ready
 * - Download links expire after 7 days
 */

// Types
export type {
  ExportFormat,
  ExportStatus,
  ExportableTable,
  ExportConfig,
  ExportJob,
  CreateExportJobInput,
  ExportTableResult,
  ExportResult,
  ExportJobResponse,
  ExportListResponse,
} from './types'

export { EXPORTABLE_TABLES } from './types'

// Configuration
export { TABLE_CONFIGS, getAllColumnsForTable, isValidExportTable } from './config'

// Job management
export {
  createExportJob,
  getExportJob,
  listExportJobs,
  processExportJob,
  cleanupExpiredExports,
  type CreateJobResult,
} from './job'

// Generators (for direct use if needed)
export {
  generateExportFile,
  generateCSVExport,
  generateJSONExport,
  generateXLSXExport,
  transformRows,
  type ExportData,
  type GeneratedFile,
} from './generators'
