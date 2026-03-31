/**
 * InventoryService - Inventory & Stock Management Service Layer
 *
 * Handles inventory operations:
 * - Stock levels and tracking
 * - Inventory adjustments
 * - Transaction history
 * - Reorder management
 * - Stock reservations
 * - Low stock alerts
 *
 * @example
 * ```typescript
 * const service = new InventoryService(supabase);
 * const result = await service.adjustStock('product-123', 'terrapet', 50, 'purchase');
 * ```
 */

import { BaseService, type ServiceResult } from './base-service';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Transaction types for inventory movements
 */
export type TransactionType = 
  | 'purchase'    // Receiving stock from supplier
  | 'sale'        // Selling to customer
  | 'adjustment'  // Manual stock adjustment
  | 'return'      // Customer return
  | 'damage'      // Damaged goods
  | 'theft'       // Theft/loss
  | 'expired'     // Expired products
  | 'transfer';   // Transfer between locations

/**
 * Inventory record
 */
export interface Inventory {
  id: string;
  product_id: string;
  tenant_id: string;
  stock_quantity: number;
  reserved_quantity: number;
  available_quantity: number; // Computed column
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
}

/**
 * Inventory transaction record
 */
export interface InventoryTransaction {
  id: string;
  tenant_id: string;
  product_id: string;
  type: TransactionType;
  quantity: number;
  unit_cost?: number | null;
  reference_type?: string | null;
  reference_id?: string | null;
  notes?: string | null;
  performed_by?: string | null;
  created_at: string;
}

/**
 * Input for stock adjustment
 */
export interface StockAdjustmentData {
  product_id: string;
  type: TransactionType;
  quantity: number;
  unit_cost?: number;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
  performed_by?: string;
}

/**
 * Input for creating/updating inventory
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

/**
 * Filters for listing inventory
 */
export interface InventoryFilters {
  low_stock?: boolean;      // available_quantity <= reorder_point
  out_of_stock?: boolean;   // available_quantity = 0
  expiring_soon?: boolean;  // expiry_date within 30 days
  location?: string;
  supplier?: string;
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
// INVENTORY SERVICE
// =============================================================================

export class InventoryService extends BaseService {
  // ---------------------------------------------------------------------------
  // INVENTORY CRUD
  // ---------------------------------------------------------------------------

  /**
   * List inventory for a tenant
   *
   * @param tenantId - Tenant ID
   * @param filters - Optional filters
   * @returns List of inventory records with product info
   */
  async list(
    tenantId: string,
    filters?: InventoryFilters
  ): Promise<ServiceResult<Inventory[]>> {
    return this.handleError(async () => {
      let query = this.supabase
        .from('store_inventory')
        .select(`
          *,
          product:store_products!inner(id, name, sku, category_id)
        `)
        .eq('tenant_id', tenantId)
        .order('updated_at', { ascending: false });

      // Apply database filters (where column-to-column comparison is not needed)
      if (filters?.out_of_stock) {
        query = query.eq('available_quantity', 0);
      }

      if (filters?.expiring_soon) {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        query = query
          .not('expiry_date', 'is', null)
          .lte('expiry_date', thirtyDaysFromNow.toISOString().split('T')[0]);
      }

      if (filters?.location) {
        query = query.eq('location', filters.location);
      }

      if (filters?.supplier) {
        query = query.eq('supplier_name', filters.supplier);
      }

      const { data, error } = await query;

      if (error) throw error;

      let result = data || [];

      // Apply low_stock filter client-side (Supabase doesn't support column-to-column comparison)
      if (filters?.low_stock) {
        result = result.filter(
          (item: { available_quantity: number; reorder_point: number }) =>
            item.available_quantity <= item.reorder_point
        );
      }

      return result;
    }, 'Failed to fetch inventory');
  }

  /**
   * Get inventory for a specific product
   *
   * @param productId - Product ID
   * @param tenantId - Tenant ID for access control
   * @returns Inventory record
   */
  async getByProduct(
    productId: string,
    tenantId: string
  ): Promise<ServiceResult<Inventory | null>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('store_inventory')
        .select(`
          *,
          product:store_products(id, name, sku)
        `)
        .eq('product_id', productId)
        .eq('tenant_id', tenantId)
        .single();

      if (error) {
        // Return null if not found (not an error)
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }
      
      return data;
    }, 'Failed to fetch inventory');
  }

  /**
   * Create inventory record for a product
   *
   * @param tenantId - Tenant ID
   * @param inventoryData - Inventory data
   * @returns Created inventory record
   */
  async create(
    tenantId: string,
    inventoryData: InventoryData
  ): Promise<ServiceResult<Inventory>> {
    return this.handleError(async () => {
      // Check if inventory already exists for this product
      const existing = await this.getByProduct(inventoryData.product_id, tenantId);
      if (existing.success && existing.data) {
        throw new Error('Inventory already exists for this product');
      }

      const { data, error } = await this.supabase
        .from('store_inventory')
        .insert({
          ...inventoryData,
          tenant_id: tenantId,
          stock_quantity: inventoryData.stock_quantity || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }, 'Failed to create inventory');
  }

  /**
   * Update inventory settings (not stock quantity)
   *
   * @param productId - Product ID
   * @param tenantId - Tenant ID for access control
   * @param updates - Fields to update
   * @returns Updated inventory record
   */
  async update(
    productId: string,
    tenantId: string,
    updates: Partial<InventoryData>
  ): Promise<ServiceResult<Inventory>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('store_inventory')
        .update(updates)
        .eq('product_id', productId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Inventory not found');
      return data;
    }, 'Failed to update inventory');
  }

  // ---------------------------------------------------------------------------
  // STOCK MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Adjust stock quantity and record transaction
   *
   * @param productId - Product ID
   * @param tenantId - Tenant ID
   * @param quantity - Quantity to adjust (positive = add, negative = remove)
   * @param type - Transaction type
   * @param metadata - Additional transaction data
   * @returns Updated inventory record
   */
  async adjustStock(
    productId: string,
    tenantId: string,
    quantity: number,
    type: TransactionType,
    metadata?: {
      unit_cost?: number;
      reference_type?: string;
      reference_id?: string;
      notes?: string;
      performed_by?: string;
    }
  ): Promise<ServiceResult<Inventory>> {
    return this.handleError(async () => {
      // Get current inventory
      const current = await this.getByProduct(productId, tenantId);
      
      let inventory;
      if (!current.success || !current.data) {
        // Create inventory if doesn't exist
        const createResult = await this.create(tenantId, {
          product_id: productId,
          stock_quantity: Math.max(0, quantity),
        });
        if (!createResult.success) throw new Error(createResult.error);
        inventory = createResult.data;
      } else {
        // Update existing inventory
        const newQuantity = Math.max(0, current.data.stock_quantity + quantity);
        
        const { data, error } = await this.supabase
          .from('store_inventory')
          .update({ stock_quantity: newQuantity })
          .eq('product_id', productId)
          .eq('tenant_id', tenantId)
          .select()
          .single();

        if (error) throw error;
        inventory = data;
      }

      // Record transaction
      await this.supabase
        .from('store_inventory_transactions')
        .insert({
          tenant_id: tenantId,
          product_id: productId,
          type,
          quantity,
          unit_cost: metadata?.unit_cost,
          reference_type: metadata?.reference_type,
          reference_id: metadata?.reference_id,
          notes: metadata?.notes,
          performed_by: metadata?.performed_by,
        });

      return inventory;
    }, 'Failed to adjust stock');
  }

  /**
   * Reserve stock for an order
   *
   * @param productId - Product ID
   * @param tenantId - Tenant ID
   * @param quantity - Quantity to reserve
   * @returns Updated inventory
   */
  async reserveStock(
    productId: string,
    tenantId: string,
    quantity: number
  ): Promise<ServiceResult<Inventory>> {
    return this.handleError(async () => {
      const current = await this.getByProduct(productId, tenantId);
      
      if (!current.success || !current.data) {
        throw new Error('Product inventory not found');
      }

      if (current.data.available_quantity < quantity) {
        throw new Error('Insufficient stock available for reservation');
      }

      const newReserved = current.data.reserved_quantity + quantity;

      const { data, error } = await this.supabase
        .from('store_inventory')
        .update({ reserved_quantity: newReserved })
        .eq('product_id', productId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data;
    }, 'Failed to reserve stock');
  }

  /**
   * Release reserved stock
   *
   * @param productId - Product ID
   * @param tenantId - Tenant ID
   * @param quantity - Quantity to release
   * @returns Updated inventory
   */
  async releaseStock(
    productId: string,
    tenantId: string,
    quantity: number
  ): Promise<ServiceResult<Inventory>> {
    return this.handleError(async () => {
      const current = await this.getByProduct(productId, tenantId);
      
      if (!current.success || !current.data) {
        throw new Error('Product inventory not found');
      }

      const newReserved = Math.max(0, current.data.reserved_quantity - quantity);

      const { data, error } = await this.supabase
        .from('store_inventory')
        .update({ reserved_quantity: newReserved })
        .eq('product_id', productId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data;
    }, 'Failed to release stock');
  }

  // ---------------------------------------------------------------------------
  // TRANSACTION HISTORY
  // ---------------------------------------------------------------------------

  /**
   * List inventory transactions
   *
   * @param tenantId - Tenant ID
   * @param filters - Optional filters
   * @returns List of transactions
   */
  async listTransactions(
    tenantId: string,
    filters?: TransactionFilters
  ): Promise<ServiceResult<InventoryTransaction[]>> {
    return this.handleError(async () => {
      let query = this.supabase
        .from('store_inventory_transactions')
        .select(`
          *,
          product:store_products(id, name, sku),
          performer:profiles(id, full_name)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.product_id) {
        query = query.eq('product_id', filters.product_id);
      }

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }

      if (filters?.from_date) {
        query = query.gte('created_at', filters.from_date);
      }

      if (filters?.to_date) {
        query = query.lte('created_at', filters.to_date);
      }

      if (filters?.performed_by) {
        query = query.eq('performed_by', filters.performed_by);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    }, 'Failed to fetch transactions');
  }

  /**
   * Get transaction history for a specific product
   *
   * @param productId - Product ID
   * @param tenantId - Tenant ID
   * @param limit - Max number of transactions to return
   * @returns List of transactions
   */
  async getProductHistory(
    productId: string,
    tenantId: string,
    limit: number = 50
  ): Promise<ServiceResult<InventoryTransaction[]>> {
    return this.listTransactions(tenantId, { product_id: productId });
  }

  // ---------------------------------------------------------------------------
  // ALERTS & REPORTS
  // ---------------------------------------------------------------------------

  /**
   * Get products with low stock
   *
   * @param tenantId - Tenant ID
   * @returns List of low stock items
   */
  async getLowStockItems(tenantId: string): Promise<ServiceResult<Inventory[]>> {
    return this.list(tenantId, { low_stock: true });
  }

  /**
   * Get out of stock products
   *
   * @param tenantId - Tenant ID
   * @returns List of out of stock items
   */
  async getOutOfStockItems(tenantId: string): Promise<ServiceResult<Inventory[]>> {
    return this.list(tenantId, { out_of_stock: true });
  }

  /**
   * Get products expiring soon (within 30 days)
   *
   * @param tenantId - Tenant ID
   * @returns List of expiring items
   */
  async getExpiringSoon(tenantId: string): Promise<ServiceResult<Inventory[]>> {
    return this.list(tenantId, { expiring_soon: true });
  }

  /**
   * Get inventory statistics
   *
   * @param tenantId - Tenant ID
   * @returns Inventory stats
   */
  async getStats(tenantId: string): Promise<ServiceResult<{
    total_products: number;
    total_stock_value: number;
    low_stock_count: number;
    out_of_stock_count: number;
    expiring_soon_count: number;
  }>> {
    return this.handleError(async () => {
      const { data: all, error: allError } = await this.supabase
        .from('store_inventory')
        .select('stock_quantity, available_quantity, reorder_point, expiry_date, weighted_average_cost')
        .eq('tenant_id', tenantId);

      if (allError) throw allError;

      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const thirtyDaysDate = thirtyDaysFromNow.toISOString().split('T')[0];

      const stats = {
        total_products: all?.length || 0,
        total_stock_value: all?.reduce((sum, item) => {
          return sum + (item.stock_quantity * (item.weighted_average_cost || 0));
        }, 0) || 0,
        low_stock_count: all?.filter(item => 
          item.reorder_point && item.available_quantity <= item.reorder_point
        ).length || 0,
        out_of_stock_count: all?.filter(item => item.available_quantity === 0).length || 0,
        expiring_soon_count: all?.filter(item =>
          item.expiry_date && item.expiry_date <= thirtyDaysDate
        ).length || 0,
      };

      return stats;
    }, 'Failed to fetch inventory statistics');
  }
}
