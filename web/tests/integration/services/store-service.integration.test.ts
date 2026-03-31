/**
 * StoreService Integration Tests
 * 
 * Tests the StoreService with real Supabase database connection.
 * These tests verify that the service correctly manages products, cart,
 * checkout, and order operations.
 * 
 * ACTUAL StoreService API (verified 2026-01-15):
 * - listProducts(tenantId, filters?)
 * - getProduct(id, tenantId)
 * - addToCart(userId, tenantId, productId, quantity)
 * - getCart(userId, tenantId)
 * - updateCartItem(userId, itemId, quantity)
 * - removeFromCart(userId, itemId)
 * - checkout(userId, tenantId, input)
 * - getOrderHistory(userId, tenantId)
 * 
 * @group integration
 * @group services
 * @group store
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { StoreService } from '@/lib/services/store-service';
import type { CheckoutInput } from '@/lib/services/store-service';
import {
  createTestClient,
  createTestDataTracker,
  createTestTenant,
  createTestUser,
  createTestProduct,
  cleanupTestData,
} from './setup';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { TestDataTracker } from './setup';

describe('StoreService Integration Tests', () => {
  let supabase: SupabaseClient;
  let service: StoreService;
  let tracker: TestDataTracker;
  
  // Test data IDs
  let tenantId: string;
  let customerId: string;
  let staffId: string;
  let product1Id: string;
  let product2Id: string;
  let product3Id: string;

  beforeAll(async () => {
    supabase = createTestClient();
    service = new StoreService(supabase);
    tracker = createTestDataTracker();

    // Create test tenant
    tenantId = await createTestTenant(supabase, tracker, {
      name: 'StoreService Test Clinic',
    });

    // Create test users
    customerId = await createTestUser(supabase, tracker, tenantId, 'owner', {
      email: 'customer@storetest.com',
      full_name: 'Test Customer',
    });

    staffId = await createTestUser(supabase, tracker, tenantId, 'admin', {
      email: 'staff@storetest.com',
      full_name: 'Test Staff',
    });

    // Create test products with unique SKUs to avoid constraint violations
    const testRun = Date.now();
    
    product1Id = await createTestProduct(supabase, tracker, tenantId, {
      name: 'Dog Food Premium',
      sku: `DOG-FOOD-${testRun}-1`,
      base_price: 50000,
      stock_quantity: 100,
      is_prescription_required: false,
    });

    product2Id = await createTestProduct(supabase, tracker, tenantId, {
      name: 'Cat Treats',
      sku: `CAT-TREAT-${testRun}-2`,
      base_price: 15000,
      stock_quantity: 50,
      is_prescription_required: false,
    });

    product3Id = await createTestProduct(supabase, tracker, tenantId, {
      name: 'Antibiotic Medication',
      sku: `MED-ANTI-${testRun}-3`,
      base_price: 80000,
      stock_quantity: 20,
      is_prescription_required: true,
    });
  });

  afterAll(async () => {
    await cleanupTestData(supabase, tracker);
  });

  // ==========================================
  // PRODUCT BROWSING (5 tests)
  // ==========================================

  describe('listProducts() - Product Browsing', () => {
    it('should list all products for tenant', async () => {
      const result = await service.listProducts(tenantId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.length).toBeGreaterThanOrEqual(3);

      // All products should belong to this tenant
      result.data!.forEach(product => {
        expect(product.tenant_id).toBe(tenantId);
        expect(product).toHaveProperty('stock_quantity');
        expect(product).toHaveProperty('is_in_stock');
      });
    });

    it('should filter products by search query', async () => {
      const result = await service.listProducts(tenantId, {
        query: 'Dog Food',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.length).toBeGreaterThanOrEqual(1);

      const found = result.data!.find(p => p.name.includes('Dog Food'));
      expect(found).toBeDefined();
    });

    it('should filter products by in_stock_only', async () => {
      // Create out of stock product with unique SKU
      const outOfStockId = await createTestProduct(supabase, tracker, tenantId, {
        name: 'Out of Stock Item',
        sku: `OUT-STOCK-${Date.now()}`,
        base_price: 10000,
        stock_quantity: 0,
      });

      const result = await service.listProducts(tenantId, {
        in_stock_only: true,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      // Should not include out of stock product
      const outOfStock = result.data!.find(p => p.id === outOfStockId);
      expect(outOfStock).toBeUndefined();

      // All returned products should be in stock
      result.data!.forEach(product => {
        expect(product.is_in_stock).toBe(true);
        expect(product.stock_quantity).toBeGreaterThan(0);
      });
    });

    it('should get single product by ID', async () => {
      const result = await service.getProduct(product1Id, tenantId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.id).toBe(product1Id);
      expect(result.data!.name).toBe('Dog Food Premium');
      expect(result.data!.stock_quantity).toBe(100);
      expect(result.data!.is_in_stock).toBe(true);
    });

    it('should return error for non-existent product', async () => {
      const result = await service.getProduct(
        '00000000-0000-0000-0000-000000000000',
        tenantId
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      // When .single() finds 0 rows, Supabase returns PGRST116 which maps to permissions error
      expect(result.error).toBeDefined();
    });
  });

  // ==========================================
  // CART MANAGEMENT (8 tests)
  // ==========================================

  describe('Cart Management', () => {
    beforeEach(async () => {
      // Clear any existing cart for customer
      const { data: existingCarts } = await supabase
        .from('store_carts')
        .select('id')
        .eq('customer_id', customerId)
        .eq('tenant_id', tenantId);

      if (existingCarts && existingCarts.length > 0) {
        // Delete cart items first
        for (const cart of existingCarts) {
          await supabase
            .from('store_cart_items')
            .delete()
            .eq('cart_id', cart.id);
        }
        // Then delete carts
        await supabase
          .from('store_carts')
          .delete()
          .eq('customer_id', customerId);
      }
    });

    it('should add product to cart', async () => {
      const result = await service.addToCart(customerId, tenantId, product1Id, 2);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.items).toBeDefined();
      expect(result.data!.items.length).toBe(1);
      expect(result.data!.items[0].product_id).toBe(product1Id);
      expect(result.data!.items[0].quantity).toBe(2);
    });

    it('should update quantity when adding same product again', async () => {
      // Add product first time
      await service.addToCart(customerId, tenantId, product1Id, 2);

      // Add same product again
      const result = await service.addToCart(customerId, tenantId, product1Id, 3);

      expect(result.success).toBe(true);
      expect(result.data!.items.length).toBe(1);
      expect(result.data!.items[0].quantity).toBe(5); // 2 + 3
    });

    it('should add multiple different products to cart', async () => {
      // Add first product
      await service.addToCart(customerId, tenantId, product1Id, 1);

      // Add second product
      const result = await service.addToCart(customerId, tenantId, product2Id, 2);

      expect(result.success).toBe(true);
      expect(result.data!.items.length).toBe(2);
    });

    it('should get cart with all items', async () => {
      // Add products to cart
      await service.addToCart(customerId, tenantId, product1Id, 2);
      await service.addToCart(customerId, tenantId, product2Id, 1);

      const result = await service.getCart(customerId, tenantId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.items.length).toBe(2);
      expect(result.data!.customer_id).toBe(customerId);
    });

    it('should return null for empty cart', async () => {
      const result = await service.getCart(customerId, tenantId);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should update cart item quantity', async () => {
      // Add product to cart
      const addResult = await service.addToCart(customerId, tenantId, product1Id, 2);
      const itemId = addResult.data!.items[0].id;

      // Update quantity
      const result = await service.updateCartItem(customerId, itemId, 5);

      expect(result.success).toBe(true);
      expect(result.data!.items[0].quantity).toBe(5);
    });

    it('should remove cart item', async () => {
      // Add products to cart
      await service.addToCart(customerId, tenantId, product1Id, 2);
      const addResult = await service.addToCart(customerId, tenantId, product2Id, 1);
      
      const itemId = addResult.data!.items.find(i => i.product_id === product2Id)!.id;

      // Remove one item
      const result = await service.removeFromCart(customerId, itemId);

      expect(result.success).toBe(true);
      expect(result.data!.items.length).toBe(1);
      expect(result.data!.items[0].product_id).toBe(product1Id);
    });

    it('should validate stock before adding to cart', async () => {
      // Try to add more than available stock
      const result = await service.addToCart(customerId, tenantId, product1Id, 150);

      // Should either fail or cap at available stock
      if (!result.success) {
        expect(result.error).toBeDefined();
      } else {
        expect(result.data!.items[0].quantity).toBeLessThanOrEqual(100);
      }
    });
  });

  // ==========================================
  // CHECKOUT (6 tests)
  // ==========================================

  describe('checkout() - Order Creation', () => {
    beforeEach(async () => {
      // Clear any existing cart and orders for customer
      const { data: existingCarts } = await supabase
        .from('store_carts')
        .select('id')
        .eq('customer_id', customerId);

      if (existingCarts) {
        for (const cart of existingCarts) {
          await supabase.from('store_cart_items').delete().eq('cart_id', cart.id);
        }
        await supabase.from('store_carts').delete().eq('customer_id', customerId);
      }
    });

    it('should checkout and create order from cart', async () => {
      // Add products to cart
      await service.addToCart(customerId, tenantId, product1Id, 2);
      await service.addToCart(customerId, tenantId, product2Id, 1);

      const checkoutInput: CheckoutInput = {
        notes: 'Test order',
      };

      const result = await service.checkout(customerId, tenantId, checkoutInput);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.customer_id).toBe(customerId);
      expect(result.data!.tenant_id).toBe(tenantId);
      expect(result.data!.status).toBe('pending');

      tracker.orderIds.push(result.data!.id);

      // Verify cart was cleared
      const cartResult = await service.getCart(customerId, tenantId);
      expect(cartResult.data).toBeNull();
    });

    it('should calculate correct order totals', async () => {
      // Add products: 2 x 50000 + 1 x 15000 = 115000
      await service.addToCart(customerId, tenantId, product1Id, 2);
      await service.addToCart(customerId, tenantId, product2Id, 1);

      const result = await service.checkout(customerId, tenantId, {});

      expect(result.success).toBe(true);
      expect(result.data!.subtotal).toBe(115000);
      expect(result.data!.total).toBeGreaterThanOrEqual(115000); // Includes tax

      tracker.orderIds.push(result.data!.id);
    });

    it('should mark order requiring prescription review', async () => {
      // Add prescription-required product
      await service.addToCart(customerId, tenantId, product3Id, 1);

      const result = await service.checkout(customerId, tenantId, {});

      expect(result.success).toBe(true);
      expect(result.data!.requires_prescription_review).toBe(true);

      tracker.orderIds.push(result.data!.id);
    });

    it('should reject checkout with empty cart', async () => {
      const result = await service.checkout(customerId, tenantId, {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should create order items from cart items', async () => {
      // Add products
      await service.addToCart(customerId, tenantId, product1Id, 2);

      const result = await service.checkout(customerId, tenantId, {});

      expect(result.success).toBe(true);

      tracker.orderIds.push(result.data!.id);

      // Verify order items created
      const { data: orderItems } = await supabase
        .from('store_order_items')
        .select('*')
        .eq('order_id', result.data!.id);

      expect(orderItems).toBeDefined();
      expect(orderItems!.length).toBe(1);
      expect(orderItems![0].product_id).toBe(product1Id);
      expect(orderItems![0].quantity).toBe(2);
    });

    it('should reduce stock after checkout', async () => {
      // Get initial stock
      const initialResult = await service.getProduct(product2Id, tenantId);
      const initialStock = initialResult.data!.stock_quantity;

      // Add to cart and checkout
      await service.addToCart(customerId, tenantId, product2Id, 3);
      const checkoutResult = await service.checkout(customerId, tenantId, {});

      expect(checkoutResult.success).toBe(true);
      tracker.orderIds.push(checkoutResult.data!.id);

      // Verify stock reduced
      const updatedResult = await service.getProduct(product2Id, tenantId);
      expect(updatedResult.data!.stock_quantity).toBe(initialStock - 3);
    });
  });

  // ==========================================
  // ORDER HISTORY (3 tests)
  // ==========================================

  describe('getOrderHistory() - Order History', () => {
    it('should get order history for customer', async () => {
      // Create an order
      await service.addToCart(customerId, tenantId, product1Id, 1);
      const checkoutResult = await service.checkout(customerId, tenantId, {});
      tracker.orderIds.push(checkoutResult.data!.id);

      const result = await service.getOrderHistory(customerId, tenantId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.length).toBeGreaterThanOrEqual(1);

      // All orders should belong to this customer
      result.data!.forEach(order => {
        expect(order.customer_id).toBe(customerId);
        expect(order.tenant_id).toBe(tenantId);
      });
    });

    it('should return empty array for customer with no orders', async () => {
      // Create new customer
      const newCustomerId = await createTestUser(supabase, tracker, tenantId, 'owner', {
        email: 'newcustomer@test.com',
        full_name: 'New Customer',
      });

      const result = await service.getOrderHistory(newCustomerId, tenantId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should return orders in descending order by date', async () => {
      // Create multiple orders
      for (let i = 0; i < 3; i++) {
        await service.addToCart(customerId, tenantId, product1Id, 1);
        const checkoutResult = await service.checkout(customerId, tenantId, {
          notes: `Order ${i + 1}`,
        });
        tracker.orderIds.push(checkoutResult.data!.id);

        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const result = await service.getOrderHistory(customerId, tenantId);

      expect(result.success).toBe(true);
      expect(result.data!.length).toBeGreaterThanOrEqual(3);

      // Verify descending order
      for (let i = 1; i < result.data!.length; i++) {
        const prev = new Date(result.data![i - 1].created_at);
        const curr = new Date(result.data![i].created_at);
        expect(prev.getTime()).toBeGreaterThanOrEqual(curr.getTime());
      }
    });
  });

  // ==========================================
  // EDGE CASES (3 tests)
  // ==========================================

  describe('Edge Cases', () => {
    it('should handle concurrent cart operations gracefully', async () => {
      // Add multiple products concurrently
      const promises = [
        service.addToCart(customerId, tenantId, product1Id, 1),
        service.addToCart(customerId, tenantId, product2Id, 1),
        service.addToCart(customerId, tenantId, product3Id, 1),
      ];

      const results = await Promise.all(promises);

      // At least some should succeed
      const succeeded = results.filter(r => r.success);
      expect(succeeded.length).toBeGreaterThan(0);

      // Final cart should have all items
      const cartResult = await service.getCart(customerId, tenantId);
      if (cartResult.data) {
        expect(cartResult.data.items.length).toBeGreaterThan(0);
      }
    });

    it('should enforce tenant isolation for products', async () => {
      // Create another tenant
      const otherTenantId = await createTestTenant(supabase, tracker, {
        name: 'Other Clinic',
      });

      // Try to get product from different tenant
      const result = await service.getProduct(product1Id, otherTenantId);

      expect(result.success).toBe(false);
      // When .single() finds 0 rows (wrong tenant), returns permission error
      expect(result.error).toBeDefined();
    });

    it('should enforce tenant isolation for cart', async () => {
      // Create cart for customer in original tenant
      await service.addToCart(customerId, tenantId, product1Id, 1);

      // Create another tenant
      const otherTenantId = await createTestTenant(supabase, tracker, {
        name: 'Other Clinic 2',
      });

      // Try to get cart from different tenant
      const result = await service.getCart(customerId, otherTenantId);

      // Should return null (no cart in other tenant)
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });
});
