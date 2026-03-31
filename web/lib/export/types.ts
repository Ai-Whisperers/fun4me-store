/**
 * Data Export Types
 *
 * DATA-002: Type definitions for the data export system.
 */

// =============================================================================
// Export Format Types
// =============================================================================

export type ExportFormat = 'csv' | 'json' | 'xlsx'

export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'expired'

// =============================================================================
// Exportable Tables
// =============================================================================

export const EXPORTABLE_TABLES = [
  'pets',
  'appointments',
  'invoices',
  'payments',
  'vaccines',
  'medical_records',
  'prescriptions',
  'lab_orders',
  'lab_results',
  'clients', // profiles with role='owner'
  'products', // store_products
  'inventory', // store_inventory
] as const

export type ExportableTable = (typeof EXPORTABLE_TABLES)[number]

// =============================================================================
// Export Configuration
// =============================================================================

export interface ExportConfig {
  /** Tables to export */
  tables: ExportableTable[]
  /** Export format */
  format: ExportFormat
  /** Optional date range filter (for date-based tables) */
  dateRange?: {
    from: Date
    to: Date
  }
  /** Include related data (e.g., pets with their owners) */
  includeRelations?: boolean
  /** Anonymize sensitive data (for GDPR compliance) */
  anonymize?: boolean
}

// =============================================================================
// Export Job Types
// =============================================================================

export interface ExportJob {
  id: string
  tenant_id: string
  user_id: string
  config: ExportConfig
  status: ExportStatus
  progress: number // 0-100
  file_url: string | null
  file_size: number | null
  expires_at: string | null
  error_message: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface CreateExportJobInput {
  tables: ExportableTable[]
  format: ExportFormat
  dateRange?: {
    from: string // ISO date string
    to: string
  }
  includeRelations?: boolean
  anonymize?: boolean
}

// =============================================================================
// Export Result Types
// =============================================================================

export interface ExportTableResult {
  table: ExportableTable
  recordCount: number
  columns: string[]
}

export interface ExportResult {
  success: boolean
  tables: ExportTableResult[]
  totalRecords: number
  fileSize: number
  format: ExportFormat
  duration_ms: number
}

// =============================================================================
// Table Column Configurations
// =============================================================================

export interface TableColumnConfig {
  /** Database column name */
  column: string
  /** Display header name */
  header: string
  /** Optional transformation function */
  transform?: (value: unknown) => unknown
  /** Whether to include in anonymized exports */
  anonymize?: boolean
  /** Anonymized replacement value */
  anonymizedValue?: string
}

export interface TableExportConfig {
  /** Database table name */
  dbTable: string
  /** Column configurations */
  columns: TableColumnConfig[]
  /** Date column for filtering (if applicable) */
  dateColumn?: string
  /** Join configurations for related data */
  joins?: Array<{
    table: string
    on: string
    columns: TableColumnConfig[]
  }>
}

// =============================================================================
// API Response Types
// =============================================================================

export interface ExportJobResponse {
  id: string
  status: ExportStatus
  progress: number
  fileUrl: string | null
  fileSize: number | null
  expiresAt: string | null
  errorMessage: string | null
  createdAt: string
  completedAt: string | null
}

export interface ExportListResponse {
  jobs: ExportJobResponse[]
  total: number
}
