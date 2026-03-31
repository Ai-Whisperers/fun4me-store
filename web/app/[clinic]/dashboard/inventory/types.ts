/**
 * Inventory Client Types
 *
 * REF-006: Types extracted from client component
 */

import type { PaginationInfo as BasePaginationInfo } from '@/components/dashboard/inventory'

export type ProductSource = 'all' | 'own' | 'catalog'

export interface InventoryClientProps {
  googleSheetUrl: string | null
}

export interface PaginationInfo extends BasePaginationInfo {}

export interface Category {
  id: string
  name: string
  slug: string
}

export interface Product {
  id: string
  sku: string
  name: string
  short_description?: string
  description?: string
  image_url?: string
  base_price: number
  sale_price?: number
  category_id?: string
  category?: { id: string; name: string; slug: string }
  brand?: { id: string; name: string }
  inventory?: {
    stock_quantity: number
    min_stock_level?: number
    weighted_average_cost?: number
    expiry_date?: string
    batch_number?: string
  }
  is_active: boolean
  created_at: string
  source?: 'own' | 'catalog'
  assignment?: {
    sale_price: number
    min_stock_level: number
    location?: string
    margin_percentage?: number
  }
}

export interface ImportResult {
  success: number
  errors: string[]
  message?: string
}

export interface InventoryStats {
  totalProducts: number
  lowStockCount: number
  totalValue: number
}

export interface StockAlertItem {
  id: string
  name: string
  stock_quantity: number
  min_stock_level: number
  expiry_date?: string
}

export interface InventoryAlerts {
  hasAlerts: boolean
  lowStock: StockAlertItem[]
  expiring: StockAlertItem[]
}

export interface ImportPreviewRow {
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

export interface ImportPreviewSummary {
  totalRows: number
  newProducts: number
  updates: number
  adjustments: number
  errors: number
  skipped: number
}

export interface ImportPreviewData {
  preview: ImportPreviewRow[]
  summary: ImportPreviewSummary
}
