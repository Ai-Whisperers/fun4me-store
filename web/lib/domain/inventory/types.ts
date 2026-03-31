/**
 * Inventory Domain - Type Definitions
 *
 * All types related to inventory and stock management
 */

// =============================================================================
// BASIC TYPES
// =============================================================================

/**
 * Transaction types for inventory movements
 */
export type TransactionType = 
  | 'purchase'     // Receiving stock from supplier
  | 'sale'         // Selling to customer
  | 'adjustment'   // Manual stock adjustment
  | 'return'       // Customer return
  | 'damage'       // Damaged goods
  | 'theft'        // Theft/loss
  | 'expired'      // Expired products
  | 'transfer'     // Transfer between locations
  | 'reservation'; // Reserved for pending order

// =============================================================================
// ENTITY TYPES
// =============================================================================

/**
 * Inventory record - tracks stock levels for products
 */
export interface Inventory {
  id: string;
  product_id: string;
  tenant_id: string;
  stock_quantity: number;
  reserved_quantity: number;
  available_quantity: number; // Computed: stock_quantity - reserved_quantity
  min_stock_level?: number | null;
  reorder_quantity?: number | null;
  reorder_point?: number | null;
  weighted_average_cost?: number | null;
  location?: string | null;
  bin_number?: string | null;
  batch_number?: string | null;
  expiry_date?: string | null;
  supplier_name?: string | null;
  updated_at: string;
  created_at?: string;
}

/**
 * Inventory transaction record - audit trail of stock movements
 */
export interface InventoryTransaction {
  id: string;
  tenant_id: string;
  product_id: string;
  type: TransactionType;
  quantity: number; // Positive for additions, negative for subtractions
  unit_cost?: number | null;
  reference_type?: string | null; // e.g., 'order', 'return', 'adjustment'
  reference_id?: string | null;   // ID of the referenced entity
  notes?: string | null;
  performed_by?: string | null;   // User ID who performed the transaction
  created_at: string;
}

/**
 * Inventory with related product information
 */
export interface InventoryWithProduct extends Inventory {
  product?: {
    name: string;
    sku?: string;
    category?: string;
    unit?: string;
  };
}

// =============================================================================
// INPUT TYPES
// =============================================================================

/**
 * Input for creating inventory record
 */
export interface CreateInventoryData {
  product_id: string;
  tenant_id: string;
  stock_quantity?: number;
  min_stock_level?: number;
  reorder_quantity?: number;
  reorder_point?: number;
  weighted_average_cost?: number;
  location?: string;
  bin_number?: string;
  batch_number?: string;
  expiry_date?: string;
  supplier_name?: string;
}

/**
 * Input for updating inventory record
 */
export interface UpdateInventoryData {
  stock_quantity?: number;
  reserved_quantity?: number;
  min_stock_level?: number;
  reorder_quantity?: number;
  reorder_point?: number;
  weighted_average_cost?: number;
  location?: string;
  bin_number?: string;
  batch_number?: string;
  expiry_date?: string;
  supplier_name?: string;
}

/**
 * Input for stock adjustment operations
 */
export interface StockAdjustmentData {
  product_id: string;
  type: TransactionType;
  quantity: number; // Positive for increase, negative for decrease
  unit_cost?: number;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
  performed_by?: string;
}

/**
 * Simplified input for legacy compatibility
 */
export interface InventoryData {
  product_id: string;
  stock_quantity?: number;
  min_stock_level?: number;
  reorder_quantity?: number;
  reorder_point?: number;
  location?: string;
  bin_number?: string;
  batch_number?: string;
  expiry_date?: string;
  supplier_name?: string;
}

// =============================================================================
// FILTER TYPES
// =============================================================================

/**
 * Filters for listing inventory
 */
export interface InventoryFilters {
  low_stock?: boolean;      // available_quantity <= reorder_point
  out_of_stock?: boolean;   // available_quantity = 0
  expiring_soon?: boolean;  // expiry_date within 30 days
  location?: string;
  supplier?: string;
  product_id?: string;
}

/**
 * Filters for transaction history
 */
export interface TransactionFilters {
  product_id?: string;
  type?: TransactionType;
  from_date?: string;
  to_date?: string;
  performed_by?: string;
}

// =============================================================================
// RESULT TYPES
// =============================================================================

/**
 * Inventory statistics
 */
export interface InventoryStats {
  total_products: number;
  total_stock_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
  expiring_soon_count: number;
  total_transactions_today: number;
  stock_adjustments_today: number;
}

/**
 * Low stock report item
 */
export interface LowStockItem extends Inventory {
  product_name: string;
  sku?: string;
  shortage: number; // How much below reorder point
}

/**
 * Expiry report item
 */
export interface ExpiryItem extends Inventory {
  product_name: string;
  sku?: string;
  days_until_expiry: number;
}

/**
 * Stock valuation
 */
export interface StockValuation {
  total_items: number;
  total_quantity: number;
  total_value: number;
  average_cost: number;
  by_location?: Record<string, {
    quantity: number;
    value: number;
  }>;
}

/**
 * Transaction summary for a period
 */
export interface TransactionSummary {
  period_start: string;
  period_end: string;
  total_transactions: number;
  by_type: Record<TransactionType, {
    count: number;
    total_quantity: number;
  }>;
  net_change: number; // Total quantity change
}

/**
 * Service result wrapper (for backward compatibility)
 */
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
