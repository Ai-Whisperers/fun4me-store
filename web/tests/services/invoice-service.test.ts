/**
 * InvoiceService Tests
 *
 * Tests invoice management functionality:
 * - Invoice CRUD operations
 * - Status transitions (draft → sent → paid)
 * - Payment recording
 * - Refund processing
 * - Revenue analytics
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InvoiceService } from '@/lib/services/invoice-service';
import { createMockSupabaseClient, type MockSupabaseClient } from './__mocks__/supabase-mock';

// Mock dependencies
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/types/invoicing', () => ({
  roundCurrency: (n: number) => Math.round(n * 100) / 100,
}));

// =============================================================================
// TEST DATA FACTORIES
// =============================================================================

const TEST_TENANT_ID = 'tenant-vet-clinic';
const TEST_USER_ID = 'user-admin-123';
const TEST_PET_ID = 'pet-dog-456';

function createMockInvoice(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv-123',
    tenant_id: TEST_TENANT_ID,
    invoice_number: 'INV-2024-0001',
    pet_id: TEST_PET_ID,
    owner_id: 'owner-789',
    status: 'draft',
    subtotal: 100000,
    tax_rate: 10,
    tax_amount: 10000,
    total: 110000,
    amount_paid: 0,
    amount_due: 110000,
    notes: null,
    due_date: '2024-04-15',
    created_by: TEST_USER_ID,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    ...overrides,
  };
}

function createMockInvoiceWithDetails(overrides: Record<string, unknown> = {}) {
  return {
    ...createMockInvoice(overrides),
    pets: {
      id: TEST_PET_ID,
      name: 'Max',
      species: 'dog',
      breed: 'Labrador',
      photo_url: null,
      owner: {
        id: 'owner-789',
        full_name: 'Juan Pérez',
        email: 'juan@example.com',
        phone: '+595991234567',
      },
    },
    invoice_items: [
      {
        id: 'item-1',
        description: 'Consulta General',
        quantity: 1,
        unit_price: 100000,
        discount_percent: 0,
        line_total: 100000,
      },
    ],
    payments: [],
    refunds: [],
    created_by_user: { full_name: 'Admin User' },
  };
}

function createMockPayment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pay-123',
    tenant_id: TEST_TENANT_ID,
    invoice_id: 'inv-123',
    amount: 110000,
    payment_method: 'cash',
    payment_reference: null,
    status: 'completed',
    paid_at: new Date().toISOString(),
    processed_by: TEST_USER_ID,
    notes: null,
    ...overrides,
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('InvoiceService', () => {
  let mockClient: MockSupabaseClient;
  let service: InvoiceService;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    service = new InvoiceService(mockClient as never);
    vi.clearAllMocks();
  });

  // ===========================================================================
  // LIST INVOICES
  // ===========================================================================

  describe('list', () => {
    it('should return invoices for tenant (staff)', async () => {
      const invoices = [
        createMockInvoiceWithDetails({ id: 'inv-1' }),
        createMockInvoiceWithDetails({ id: 'inv-2' }),
      ];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({ data: invoices, error: null, count: 2 }),
              }),
            }),
          }),
        }),
      });

      const result = await service.list(TEST_TENANT_ID, {}, TEST_USER_ID, true);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.invoices.length).toBe(2);
        expect(result.data.count).toBe(2);
      }
    });

    it('should filter by status', async () => {
      const paidInvoices = [createMockInvoiceWithDetails({ status: 'paid' })];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ data: paidInvoices, error: null, count: 1 }),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await service.list(TEST_TENANT_ID, { status: 'paid' });

      expect(result.success).toBe(true);
    });

    it('should return only owner invoices for non-staff', async () => {
      const ownerPets = [{ id: TEST_PET_ID }];
      const ownerInvoices = [createMockInvoiceWithDetails()];

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'pets') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: ownerPets, error: null }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockReturnValue({
                    in: vi.fn().mockResolvedValue({
                      data: ownerInvoices,
                      error: null,
                      count: 1,
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      });

      const result = await service.list(TEST_TENANT_ID, {}, 'owner-user', false);

      expect(result.success).toBe(true);
    });
  });

  // ===========================================================================
  // GET BY ID
  // ===========================================================================

  describe('getById', () => {
    it('should return invoice by ID', async () => {
      const invoice = createMockInvoiceWithDetails();

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: invoice, error: null }),
            }),
          }),
        }),
      });

      const result = await service.getById('inv-123', TEST_TENANT_ID, TEST_USER_ID, true);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('inv-123');
      }
    });

    it('should deny access for non-owner', async () => {
      const invoice = createMockInvoiceWithDetails({ owner_id: 'other-owner' });

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: invoice, error: null }),
            }),
          }),
        }),
      });

      const result = await service.getById('inv-123', TEST_TENANT_ID, 'non-owner', false);

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // CREATE INVOICE
  // ===========================================================================

  describe('create', () => {
    it('should create invoice with items', async () => {
      const newInvoice = createMockInvoice();
      const pet = { id: TEST_PET_ID, tenant_id: TEST_TENANT_ID, owner_id: 'owner-789' };

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'pets') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: pet, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'invoices') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: newInvoice, error: null }),
              }),
            }),
          };
        }
        if (table === 'invoice_items') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return mockClient._queryBuilder;
      });

      mockClient.rpc.mockResolvedValue({ data: 'INV-2024-0001', error: null });

      const result = await service.create(TEST_TENANT_ID, TEST_USER_ID, {
        pet_id: TEST_PET_ID,
        items: [{ description: 'Consulta', quantity: 1, unit_price: 100000 }],
        tax_rate: 10,
      });

      expect(result.success).toBe(true);
    });

    it('should fail with empty items', async () => {
      const result = await service.create(TEST_TENANT_ID, TEST_USER_ID, {
        pet_id: TEST_PET_ID,
        items: [],
      });

      expect(result.success).toBe(false);
    });

    it('should return existing invoice for idempotent request', async () => {
      const existingInvoice = createMockInvoice();

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: existingInvoice, error: null }),
            }),
          }),
        }),
      });

      const result = await service.create(TEST_TENANT_ID, TEST_USER_ID, {
        pet_id: TEST_PET_ID,
        items: [{ description: 'Consulta', quantity: 1, unit_price: 100000 }],
        idempotency_key: 'unique-key-123',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('inv-123');
      }
    });
  });

  // ===========================================================================
  // UPDATE INVOICE
  // ===========================================================================

  describe('update', () => {
    it('should allow full edit for draft invoice', async () => {
      const existing = createMockInvoice({ status: 'draft' });
      const updated = createMockInvoice({ notes: 'Updated' });

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'invoices') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: existing, error: null }),
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
        return mockClient._queryBuilder;
      });

      const result = await service.update('inv-123', TEST_TENANT_ID, TEST_USER_ID, {
        notes: 'Updated',
      });

      expect(result.success).toBe(true);
    });

    it('should only allow limited edits for sent invoice', async () => {
      const existing = createMockInvoice({ status: 'sent' });
      const updated = createMockInvoice({ status: 'sent', notes: 'Updated' });

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: existing, error: null }),
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

      const result = await service.update('inv-123', TEST_TENANT_ID, TEST_USER_ID, {
        notes: 'Updated',
      });

      expect(result.success).toBe(true);
    });
  });

  // ===========================================================================
  // DELETE INVOICE
  // ===========================================================================

  describe('delete', () => {
    it('should hard delete draft invoice', async () => {
      const existing = createMockInvoice({ status: 'draft' });

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'invoices') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: existing, error: null }),
                }),
              }),
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'invoice_items') {
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return mockClient._queryBuilder;
      });

      const result = await service.delete('inv-123', TEST_TENANT_ID, TEST_USER_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.deleted).toBe(true);
        expect(result.data.voided).toBe(false);
      }
    });

    it('should void sent invoice instead of deleting', async () => {
      const existing = createMockInvoice({ status: 'sent' });

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: existing, error: null }),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await service.delete('inv-123', TEST_TENANT_ID, TEST_USER_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.deleted).toBe(false);
        expect(result.data.voided).toBe(true);
      }
    });
  });

  // ===========================================================================
  // RECORD PAYMENT
  // ===========================================================================

  describe('recordPayment', () => {
    it('should record payment and update invoice', async () => {
      const invoice = createMockInvoice({ status: 'sent', amount_due: 110000 });
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
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: payment, error: null }),
              }),
            }),
          };
        }
        return mockClient._queryBuilder;
      });

      const result = await service.recordPayment(TEST_TENANT_ID, TEST_USER_ID, {
        invoice_id: 'inv-123',
        amount: 110000,
        payment_method: 'cash',
      });

      expect(result.success).toBe(true);
    });

    it('should fail when amount exceeds due', async () => {
      const invoice = createMockInvoice({ status: 'sent', amount_due: 50000 });

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: invoice, error: null }),
            }),
          }),
        }),
      });

      const result = await service.recordPayment(TEST_TENANT_ID, TEST_USER_ID, {
        invoice_id: 'inv-123',
        amount: 100000,
        payment_method: 'cash',
      });

      expect(result.success).toBe(false);
    });

    it('should fail when amount is zero or negative', async () => {
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

      const result = await service.recordPayment(TEST_TENANT_ID, TEST_USER_ID, {
        invoice_id: 'inv-123',
        amount: 0,
        payment_method: 'cash',
      });

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // REFUND PAYMENT
  // ===========================================================================

  describe('refundPayment', () => {
    it('should process refund', async () => {
      const payment = createMockPayment({ amount: 110000 });
      const refund = {
        id: 'ref-123',
        amount: 50000,
        reason: 'Partial refund',
      };

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'payments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: payment, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'refunds') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: refund, error: null }),
              }),
            }),
          };
        }
        if (table === 'invoices') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { total: 110000, amount_paid: 110000 },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return mockClient._queryBuilder;
      });

      const result = await service.refundPayment(
        TEST_TENANT_ID,
        TEST_USER_ID,
        'pay-123',
        50000,
        'Partial refund'
      );

      expect(result.success).toBe(true);
    });

    it('should fail when refund exceeds payment', async () => {
      const payment = createMockPayment({ amount: 50000 });

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: payment, error: null }),
            }),
          }),
        }),
      });

      const result = await service.refundPayment(
        TEST_TENANT_ID,
        TEST_USER_ID,
        'pay-123',
        100000,
        'Over refund'
      );

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // STATUS TRANSITIONS
  // ===========================================================================

  describe('sendInvoice', () => {
    it('should mark draft invoice as sent', async () => {
      const sentInvoice = createMockInvoice({ status: 'sent' });

      mockClient.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: sentInvoice, error: null }),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await service.sendInvoice('inv-123', TEST_TENANT_ID, TEST_USER_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('sent');
      }
    });
  });

  describe('markAsPaid', () => {
    it('should mark invoice as paid', async () => {
      const existing = createMockInvoice({ total: 110000 });
      const paidInvoice = createMockInvoice({ status: 'paid', amount_due: 0 });

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: existing, error: null }),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: paidInvoice, error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await service.markAsPaid('inv-123', TEST_TENANT_ID, TEST_USER_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('paid');
      }
    });
  });

  describe('voidInvoice', () => {
    it('should void invoice', async () => {
      const voidedInvoice = createMockInvoice({ status: 'void' });

      mockClient.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: voidedInvoice, error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await service.voidInvoice('inv-123', TEST_TENANT_ID, TEST_USER_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('void');
      }
    });
  });

  // ===========================================================================
  // REPORTING
  // ===========================================================================

  describe('getOverdueInvoices', () => {
    it('should return overdue invoices', async () => {
      const overdueInvoices = [
        createMockInvoiceWithDetails({ status: 'sent', due_date: '2024-01-01' }),
      ];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              lt: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: overdueInvoices, error: null }),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await service.getOverdueInvoices(TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(1);
      }
    });
  });

  describe('getRevenueSummary', () => {
    it('should calculate revenue statistics', async () => {
      const invoices = [
        { total: 100000, status: 'paid', amount_due: 0, due_date: null, paid_at: new Date() },
        { total: 50000, status: 'paid', amount_due: 0, due_date: null, paid_at: new Date() },
        { total: 75000, status: 'sent', amount_due: 75000, due_date: '2024-01-01', paid_at: null },
      ];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                is: vi.fn().mockResolvedValue({ data: invoices, error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await service.getRevenueSummary(
        TEST_TENANT_ID,
        '2024-01-01',
        '2024-12-31'
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.total_revenue).toBe(150000);
        expect(result.data.paid_invoices_count).toBe(2);
        expect(result.data.outstanding_balance).toBe(75000);
      }
    });

    it('should handle empty results', async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                is: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await service.getRevenueSummary(
        TEST_TENANT_ID,
        '2024-01-01',
        '2024-12-31'
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.total_revenue).toBe(0);
        expect(result.data.paid_invoices_count).toBe(0);
      }
    });
  });
});
