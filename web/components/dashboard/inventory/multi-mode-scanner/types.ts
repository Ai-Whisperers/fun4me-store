/**
 * Multi-Mode Scanner Types
 *
 * Shared type definitions for the multi-mode inventory scanner component.
 */

import type { LucideIcon } from 'lucide-react'

// =============================================================================
// Scanner Mode Types
// =============================================================================

export type ScannerMode = 'lookup' | 'receive' | 'count'

export interface ScannedProduct {
  id: string
  sku: string | null
  name: string
  base_price: number
  stock_quantity: number
  barcode: string
}

export interface ModeConfig {
  label: string
  icon: LucideIcon
  color: string
  bgColor: string
  description: string
  actionLabel: string
}

// =============================================================================
// Component Props
// =============================================================================

export interface MultiModeScannerProps {
  isOpen: boolean
  onClose: () => void
  clinic: string
  initialMode?: ScannerMode
  onActionComplete?: (action: {
    mode: ScannerMode
    product: ScannedProduct
    quantity: number
    notes?: string
  }) => void
}

export interface ModeSelectionScreenProps {
  onModeSelect: (mode: ScannerMode) => void
  onClose: () => void
  continuousMode: boolean
  setContinuousMode: (value: boolean) => void
}

export interface ErrorScreenProps {
  notFound: boolean
  error: string | null
  onChangeMode: () => void
  onRetry: () => void
}

export interface ActionScreenProps {
  mode: ScannerMode
  product: ScannedProduct
  quantity: number
  setQuantity: (q: number | ((prev: number) => number)) => void
  notes: string
  setNotes: (n: string) => void
  error: string | null
  isSubmitting: boolean
  actionSuccess: boolean
  continuousMode: boolean
  scannedCount: number
  onAction: () => void
  onClose: () => void
  onScanAnother: () => void
}
