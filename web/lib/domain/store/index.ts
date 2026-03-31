/**
 * Store Domain - Public API
 *
 * Exports all store domain functionality
 */

// Export all types
export type {
  // Basic types
  OrderStatus,
  CartItemType,

  // Entity types
  Product,
  ProductWithStock,
  CartItem,
  Cart,
  Order,
  OrderWithItems,
  CartItemJsonb,
  ProductRow,

  // Input types
  CheckoutInput,
  AddToCartInput,
  UpdateCartItemInput,

  // Filter types
  ProductFilters,
  OrderFilters,

  // Result types
  CartSummary,
  OrderStats,
  ProductAnalytics,
  ServiceResult,
} from './types';

// Export repository and service
export { StoreRepository } from './repository';
export { StoreService } from './service';