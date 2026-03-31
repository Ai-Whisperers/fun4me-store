/**
 * Store Service - Business Logic Layer
 *
 * Handles store operations with business logic and validation.
 * Uses ServiceResult for backward compatibility with legacy service.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { StoreRepository } from './repository';
import type {
  ProductWithStock,
  Cart,
  CartItemJsonb,
  Order,
  OrderWithItems,
  ProductFilters,
  OrderFilters,
  CheckoutInput,
  AddToCartInput,
  UpdateCartItemInput,
  CartSummary,
  ServiceResult,
} from './types';

export class StoreService {
  private repository: StoreRepository;

  constructor(supabase: SupabaseClient) {
    this.repository = new StoreRepository(supabase);
  }

  // ==========================================================================
  // PRODUCT OPERATIONS
  // ==========================================================================

  /**
   * List products for browsing
   */
  async listProducts(
    tenantId: string,
    filters: ProductFilters = {}
  ): Promise<ServiceResult<ProductWithStock[]>> {
    try {
      const products = await this.repository.listProducts(tenantId, filters);
      return {
        success: true,
        data: products,
      };
    } catch (error) {
      return {
        success: false,
        error: this.mapDatabaseError(error),
      };
    }
  }

  /**
   * Get single product by ID
   */
  async getProduct(id: string, tenantId: string): Promise<ServiceResult<ProductWithStock>> {
    try {
      const product = await this.repository.getProduct(id, tenantId);
      
      if (!product) {
        return {
          success: false,
          error: 'Product not found',
        };
      }

      return {
        success: true,
        data: product,
      };
    } catch (error) {
      return {
        success: false,
        error: this.mapDatabaseError(error),
      };
    }
  }

  // ==========================================================================
  // CART OPERATIONS
  // ==========================================================================

  /**
   * Add product to cart
   */
  async addToCart(
    userId: string,
    tenantId: string,
    input: AddToCartInput
  ): Promise<ServiceResult<Cart>> {
    try {
      const { productId, quantity } = input;

      // Validate input
      if (quantity <= 0) {
        return {
          success: false,
          error: 'Quantity must be greater than 0',
        };
      }

      // Check product exists and availability
      const product = await this.repository.getProduct(productId, tenantId);
      if (!product) {
        return {
          success: false,
          error: 'Product not found',
        };
      }

      if (!product.is_active) {
        return {
          success: false,
          error: 'Product is not available for purchase',
        };
      }

      // Check stock availability
      const isAvailable = await this.repository.checkAvailability(productId, tenantId, quantity);
      if (!isAvailable) {
        return {
          success: false,
          error: `Insufficient stock. Available: ${product.stock_quantity}`,
        };
      }

      // Get or create cart
      const cartId = await this.repository.getOrCreateCart(userId, tenantId);
      const cart = await this.repository.getCart(userId, tenantId);
      
      if (!cart) {
        return {
          success: false,
          error: 'Unable to create cart',
        };
      }

      // Get current cart items as JSONB
      const currentItems: CartItemJsonb[] = cart.items.map(item => ({
        id: item.product_id,
        sku: item.product.sku,
        name: item.product.name,
        type: 'product',
        price: item.unit_price,
        quantity: item.quantity,
        stock: item.product.stock_quantity,
        image_url: item.product.photo_url,
      }));

      // Check if product is already in cart
      const existingItemIndex = currentItems.findIndex(item => item.id === productId);
      
      if (existingItemIndex >= 0) {
        // Update existing item quantity
        const newQuantity = currentItems[existingItemIndex].quantity + quantity;
        
        // Check if new quantity exceeds stock
        if (newQuantity > product.stock_quantity) {
          return {
            success: false,
            error: `Cannot add ${quantity} more. Total would exceed available stock (${product.stock_quantity})`,
          };
        }

        currentItems[existingItemIndex].quantity = newQuantity;
      } else {
        // Add new item
        currentItems.push({
          id: productId,
          sku: product.sku,
          name: product.name,
          type: 'product',
          price: product.base_price,
          quantity,
          stock: product.stock_quantity,
          image_url: product.photo_url,
        });
      }

      // Update cart
      await this.repository.updateCartItems(cartId, currentItems);

      // Return updated cart
      const updatedCart = await this.repository.getCart(userId, tenantId);
      if (!updatedCart) {
        return { success: false, error: 'Cart not found after update' };
      }
      return {
        success: true,
        data: updatedCart,
      };
    } catch (error) {
      return {
        success: false,
        error: this.mapDatabaseError(error),
      };
    }
  }

  /**
   * Get user's cart
   */
  async getCart(userId: string, tenantId: string): Promise<ServiceResult<Cart | null>> {
    try {
      const cart = await this.repository.getCart(userId, tenantId);
      return {
        success: true,
        data: cart,
      };
    } catch (error) {
      return {
        success: false,
        error: this.mapDatabaseError(error),
      };
    }
  }

  /**
   * Update cart item quantity
   */
  async updateCartItem(
    userId: string,
    tenantId: string,
    input: UpdateCartItemInput
  ): Promise<ServiceResult<Cart>> {
    try {
      const { itemId, quantity } = input;

      // Validate quantity
      if (quantity <= 0) {
        return {
          success: false,
          error: 'Quantity must be greater than 0',
        };
      }

      const cart = await this.repository.getCart(userId, tenantId);
      if (!cart) {
        return {
          success: false,
          error: 'Cart not found',
        };
      }

      // Find the item to update
      const item = cart.items.find(item => item.id === itemId);
      if (!item) {
        return {
          success: false,
          error: 'Cart item not found',
        };
      }

      // Check stock availability for new quantity
      const isAvailable = await this.repository.checkAvailability(item.product_id, tenantId, quantity);
      if (!isAvailable) {
        return {
          success: false,
          error: `Insufficient stock. Available: ${item.product.stock_quantity}`,
        };
      }

      // Convert to JSONB and update
      const currentItems: CartItemJsonb[] = cart.items.map(cartItem => ({
        id: cartItem.product_id,
        sku: cartItem.product.sku,
        name: cartItem.product.name,
        type: 'product',
        price: cartItem.unit_price,
        quantity: cartItem.id === itemId ? quantity : cartItem.quantity,
        stock: cartItem.product.stock_quantity,
        image_url: cartItem.product.photo_url,
      }));

      await this.repository.updateCartItems(cart.id, currentItems);

      // Return updated cart
      const updatedCart = await this.repository.getCart(userId, tenantId);
      if (!updatedCart) {
        return { success: false, error: 'Cart not found after update' };
      }
      return {
        success: true,
        data: updatedCart,
      };
    } catch (error) {
      return {
        success: false,
        error: this.mapDatabaseError(error),
      };
    }
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(userId: string, tenantId: string, itemId: string): Promise<ServiceResult<Cart>> {
    try {
      const cart = await this.repository.getCart(userId, tenantId);
      if (!cart) {
        return {
          success: false,
          error: 'Cart not found',
        };
      }

      // Filter out the item to remove
      const currentItems: CartItemJsonb[] = cart.items
        .filter(item => item.id !== itemId)
        .map(item => ({
          id: item.product_id,
          sku: item.product.sku,
          name: item.product.name,
          type: 'product',
          price: item.unit_price,
          quantity: item.quantity,
          stock: item.product.stock_quantity,
          image_url: item.product.photo_url,
        }));

      await this.repository.updateCartItems(cart.id, currentItems);

      // Return updated cart
      const updatedCart = await this.repository.getCart(userId, tenantId);
      if (!updatedCart) {
        return { success: false, error: 'Cart not found after update' };
      }
      return {
        success: true,
        data: updatedCart,
      };
    } catch (error) {
      return {
        success: false,
        error: this.mapDatabaseError(error),
      };
    }
  }

  /**
   * Get cart summary
   */
  async getCartSummary(userId: string, tenantId: string): Promise<ServiceResult<CartSummary>> {
    try {
      const cart = await this.repository.getCart(userId, tenantId);
      
      if (!cart || cart.items.length === 0) {
        return {
          success: true,
          data: {
            total_items: 0,
            subtotal: 0,
            has_prescription_items: false,
          },
        };
      }

      const total_items = cart.items.reduce((sum, item) => sum + item.quantity, 0);
      const subtotal = cart.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const has_prescription_items = cart.items.some(item => item.product.is_prescription_required);

      return {
        success: true,
        data: {
          total_items,
          subtotal,
          has_prescription_items,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: this.mapDatabaseError(error),
      };
    }
  }

  // ==========================================================================
  // CHECKOUT OPERATIONS
  // ==========================================================================

  /**
   * Process checkout
   */
  async checkout(
    userId: string,
    tenantId: string,
    input: CheckoutInput
  ): Promise<ServiceResult<Order>> {
    try {
      const cart = await this.repository.getCart(userId, tenantId);
      
      if (!cart || cart.items.length === 0) {
        return {
          success: false,
          error: 'Cart is empty',
        };
      }

      // Validate stock availability for all items
      for (const item of cart.items) {
        const isAvailable = await this.repository.checkAvailability(
          item.product_id,
          tenantId,
          item.quantity
        );
        if (!isAvailable) {
          return {
            success: false,
            error: `Insufficient stock for ${item.product.name}. Available: ${item.product.stock_quantity}`,
          };
        }
      }

      // Calculate totals
      const subtotal = cart.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const tax_amount = subtotal * 0.1; // 10% tax rate
      const total = subtotal + tax_amount;
      const requires_prescription_review = cart.items.some(item => item.product.is_prescription_required);

      // Create order
      const orderId = await this.repository.createOrder(cart.id, tenantId, userId, {
        subtotal,
        tax_amount,
        total,
        pet_id: input.pet_id,
        requires_prescription_review,
      });

      // Create order items
      const orderItems = cart.items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }));

      await this.repository.createOrderItems(orderId, orderItems);

      // Clear cart
      await this.repository.clearCart(cart.id);

      // Get complete order
      const order = await this.repository.getOrderWithItems(orderId, tenantId);
      if (!order) {
        return { success: false, error: 'Order not found after creation' };
      }
      
      return {
        success: true,
        data: order,
      };
    } catch (error) {
      return {
        success: false,
        error: this.mapDatabaseError(error),
      };
    }
  }

  // ==========================================================================
  // ORDER OPERATIONS
  // ==========================================================================

  /**
   * Get order history for user
   */
  async getOrderHistory(
    userId: string,
    tenantId: string,
    filters: OrderFilters = {}
  ): Promise<ServiceResult<Order[]>> {
    try {
      const orders = await this.repository.getOrderHistory(userId, tenantId, filters);
      return {
        success: true,
        data: orders,
      };
    } catch (error) {
      return {
        success: false,
        error: this.mapDatabaseError(error),
      };
    }
  }

  /**
   * Get order with items by ID
   */
  async getOrder(orderId: string, tenantId: string): Promise<ServiceResult<OrderWithItems>> {
    try {
      const order = await this.repository.getOrderWithItems(orderId, tenantId);
      
      if (!order) {
        return {
          success: false,
          error: 'Order not found',
        };
      }

      return {
        success: true,
        data: order,
      };
    } catch (error) {
      return {
        success: false,
        error: this.mapDatabaseError(error),
      };
    }
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Map database errors to user-friendly messages
   */
  private mapDatabaseError(error: unknown): string {
    const err = error as { code?: string; message?: string } | null;
    if (err?.code === '23505') {
      return 'This item already exists in the system';
    }
    if (err?.code === '23503') {
      return 'Referenced item does not exist';
    }
    if (err?.code === '23514') {
      return 'Invalid data provided';
    }
    return err?.message || 'An unexpected error occurred';
  }
}