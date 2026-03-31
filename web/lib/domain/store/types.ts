/**
 * Store Domain - Type Definitions
 *
 * All types related to e-commerce and store operations
 */

// =============================================================================
// BASIC TYPES
// =============================================================================

/**
 * Order status types
 */
export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

/**
 * Cart item type for JSONB storage
 */
export type CartItemType = 'product' | 'service';

// =============================================================================
// ENTITY TYPES
// =============================================================================

/**
 * Product from database
 */
export interface Product {
  id: string;
  tenant_id: string;
  category_id: string | null;
  sku: string;
  name: string;
  description: string | null;
  base_price: number;
  is_active: boolean;
  is_prescription_required: boolean;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Product with inventory info
 */
export interface ProductWithStock extends Product {
  stock_quantity: number;
  is_in_stock: boolean;
}

/**
 * Cart item from database
 */
export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  product: ProductWithStock;
}

/**
 * Shopping cart
 */
export interface Cart {
  id: string;
  tenant_id: string;
  customer_id: string;
  items: CartItem[];
  updated_at: string;
}

/**
 * Order from database
 */
export interface Order {
  id: string;
  tenant_id: string;
  customer_id: string;
  status: OrderStatus;
  subtotal: number;
  tax_amount: number;
  total: number;
  pet_id: string | null;
  requires_prescription_review: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Order with items
 */
export interface OrderWithItems extends Order {
  items: Array<{
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    product: Product;
  }>;
}

/**
 * Cart item as stored in JSONB column
 * This is the shape of items in store_carts.items[]
 */
export interface CartItemJsonb {
  id: string;
  sku: string;
  name: string;
  type: CartItemType;
  price: number;
  quantity: number;
  stock?: number;
  image_url?: string | null;
}

/**
 * Raw product row from Supabase with nested inventory
 */
export interface ProductRow extends Product {
  inventory?: { stock_quantity: number } | null;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

/**
 * Checkout input
 */
export interface CheckoutInput {
  pet_id?: string | null;
  notes?: string | null;
}

/**
 * Add to cart input
 */
export interface AddToCartInput {
  productId: string;
  quantity: number;
}

/**
 * Update cart item input
 */
export interface UpdateCartItemInput {
  itemId: string;
  quantity: number;
}

// =============================================================================
// FILTER TYPES
// =============================================================================

/**
 * Product filters for browsing
 */
export interface ProductFilters {
  category_id?: string;
  query?: string;
  is_active?: boolean;
  in_stock_only?: boolean;
}

/**
 * Order filters
 */
export interface OrderFilters {
  status?: OrderStatus;
  from_date?: string;
  to_date?: string;
  pet_id?: string;
}

// =============================================================================
// RESULT TYPES
// =============================================================================

/**
 * Cart summary for display
 */
export interface CartSummary {
  total_items: number;
  subtotal: number;
  has_prescription_items: boolean;
}

/**
 * Order statistics
 */
export interface OrderStats {
  total_orders: number;
  pending_orders: number;
  completed_orders: number;
  total_revenue: number;
  average_order_value: number;
}

/**
 * Product analytics
 */
export interface ProductAnalytics {
  total_products: number;
  active_products: number;
  low_stock_products: number;
  out_of_stock_products: number;
  prescription_products: number;
}

/**
 * Service result wrapper (for backward compatibility)
 */
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}