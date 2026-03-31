/**
 * Store Repository - Data Access Layer
 *
 * Handles database operations for store/e-commerce functionality.
 * Pure data layer with no business logic.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ProductWithStock,
  ProductRow,
  Cart,
  CartItem,
  CartItemJsonb,
  Order,
  OrderWithItems,
  ProductFilters,
  OrderFilters,
  OrderStatus,
} from './types';

export class StoreRepository {
  constructor(private supabase: SupabaseClient) {}

  // ==========================================================================
  // PRODUCT OPERATIONS
  // ==========================================================================

  /**
   * List products with optional filters
   */
  async listProducts(tenantId: string, filters: ProductFilters = {}): Promise<ProductWithStock[]> {
    const { category_id, query, is_active = true, in_stock_only = false } = filters;

    let productsQuery = this.supabase
      .from('store_products')
      .select(
        `
        *,
        inventory:store_inventory(stock_quantity)
      `
      )
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true });

    // Filter by active status
    if (is_active !== undefined) {
      productsQuery = productsQuery.eq('is_active', is_active);
    }

    // Filter by category
    if (category_id) {
      productsQuery = productsQuery.eq('category_id', category_id);
    }

    // Search by name/description
    if (query) {
      productsQuery = productsQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
    }

    const { data, error } = await productsQuery;
    if (error) throw error;

    // Transform and filter results
    const productsWithStock: ProductWithStock[] = (data as ProductRow[]).map((row) => {
      const stock_quantity = row.inventory?.stock_quantity ?? 0;
      const { inventory, ...product } = row;

      return {
        ...product,
        stock_quantity,
        is_in_stock: stock_quantity > 0,
      };
    });

    // Filter by stock if requested
    if (in_stock_only) {
      return productsWithStock.filter(p => p.is_in_stock);
    }

    return productsWithStock;
  }

  /**
   * Get single product by ID
   */
  async getProduct(id: string, tenantId: string): Promise<ProductWithStock | null> {
    const { data, error } = await this.supabase
      .from('store_products')
      .select(
        `
        *,
        inventory:store_inventory(stock_quantity)
      `
      )
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error) throw error;

    const row = data as ProductRow;
    const stock_quantity = row.inventory?.stock_quantity ?? 0;
    const { inventory, ...product } = row;

    return {
      ...product,
      stock_quantity,
      is_in_stock: stock_quantity > 0,
    };
  }

  // ==========================================================================
  // CART OPERATIONS
  // ==========================================================================

  /**
   * Get or create cart for user
   */
  async getOrCreateCart(userId: string, tenantId: string): Promise<string> {
    // First, try to get existing cart
    const { data: existingCart } = await this.supabase
      .from('store_carts')
      .select('id')
      .eq('customer_id', userId)
      .eq('tenant_id', tenantId)
      .single();

    if (existingCart) {
      return existingCart.id;
    }

    // Create new cart if none exists
    const { data: newCart, error } = await this.supabase
      .from('store_carts')
      .insert({
        tenant_id: tenantId,
        customer_id: userId,
        items: [],
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) throw error;
    return newCart.id;
  }

  /**
   * Get cart with items
   */
  async getCart(userId: string, tenantId: string): Promise<Cart | null> {
    const { data, error } = await this.supabase
      .from('store_carts')
      .select('*')
      .eq('customer_id', userId)
      .eq('tenant_id', tenantId)
      .single();

    if (error && error.code === 'PGRST116') {
      // No cart found
      return null;
    }

    if (error) throw error;

    // Convert JSONB items to full cart items
    const jsonbItems: CartItemJsonb[] = data.items || [];
    const items: CartItem[] = await Promise.all(
      jsonbItems.map(async (item) => {
        const product = await this.getProduct(item.id, tenantId);
        if (!product) {
          throw new Error(`Product ${item.id} not found`);
        }

        return {
          id: `${data.id}-${item.id}`,
          cart_id: data.id,
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price,
          product,
        };
      })
    );

    return {
      id: data.id,
      tenant_id: data.tenant_id,
      customer_id: data.customer_id,
      items,
      updated_at: data.updated_at,
    };
  }

  /**
   * Update cart items
   */
  async updateCartItems(cartId: string, items: CartItemJsonb[]): Promise<void> {
    const { error } = await this.supabase
      .from('store_carts')
      .update({
        items,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cartId);

    if (error) throw error;
  }

  /**
   * Clear cart
   */
  async clearCart(cartId: string): Promise<void> {
    const { error } = await this.supabase
      .from('store_carts')
      .update({
        items: [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', cartId);

    if (error) throw error;
  }

  // ==========================================================================
  // ORDER OPERATIONS
  // ==========================================================================

  /**
   * Create order from cart
   */
  async createOrder(
    cartId: string,
    tenantId: string,
    customerId: string,
    orderData: {
      subtotal: number;
      tax_amount: number;
      total: number;
      pet_id?: string | null;
      requires_prescription_review: boolean;
    }
  ): Promise<string> {
    const { data, error } = await this.supabase
      .from('store_orders')
      .insert({
        tenant_id: tenantId,
        customer_id: customerId,
        status: 'pending' as OrderStatus,
        ...orderData,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  /**
   * Create order items
   */
  async createOrderItems(
    orderId: string,
    items: Array<{
      product_id: string;
      quantity: number;
      unit_price: number;
    }>
  ): Promise<void> {
    const { error } = await this.supabase
      .from('store_order_items')
      .insert(
        items.map(item => ({
          order_id: orderId,
          ...item,
        }))
      );

    if (error) throw error;
  }

  /**
   * Get order history for user
   */
  async getOrderHistory(userId: string, tenantId: string, filters: OrderFilters = {}): Promise<Order[]> {
    let query = this.supabase
      .from('store_orders')
      .select('*')
      .eq('customer_id', userId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.from_date) {
      query = query.gte('created_at', filters.from_date);
    }

    if (filters.to_date) {
      query = query.lte('created_at', filters.to_date);
    }

    if (filters.pet_id) {
      query = query.eq('pet_id', filters.pet_id);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  }

  /**
   * Get order with items by ID
   */
  async getOrderWithItems(orderId: string, tenantId: string): Promise<OrderWithItems | null> {
    // Get order
    const { data: order, error: orderError } = await this.supabase
      .from('store_orders')
      .select('*')
      .eq('id', orderId)
      .eq('tenant_id', tenantId)
      .single();

    if (orderError) throw orderError;

    // Get order items
    const { data: items, error: itemsError } = await this.supabase
      .from('store_order_items')
      .select(`
        *,
        product:store_products(*)
      `)
      .eq('order_id', orderId);

    if (itemsError) throw itemsError;

    return {
      ...order,
      items: items || [],
    };
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    const { error } = await this.supabase
      .from('store_orders')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (error) throw error;
  }

  // ==========================================================================
  // UTILITY OPERATIONS
  // ==========================================================================

  /**
   * Get product by SKU
   */
  async getProductBySku(sku: string, tenantId: string): Promise<ProductWithStock | null> {
    const { data, error } = await this.supabase
      .from('store_products')
      .select(
        `
        *,
        inventory:store_inventory(stock_quantity)
      `
      )
      .eq('sku', sku)
      .eq('tenant_id', tenantId)
      .single();

    if (error && error.code === 'PGRST116') {
      // No product found
      return null;
    }

    if (error) throw error;

    const row = data as ProductRow;
    const stock_quantity = row.inventory?.stock_quantity ?? 0;
    const { inventory, ...product } = row;

    return {
      ...product,
      stock_quantity,
      is_in_stock: stock_quantity > 0,
    };
  }

  /**
   * Check product availability
   */
  async checkAvailability(productId: string, tenantId: string, quantity: number): Promise<boolean> {
    const product = await this.getProduct(productId, tenantId);
    return product ? product.stock_quantity >= quantity : false;
  }
}