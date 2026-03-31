/**
 * PaymentService Tests
 *
 * Tests payment processing functionality:
 * - Payment creation and processing
 * - Status updates
 * - Payment history
 * - Invoice status synchronization
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PaymentService } from '@/lib/services/payment-service';
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
const TEST_USER_ID = 'user-admin-123';
const TEST_INVOICE_ID = 'inv-123';

function createMockPayment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pay-123',
    tenant_id: TEST_TENANT_ID,
    invoice_id: TEST_INVOICE_ID,
    amount: 110000,
    payment_method: 'cash',
    status: 'completed',
    reference_number: null,
    notes: null,
    paid_at: new Date().toISOString(),
    received_by: TEST_USER_ID,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function createMockInvoice(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_INVOICE_ID,
    tenant_id: TEST_TENANT_ID,
    invoice_number: 'INV-2024-0001',
    total: 110000,
    status: 'sent',
    client_id: 'client-123',
    ...overrides,
  };
}

function createMockPaymentWithInvoice(overrides: Record<string, unknown> = {}) {
  return {
    ...createMockPayment(overrides),
    invoice: createMockInvoice(),
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('PaymentService', () => {
  let mockClient: MockSupabaseClient;
  let service: PaymentService;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    service = new PaymentService(mockClient as never);
    vi.clearAllMocks();
  });

  // ===========================================================================
  // PROCESS PAYMENT
  // ===========================================================================

  describe('processPayment', () => {
    it('should process cash payment', async () => {
      const invoice = createMockInvoice();
      const payment = createMockPayment();

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'invoices') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: invoice, error: null }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'payments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [payment], error: null }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: payment, error: null }),
              }),
            }),
          };
        }
        return mockClient._queryBuilder;
      });

      const result = await service.processPayment(TEST_TENANT_ID, {
        invoice_id: TEST_INVOICE_ID,
        amount: 110000,
        method: 'cash',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.payment_method).toBe('cash');
        expect(result.data.status).toBe('completed');
      }
    });

    it('should process card payment', async () => {
      const invoice = createMockInvoice();
      const payment = createMockPayment({ payment_method: 'card' });

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'invoices') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: invoice, error: null }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'payments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [payment], error: null }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: payment, error: null }),
              }),
            }),
          };
        }
        return mockClient._queryBuilder;
      });

      const result = await service.processPayment(TEST_TENANT_ID, {
        invoice_id: TEST_INVOICE_ID,
        amount: 110000,
        method: 'card',
        reference_number: 'REF-12345',
      });

      expect(result.success).toBe(true);
    });

    it('should fail for already paid invoice', async () => {
      const invoice = createMockInvoice({ status: 'paid' });

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: invoice, error: null }),
            }),
          }),
        }),
      });

      const result = await service.processPayment(TEST_TENANT_ID, {
        invoice_id: TEST_INVOICE_ID,
        amount: 110000,
        method: 'cash',
      });

      expect(result.success).toBe(false);
    });

    it('should fail for zero amount', async () => {
      const invoice = createMockInvoice();

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: invoice, error: null }),
            }),
          }),
        }),
      });

      const result = await service.processPayment(TEST_TENANT_ID, {
        invoice_id: TEST_INVOICE_ID,
        amount: 0,
        method: 'cash',
      });

      expect(result.success).toBe(false);
    });

    it('should fail for negative amount', async () => {
      const result = await service.processPayment(TEST_TENANT_ID, {
        invoice_id: TEST_INVOICE_ID,
        amount: -100,
        method: 'cash',
      });

      expect(result.success).toBe(false);
    });

    it('should fail when invoice not found', async () => {
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

      const result = await service.processPayment(TEST_TENANT_ID, {
        invoice_id: 'nonexistent',
        amount: 110000,
        method: 'cash',
      });

      expect(result.success).toBe(false);
    });

    it('should update invoice status to paid when fully paid', async () => {
      const invoice = createMockInvoice({ total: 110000 });
      const payment = createMockPayment({ amount: 110000 });
      const allPayments = [payment];

      let invoiceUpdated = false;

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'invoices') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: invoice, error: null }),
                }),
              }),
            }),
            update: vi.fn().mockImplementation(() => {
              invoiceUpdated = true;
              return {
                eq: vi.fn().mockResolvedValue({ error: null }),
              };
            }),
          };
        }
        if (table === 'payments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: allPayments, error: null }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: payment, error: null }),
              }),
            }),
          };
        }
        return mockClient._queryBuilder;
      });

      const result = await service.processPayment(TEST_TENANT_ID, {
        invoice_id: TEST_INVOICE_ID,
        amount: 110000,
        method: 'cash',
      });

      expect(result.success).toBe(true);
      expect(invoiceUpdated).toBe(true);
    });
  });

  // ===========================================================================
  // GET PAYMENT STATUS
  // ===========================================================================

  describe('getPaymentStatus', () => {
    it('should return payment by ID', async () => {
      const payment = createMockPayment();

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: payment, error: null }),
            }),
          }),
        }),
      });

      const result = await service.getPaymentStatus('pay-123', TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('pay-123');
        expect(result.data.status).toBe('completed');
      }
    });

    it('should fail when payment not found', async () => {
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

      const result = await service.getPaymentStatus('nonexistent', TEST_TENANT_ID);

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // LIST PAYMENTS
  // ===========================================================================

  describe('listPayments', () => {
    it('should return all payments for tenant', async () => {
      const payments = [
        createMockPaymentWithInvoice({ id: 'pay-1' }),
        createMockPaymentWithInvoice({ id: 'pay-2' }),
      ];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: payments, error: null }),
          }),
        }),
      });

      const result = await service.listPayments(TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(2);
      }
    });

    it('should filter by invoice_id', async () => {
      const payments = [createMockPaymentWithInvoice()];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: payments, error: null }),
            }),
          }),
        }),
      });

      const result = await service.listPayments(TEST_TENANT_ID, {
        invoice_id: TEST_INVOICE_ID,
      });

      expect(result.success).toBe(true);
    });

    it('should filter by method', async () => {
      const cashPayments = [createMockPaymentWithInvoice({ payment_method: 'cash' })];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: cashPayments, error: null }),
            }),
          }),
        }),
      });

      const result = await service.listPayments(TEST_TENANT_ID, { method: 'cash' });

      expect(result.success).toBe(true);
    });

    it('should filter by status', async () => {
      const completedPayments = [createMockPaymentWithInvoice({ status: 'completed' })];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: completedPayments, error: null }),
            }),
          }),
        }),
      });

      const result = await service.listPayments(TEST_TENANT_ID, { status: 'completed' });

      expect(result.success).toBe(true);
    });

    it('should filter by date range', async () => {
      const payments = [createMockPaymentWithInvoice()];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({ data: payments, error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await service.listPayments(TEST_TENANT_ID, {
        start_date: '2024-01-01',
        end_date: '2024-12-31',
      });

      expect(result.success).toBe(true);
    });
  });

  // ===========================================================================
  // GET USER PAYMENT HISTORY
  // ===========================================================================

  describe('getUserPaymentHistory', () => {
    it('should return payment history for user', async () => {
      const invoices = [{ id: 'inv-1' }, { id: 'inv-2' }];
      const payments = [
        createMockPaymentWithInvoice({ invoice_id: 'inv-1' }),
        createMockPaymentWithInvoice({ invoice_id: 'inv-2' }),
      ];

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'invoices') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: invoices, error: null }),
              }),
            }),
          };
        }
        if (table === 'payments') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: payments, error: null }),
              }),
            }),
          };
        }
        return mockClient._queryBuilder;
      });

      const result = await service.getUserPaymentHistory(TEST_USER_ID, TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(2);
      }
    });

    it('should return empty array when user has no invoices', async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      const result = await service.getUserPaymentHistory(TEST_USER_ID, TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });
  });

  // ===========================================================================
  // UPDATE PAYMENT STATUS
  // ===========================================================================

  describe('updatePaymentStatus', () => {
    it('should update payment status to completed', async () => {
      const existing = createMockPayment({ status: 'pending' });
      const updated = createMockPayment({ status: 'completed' });

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'payments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { ...existing, invoice: createMockInvoice() },
                    error: null,
                  }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: updated, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'invoices') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return mockClient._queryBuilder;
      });

      const result = await service.updatePaymentStatus(
        'pay-123',
        TEST_TENANT_ID,
        'completed',
        'TXN-12345'
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('completed');
      }
    });

    it('should update payment status to failed', async () => {
      const existing = createMockPayment({ status: 'pending' });
      const updated = createMockPayment({ status: 'failed' });

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...existing, invoice: createMockInvoice() },
                error: null,
              }),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: updated, error: null }),
            }),
          }),
        }),
      });

      const result = await service.updatePaymentStatus(
        'pay-123',
        TEST_TENANT_ID,
        'failed'
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('failed');
      }
    });

    it('should fail when payment not found', async () => {
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

      const result = await service.updatePaymentStatus(
        'nonexistent',
        TEST_TENANT_ID,
        'completed'
      );

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // PAYMENT METHODS
  // ===========================================================================

  describe('Payment Methods', () => {
    const paymentMethods = ['cash', 'card', 'bank_transfer', 'stripe'] as const;

    paymentMethods.forEach((method) => {
      it(`should handle ${method} payment method`, async () => {
        const invoice = createMockInvoice();
        const payment = createMockPayment({ payment_method: method });

        mockClient.from.mockImplementation((table: string) => {
          if (table === 'invoices') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: invoice, error: null }),
                  }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            };
          }
          if (table === 'payments') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ data: [payment], error: null }),
                }),
              }),
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: payment, error: null }),
                }),
              }),
            };
          }
          return mockClient._queryBuilder;
        });

        const result = await service.processPayment(TEST_TENANT_ID, {
          invoice_id: TEST_INVOICE_ID,
          amount: 110000,
          method,
        });

        expect(result.success).toBe(true);
      });
    });
  });
});
