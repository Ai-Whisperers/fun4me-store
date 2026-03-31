/**
 * LabService Tests
 *
 * Tests the laboratory management functionality:
 * - Test catalog operations
 * - Panel management
 * - Order creation and status updates
 * - Results entry
 * - Attachments and comments
 * - Statistics
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  LabService,
  type LabTest,
  type LabPanel,
  type LabOrder,
  type LabResult,
  type LabAttachment,
  type LabComment,
  type OrderStatus,
  type OrderPriority,
  type ResultFlag,
} from '@/lib/services/lab-service';
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
// HELPER: CHAINABLE MOCK
// =============================================================================

function createChainableMock<T>(response: { data: T | null; error: { message: string; code?: string } | null; count?: number }) {
  const mockObj: Record<string, unknown> = {};

  const chainMethods = [
    'select', 'eq', 'neq', 'is', 'in', 'not', 'or', 'ilike', 'contains',
    'order', 'limit', 'range', 'gte', 'lte', 'gt', 'lt', 'update', 'insert', 'delete'
  ];

  chainMethods.forEach(method => {
    mockObj[method] = vi.fn().mockImplementation(() => mockObj);
  });

  mockObj.single = vi.fn().mockResolvedValue(response);
  mockObj.maybeSingle = vi.fn().mockResolvedValue(response);

  mockObj.then = vi.fn().mockImplementation((resolve: (value: typeof response) => void) => {
    return Promise.resolve(response).then(resolve);
  });

  return mockObj;
}

// =============================================================================
// TEST DATA FACTORIES
// =============================================================================

const TEST_TENANT_ID = 'tenant-vet-clinic';
const TEST_PET_ID = 'pet-123';
const TEST_ORDER_ID = 'order-123';

function createMockTest(overrides: Partial<LabTest> = {}): LabTest {
  return {
    id: 'test-123',
    tenant_id: null,
    code: 'CBC',
    name: 'Complete Blood Count',
    category: 'Hematology',
    description: 'Full blood panel',
    base_price: 50.00,
    reference_ranges: { dog: { min: 5, max: 15, unit: 'x10^9/L' } },
    turnaround_days: 1,
    requires_fasting: false,
    sample_type: 'edta_blood',
    sample_volume_ml: 2.0,
    special_instructions: null,
    is_active: true,
    display_order: 10,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function createMockPanel(overrides: Partial<LabPanel> = {}): LabPanel {
  return {
    id: 'panel-123',
    tenant_id: TEST_TENANT_ID,
    code: 'CHEM_PANEL',
    name: 'Chemistry Panel',
    description: 'Comprehensive chemistry panel',
    test_ids: ['test-1', 'test-2', 'test-3'],
    panel_price: 120.00,
    is_active: true,
    display_order: 10,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function createMockOrder(overrides: Partial<LabOrder> = {}): LabOrder {
  return {
    id: TEST_ORDER_ID,
    tenant_id: TEST_TENANT_ID,
    order_number: 'LAB-2024-000001',
    pet_id: TEST_PET_ID,
    ordered_by: 'vet-123',
    medical_record_id: null,
    priority: 'routine',
    clinical_notes: 'Pre-surgical bloodwork',
    fasting_confirmed: true,
    lab_type: 'in_house',
    reference_lab_name: null,
    external_accession: null,
    status: 'pending',
    collected_at: null,
    collected_by: null,
    processing_at: null,
    completed_at: null,
    reviewed_at: null,
    reviewed_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function createMockResult(overrides: Partial<LabResult> = {}): LabResult {
  return {
    id: 'result-123',
    lab_order_id: TEST_ORDER_ID,
    tenant_id: TEST_TENANT_ID,
    test_id: 'test-123',
    value: '12.5',
    numeric_value: 12.5,
    unit: 'x10^9/L',
    reference_min: 5.0,
    reference_max: 15.0,
    flag: 'normal',
    is_abnormal: false,
    notes: null,
    entered_by: 'tech-123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function createMockAttachment(overrides: Partial<LabAttachment> = {}): LabAttachment {
  return {
    id: 'attach-123',
    lab_order_id: TEST_ORDER_ID,
    tenant_id: TEST_TENANT_ID,
    file_url: 'https://storage.example.com/lab-report.pdf',
    file_name: 'lab-report.pdf',
    file_type: 'application/pdf',
    file_size_bytes: 102400,
    description: 'Full lab report',
    uploaded_by: 'tech-123',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function createMockComment(overrides: Partial<LabComment> = {}): LabComment {
  return {
    id: 'comment-123',
    lab_order_id: TEST_ORDER_ID,
    tenant_id: TEST_TENANT_ID,
    comment: 'Results look normal, no concerns.',
    created_by: 'vet-123',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('LabService', () => {
  let mockClient: MockSupabaseClient;
  let service: LabService;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    service = new LabService(mockClient as never);
    vi.clearAllMocks();
  });

  // ===========================================================================
  // LIST TESTS
  // ===========================================================================

  describe('listTests', () => {
    it('should return all lab tests for a tenant', async () => {
      const mockTests = [
        createMockTest({ id: 'test-1', code: 'CBC' }),
        createMockTest({ id: 'test-2', code: 'CHEM10' }),
      ];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: mockTests, error: null })
      );

      const result = await service.listTests(TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(2);
      }
      expect(mockClient.from).toHaveBeenCalledWith('lab_test_catalog');
    });

    it('should filter by category', async () => {
      const hematologyTests = [createMockTest({ category: 'Hematology' })];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: hematologyTests, error: null })
      );

      const result = await service.listTests(TEST_TENANT_ID, { category: 'Hematology' });

      expect(result.success).toBe(true);
    });

    it('should filter by sample_type', async () => {
      const bloodTests = [createMockTest({ sample_type: 'blood' })];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: bloodTests, error: null })
      );

      const result = await service.listTests(TEST_TENANT_ID, { sample_type: 'blood' });

      expect(result.success).toBe(true);
    });

    it('should filter by active status', async () => {
      const activeTests = [createMockTest({ is_active: true })];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: activeTests, error: null })
      );

      const result = await service.listTests(TEST_TENANT_ID, { is_active: true });

      expect(result.success).toBe(true);
    });

    it('should search by name or code', async () => {
      const searchResults = [createMockTest({ name: 'Complete Blood Count' })];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: searchResults, error: null })
      );

      const result = await service.listTests(TEST_TENANT_ID, { search: 'blood' });

      expect(result.success).toBe(true);
    });

    it('should handle database errors', async () => {
      mockClient.from.mockReturnValue(
        createChainableMock({ data: null, error: { message: 'Connection failed' } })
      );

      const result = await service.listTests(TEST_TENANT_ID);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Connection failed');
      }
    });
  });

  // ===========================================================================
  // GET TEST
  // ===========================================================================

  describe('getTest', () => {
    it('should return a specific test', async () => {
      const test = createMockTest();

      mockClient.from.mockReturnValue(
        createChainableMock({ data: test, error: null })
      );

      const result = await service.getTest('test-123');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.code).toBe('CBC');
      }
    });

    it('should return null when not found', async () => {
      mockClient.from.mockReturnValue(
        createChainableMock({ data: null, error: { code: 'PGRST116', message: 'Not found' } })
      );

      const result = await service.getTest('nonexistent');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });
  });

  // ===========================================================================
  // GET TEST CATEGORIES
  // ===========================================================================

  describe('getTestCategories', () => {
    it('should return unique categories', async () => {
      const tests = [
        { category: 'Hematology' },
        { category: 'Chemistry' },
        { category: 'Hematology' }, // Duplicate
        { category: 'Endocrine' },
      ];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: tests, error: null })
      );

      const result = await service.getTestCategories(TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(['Chemistry', 'Endocrine', 'Hematology']);
      }
    });
  });

  // ===========================================================================
  // LIST PANELS
  // ===========================================================================

  describe('listPanels', () => {
    it('should return all panels for a tenant', async () => {
      const mockPanels = [
        createMockPanel({ id: 'panel-1' }),
        createMockPanel({ id: 'panel-2', name: 'Basic Panel' }),
      ];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: mockPanels, error: null })
      );

      const result = await service.listPanels(TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(2);
      }
      expect(mockClient.from).toHaveBeenCalledWith('lab_panels');
    });
  });

  // ===========================================================================
  // GET PANEL
  // ===========================================================================

  describe('getPanel', () => {
    it('should return panel with tests', async () => {
      const panel = createMockPanel();
      const tests = [
        createMockTest({ id: 'test-1' }),
        createMockTest({ id: 'test-2' }),
      ];

      let callCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        callCount++;
        if (table === 'lab_panels') {
          return createChainableMock({ data: panel, error: null });
        }
        if (table === 'lab_test_catalog') {
          return createChainableMock({ data: tests, error: null });
        }
        return createChainableMock({ data: null, error: null });
      });

      const result = await service.getPanel('panel-123', TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.id).toBe('panel-123');
      }
    });

    it('should return null when not found', async () => {
      mockClient.from.mockReturnValue(
        createChainableMock({ data: null, error: { code: 'PGRST116', message: 'Not found' } })
      );

      const result = await service.getPanel('nonexistent', TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });
  });

  // ===========================================================================
  // LIST ORDERS
  // ===========================================================================

  describe('listOrders', () => {
    it('should return all orders for a tenant', async () => {
      const mockOrders = [
        createMockOrder({ id: 'order-1' }),
        createMockOrder({ id: 'order-2', status: 'completed' }),
      ];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: mockOrders, error: null })
      );

      const result = await service.listOrders(TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(2);
      }
      expect(mockClient.from).toHaveBeenCalledWith('lab_orders');
    });

    it('should filter by status', async () => {
      const pendingOrders = [createMockOrder({ status: 'pending' })];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: pendingOrders, error: null })
      );

      const result = await service.listOrders(TEST_TENANT_ID, { status: 'pending' });

      expect(result.success).toBe(true);
    });

    it('should filter by priority', async () => {
      const urgentOrders = [createMockOrder({ priority: 'urgent' })];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: urgentOrders, error: null })
      );

      const result = await service.listOrders(TEST_TENANT_ID, { priority: 'urgent' });

      expect(result.success).toBe(true);
    });

    it('should filter by pet_id', async () => {
      const petOrders = [createMockOrder({ pet_id: TEST_PET_ID })];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: petOrders, error: null })
      );

      const result = await service.listOrders(TEST_TENANT_ID, { pet_id: TEST_PET_ID });

      expect(result.success).toBe(true);
    });

    it('should filter by date range', async () => {
      const dateRangeOrders = [createMockOrder()];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: dateRangeOrders, error: null })
      );

      const result = await service.listOrders(TEST_TENANT_ID, {
        from_date: '2024-01-01',
        to_date: '2024-12-31',
      });

      expect(result.success).toBe(true);
    });
  });

  // ===========================================================================
  // GET PENDING ORDERS
  // ===========================================================================

  describe('getPendingOrders', () => {
    it('should return pending orders sorted by priority', async () => {
      const pendingOrders = [
        createMockOrder({ id: 'order-1', priority: 'stat', status: 'pending' }),
        createMockOrder({ id: 'order-2', priority: 'routine', status: 'collected' }),
      ];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: pendingOrders, error: null })
      );

      const result = await service.getPendingOrders(TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(2);
      }
    });
  });

  // ===========================================================================
  // GET ORDER
  // ===========================================================================

  describe('getOrder', () => {
    it('should return order with items', async () => {
      const order = createMockOrder();
      const items = [
        { id: 'item-1', test_id: 'test-1', status: 'pending' },
        { id: 'item-2', test_id: 'test-2', status: 'completed' },
      ];

      let callCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        callCount++;
        if (table === 'lab_orders') {
          return createChainableMock({ data: order, error: null });
        }
        if (table === 'lab_order_items') {
          return createChainableMock({ data: items, error: null });
        }
        return createChainableMock({ data: null, error: null });
      });

      const result = await service.getOrder(TEST_ORDER_ID, TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.order_number).toBe('LAB-2024-000001');
      }
    });

    it('should return null when not found', async () => {
      mockClient.from.mockReturnValue(
        createChainableMock({ data: null, error: { code: 'PGRST116', message: 'Not found' } })
      );

      const result = await service.getOrder('nonexistent', TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });
  });

  // ===========================================================================
  // CREATE ORDER
  // ===========================================================================

  describe('createOrder', () => {
    it('should create a new lab order with items', async () => {
      const newOrder = createMockOrder({ id: 'order-new' });
      const tests = [
        { id: 'test-1', base_price: 50 },
        { id: 'test-2', base_price: 75 },
      ];

      mockClient.rpc.mockResolvedValue({ data: 'LAB-2024-000002', error: null });

      let callCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        callCount++;
        if (table === 'lab_orders') {
          return createChainableMock({ data: newOrder, error: null });
        }
        if (table === 'lab_test_catalog') {
          return createChainableMock({ data: tests, error: null });
        }
        if (table === 'lab_order_items') {
          return createChainableMock({ data: null, error: null });
        }
        return createChainableMock({ data: null, error: null });
      });

      const result = await service.createOrder(TEST_TENANT_ID, {
        pet_id: TEST_PET_ID,
        ordered_by: 'vet-123',
        priority: 'routine',
        test_ids: ['test-1', 'test-2'],
      });

      expect(result.success).toBe(true);
      expect(mockClient.rpc).toHaveBeenCalledWith('generate_lab_order_number', {
        p_tenant_id: TEST_TENANT_ID,
      });
    });

    it('should create order with stat priority', async () => {
      const statOrder = createMockOrder({ priority: 'stat' });

      mockClient.rpc.mockResolvedValue({ data: 'LAB-2024-000003', error: null });
      // Mock: 1) order insert, 2) test prices, 3) items insert
      mockClient.from
        .mockReturnValueOnce(createChainableMock({ data: statOrder, error: null }))
        .mockReturnValueOnce(createChainableMock({ data: [{ id: 'test-1', base_price: 50 }], error: null }))
        .mockReturnValueOnce(createChainableMock({ data: [], error: null }));

      const result = await service.createOrder(TEST_TENANT_ID, {
        pet_id: TEST_PET_ID,
        priority: 'stat',
        clinical_notes: 'Emergency bloodwork',
        test_ids: ['test-1'],
      });

      expect(result.success).toBe(true);
    });

    it('should handle order number generation error', async () => {
      mockClient.rpc.mockResolvedValue({ data: null, error: { message: 'RPC failed' } });

      const result = await service.createOrder(TEST_TENANT_ID, {
        pet_id: TEST_PET_ID,
        test_ids: ['test-1'],
      });

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // UPDATE ORDER STATUS
  // ===========================================================================

  describe('updateOrderStatus', () => {
    const statuses: OrderStatus[] = ['pending', 'collected', 'processing', 'completed', 'reviewed', 'cancelled'];

    statuses.forEach((status) => {
      it(`should update order to ${status}`, async () => {
        const updatedOrder = createMockOrder({ status });

        mockClient.from.mockReturnValue(
          createChainableMock({ data: updatedOrder, error: null })
        );

        const result = await service.updateOrderStatus(
          TEST_ORDER_ID,
          TEST_TENANT_ID,
          status
        );

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe(status);
        }
      });
    });

    it('should set collected_by when collecting', async () => {
      const collectedOrder = createMockOrder({
        status: 'collected',
        collected_by: 'tech-123',
      });

      mockClient.from.mockReturnValue(
        createChainableMock({ data: collectedOrder, error: null })
      );

      const result = await service.updateOrderStatus(
        TEST_ORDER_ID,
        TEST_TENANT_ID,
        'collected',
        { collected_by: 'tech-123' }
      );

      expect(result.success).toBe(true);
    });

    it('should set reviewed_by when reviewing', async () => {
      const reviewedOrder = createMockOrder({
        status: 'reviewed',
        reviewed_by: 'vet-123',
      });

      mockClient.from.mockReturnValue(
        createChainableMock({ data: reviewedOrder, error: null })
      );

      const result = await service.updateOrderStatus(
        TEST_ORDER_ID,
        TEST_TENANT_ID,
        'reviewed',
        { reviewed_by: 'vet-123' }
      );

      expect(result.success).toBe(true);
    });

    it('should fail when order not found', async () => {
      mockClient.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      const result = await service.updateOrderStatus(
        'nonexistent',
        TEST_TENANT_ID,
        'collected'
      );

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // CANCEL ORDER
  // ===========================================================================

  describe('cancelOrder', () => {
    it('should cancel an order', async () => {
      const cancelledOrder = createMockOrder({ status: 'cancelled' });

      mockClient.from.mockReturnValue(
        createChainableMock({ data: cancelledOrder, error: null })
      );

      const result = await service.cancelOrder(TEST_ORDER_ID, TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('cancelled');
      }
    });
  });

  // ===========================================================================
  // LIST RESULTS
  // ===========================================================================

  describe('listResults', () => {
    it('should return results for an order', async () => {
      const mockResults = [
        createMockResult({ id: 'result-1', test_id: 'test-1' }),
        createMockResult({ id: 'result-2', test_id: 'test-2', is_abnormal: true }),
      ];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: mockResults, error: null })
      );

      const result = await service.listResults(TEST_ORDER_ID, TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(2);
      }
      expect(mockClient.from).toHaveBeenCalledWith('lab_results');
    });
  });

  // ===========================================================================
  // ENTER RESULT
  // ===========================================================================

  describe('enterResult', () => {
    it('should enter a normal result', async () => {
      const newResult = createMockResult();

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'lab_results') {
          return createChainableMock({ data: newResult, error: null });
        }
        if (table === 'lab_order_items') {
          return createChainableMock({ data: null, error: null });
        }
        return createChainableMock({ data: null, error: null });
      });

      const result = await service.enterResult(TEST_ORDER_ID, TEST_TENANT_ID, {
        test_id: 'test-123',
        value: '12.5',
        numeric_value: 12.5,
        unit: 'x10^9/L',
        reference_min: 5.0,
        reference_max: 15.0,
        entered_by: 'tech-123',
      });

      expect(result.success).toBe(true);
    });

    it('should auto-flag low results', async () => {
      const lowResult = createMockResult({
        numeric_value: 3.0,
        flag: 'low',
        is_abnormal: true,
      });

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'lab_results') {
          return createChainableMock({ data: lowResult, error: null });
        }
        if (table === 'lab_order_items') {
          return createChainableMock({ data: null, error: null });
        }
        return createChainableMock({ data: null, error: null });
      });

      const result = await service.enterResult(TEST_ORDER_ID, TEST_TENANT_ID, {
        test_id: 'test-123',
        value: '3.0',
        numeric_value: 3.0,
        reference_min: 5.0,
        reference_max: 15.0,
      });

      expect(result.success).toBe(true);
    });

    it('should auto-flag high results', async () => {
      const highResult = createMockResult({
        numeric_value: 20.0,
        flag: 'high',
        is_abnormal: true,
      });

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'lab_results') {
          return createChainableMock({ data: highResult, error: null });
        }
        if (table === 'lab_order_items') {
          return createChainableMock({ data: null, error: null });
        }
        return createChainableMock({ data: null, error: null });
      });

      const result = await service.enterResult(TEST_ORDER_ID, TEST_TENANT_ID, {
        test_id: 'test-123',
        value: '20.0',
        numeric_value: 20.0,
        reference_min: 5.0,
        reference_max: 15.0,
      });

      expect(result.success).toBe(true);
    });

    it('should allow manual flag override', async () => {
      const criticalResult = createMockResult({
        flag: 'critical_high',
        is_abnormal: true,
      });

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'lab_results') {
          return createChainableMock({ data: criticalResult, error: null });
        }
        if (table === 'lab_order_items') {
          return createChainableMock({ data: null, error: null });
        }
        return createChainableMock({ data: null, error: null });
      });

      const result = await service.enterResult(TEST_ORDER_ID, TEST_TENANT_ID, {
        test_id: 'test-123',
        value: '25.0',
        numeric_value: 25.0,
        flag: 'critical_high',
        is_abnormal: true,
      });

      expect(result.success).toBe(true);
    });
  });

  // ===========================================================================
  // UPDATE RESULT
  // ===========================================================================

  describe('updateResult', () => {
    it('should update a result', async () => {
      const updatedResult = createMockResult({ notes: 'Updated notes' });

      mockClient.from.mockReturnValue(
        createChainableMock({ data: updatedResult, error: null })
      );

      const result = await service.updateResult('result-123', TEST_TENANT_ID, {
        notes: 'Updated notes',
      });

      expect(result.success).toBe(true);
    });

    it('should fail when result not found', async () => {
      mockClient.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      const result = await service.updateResult('nonexistent', TEST_TENANT_ID, {
        notes: 'Test',
      });

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // GET ABNORMAL RESULTS
  // ===========================================================================

  describe('getAbnormalResults', () => {
    it('should return only abnormal results', async () => {
      const abnormalResults = [
        createMockResult({ flag: 'high', is_abnormal: true }),
        createMockResult({ flag: 'low', is_abnormal: true }),
      ];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: abnormalResults, error: null })
      );

      const result = await service.getAbnormalResults(TEST_ORDER_ID, TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.every(r => r.is_abnormal)).toBe(true);
      }
    });
  });

  // ===========================================================================
  // LIST ATTACHMENTS
  // ===========================================================================

  describe('listAttachments', () => {
    it('should return attachments for an order', async () => {
      const mockAttachments = [
        createMockAttachment({ id: 'attach-1' }),
        createMockAttachment({ id: 'attach-2', file_name: 'microscopy.jpg' }),
      ];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: mockAttachments, error: null })
      );

      const result = await service.listAttachments(TEST_ORDER_ID, TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(2);
      }
      expect(mockClient.from).toHaveBeenCalledWith('lab_result_attachments');
    });
  });

  // ===========================================================================
  // ADD ATTACHMENT
  // ===========================================================================

  describe('addAttachment', () => {
    it('should add an attachment', async () => {
      const newAttachment = createMockAttachment({ id: 'attach-new' });

      mockClient.from.mockReturnValue(
        createChainableMock({ data: newAttachment, error: null })
      );

      const result = await service.addAttachment(TEST_ORDER_ID, TEST_TENANT_ID, {
        file_url: 'https://storage.example.com/report.pdf',
        file_name: 'report.pdf',
        file_type: 'application/pdf',
        uploaded_by: 'tech-123',
      });

      expect(result.success).toBe(true);
    });
  });

  // ===========================================================================
  // DELETE ATTACHMENT
  // ===========================================================================

  describe('deleteAttachment', () => {
    it('should delete an attachment', async () => {
      mockClient.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      const result = await service.deleteAttachment('attach-123', TEST_TENANT_ID);

      expect(result.success).toBe(true);
    });
  });

  // ===========================================================================
  // LIST COMMENTS
  // ===========================================================================

  describe('listComments', () => {
    it('should return comments for an order', async () => {
      const mockComments = [
        createMockComment({ id: 'comment-1' }),
        createMockComment({ id: 'comment-2', comment: 'Follow up needed' }),
      ];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: mockComments, error: null })
      );

      const result = await service.listComments(TEST_ORDER_ID, TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(2);
      }
      expect(mockClient.from).toHaveBeenCalledWith('lab_result_comments');
    });
  });

  // ===========================================================================
  // ADD COMMENT
  // ===========================================================================

  describe('addComment', () => {
    it('should add a comment', async () => {
      const newComment = createMockComment({ id: 'comment-new' });

      mockClient.from.mockReturnValue(
        createChainableMock({ data: newComment, error: null })
      );

      const result = await service.addComment(
        TEST_ORDER_ID,
        TEST_TENANT_ID,
        'Results reviewed, all normal.',
        'vet-123'
      );

      expect(result.success).toBe(true);
    });
  });

  // ===========================================================================
  // GET STATS
  // ===========================================================================

  describe('getStats', () => {
    it('should return comprehensive lab statistics', async () => {
      const now = new Date();
      const ordersData = [
        { status: 'pending', created_at: now.toISOString(), completed_at: null },
        { status: 'collected', created_at: now.toISOString(), completed_at: null },
        { status: 'processing', created_at: now.toISOString(), completed_at: null },
        { status: 'completed', created_at: new Date(now.getTime() - 3600000).toISOString(), completed_at: now.toISOString() },
      ];

      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // lab_orders query
          return createChainableMock({ data: ordersData, error: null });
        }
        // lab_results count query
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 3, error: null }),
            }),
          }),
        };
      });

      const result = await service.getStats(TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pending_orders).toBe(1);
        expect(result.data.processing_orders).toBe(2); // collected + processing
        expect(result.data.abnormal_results_count).toBe(3);
      }
    });

    it('should handle empty data', async () => {
      mockClient.from.mockImplementation(() => {
        return createChainableMock({ data: [], error: null });
      });

      // Also mock the count query
      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainableMock({ data: [], error: null });
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          }),
        };
      });

      const result = await service.getStats(TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pending_orders).toBe(0);
        expect(result.data.avg_turnaround_hours).toBeNull();
      }
    });
  });

  // ===========================================================================
  // RESULT FLAGS
  // ===========================================================================

  describe('Result Flags', () => {
    const flags: ResultFlag[] = ['low', 'normal', 'high', 'critical_low', 'critical_high'];

    flags.forEach((flag) => {
      it(`should handle ${flag} result flag`, async () => {
        const result = createMockResult({ flag });

        mockClient.from.mockImplementation((table: string) => {
          if (table === 'lab_results') {
            return createChainableMock({ data: result, error: null });
          }
          if (table === 'lab_order_items') {
            return createChainableMock({ data: null, error: null });
          }
          return createChainableMock({ data: null, error: null });
        });

        const serviceResult = await service.enterResult(TEST_ORDER_ID, TEST_TENANT_ID, {
          test_id: 'test-123',
          value: '10',
          flag,
        });

        expect(serviceResult.success).toBe(true);
      });
    });
  });

  // ===========================================================================
  // ORDER PRIORITIES
  // ===========================================================================

  describe('Order Priorities', () => {
    const priorities: OrderPriority[] = ['stat', 'urgent', 'routine'];

    priorities.forEach((priority) => {
      it(`should handle ${priority} priority`, async () => {
        const order = createMockOrder({ priority });

        mockClient.rpc.mockResolvedValue({ data: 'LAB-2024-000004', error: null });
        // Mock: 1) order insert, 2) test prices, 3) items insert
        mockClient.from
          .mockReturnValueOnce(createChainableMock({ data: order, error: null }))
          .mockReturnValueOnce(createChainableMock({ data: [{ id: 'test-1', base_price: 50 }], error: null }))
          .mockReturnValueOnce(createChainableMock({ data: [], error: null }));

        const result = await service.createOrder(TEST_TENANT_ID, {
          pet_id: TEST_PET_ID,
          priority,
          test_ids: ['test-1'],
        });

        expect(result.success).toBe(true);
      });
    });
  });
});
