/**
 * Store Analytics Module
 *
 * Decomposed store analytics components for the dashboard.
 *
 * Usage:
 *   import { StoreAnalyticsClient } from '@/components/analytics/store'
 *   <StoreAnalyticsClient clinic="terrapet" />
 */

// Main orchestrator
export { StoreAnalyticsClient } from './StoreAnalyticsClient'

// Individual components (for custom compositions)
export { PeriodSelector } from './PeriodSelector'
export { AnalyticsTabNav } from './AnalyticsTabNav'
export { SalesTab, MarginsTab, InventoryTab } from './tabs'

// Hook for custom data fetching
export { useStoreAnalytics } from './hooks/use-store-analytics'

// Types
export type {
  StoreAnalyticsData,
  MarginAnalyticsData,
  TurnoverAnalyticsData,
  AnalyticsTab,
  PeriodDays,
  SalesSummary,
  TopProduct,
  CategoryRevenue,
  StatusDistribution,
  DailyTrend,
  CouponStats,
  ProductMargin,
  CategoryMargin,
  MarginSummary,
  ProductTurnover,
  TurnoverSummary,
  ReorderSuggestion,
  TurnoverStatus,
  ReorderPriority,
} from './types'

// Utility functions
export { formatCurrency, formatDate, formatPercent } from './utils/format'
