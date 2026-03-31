/**
 * Portal Inventory Types
 *
 * Shared type definitions for inventory management components.
 */

// =============================================================================
// Import/Export Types
// =============================================================================

export interface ImportResult {
  success: number
  errors: string[]
  message?: string
}

// =============================================================================
// Stats & Alerts Types
// =============================================================================

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

// =============================================================================
// Product Types
// =============================================================================

export interface ProductInventory {
  stock_quantity?: number
  min_stock_level?: number
  expiry_date?: string
  batch_number?: string
  location?: string
  bin_number?: string
  supplier_name?: string
}

export interface Product {
  id: string
  name: string
  sku?: string
  base_price?: number
  price?: number
  image_url?: string
  image?: string
  stock?: number
  inventory?: ProductInventory
  category?: { id: string; name: string; slug: string }
}

export interface Category {
  id: string
  name: string
  slug: string
}

// =============================================================================
// Pagination Types
// =============================================================================

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  pages: number
  hasNext: boolean
  hasPrev: boolean
}

// =============================================================================
// Edit Form Types
// =============================================================================

export interface EditValues {
  price: number
  stock: number
  expiry_date: string
  batch_number: string
  location: string
  bin_number: string
  supplier_name: string
  min_stock_level: number
}

export type EditTab = 'basic' | 'inventory' | 'location'

// =============================================================================
// Filter Types
// =============================================================================

export type StockFilterValue = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'

export interface StockFilterOption {
  value: StockFilterValue
  label: string
}

// =============================================================================
// Constants
// =============================================================================

export const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100] as const

export const STOCK_FILTER_OPTIONS: StockFilterOption[] = [
  { value: 'all', label: 'Todos' },
  { value: 'in_stock', label: 'En Stock' },
  { value: 'low_stock', label: 'Bajo Stock' },
  { value: 'out_of_stock', label: 'Sin Stock' },
]

export const EDIT_TABS = [
  { id: 'basic' as const, label: 'Básico', icon: '💰' },
  { id: 'inventory' as const, label: 'Inventario', icon: '📦' },
  { id: 'location' as const, label: 'Ubicación', icon: '📍' },
]
