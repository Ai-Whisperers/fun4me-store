/**
 * Inventory Repository - Data Access Layer
 *
 * Handles database operations for inventory management.
 * Pure data layer with no business logic.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Inventory,
  InventoryTransaction,
  InventoryWithProduct,
  CreateInventoryData,
  UpdateInventoryData,
  StockAdjustmentData,
  InventoryFilters,
  TransactionFilters,
} from './types';

export class InventoryRepository {
  constructor(private supabase: SupabaseClient) {}

  // ==========================================================================
  // READ OPERATIONS
  // ==========================================================================

  /**
   * Get inventory record by product ID
   */
  async getByProductId(productId: string, tenantId: string): Promise<Inventory | null> {
    const { data, error } = await this.supabase
      .from('store_inventory')
      .select('*')
      .eq('product_id', productId)
      .eq('tenant_id', tenantId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * List inventory records with filters
   */
  async list(tenantId: string, filters: InventoryFilters = {}): Promise<InventoryWithProduct[]> {
    let query = this.supabase
      .from('store_inventory')
      .select(`
        *,
        product:store_products(name, sku, category, unit)
      `)
      .eq('tenant_id', tenantId);

    // Apply filters
    if (filters.low_stock) {
      query = query.lte('stock_quantity', 'reorder_point');
    }

    if (filters.out_of_stock) {
      query = query.eq('stock_quantity', 0);
    }

    if (filters.product_id) {
      query = query.eq('product_id', filters.product_id);
    }

    if (filters.location) {
      query = query.eq('location', filters.location);
    }

    if (filters.supplier) {
      query = query.eq('supplier_name', filters.supplier);
    }

    if (filters.expiring_soon) {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      query = query.lte('expiry_date', thirtyDaysFromNow.toISOString().split('T')[0]);
    }

    const { data, error } = await query.order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get transaction history
   */
  async getTransactions(
    tenantId: string,
    filters: TransactionFilters = {}
  ): Promise<InventoryTransaction[]> {
    let query = this.supabase
      .from('store_inventory_transactions')
      .select('*')
      .eq('tenant_id', tenantId);

    if (filters.product_id) {
      query = query.eq('product_id', filters.product_id);
    }

    if (filters.type) {
      query = query.eq('type', filters.type);
    }

    if (filters.from_date) {
      query = query.gte('created_at', filters.from_date);
    }

    if (filters.to_date) {
      query = query.lte('created_at', filters.to_date);
    }

    if (filters.performed_by) {
      query = query.eq('performed_by', filters.performed_by);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // ==========================================================================
  // WRITE OPERATIONS
  // ==========================================================================

  /**
   * Create inventory record
   */
  async create(data: CreateInventoryData): Promise<Inventory> {
    const { data: result, error } = await this.supabase
      .from('store_inventory')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  /**
   * Update inventory record
   */
  async update(productId: string, tenantId: string, data: UpdateInventoryData): Promise<Inventory> {
    const { data: result, error } = await this.supabase
      .from('store_inventory')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('product_id', productId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  /**
   * Record inventory transaction
   */
  async createTransaction(data: StockAdjustmentData & { tenant_id: string }): Promise<InventoryTransaction> {
    const { data: result, error } = await this.supabase
      .from('store_inventory_transactions')
      .insert({
        tenant_id: data.tenant_id,
        product_id: data.product_id,
        type: data.type,
        quantity: data.quantity,
        unit_cost: data.unit_cost,
        reference_type: data.reference_type,
        reference_id: data.reference_id,
        notes: data.notes,
        performed_by: data.performed_by,
      })
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  /**
   * Delete inventory record
   */
  async delete(productId: string, tenantId: string): Promise<void> {
    const { error } = await this.supabase
      .from('store_inventory')
      .delete()
      .eq('product_id', productId)
      .eq('tenant_id', tenantId);

    if (error) throw error;
  }

  /**
   * Upsert inventory record (create or update)
   */
  async upsert(data: CreateInventoryData): Promise<Inventory> {
    const { data: result, error } = await this.supabase
      .from('store_inventory')
      .upsert(data, {
        onConflict: 'product_id,tenant_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  /**
   * Adjust stock quantity (atomic operation)
   */
  async adjustStock(
    productId: string,
    tenantId: string,
    adjustment: number,
    transactionData: Omit<StockAdjustmentData, 'product_id' | 'quantity'>
  ): Promise<{ inventory: Inventory; transaction: InventoryTransaction }> {
    // Start transaction
    const { data, error } = await this.supabase.rpc('adjust_inventory_stock', {
      p_product_id: productId,
      p_tenant_id: tenantId,
      p_adjustment: adjustment,
      p_transaction_type: transactionData.type,
      p_unit_cost: transactionData.unit_cost,
      p_reference_type: transactionData.reference_type,
      p_reference_id: transactionData.reference_id,
      p_notes: transactionData.notes,
      p_performed_by: transactionData.performed_by,
    });

    if (error) throw error;

    // Return both updated inventory and created transaction
    return {
      inventory: data.inventory,
      transaction: data.transaction,
    };
  }
}