/**
 * Inventory Service - Business Logic Layer
 *
 * Handles inventory operations with business logic and validation.
 * Uses ServiceResult for backward compatibility with legacy service.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { InventoryRepository } from './repository';
import type {
  Inventory,
  InventoryTransaction,
  InventoryWithProduct,
  CreateInventoryData,
  UpdateInventoryData,
  StockAdjustmentData,
  InventoryFilters,
  InventoryStats,
  LowStockItem,
  ExpiryItem,
  ServiceResult,
} from './types';

export class InventoryService {
  private repository: InventoryRepository;

  constructor(supabase: SupabaseClient) {
    this.repository = new InventoryRepository(supabase);
  }

  // ==========================================================================
  // READ OPERATIONS
  // ==========================================================================

  /**
   * Get inventory for a specific product
   */
  async getByProductId(productId: string, tenantId: string): Promise<ServiceResult<Inventory>> {
    try {
      const inventory = await this.repository.getByProductId(productId, tenantId);
      return {
        success: true,
        data: inventory || undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * List inventory with optional filters
   */
  async list(tenantId: string, filters: InventoryFilters = {}): Promise<ServiceResult<InventoryWithProduct[]>> {
    try {
      const inventory = await this.repository.list(tenantId, filters);
      return {
        success: true,
        data: inventory,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get low stock items
   */
  async getLowStockItems(tenantId: string): Promise<ServiceResult<LowStockItem[]>> {
    try {
      const inventory = await this.repository.list(tenantId, { low_stock: true });
      
      const lowStockItems: LowStockItem[] = inventory.map(item => ({
        ...item,
        product_name: item.product?.name || 'Unknown Product',
        sku: item.product?.sku,
        shortage: (item.reorder_point || 0) - item.stock_quantity,
      }));

      return {
        success: true,
        data: lowStockItems,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get expiring items
   */
  async getExpiringItems(tenantId: string): Promise<ServiceResult<ExpiryItem[]>> {
    try {
      const inventory = await this.repository.list(tenantId, { expiring_soon: true });
      
      const expiryItems: ExpiryItem[] = inventory
        .filter(item => item.expiry_date)
        .map(item => {
          const expiryDate = new Date(item.expiry_date as string);
          const today = new Date();
          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          return {
            ...item,
            product_name: item.product?.name || 'Unknown Product',
            sku: item.product?.sku,
            days_until_expiry: daysUntilExpiry,
          };
        })
        .sort((a, b) => a.days_until_expiry - b.days_until_expiry);

      return {
        success: true,
        data: expiryItems,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get inventory statistics
   */
  async getStats(tenantId: string): Promise<ServiceResult<InventoryStats>> {
    try {
      const allInventory = await this.repository.list(tenantId);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const todayTransactions = await this.repository.getTransactions(tenantId, {
        from_date: todayStart.toISOString(),
      });

      const stats: InventoryStats = {
        total_products: allInventory.length,
        total_stock_value: allInventory.reduce((sum, item) => 
          sum + (item.stock_quantity * (item.weighted_average_cost || 0)), 0),
        low_stock_count: allInventory.filter(item => 
          item.reorder_point && item.stock_quantity <= item.reorder_point).length,
        out_of_stock_count: allInventory.filter(item => item.stock_quantity === 0).length,
        expiring_soon_count: allInventory.filter(item => {
          if (!item.expiry_date) return false;
          const expiryDate = new Date(item.expiry_date);
          const thirtyDaysFromNow = new Date();
          thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
          return expiryDate <= thirtyDaysFromNow;
        }).length,
        total_transactions_today: todayTransactions.length,
        stock_adjustments_today: todayTransactions.filter(t => t.type === 'adjustment').length,
      };

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ==========================================================================
  // WRITE OPERATIONS
  // ==========================================================================

  /**
   * Create new inventory record
   */
  async create(data: CreateInventoryData): Promise<ServiceResult<Inventory>> {
    try {
      const inventory = await this.repository.create(data);
      return {
        success: true,
        data: inventory,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update inventory record
   */
  async update(
    productId: string,
    tenantId: string,
    data: UpdateInventoryData
  ): Promise<ServiceResult<Inventory>> {
    try {
      const inventory = await this.repository.update(productId, tenantId, data);
      return {
        success: true,
        data: inventory,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Adjust stock quantity with transaction recording
   */
  async adjustStock(
    productId: string,
    tenantId: string,
    adjustment: number,
    transactionData: Omit<StockAdjustmentData, 'product_id' | 'quantity'>
  ): Promise<ServiceResult<{ inventory: Inventory; transaction: InventoryTransaction }>> {
    try {
      // Validate adjustment amount
      if (adjustment === 0) {
        return {
          success: false,
          error: 'Stock adjustment cannot be zero',
        };
      }

      const result = await this.repository.adjustStock(productId, tenantId, adjustment, transactionData);
      
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Reserve stock for an order
   */
  async reserveStock(
    productId: string,
    tenantId: string,
    quantity: number,
    orderId?: string
  ): Promise<ServiceResult<Inventory>> {
    try {
      if (quantity <= 0) {
        return {
          success: false,
          error: 'Reservation quantity must be positive',
        };
      }

      // Get current inventory
      const current = await this.repository.getByProductId(productId, tenantId);
      if (!current) {
        return {
          success: false,
          error: 'Product not found in inventory',
        };
      }

      // Check if enough stock available
      const availableStock = current.stock_quantity - current.reserved_quantity;
      if (availableStock < quantity) {
        return {
          success: false,
          error: `Insufficient stock. Available: ${availableStock}, Requested: ${quantity}`,
        };
      }

      // Update reserved quantity
      const inventory = await this.repository.update(productId, tenantId, {
        reserved_quantity: current.reserved_quantity + quantity,
      });

      // Record transaction
      await this.repository.createTransaction({
        tenant_id: tenantId,
        product_id: productId,
        type: 'reservation',
        quantity: -quantity, // Negative for reservation
        reference_type: orderId ? 'order' : 'manual',
        reference_id: orderId,
        notes: `Reserved ${quantity} units`,
      });

      return {
        success: true,
        data: inventory,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Release reserved stock
   */
  async releaseReservation(
    productId: string,
    tenantId: string,
    quantity: number,
    orderId?: string
  ): Promise<ServiceResult<Inventory>> {
    try {
      if (quantity <= 0) {
        return {
          success: false,
          error: 'Release quantity must be positive',
        };
      }

      // Get current inventory
      const current = await this.repository.getByProductId(productId, tenantId);
      if (!current) {
        return {
          success: false,
          error: 'Product not found in inventory',
        };
      }

      // Check if enough reserved stock
      if (current.reserved_quantity < quantity) {
        return {
          success: false,
          error: `Cannot release more than reserved. Reserved: ${current.reserved_quantity}, Requested: ${quantity}`,
        };
      }

      // Update reserved quantity
      const inventory = await this.repository.update(productId, tenantId, {
        reserved_quantity: current.reserved_quantity - quantity,
      });

      // Record transaction
      await this.repository.createTransaction({
        tenant_id: tenantId,
        product_id: productId,
        type: 'adjustment',
        quantity: quantity, // Positive for release
        reference_type: orderId ? 'order' : 'manual',
        reference_id: orderId,
        notes: `Released ${quantity} units from reservation`,
      });

      return {
        success: true,
        data: inventory,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}