/**
 * Portal Inventory Components
 *
 * Exports all inventory management components for the portal.
 */

// Main component
export { PortalInventoryClient } from './PortalInventoryClient'

// Sub-components
export { InventoryHeader } from './InventoryHeader'
export { StockAlertsPanel } from './StockAlertsPanel'
export { ImportSection } from './ImportSection'
export { StatsCards } from './StatsCards'
export { FilterBar } from './FilterBar'
export { ProductTable } from './ProductTable'
export { Pagination } from './Pagination'
export { ProductEditModal } from './ProductEditModal'

// Hooks
export { usePortalInventory } from './hooks/use-portal-inventory'

// Types
export type {
  ImportResult,
  InventoryStats,
  StockAlertItem,
  InventoryAlerts,
  ProductInventory,
  Product,
  Category,
  PaginationInfo,
  EditValues,
  EditTab,
  StockFilterValue,
} from './types'

export { ITEMS_PER_PAGE_OPTIONS, STOCK_FILTER_OPTIONS, EDIT_TABS } from './types'
