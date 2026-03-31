/**
 * Store Analytics Types
 *
 * Shared type definitions for store analytics components.
 */

// =============================================================================
// Sales Analytics Types
// =============================================================================

export interface SalesSummary {
  today: { total: number; count: number }
  week: { total: number; count: number }
  month: { total: number; count: number }
  year: { total: number; count: number }
}

export interface TopProduct {
  id: string
  name: string
  sku: string | null
  image_url: string | null
  category_name: string | null
  total_sold: number
  total_revenue: number
}

export interface CategoryRevenue {
  category_id: string
  category_name: string
  total_revenue: number
  order_count: number
  percentage: number
  [key: string]: string | number
}

export interface StatusDistribution {
  status: string
  count: number
  total: number
  percentage: number
}

export interface DailyTrend {
  date: string
  revenue: number
  orders: number
  avg_order_value: number
}

export interface CouponStats {
  total_coupons: number
  active_coupons: number
  total_usage: number
  total_discount_given: number
}

export interface StoreAnalyticsData {
  summary: SalesSummary
  topProducts: TopProduct[]
  categoryRevenue: CategoryRevenue[]
  statusDistribution: StatusDistribution[]
  dailyTrend: DailyTrend[]
  couponStats: CouponStats
  generatedAt: string
}

// =============================================================================
// Margin Analytics Types
// =============================================================================

export interface ProductMargin {
  id: string
  name: string
  sku: string | null
  category_name: string | null
  base_price: number
  cost: number
  margin_amount: number
  margin_percentage: number
  units_sold: number
  total_revenue: number
  total_profit: number
}

export interface CategoryMargin {
  category_id: string
  category_name: string
  total_revenue: number
  total_cost: number
  total_profit: number
  margin_percentage: number
  product_count: number
  [key: string]: string | number
}

export interface MarginSummary {
  total_revenue: number
  total_cost: number
  total_profit: number
  average_margin: number
  low_margin_count: number
  low_margin_threshold: number
}

export interface MarginAnalyticsData {
  summary: MarginSummary
  productMargins: ProductMargin[]
  categoryMargins: CategoryMargin[]
  generatedAt: string
}

// =============================================================================
// Turnover Analytics Types
// =============================================================================

export type TurnoverStatus = 'critical' | 'low' | 'healthy' | 'overstocked' | 'slow_moving'
export type ReorderPriority = 'urgent' | 'high' | 'medium' | 'low'

export interface ProductTurnover {
  id: string
  name: string
  sku: string | null
  category_name: string | null
  current_stock: number
  reorder_point: number | null
  avg_daily_sales: number
  days_of_inventory: number | null
  turnover_ratio: number
  status: TurnoverStatus
  last_sale_date: string | null
  cost_value: number
}

export interface TurnoverSummary {
  total_inventory_value: number
  total_products: number
  critical_stock_count: number
  low_stock_count: number
  overstocked_count: number
  slow_moving_count: number
  avg_turnover_ratio: number
}

export interface ReorderSuggestion {
  id: string
  name: string
  sku: string | null
  current_stock: number
  reorder_point: number
  suggested_quantity: number
  days_until_stockout: number | null
  priority: ReorderPriority
}

export interface TurnoverAnalyticsData {
  summary: TurnoverSummary
  productTurnover: ProductTurnover[]
  reorderSuggestions: ReorderSuggestion[]
  generatedAt: string
}

// =============================================================================
// UI Types
// =============================================================================

export type AnalyticsTab = 'sales' | 'margins' | 'inventory'
export type PeriodDays = 7 | 30 | 90 | 365

// =============================================================================
// Chart Configuration
// =============================================================================

export const CHART_COLORS = {
  blue: 'var(--chart-1)',
  green: 'var(--chart-2)',
  amber: 'var(--chart-3)',
  red: 'var(--chart-4)',
  purple: 'var(--chart-5)',
  pink: 'var(--chart-6)',
  cyan: 'var(--chart-7)',
  lime: 'var(--chart-8)',
} as const

export const COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
  'var(--chart-7)',
  'var(--chart-8)',
] as const

export const STATUS_COLORS: Record<string, string> = {
  Pendiente: 'var(--status-warning)',
  Confirmado: 'var(--status-info)',
  'En Proceso': 'var(--accent-purple)',
  Listo: 'var(--status-success)',
  Enviado: 'var(--accent-cyan)',
  Entregado: 'var(--status-success)',
  Cancelado: 'var(--status-error)',
  Reembolsado: 'var(--text-muted)',
}

export const TURNOVER_STATUS_COLORS: Record<TurnoverStatus, { bg: string; text: string; icon: string }> = {
  critical: {
    bg: 'var(--status-error-light)',
    text: 'var(--status-error)',
    icon: 'var(--status-error)',
  },
  low: {
    bg: 'var(--status-warning-light)',
    text: 'var(--status-warning)',
    icon: 'var(--status-warning)',
  },
  healthy: {
    bg: 'var(--status-success-light)',
    text: 'var(--status-success)',
    icon: 'var(--status-success)',
  },
  overstocked: {
    bg: 'var(--accent-purple-light)',
    text: 'var(--accent-purple)',
    icon: 'var(--accent-purple)',
  },
  slow_moving: {
    bg: 'var(--accent-orange-light)',
    text: 'var(--accent-orange)',
    icon: 'var(--accent-orange)',
  },
}

export const PRIORITY_COLORS: Record<ReorderPriority, { bg: string; text: string }> = {
  urgent: { bg: 'var(--status-error-light)', text: 'var(--status-error)' },
  high: { bg: 'var(--status-warning-light)', text: 'var(--status-warning)' },
  medium: { bg: 'var(--accent-blue-light)', text: 'var(--accent-blue)' },
  low: { bg: 'var(--bg-tertiary)', text: 'var(--text-secondary)' },
}
