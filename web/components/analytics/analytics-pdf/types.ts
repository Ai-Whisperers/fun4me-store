/**
 * Analytics PDF Export Types
 *
 * Shared type definitions for analytics PDF export components.
 */

// =============================================================================
// Export Types
// =============================================================================

export type ExportType =
  | 'revenue'
  | 'appointments'
  | 'clients'
  | 'services'
  | 'inventory'
  | 'customers'

export interface ExportColumn {
  key: string
  header: string
}

export interface AnalyticsExportData {
  type: ExportType
  title: string
  columns: ExportColumn[]
  data: Record<string, unknown>[]
  period: {
    startDate: string
    endDate: string
  }
  clinicName: string
  generatedAt: string
}

// =============================================================================
// Component Props
// =============================================================================

export interface AnalyticsPDFButtonProps {
  exportType: ExportType
  startDate: string
  endDate: string
  clinicName: string
  variant?: 'button' | 'icon'
  className?: string
}

export interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  clinicName: string
  defaultType?: ExportType
}
