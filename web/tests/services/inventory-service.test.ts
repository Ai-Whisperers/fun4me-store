/**
 * InventoryService Tests
 *
 * Tests the inventory and stock management functionality:
 * - Inventory CRUD operations
 * - Stock adjustments with transaction recording
 * - Stock reservations and releases
 * - Transaction history
 * - Low stock and expiry alerts
 * - Inventory statistics
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  InventoryService,
  type Inventory,
  type InventoryTransaction,
  type TransactionType,
} from '@/lib/services/inventory-service';
import { createMockSupabaseClient, type MockSupabaseClient } from './__mocks__/supabase-mock';

// Mock the logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// =============================================================================
// TEST DATA FACTORIES
// =============================================================================

const TEST_TENANT_ID = 'tenant-vet-clinic';
const TEST_PRODUCT_ID = 'product-vaccine-123';

function createMockInventory(overrides: Partial<Inventory> = {}): Inventory {
  return {
    id: 'inv-123',
    product_id: TEST_PRODUCT_ID,
    tenant_id: TEST_TENANT_ID,
    stock_quantity: 100,
    reserved_quantity: 10,
    available_quantity: 90, // Computed: stock - reserved
    min_stock_level: 20,
    reorder_quantity: 50,
    reorder_point: 25,
    weighted_average_cost: 15.50,
    location: 'Warehouse A',
    bin_number: 'A-01-03',
    batch_number: 'BATCH-2024-001',
    expiry_date: '2025-12-31',
    supplier_name: 'PetMed Supplies',
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function createMockTransaction(overrides: Partial<InventoryTransaction> = {}): InventoryTransaction {
  return {
    id: 'txn-123',
    tenant_id: TEST_TENANT_ID,
    product_id: TEST_PRODUCT_ID,
    type: 'purchase',
    quantity: 50,
    unit_cost: 12.00,
    reference_type: 'purchase_order',
    reference_id: 'po-456',
    notes: 'Regular stock replenishment',
    performed_by: 'user-admin-789',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function createLowStockInventory(): Inventory {
  return createMockInventory({
    id: 'inv-low',
    stock_quantity: 15,
    reserved_quantity: 5,
    available_quantity: 10,
    reorder_point: 25,
  });
}

function createOutOfStockInventory(): Inventory {
  return createMockInventory({
    id: 'inv-oos',
    stock_quantity: 5,
    reserved_quantity: 5,
    available_quantity: 0,
  });
}

function createExpiringSoonInventory(): Inventory {
  const inTwoWeeks = new Date();
  inTwoWeeks.setDate(inTwoWeeks.getDate() + 14);
  return createMockInventory({
    id: 'inv-expiring',
    expiry_date: inTwoWeeks.toISOString().split('T')[0],
  });
}

// =============================================================================
// TESTS
// =============================================================================

describe('InventoryService', () => {
  let mockClient: MockSupabaseClient;
  let service: InventoryService;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    service = new InventoryService(mockClient as never);
    vi.clearAllMocks();
  });

  // ===========================================================================
  // LIST INVENTORY
  // ===========================================================================

  describe('list', () => {
    it('should return all inventory for a tenant', async () => {
      const mockInventory = [
        createMockInventory({ id: 'inv-1' }),
        createMockInventory({ id: 'inv-2', product_id: 'product-2' }),
      ];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: mockInventory, error: null }),
              }),
              not: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({ data: mockInventory, error: null }),
              }),
              then: (resolve: (value: unknown) => void) => resolve({ data: mockInventory, error: null }),
              data: mockInventory,
              error: null,
            }),
          }),
        }),
      });

      const result = await service.list(TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(2);
      }
      expect(mockClient.from).toHaveBeenCalledWith('store_inventory');
    });

    it('should filter by low stock', async () => {
      // low_stock filtering is done client-side by the service
      // The mock returns all items, service filters to only low stock
      const allItems = [
        createMockInventory({ id: 'inv-normal', available_quantity: 90, reorder_point: 25 }),
        createLowStockInventory(), // available_quantity: 10, reorder_point: 25
      ];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: allItems, error: null }),
          }),
        }),
      });

      const result = await service.list(TEST_TENANT_ID, { low_stock: true });

      expect(result.success).toBe(true);
      if (result.success) {
        // Service filters client-side: only items where available_quantity <= reorder_point
        expect(result.data.length).toBe(1);
        expect(result.data[0].available_quantity).toBeLessThanOrEqual(result.data[0].reorder_point!);
      }
    });

    it('should filter by out of stock', async () => {
      const outOfStockItems = [createOutOfStockInventory()];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: outOfStockItems, error: null }),
            }),
          }),
        }),
      });

      const result = await service.list(TEST_TENANT_ID, { out_of_stock: true });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.every(item => item.available_quantity === 0)).toBe(true);
      }
    });

    it('should filter by expiring soon', async () => {
      const expiringItems = [createExpiringSoonInventory()];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({ data: expiringItems, error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await service.list(TEST_TENANT_ID, { expiring_soon: true });

      expect(result.success).toBe(true);
    });

    it('should filter by location', async () => {
      const locationItems = [createMockInventory({ location: 'Warehouse B' })];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: locationItems, error: null }),
            }),
          }),
        }),
      });

      const result = await service.list(TEST_TENANT_ID, { location: 'Warehouse B' });

      expect(result.success).toBe(true);
    });

    it('should filter by supplier', async () => {
      const supplierItems = [createMockInventory({ supplier_name: 'VetSupply Co' })];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: supplierItems, error: null }),
            }),
          }),
        }),
      });

      const result = await service.list(TEST_TENANT_ID, { supplier: 'VetSupply Co' });

      expect(result.success).toBe(true);
    });

    it('should handle database errors', async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Connection failed', code: 'CONN_ERR' },
            }),
          }),
        }),
      });

      const result = await service.list(TEST_TENANT_ID);

      expect(result.success).toBe(false);
      if (!result.success) {
        // Service returns specific error message from database
        expect(result.error).toBe('Connection failed');
      }
    });
  });

  // ===========================================================================
  // GET BY PRODUCT
  // ===========================================================================

  describe('getByProduct', () => {
    it('should return inventory for a specific product', async () => {
      const inventory = createMockInventory();

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: inventory, error: null }),
            }),
          }),
        }),
      });

      const result = await service.getByProduct(TEST_PRODUCT_ID, TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.product_id).toBe(TEST_PRODUCT_ID);
        expect(result.data?.tenant_id).toBe(TEST_TENANT_ID);
      }
    });

    it('should return null when inventory not found', async () => {
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

      const result = await service.getByProduct('nonexistent', TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it('should handle database errors', async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'GENERIC_ERR', message: 'Database error' },
              }),
            }),
          }),
        }),
      });

      const result = await service.getByProduct(TEST_PRODUCT_ID, TEST_TENANT_ID);

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // CREATE INVENTORY
  // ===========================================================================

  describe('create', () => {
    it('should create inventory for a new product', async () => {
      const newInventory = createMockInventory({ id: 'inv-new' });

      // Mock getByProduct returning null (no existing inventory)
      const getByProductMock = vi.fn()
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });

      // Mock insert
      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: newInventory, error: null }),
        }),
      });

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'store_inventory') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: getByProductMock,
                }),
              }),
            }),
            insert: insertMock,
          };
        }
        return mockClient._queryBuilder;
      });

      const result = await service.create(TEST_TENANT_ID, {
        product_id: TEST_PRODUCT_ID,
        stock_quantity: 100,
        min_stock_level: 20,
        reorder_point: 25,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('inv-new');
      }
    });

    it('should fail if inventory already exists for product', async () => {
      const existingInventory = createMockInventory();

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: existingInventory, error: null }),
            }),
          }),
        }),
      });

      const result = await service.create(TEST_TENANT_ID, {
        product_id: TEST_PRODUCT_ID,
        stock_quantity: 50,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        // Service throws specific error when inventory already exists
        expect(result.error).toBe('Inventory already exists for this product');
      }
    });
  });

  // ===========================================================================
  // UPDATE INVENTORY
  // ===========================================================================

  describe('update', () => {
    it('should update inventory settings', async () => {
      const updatedInventory = createMockInventory({
        min_stock_level: 30,
        reorder_point: 35,
      });

      mockClient.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: updatedInventory, error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await service.update(TEST_PRODUCT_ID, TEST_TENANT_ID, {
        min_stock_level: 30,
        reorder_point: 35,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.min_stock_level).toBe(30);
        expect(result.data.reorder_point).toBe(35);
      }
    });

    it('should fail when inventory not found', async () => {
      mockClient.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await service.update('nonexistent', TEST_TENANT_ID, {
        min_stock_level: 30,
      });

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // ADJUST STOCK
  // ===========================================================================

  describe('adjustStock', () => {
    it('should add stock with purchase transaction', async () => {
      const currentInventory = createMockInventory({ stock_quantity: 100 });
      const updatedInventory = createMockInventory({ stock_quantity: 150 });

      let callCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'store_inventory') {
          callCount++;
          if (callCount === 1) {
            // First call: getByProduct
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: currentInventory, error: null }),
                  }),
                }),
              }),
            };
          } else {
            // Second call: update
            return {
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({ data: updatedInventory, error: null }),
                    }),
                  }),
                }),
              }),
            };
          }
        }
        if (table === 'store_inventory_transactions') {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return mockClient._queryBuilder;
      });

      const result = await service.adjustStock(
        TEST_PRODUCT_ID,
        TEST_TENANT_ID,
        50,
        'purchase',
        {
          unit_cost: 12.00,
          reference_type: 'purchase_order',
          reference_id: 'po-789',
          notes: 'Weekly restock',
          performed_by: 'user-admin',
        }
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.stock_quantity).toBe(150);
      }
    });

    it('should subtract stock with sale transaction', async () => {
      const currentInventory = createMockInventory({ stock_quantity: 100 });
      const updatedInventory = createMockInventory({ stock_quantity: 90 });

      let callCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'store_inventory') {
          callCount++;
          if (callCount === 1) {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: currentInventory, error: null }),
                  }),
                }),
              }),
            };
          } else {
            return {
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({ data: updatedInventory, error: null }),
                    }),
                  }),
                }),
              }),
            };
          }
        }
        if (table === 'store_inventory_transactions') {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return mockClient._queryBuilder;
      });

      const result = await service.adjustStock(
        TEST_PRODUCT_ID,
        TEST_TENANT_ID,
        -10,
        'sale'
      );

      expect(result.success).toBe(true);
    });

    it('should handle damage transaction type', async () => {
      const currentInventory = createMockInventory({ stock_quantity: 100 });
      const updatedInventory = createMockInventory({ stock_quantity: 95 });

      let callCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'store_inventory') {
          callCount++;
          if (callCount === 1) {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: currentInventory, error: null }),
                  }),
                }),
              }),
            };
          } else {
            return {
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({ data: updatedInventory, error: null }),
                    }),
                  }),
                }),
              }),
            };
          }
        }
        if (table === 'store_inventory_transactions') {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return mockClient._queryBuilder;
      });

      const result = await service.adjustStock(
        TEST_PRODUCT_ID,
        TEST_TENANT_ID,
        -5,
        'damage',
        { notes: 'Damaged during shipping' }
      );

      expect(result.success).toBe(true);
    });

    it('should create inventory if it does not exist', async () => {
      const newInventory = createMockInventory({ stock_quantity: 50 });

      let callCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'store_inventory') {
          callCount++;
          if (callCount === 1) {
            // getByProduct returns null
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: null,
                      error: { code: 'PGRST116' },
                    }),
                  }),
                }),
              }),
            };
          } else if (callCount === 2) {
            // create check
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: null,
                      error: { code: 'PGRST116' },
                    }),
                  }),
                }),
              }),
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: newInventory, error: null }),
                }),
              }),
            };
          }
        }
        if (table === 'store_inventory_transactions') {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return mockClient._queryBuilder;
      });

      const result = await service.adjustStock(
        'new-product',
        TEST_TENANT_ID,
        50,
        'purchase'
      );

      expect(result.success).toBe(true);
    });

    it('should not allow stock to go negative', async () => {
      const currentInventory = createMockInventory({ stock_quantity: 10 });
      const updatedInventory = createMockInventory({ stock_quantity: 0 }); // Clamped to 0

      let callCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'store_inventory') {
          callCount++;
          if (callCount === 1) {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: currentInventory, error: null }),
                  }),
                }),
              }),
            };
          } else {
            return {
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({ data: updatedInventory, error: null }),
                    }),
                  }),
                }),
              }),
            };
          }
        }
        if (table === 'store_inventory_transactions') {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return mockClient._queryBuilder;
      });

      const result = await service.adjustStock(
        TEST_PRODUCT_ID,
        TEST_TENANT_ID,
        -50, // More than available
        'sale'
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.stock_quantity).toBe(0);
      }
    });
  });

  // ===========================================================================
  // RESERVE STOCK
  // ===========================================================================

  describe('reserveStock', () => {
    it('should reserve stock when available', async () => {
      const currentInventory = createMockInventory({
        stock_quantity: 100,
        reserved_quantity: 10,
        available_quantity: 90,
      });
      const updatedInventory = createMockInventory({
        stock_quantity: 100,
        reserved_quantity: 30,
        available_quantity: 70,
      });

      let callCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'store_inventory') {
          callCount++;
          if (callCount === 1) {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: currentInventory, error: null }),
                  }),
                }),
              }),
            };
          } else {
            return {
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({ data: updatedInventory, error: null }),
                    }),
                  }),
                }),
              }),
            };
          }
        }
        return mockClient._queryBuilder;
      });

      const result = await service.reserveStock(TEST_PRODUCT_ID, TEST_TENANT_ID, 20);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reserved_quantity).toBe(30);
      }
    });

    it('should fail when insufficient stock available', async () => {
      const currentInventory = createMockInventory({
        stock_quantity: 100,
        reserved_quantity: 90,
        available_quantity: 10,
      });

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: currentInventory, error: null }),
            }),
          }),
        }),
      });

      const result = await service.reserveStock(TEST_PRODUCT_ID, TEST_TENANT_ID, 50);

      expect(result.success).toBe(false);
      if (!result.success) {
        // Service throws descriptive error for insufficient stock
        expect(result.error).toBe('Insufficient stock available for reservation');
      }
    });

    it('should fail when product inventory not found', async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' },
              }),
            }),
          }),
        }),
      });

      const result = await service.reserveStock('nonexistent', TEST_TENANT_ID, 10);

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // RELEASE STOCK
  // ===========================================================================

  describe('releaseStock', () => {
    it('should release reserved stock', async () => {
      const currentInventory = createMockInventory({
        reserved_quantity: 30,
      });
      const updatedInventory = createMockInventory({
        reserved_quantity: 10,
      });

      let callCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'store_inventory') {
          callCount++;
          if (callCount === 1) {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: currentInventory, error: null }),
                  }),
                }),
              }),
            };
          } else {
            return {
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({ data: updatedInventory, error: null }),
                    }),
                  }),
                }),
              }),
            };
          }
        }
        return mockClient._queryBuilder;
      });

      const result = await service.releaseStock(TEST_PRODUCT_ID, TEST_TENANT_ID, 20);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reserved_quantity).toBe(10);
      }
    });

    it('should not allow reserved quantity to go negative', async () => {
      const currentInventory = createMockInventory({
        reserved_quantity: 10,
      });
      const updatedInventory = createMockInventory({
        reserved_quantity: 0, // Clamped to 0
      });

      let callCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'store_inventory') {
          callCount++;
          if (callCount === 1) {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: currentInventory, error: null }),
                  }),
                }),
              }),
            };
          } else {
            return {
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({ data: updatedInventory, error: null }),
                    }),
                  }),
                }),
              }),
            };
          }
        }
        return mockClient._queryBuilder;
      });

      const result = await service.releaseStock(TEST_PRODUCT_ID, TEST_TENANT_ID, 50);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reserved_quantity).toBe(0);
      }
    });

    it('should fail when product inventory not found', async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' },
              }),
            }),
          }),
        }),
      });

      const result = await service.releaseStock('nonexistent', TEST_TENANT_ID, 10);

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // LIST TRANSACTIONS
  // ===========================================================================

  describe('listTransactions', () => {
    it('should return all transactions for a tenant', async () => {
      const mockTransactions = [
        createMockTransaction({ id: 'txn-1', type: 'purchase' }),
        createMockTransaction({ id: 'txn-2', type: 'sale' }),
      ];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockTransactions, error: null }),
          }),
        }),
      });

      const result = await service.listTransactions(TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(2);
      }
      expect(mockClient.from).toHaveBeenCalledWith('store_inventory_transactions');
    });

    it('should filter by product_id', async () => {
      const productTransactions = [createMockTransaction()];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: productTransactions, error: null }),
            }),
          }),
        }),
      });

      const result = await service.listTransactions(TEST_TENANT_ID, {
        product_id: TEST_PRODUCT_ID,
      });

      expect(result.success).toBe(true);
    });

    it('should filter by transaction type', async () => {
      const saleTransactions = [
        createMockTransaction({ type: 'sale' }),
      ];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: saleTransactions, error: null }),
            }),
          }),
        }),
      });

      const result = await service.listTransactions(TEST_TENANT_ID, {
        type: 'sale',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.every(t => t.type === 'sale')).toBe(true);
      }
    });

    it('should filter by date range', async () => {
      const dateRangeTransactions = [createMockTransaction()];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({ data: dateRangeTransactions, error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await service.listTransactions(TEST_TENANT_ID, {
        from_date: '2024-01-01',
        to_date: '2024-12-31',
      });

      expect(result.success).toBe(true);
    });

    it('should filter by performer', async () => {
      const performerTransactions = [
        createMockTransaction({ performed_by: 'user-specific' }),
      ];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: performerTransactions, error: null }),
            }),
          }),
        }),
      });

      const result = await service.listTransactions(TEST_TENANT_ID, {
        performed_by: 'user-specific',
      });

      expect(result.success).toBe(true);
    });
  });

  // ===========================================================================
  // GET PRODUCT HISTORY
  // ===========================================================================

  describe('getProductHistory', () => {
    it('should return transaction history for a product', async () => {
      const productHistory = [
        createMockTransaction({ type: 'purchase', quantity: 100 }),
        createMockTransaction({ type: 'sale', quantity: -10 }),
        createMockTransaction({ type: 'damage', quantity: -5 }),
      ];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: productHistory, error: null }),
            }),
          }),
        }),
      });

      const result = await service.getProductHistory(TEST_PRODUCT_ID, TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(3);
      }
    });
  });

  // ===========================================================================
  // ALERT METHODS
  // ===========================================================================

  describe('getLowStockItems', () => {
    it('should return items below reorder point', async () => {
      const lowStockItems = [
        createLowStockInventory(),
      ];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              lte: vi.fn().mockResolvedValue({ data: lowStockItems, error: null }),
            }),
          }),
        }),
      });

      const result = await service.getLowStockItems(TEST_TENANT_ID);

      expect(result.success).toBe(true);
    });
  });

  describe('getOutOfStockItems', () => {
    it('should return items with zero available quantity', async () => {
      const outOfStockItems = [
        createOutOfStockInventory(),
      ];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: outOfStockItems, error: null }),
            }),
          }),
        }),
      });

      const result = await service.getOutOfStockItems(TEST_TENANT_ID);

      expect(result.success).toBe(true);
    });
  });

  describe('getExpiringSoon', () => {
    it('should return items expiring within 30 days', async () => {
      const expiringItems = [
        createExpiringSoonInventory(),
      ];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({ data: expiringItems, error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await service.getExpiringSoon(TEST_TENANT_ID);

      expect(result.success).toBe(true);
    });
  });

  // ===========================================================================
  // GET STATS
  // ===========================================================================

  describe('getStats', () => {
    it('should return comprehensive inventory statistics', async () => {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const thirtyDaysDate = thirtyDaysFromNow.toISOString().split('T')[0];

      const inventoryData = [
        {
          stock_quantity: 100,
          available_quantity: 90,
          reorder_point: 25,
          expiry_date: null,
          weighted_average_cost: 10.00,
        },
        {
          stock_quantity: 15,
          available_quantity: 10,
          reorder_point: 20, // Low stock
          expiry_date: null,
          weighted_average_cost: 25.00,
        },
        {
          stock_quantity: 5,
          available_quantity: 0, // Out of stock
          reorder_point: 10,
          expiry_date: null,
          weighted_average_cost: 50.00,
        },
        {
          stock_quantity: 50,
          available_quantity: 50,
          reorder_point: 10,
          expiry_date: thirtyDaysDate, // Expiring soon
          weighted_average_cost: 15.00,
        },
      ];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: inventoryData, error: null }),
        }),
      });

      const result = await service.getStats(TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.total_products).toBe(4);
        expect(result.data.total_stock_value).toBe(
          100 * 10 + 15 * 25 + 5 * 50 + 50 * 15
        ); // 1000 + 375 + 250 + 750 = 2375
        // Low stock = available_quantity <= reorder_point
        // Item 2: 10 <= 20 = low stock
        // Item 3: 0 <= 10 = low stock (out-of-stock items are also low stock)
        expect(result.data.low_stock_count).toBe(2);
        expect(result.data.out_of_stock_count).toBe(1);
        expect(result.data.expiring_soon_count).toBe(1);
      }
    });

    it('should handle empty inventory', async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });

      const result = await service.getStats(TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.total_products).toBe(0);
        expect(result.data.total_stock_value).toBe(0);
        expect(result.data.low_stock_count).toBe(0);
        expect(result.data.out_of_stock_count).toBe(0);
        expect(result.data.expiring_soon_count).toBe(0);
      }
    });

    it('should handle database errors', async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      });

      const result = await service.getStats(TEST_TENANT_ID);

      expect(result.success).toBe(false);
      if (!result.success) {
        // Service returns specific error message from database
        expect(result.error).toBe('Database error');
      }
    });
  });

  // ===========================================================================
  // TRANSACTION TYPES
  // ===========================================================================

  describe('Transaction Types', () => {
    const transactionTypes: TransactionType[] = [
      'purchase',
      'sale',
      'adjustment',
      'return',
      'damage',
      'theft',
      'expired',
      'transfer',
    ];

    transactionTypes.forEach((type) => {
      it(`should handle ${type} transaction type`, async () => {
        const currentInventory = createMockInventory({ stock_quantity: 100 });
        const updatedInventory = createMockInventory({ stock_quantity: 90 });

        let callCount = 0;
        mockClient.from.mockImplementation((table: string) => {
          if (table === 'store_inventory') {
            callCount++;
            if (callCount === 1) {
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({ data: currentInventory, error: null }),
                    }),
                  }),
                }),
              };
            } else {
              return {
                update: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      select: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({ data: updatedInventory, error: null }),
                      }),
                    }),
                  }),
                }),
              };
            }
          }
          if (table === 'store_inventory_transactions') {
            return {
              insert: vi.fn().mockResolvedValue({ data: null, error: null }),
            };
          }
          return mockClient._queryBuilder;
        });

        const result = await service.adjustStock(
          TEST_PRODUCT_ID,
          TEST_TENANT_ID,
          -10,
          type
        );

        expect(result.success).toBe(true);
      });
    });
  });
});
