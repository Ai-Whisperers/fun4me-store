/**
 * Inventory Domain - Public API
 * 
 * This is the single entry point for the inventory domain.
 * All external modules should import from this file only.
 */

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type {
  TransactionType,
  Inventory,
  InventoryTransaction,
  InventoryWithProduct,
  CreateInventoryData,
  UpdateInventoryData,
  StockAdjustmentData,
  InventoryData,
  InventoryFilters,
  TransactionFilters,
  InventoryStats,
  LowStockItem,
  ExpiryItem,
  StockValuation,
  TransactionSummary,
  ServiceResult,
} from './types';

// =============================================================================
// CLASS EXPORTS
// =============================================================================

export { InventoryRepository } from './repository';
export { InventoryService } from './service';

// =============================================================================
// CONVENIENCE FACTORY
// =============================================================================

import { SupabaseClient } from '@supabase/supabase-js';
import { InventoryService } from './service';

/**
 * Create a new InventoryService instance with proper dependency injection
 * 
 * @param supabase - Authenticated Supabase client
 * @returns Configured InventoryService ready to use
 * 
 * @example
 * ```typescript
 * import { createInventoryService } from '@/lib/domain/inventory';
 * 
 * const supabase = await createClient();
 * const service = createInventoryService(supabase);
 * 
 * const result = await service.list(tenantId);
 * ```
 */
export function createInventoryService(supabase: SupabaseClient): InventoryService {
  return new InventoryService(supabase);
}