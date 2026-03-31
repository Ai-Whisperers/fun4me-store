/**
 * StoreService Tests
 *
 * Tests e-commerce functionality:
 * - Product listing and search
 * - Cart management (add, update, remove)
 * - Checkout process
 * - Order history
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StoreService } from '@/lib/services/store-service';
import { createMockSupabaseClient, type MockSupabaseClient } from './__mocks__/supabase-mock';

// Mock dependencies
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

// =============================================================================
// TEST DATA FACTORIES
// =============================================================================

const TEST_TENANT_ID = 'tenant-vet-clinic';
const TEST_USER_ID = 'user-customer-123';
const TEST_PRODUCT_ID = 'prod-vaccine-456';

function createMockProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_PRODUCT_ID,
    tenant_id: TEST_TENANT_ID,
    category_id: 'cat-vaccines',
    sku: 'VAC-001',
    name: 'Vacuna Antirrábica',
    description: 'Vacuna para prevenir la rabia',
    base_price: 150000,
    is_active: true,
    is_prescription_required: false,
    photo_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function createMockProductWithStock(overrides: Record<string, unknown> = {}) {
  return {
    ...createMockProduct(overrides),
    inventory: { stock_quantity: 50 },
    stock_quantity: 50,
    is_in_stock: true,
  };
}

function createMockCart(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cart-123',
    tenant_id: TEST_TENANT_ID,
    customer_id: TEST_USER_ID,
    items: [],
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function createMockCartItem(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_PRODUCT_ID,
    sku: 'VAC-001',
    name: 'Vacuna Antirrábica',
    type: 'product',
    price: 150000,
    quantity: 1,
    stock: 50,
    image_url: null,
    ...overrides,
  };
}

function createMockOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-123',
    tenant_id: TEST_TENANT_ID,
    customer_id: TEST_USER_ID,
    status: 'pending',
    subtotal: 150000,
    tax_amount: 15000,
    total: 165000,
    pet_id: null,
    requires_prescription_review: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('StoreService', () => {
  let mockClient: MockSupabaseClient;
  let service: StoreService;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    service = new StoreService(mockClient as never);
    vi.clearAllMocks();
  });

  // ===========================================================================
  // LIST PRODUCTS
  // ===========================================================================

  describe('listProducts', () => {
    it('should return active products with stock info', async () => {
      const products = [
        createMockProductWithStock({ id: 'prod-1' }),
        createMockProductWithStock({ id: 'prod-2' }),
      ];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: products, error: null }),
            }),
          }),
        }),
      });

      const result = await service.listProducts(TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(2);
        expect(result.data[0].is_in_stock).toBe(true);
      }
    });

    it('should filter by category', async () => {
      const products = [createMockProductWithStock({ category_id: 'cat-vaccines' })];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: products, error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await service.listProducts(TEST_TENANT_ID, {
        category_id: 'cat-vaccines',
      });

      expect(result.success).toBe(true);
    });

    it('should search by query', async () => {
      const products = [createMockProductWithStock({ name: 'Vacuna Antirrábica' })];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                or: vi.fn().mockResolvedValue({ data: products, error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await service.listProducts(TEST_TENANT_ID, { query: 'vacuna' });

      expect(result.success).toBe(true);
    });

    it('should filter in-stock only', async () => {
      const inStockProducts = [createMockProductWithStock()];
      const allProducts = [
        ...inStockProducts,
        createMockProductWithStock({ inventory: { stock_quantity: 0 } }),
      ];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: allProducts, error: null }),
            }),
          }),
        }),
      });

      const result = await service.listProducts(TEST_TENANT_ID, { in_stock_only: true });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.every((p) => p.is_in_stock)).toBe(true);
      }
    });
  });

  // ===========================================================================
  // GET PRODUCT
  // ===========================================================================

  describe('getProduct', () => {
    it('should return product by ID with stock', async () => {
      const product = createMockProductWithStock();

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: product, error: null }),
            }),
          }),
        }),
      });

      const result = await service.getProduct(TEST_PRODUCT_ID, TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(TEST_PRODUCT_ID);
        expect(result.data.stock_quantity).toBe(50);
      }
    });

    it('should fail when product not found', async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116', message: 'Not found' },
              }),
            }),
          }),
        }),
      });

      const result = await service.getProduct('nonexistent', TEST_TENANT_ID);

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // ADD TO CART
  // ===========================================================================

  describe('addToCart', () => {
    it('should add product to new cart', async () => {
      const product = createMockProductWithStock();
      const newCart = createMockCart({ id: 'cart-123', items: [] });
      const cartWithItem = createMockCart({
        id: 'cart-123',
        items: [createMockCartItem()],
      });

      // Track cart select calls to return different data
      let cartSelectCalls = 0;

      // Helper to create chainable mock
      const createChainable = (finalValue: unknown) => {
        const chain: Record<string, unknown> = {};
        const methods = ['select', 'eq', 'neq', 'in', 'is', 'not', 'or', 'ilike', 'gte', 'lte', 'order', 'limit', 'range'];
        methods.forEach(method => {
          chain[method] = vi.fn().mockReturnValue(chain);
        });
        chain.single = vi.fn().mockResolvedValue(finalValue);
        chain.maybeSingle = vi.fn().mockResolvedValue(finalValue);
        return chain;
      };

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'store_products') {
          return createChainable({ data: product, error: null });
        }
        if (table === 'store_carts') {
          cartSelectCalls++;
          // First call returns null (no cart), subsequent calls return cart
          const cartData = cartSelectCalls === 1 ? null : cartWithItem;
          const selectChain = createChainable({ data: cartData, error: null });
          return {
            ...selectChain,
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: newCart, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        return mockClient._queryBuilder;
      });

      const result = await service.addToCart(TEST_USER_ID, TEST_TENANT_ID, TEST_PRODUCT_ID, 1);

      expect(result.success).toBe(true);
    });

    it('should fail when quantity exceeds stock', async () => {
      const product = createMockProductWithStock({ inventory: { stock_quantity: 5 } });

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: product, error: null }),
            }),
          }),
        }),
      });

      const result = await service.addToCart(TEST_USER_ID, TEST_TENANT_ID, TEST_PRODUCT_ID, 10);

      expect(result.success).toBe(false);
    });

    it('should fail when product is inactive', async () => {
      const product = createMockProductWithStock({ is_active: false });

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: product, error: null }),
            }),
          }),
        }),
      });

      const result = await service.addToCart(TEST_USER_ID, TEST_TENANT_ID, TEST_PRODUCT_ID, 1);

      expect(result.success).toBe(false);
    });

    it('should fail with zero quantity', async () => {
      const result = await service.addToCart(TEST_USER_ID, TEST_TENANT_ID, TEST_PRODUCT_ID, 0);

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // GET CART
  // ===========================================================================

  describe('getCart', () => {
    it('should return cart with items', async () => {
      const cart = createMockCart({ id: 'cart-123', items: [createMockCartItem()] });
      const product = createMockProductWithStock();

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'store_carts') {
          // Both queries to store_carts return the same cart
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: cart, error: null }),
                }),
                single: vi.fn().mockResolvedValue({ data: cart, error: null }),
              }),
            }),
          };
        }
        if (table === 'store_products') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: product, error: null }),
              }),
            }),
          };
        }
        return mockClient._queryBuilder;
      });

      const result = await service.getCart(TEST_USER_ID, TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.id).toBe('cart-123');
      }
    });

    it('should return null for non-existent cart', async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      });

      const result = await service.getCart(TEST_USER_ID, TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });
  });

  // ===========================================================================
  // UPDATE CART ITEM
  // ===========================================================================

  describe('updateCartItem', () => {
    it('should update item quantity', async () => {
      const cart = createMockCart({ id: 'cart-123', items: [createMockCartItem({ quantity: 1 })] });
      const updatedCart = createMockCart({ id: 'cart-123', items: [createMockCartItem({ quantity: 3 })] });
      const inventory = { stock_quantity: 50 };
      const product = createMockProductWithStock();

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'store_carts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: cart, error: null }),
                }),
                single: vi.fn().mockResolvedValue({ data: updatedCart, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        if (table === 'store_inventory') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: inventory, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'store_products') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: product, error: null }),
              }),
            }),
          };
        }
        return mockClient._queryBuilder;
      });

      const result = await service.updateCartItem(
        TEST_USER_ID,
        TEST_TENANT_ID,
        TEST_PRODUCT_ID,
        3
      );

      expect(result.success).toBe(true);
    });

    it('should fail when quantity exceeds stock', async () => {
      const cart = createMockCart({ items: [createMockCartItem()] });
      const inventory = { stock_quantity: 5 };

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'store_carts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: cart, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'store_inventory') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: inventory, error: null }),
                }),
              }),
            }),
          };
        }
        return mockClient._queryBuilder;
      });

      const result = await service.updateCartItem(
        TEST_USER_ID,
        TEST_TENANT_ID,
        TEST_PRODUCT_ID,
        10
      );

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // REMOVE FROM CART
  // ===========================================================================

  describe('removeFromCart', () => {
    it('should remove item from cart', async () => {
      const cart = createMockCart({ id: 'cart-123', items: [createMockCartItem()] });
      const emptyCart = createMockCart({ id: 'cart-123', items: [] });
      const product = createMockProductWithStock();

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'store_carts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: cart, error: null }),
                }),
                single: vi.fn().mockResolvedValue({ data: emptyCart, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        if (table === 'store_products') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: product, error: null }),
              }),
            }),
          };
        }
        return mockClient._queryBuilder;
      });

      const result = await service.removeFromCart(TEST_USER_ID, TEST_TENANT_ID, TEST_PRODUCT_ID);

      expect(result.success).toBe(true);
    });

    it('should fail when item not in cart', async () => {
      const cart = createMockCart({ items: [] });

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: cart, error: null }),
            }),
          }),
        }),
      });

      const result = await service.removeFromCart(
        TEST_USER_ID,
        TEST_TENANT_ID,
        'nonexistent-product'
      );

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // CHECKOUT
  // ===========================================================================

  describe('checkout', () => {
    it('should create order from cart', async () => {
      const cart = createMockCart({
        id: 'cart-123',
        items: [createMockCartItem()],
      });
      const order = createMockOrder();
      const product = createMockProductWithStock();

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'store_carts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: cart, error: null }),
                }),
                single: vi.fn().mockResolvedValue({ data: cart, error: null }),
              }),
            }),
          };
        }
        if (table === 'store_products') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: product, error: null }),
              }),
            }),
          };
        }
        if (table === 'store_orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { ...order, items: [] },
                  error: null,
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: order, error: null }),
              }),
            }),
          };
        }
        if (table === 'store_order_items') {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        if (table === 'store_cart_items') {
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        return mockClient._queryBuilder;
      });

      const result = await service.checkout(TEST_USER_ID, TEST_TENANT_ID);

      expect(result.success).toBe(true);
    });

    it('should fail with empty cart', async () => {
      const emptyCart = createMockCart({ items: [] });

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: emptyCart, error: null }),
            }),
          }),
        }),
      });

      const result = await service.checkout(TEST_USER_ID, TEST_TENANT_ID);

      expect(result.success).toBe(false);
    });

    it('should flag prescription required items', async () => {
      const cart = createMockCart({
        id: 'cart-123',
        items: [createMockCartItem()],
      });
      const prescriptionProduct = createMockProductWithStock({ is_prescription_required: true });
      const order = createMockOrder({ requires_prescription_review: true });

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'store_carts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: cart, error: null }),
                }),
                single: vi.fn().mockResolvedValue({ data: cart, error: null }),
              }),
            }),
          };
        }
        if (table === 'store_products') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: prescriptionProduct, error: null }),
              }),
            }),
          };
        }
        if (table === 'store_orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { ...order, items: [] },
                  error: null,
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: order, error: null }),
              }),
            }),
          };
        }
        if (table === 'store_order_items') {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        if (table === 'store_cart_items') {
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        return mockClient._queryBuilder;
      });

      const result = await service.checkout(TEST_USER_ID, TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.requires_prescription_review).toBe(true);
      }
    });
  });

  // ===========================================================================
  // ORDER HISTORY
  // ===========================================================================

  describe('getOrderHistory', () => {
    it('should return order history', async () => {
      const orders = [
        createMockOrder({ id: 'order-1' }),
        createMockOrder({ id: 'order-2', status: 'completed' }),
      ];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: orders, error: null }),
            }),
          }),
        }),
      });

      const result = await service.getOrderHistory(TEST_USER_ID, TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(2);
      }
    });

    it('should return empty array for no orders', async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      });

      const result = await service.getOrderHistory(TEST_USER_ID, TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });
  });
});
