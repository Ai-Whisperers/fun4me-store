/**
 * StoreService - E-Commerce Service Layer (CORE MVP)
 *
 * Handles CORE store operations only:
 * - Product browsing
 * - Cart management (add, update, remove, view)
 * - Checkout process
 * - Order history
 *
 * DEFERRED TO PHASE 2+:
 * - Wishlists
 * - Product reviews
 * - Coupons/discounts
 * - Advanced inventory checks
 * - Prescription verification
 * - Stock alerts
 *
 * @example
 * ```typescript
 * const service = new StoreService(supabase);
 * const result = await service.addToCart(userId, 'prod-123', 2);
 * ```
 */

import { BaseService, type ServiceResult } from './base-service';

// =============================================================================
// TYPE DEFINITIONS
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
 * Cart item
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
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
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
 * Checkout input
 */
export interface CheckoutInput {
  pet_id?: string | null;
  notes?: string | null;
}

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
 * Cart item as stored in JSONB column
 * This is the shape of items in store_carts.items[]
 */
export interface CartItemJsonb {
  id: string;
  sku: string;
  name: string;
  type: 'product' | 'service';
  price: number;
  quantity: number;
  stock?: number;
  image_url?: string | null;
}

/**
 * Raw product row from Supabase with nested inventory
 */
interface ProductRow extends Product {
  inventory?: { stock_quantity: number } | null;
}

// =============================================================================
// STORE SERVICE
// =============================================================================

export class StoreService extends BaseService {
  /**
   * List products for browsing
   *
   * @param tenantId - Tenant ID
   * @param filters - Optional filters
   * @returns List of products with stock info
   */
  async listProducts(
    tenantId: string,
    filters: ProductFilters = {}
  ): Promise<ServiceResult<ProductWithStock[]>> {
    return this.handleError(
      async () => {
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

        if (error) {
          throw new Error(this.mapDatabaseError(error));
        }

        // Map to ProductWithStock
        const products = (data || []).map((p: ProductRow) => {
          const stockQuantity = p.inventory?.stock_quantity || 0;
          return {
            ...p,
            stock_quantity: stockQuantity,
            is_in_stock: stockQuantity > 0,
            inventory: undefined, // Remove nested inventory
          } as ProductWithStock;
        });

        // Filter by stock if requested
        if (in_stock_only) {
          return products.filter((p) => p.is_in_stock);
        }

        return products;
      },
      'Error al cargar productos',
      { context: { tenantId, filters } }
    );
  }

  /**
   * Get single product by ID
   *
   * @param id - Product ID
   * @param tenantId - Tenant ID
   * @returns Product with stock info
   */
  async getProduct(id: string, tenantId: string): Promise<ServiceResult<ProductWithStock>> {
    return this.handleError(
      async () => {
        const { data: product, error } = await this.supabase
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

        if (error) {
          throw new Error(this.mapDatabaseError(error));
        }

        if (!product) {
          throw new Error('Producto no encontrado');
        }

        const stockQuantity = product.inventory?.stock_quantity || 0;

        return {
          ...product,
          stock_quantity: stockQuantity,
          is_in_stock: stockQuantity > 0,
          inventory: undefined,
        } as ProductWithStock;
      },
      'Error al cargar producto',
      { context: { productId: id, tenantId } }
    );
  }

  /**
   * Add product to cart
   *
   * @param userId - User ID
   * @param tenantId - Tenant ID
   * @param productId - Product ID
   * @param quantity - Quantity to add
   * @returns Updated cart
   */
  async addToCart(
    userId: string,
    tenantId: string,
    productId: string,
    quantity: number
  ): Promise<ServiceResult<Cart>> {
    return this.handleError(
      async () => {
        // Validate quantity
        if (quantity <= 0) {
          throw new Error('La cantidad debe ser mayor a cero');
        }

        // Verify product exists and is active
        const productResult = await this.getProduct(productId, tenantId);
        if (!productResult.success) {
          throw new Error('Producto no encontrado');
        }

        const product = productResult.data;

        if (!product.is_active) {
          throw new Error('Este producto no está disponible');
        }

        // Check stock
        if (quantity > product.stock_quantity) {
          throw new Error(`Stock insuficiente. Disponible: ${product.stock_quantity}`);
        }

        // Get or create cart
        let { data: cart } = await this.supabase
          .from('store_carts')
          .select('id, items')
          .eq('customer_id', userId)
          .eq('tenant_id', tenantId)
          .single();

        if (!cart) {
          const { data: newCart, error: createError } = await this.supabase
            .from('store_carts')
            .insert({
              customer_id: userId,
              tenant_id: tenantId,
              items: [],
            })
            .select('id, items')
            .single();

          if (createError) {
            throw new Error(this.mapDatabaseError(createError));
          }

          cart = newCart;
        }

        // Get current items array
        const items = (cart.items as CartItemJsonb[]) || [];

        // Check if product already in cart
        const existingIndex = items.findIndex((item) => item.id === productId);

        if (existingIndex >= 0) {
          // Update existing item quantity
          const newQuantity = items[existingIndex].quantity + quantity;

          if (newQuantity > product.stock_quantity) {
            throw new Error(`Stock insuficiente. Disponible: ${product.stock_quantity}`);
          }

          items[existingIndex].quantity = newQuantity;
        } else {
          // Add new item to array
          items.push({
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

        // Update cart with new items array
        const { error: updateError } = await this.supabase
          .from('store_carts')
          .update({ items, updated_at: new Date().toISOString() })
          .eq('id', cart.id);

        if (updateError) {
          throw new Error(this.mapDatabaseError(updateError));
        }

        // Return full cart
        return await this.getCartInternal(cart.id, userId);
      },
      'Error al agregar al carrito',
      { context: { userId, tenantId, productId, quantity } }
    );
  }

  /**
   * Get user's cart
   *
   * @param userId - User ID
   * @param tenantId - Tenant ID
   * @returns User's cart with items
   */
  async getCart(userId: string, tenantId: string): Promise<ServiceResult<Cart | null>> {
    return this.handleError(
      async () => {
        const { data: cart } = await this.supabase
          .from('store_carts')
          .select('id')
          .eq('customer_id', userId)
          .eq('tenant_id', tenantId)
          .single();

        if (!cart) {
          return null;
        }

        return await this.getCartInternal(cart.id, userId);
      },
      'Error al cargar el carrito',
      { context: { userId, tenantId } }
    );
  }

  /**
   * Update cart item quantity
   *
   * @param userId - User ID
   * @param tenantId - Tenant ID
   * @param itemId - Product ID (in JSONB context, this is the product ID)
   * @param quantity - New quantity
   * @returns Updated cart
   */
  async updateCartItem(
    userId: string,
    tenantId: string,
    itemId: string,
    quantity: number
  ): Promise<ServiceResult<Cart>> {
    return this.handleError(
      async () => {
        if (quantity <= 0) {
          throw new Error('La cantidad debe ser mayor a cero');
        }

        // Get cart with items
        const { data: cart, error: cartError } = await this.supabase
          .from('store_carts')
          .select('id, items, customer_id')
          .eq('customer_id', userId)
          .eq('tenant_id', tenantId)
          .single();

        if (cartError || !cart) {
          throw new Error('Carrito no encontrado');
        }

        // Get items array
        const items = (cart.items as CartItemJsonb[]) || [];

        // Find item by product ID
        const itemIndex = items.findIndex((item) => item.id === itemId);

        if (itemIndex < 0) {
          throw new Error('Ítem del carrito no encontrado');
        }

        // Check stock for this product
        const { data: inventory } = await this.supabase
          .from('store_inventory')
          .select('stock_quantity')
          .eq('product_id', itemId)
          .eq('tenant_id', tenantId)
          .single();

        const stockQuantity = inventory?.stock_quantity || 0;

        if (quantity > stockQuantity) {
          throw new Error(`Stock insuficiente. Disponible: ${stockQuantity}`);
        }

        // Update quantity in items array
        items[itemIndex].quantity = quantity;

        // Update cart with modified items
        const { error: updateError } = await this.supabase
          .from('store_carts')
          .update({ items, updated_at: new Date().toISOString() })
          .eq('id', cart.id);

        if (updateError) {
          throw new Error(this.mapDatabaseError(updateError));
        }

        // Return updated cart
        return await this.getCartInternal(cart.id, userId);
      },
      'Error al actualizar el carrito',
      { context: { userId, tenantId, itemId, quantity } }
    );
  }

  /**
   * Remove item from cart
   *
   * @param userId - User ID
   * @param tenantId - Tenant ID
   * @param itemId - Product ID (in JSONB context, this is the product ID)
   * @returns Updated cart
   */
  async removeFromCart(userId: string, tenantId: string, itemId: string): Promise<ServiceResult<Cart>> {
    return this.handleError(
      async () => {
        // Get cart with items
        const { data: cart, error: cartError } = await this.supabase
          .from('store_carts')
          .select('id, items, customer_id')
          .eq('customer_id', userId)
          .eq('tenant_id', tenantId)
          .single();

        if (cartError || !cart) {
          throw new Error('Carrito no encontrado');
        }

        // Get items array
        const items = (cart.items as CartItemJsonb[]) || [];

        // Find item by product ID
        const itemIndex = items.findIndex((item) => item.id === itemId);

        if (itemIndex < 0) {
          throw new Error('Ítem del carrito no encontrado');
        }

        // Remove item from array
        items.splice(itemIndex, 1);

        // Update cart with filtered items
        const { error: updateError } = await this.supabase
          .from('store_carts')
          .update({ items, updated_at: new Date().toISOString() })
          .eq('id', cart.id);

        if (updateError) {
          throw new Error(this.mapDatabaseError(updateError));
        }

        // Return updated cart
        return await this.getCartInternal(cart.id, userId);
      },
      'Error al eliminar del carrito',
      { context: { userId, tenantId, itemId } }
    );
  }

  /**
   * Checkout - convert cart to order
   *
   * @param userId - User ID
   * @param tenantId - Tenant ID
   * @param input - Checkout details
   * @returns Created order
   */
  async checkout(
    userId: string,
    tenantId: string,
    input: CheckoutInput = {}
  ): Promise<ServiceResult<OrderWithItems>> {
    return this.handleError(
      async () => {
        // Get cart
        const cartResult = await this.getCart(userId, tenantId);

        if (!cartResult.success || !cartResult.data) {
          throw new Error('El carrito está vacío');
        }

        const cart = cartResult.data;

        if (cart.items.length === 0) {
          throw new Error('El carrito está vacío');
        }

        // Check if any items require prescription
        const requiresPrescription = cart.items.some(
          (item) => item.product.is_prescription_required
        );

        // Calculate totals
        const subtotal = cart.items.reduce(
          (sum, item) => sum + item.unit_price * item.quantity,
          0
        );
        const taxAmount = subtotal * 0.1; // 10% IVA
        const total = subtotal + taxAmount;

        // Create order
        const { data: order, error: orderError } = await this.supabase
          .from('store_orders')
          .insert({
            tenant_id: tenantId,
            customer_id: userId,
            status: 'pending',
            subtotal,
            tax_amount: taxAmount,
            total,
            pet_id: input.pet_id || null,
            requires_prescription_review: requiresPrescription,
          })
          .select()
          .single();

        if (orderError) {
          throw new Error(this.mapDatabaseError(orderError));
        }

        // Create order items
        const orderItems = cart.items.map((item) => ({
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          requires_prescription: item.product.is_prescription_required,
        }));

        const { error: itemsError } = await this.supabase
          .from('store_order_items')
          .insert(orderItems);

        if (itemsError) {
          // Rollback order
          await this.supabase.from('store_orders').delete().eq('id', order.id);
          throw new Error(this.mapDatabaseError(itemsError));
        }

        // Clear cart
        await this.supabase.from('store_cart_items').delete().eq('cart_id', cart.id);

        // Get full order with items
        const { data: fullOrder } = await this.supabase
          .from('store_orders')
          .select(
            `
            *,
            items:store_order_items(
              id,
              product_id,
              quantity,
              unit_price,
              product:store_products(*)
            )
          `
          )
          .eq('id', order.id)
          .single();

        // Audit log
        const { logAudit } = await import('@/lib/audit');
        await logAudit('CREATE_ORDER', `orders/${order.id}`, {
          customer_id: userId,
          total,
          item_count: cart.items.length,
        });

        return fullOrder as OrderWithItems;
      },
      'Error al procesar el pedido',
      { context: { userId, tenantId, input } }
    );
  }

  /**
   * Get user's order history
   *
   * @param userId - User ID
   * @param tenantId - Tenant ID
   * @returns List of orders
   */
  async getOrderHistory(userId: string, tenantId: string): Promise<ServiceResult<Order[]>> {
    return this.handleError(
      async () => {
        const { data, error } = await this.supabase
          .from('store_orders')
          .select('*')
          .eq('customer_id', userId)
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false });

        if (error) {
          throw new Error(this.mapDatabaseError(error));
        }

        return (data || []) as Order[];
      },
      'Error al cargar el historial de pedidos',
      { context: { userId, tenantId } }
    );
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  /**
   * Internal method to get full cart with items
   * Now reads from JSONB items column
   */
  private async getCartInternal(cartId: string, userId: string): Promise<Cart> {
    const { data: cart, error } = await this.supabase
      .from('store_carts')
      .select('*')
      .eq('id', cartId)
      .single();

    if (error || !cart) {
      throw new Error('Carrito no encontrado');
    }

    // Items are already in JSONB format with product info
    // Format: [{ id, sku, name, type, price, quantity, stock, image_url }]
    const jsonbItems = (cart.items as CartItemJsonb[]) || [];

    // Enrich items with full product data if needed
    const enrichedItems = await Promise.all(
      jsonbItems.map(async (item) => {
        // Get full product with current stock
        const { data: product } = await this.supabase
          .from('store_products')
          .select('*, inventory:store_inventory(stock_quantity)')
          .eq('id', item.id)
          .single();

        if (!product) {
          return {
            id: item.id,
            cart_id: cartId,
            product_id: item.id,
            quantity: item.quantity,
            unit_price: item.price,
            product: {
              id: item.id,
              sku: item.sku,
              name: item.name,
              base_price: item.price,
              photo_url: item.image_url,
              stock_quantity: item.stock || 0,
              is_in_stock: (item.stock || 0) > 0,
            },
          };
        }

        const stockQuantity = product.inventory?.stock_quantity || 0;

        return {
          id: item.id,
          cart_id: cartId,
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price,
          product: {
            ...product,
            stock_quantity: stockQuantity,
            is_in_stock: stockQuantity > 0,
            inventory: undefined,
          },
        };
      })
    );

    return {
      id: cart.id,
      tenant_id: cart.tenant_id,
      customer_id: cart.customer_id,
      items: enrichedItems,
      updated_at: cart.updated_at,
    } as Cart;
  }
}
