/**
 * Import Wizard Types
 */

export interface ImportMapping {
  id?: string
  name: string
  description?: string
  mapping: Record<string, string>
}

export interface PreviewRow {
  rowNumber: number
  operation: string
  sku: string
  name: string
  status: 'new' | 'update' | 'adjustment' | 'error' | 'skip'
  message: string
  currentStock?: number
  newStock?: number
  priceChange?: { old: number; new: number }
}

export interface PreviewSummary {
  totalRows: number
  newProducts: number
  updates: number
  adjustments: number
  errors: number
  skipped: number
}

export interface PreviewResult {
  preview: PreviewRow[]
  summary: PreviewSummary
}

export interface ImportResult {
  success: number
  errors: string[]
}

// Target fields for column mapping
export const TARGET_FIELDS = [
  { value: '', label: '-- No importar --' },
  { value: 'operation', label: 'Operación (NEW/BUY/ADJ)' },
  { value: 'sku', label: 'SKU' },
  { value: 'barcode', label: 'Código de Barras' },
  { value: 'name', label: 'Nombre del Producto' },
  { value: 'category', label: 'Categoría' },
  { value: 'description', label: 'Descripción' },
  { value: 'price', label: 'Precio de Venta' },
  { value: 'unit_cost', label: 'Costo Unitario' },
  { value: 'quantity', label: 'Cantidad' },
  { value: 'min_stock', label: 'Stock Mínimo' },
  { value: 'expiry_date', label: 'Fecha de Vencimiento' },
  { value: 'batch_number', label: 'Número de Lote' },
] as const
