// Shared types for inventory components

export interface InventoryProduct {
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

export type SortField = 'name' | 'sku' | 'base_price' | 'stock' | 'category'
export type SortDirection = 'asc' | 'desc'

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  pages: number
  hasNext: boolean
  hasPrev: boolean
}
