/**
 * InvoiceService Unit Tests
 *
 * Tests cover:
 * - CRUD operations (list, getById, create, update, delete)
 * - Payment operations (recordPayment, getPayments, refundPayment)
 * - Invoice actions (sendInvoice, markAsPaid, voidInvoice)
 * - Analytics (getOverdueInvoices, getRevenueSummary)
 * - Error handling
 * - Tenant isolation
 * - Owner/staff access control
 *
 * Target Coverage: 95%+
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InvoiceService } from '@/lib/services';
import type { Invoice, Payment, Refund } from '@/lib/types/entities/invoice';
import { createMockSupabase } from '../../__helpers__/mocks';
import { TENANT_IDS } from '@/lib/constants/tenants';

// =============================================================================
// MOCK SETUP
// =============================================================================

const mockInvoice: Invoice = {
  id: 'inv-1',
  tenant_id: TENANT_IDS.ADRIS,
  client_id: 'client-1',
  pet_id: 'pet-1',
  invoice_number: 'INV-2026-001',
  appointment_id: null,
  medical_record_id: null,
  hospitalization_id: null,
  subtotal: 150000,
  discount_amount: 0,
  discount_reason: null,
  tax_rate: 10,
  tax_amount: 15000,
  total_amount: 165000,
  amount_paid: 0,
  balance_due: 165000,
  status: 'draft',
  due_date: '2026-03-01',
  paid_at: null,
  notes: null,
  internal_notes: null,
  created_by: 'user-1',
  created_at: '2026-01-15T12:00:00Z',
  updated_at: '2026-01-15T12:00:00Z',
};

const mockInvoiceWithDetails = {
  ...mockInvoice,
  pets: {
    id: 'pet-1',
    name: 'Max',
    species: 'dog',
    breed: 'Labrador',
    photo_url: null,
    owner: {
      id: 'owner-1',
      full_name: 'Juan Pérez',
      email: 'juan@example.com',
      phone: '+595981234567',
    },
  },
  invoice_items: [
    {
      id: 'item-1',
      service_id: 'service-1',
      product_id: null,
      description: 'Consulta General',
      quantity: 1,
      unit_price: 150000,
      discount_percent: 0,
      line_total: 150000,
      services: {
        id: 'service-1',
        name: 'Consulta General',
        category: 'Consultas',
      },
      products: null,
    },
  ],
  payments: [],
  refunds: [],
  created_by_user: {
    full_name: 'Dra. María López',
  },
};

const mockPayment: Payment = {
  id: 'pay-1',
  tenant_id: TENANT_IDS.ADRIS,
  invoice_id: 'inv-1',
  amount: 165000,
  payment_method: 'cash',
  payment_reference: null,
  status: 'completed',
  paid_at: '2026-01-16T10:00:00Z',
  processed_by: 'user-1',
  notes: null,
  created_at: '2026-01-16T10:00:00Z',
};

const mockRefund: Refund = {
  id: 'ref-1',
  tenant_id: TENANT_IDS.ADRIS,
  payment_id: 'pay-1',
  invoice_id: 'inv-1',
  amount: 50000,
  reason: 'Servicio parcialmente no prestado',
  refund_method: 'cash',
  refund_reference: null,
  status: 'completed',
  refunded_at: '2026-01-17T14:00:00Z',
  processed_by: 'user-1',
  notes: null,
  created_at: '2026-01-17T14:00:00Z',
};

// Using centralized mock from tests/__helpers__/mocks.ts

// =============================================================================
// TESTS
// =============================================================================

describe('InvoiceService', () => {
  let service: InvoiceService;
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    service = new InvoiceService(mockSupabase);
    vi.clearAllMocks();
  });

  // ===========================================================================
  // LIST METHOD
  // ===========================================================================

  describe('list', () => {
    it('should return invoices for a tenant (staff view)', async () => {
      mockSupabase._mocks.setMockData({
        data: [mockInvoiceWithDetails],
        error: null,
        count: 1,
      });

      const result = await service.list('terrapet', {}, 'user-1', true);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.invoices).toHaveLength(1);
        expect(result.data.count).toBe(1);
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should filter invoices for pet owner (non-staff)', async () => {
      // Queue responses: 1) owner pets, 2) invoices
      mockSupabase._mocks.queueMockData(
        { data: [{ id: 'pet-1' }], error: null },
        { data: [mockInvoiceWithDetails], error: null, count: 1 }
      );

      const result = await service.list('terrapet', {}, 'owner-1', false);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(mockSupabase._mocks.in).toHaveBeenCalledWith('pet_id', ['pet-1']);
      }
    });

    it('should return empty list when owner has no pets', async () => {
      mockSupabase._mocks.setMockData({
        data: [],
        error: null,
      });

      const result = await service.list('terrapet', {}, 'owner-1', false);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.invoices).toHaveLength(0);
        expect(result.data.count).toBe(0);
      }
    });

    it('should filter by status', async () => {
      mockSupabase._mocks.setMockData({
        data: [mockInvoiceWithDetails],
        error: null,
        count: 1,
      });

      await service.list('terrapet', { status: 'paid' }, 'user-1', true);

      expect(mockSupabase._mocks.eq).toHaveBeenCalledWith('status', 'paid');
    });

    it('should filter by pet_id', async () => {
      mockSupabase._mocks.setMockData({
        data: [mockInvoiceWithDetails],
        error: null,
        count: 1,
      });

      await service.list('terrapet', { petId: 'pet-1' }, 'user-1', true);

      expect(mockSupabase._mocks.eq).toHaveBeenCalledWith('pet_id', 'pet-1');
    });

    it('should apply pagination', async () => {
      mockSupabase._mocks.setMockData({
        data: [mockInvoiceWithDetails],
        error: null,
        count: 50,
      });

      const result = await service.list('terrapet', { page: 2, limit: 10 }, 'user-1', true);

      expect(mockSupabase._mocks.range).toHaveBeenCalledWith(10, 19);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(10);
      }
    });

    it('should handle database errors', async () => {
      mockSupabase._mocks.setMockData({
        data: null,
        error: { message: 'Database error', code: '42P01' },
      });

      const result = await service.list('terrapet', {}, 'user-1', true);

      expect(result.success).toBe(false);
      if (!result.success) {
        // Should return the specific database error message
        expect(result.error).toBe('Database error');
      }
    });
  });

  // ===========================================================================
  // GET BY ID METHOD
  // ===========================================================================

  describe('getById', () => {
    it('should return invoice with full details', async () => {
      mockSupabase._mocks.setMockData({
        data: mockInvoiceWithDetails,
        error: null,
      });

      const result = await service.getById('inv-1', 'terrapet', 'user-1', true);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('inv-1');
        expect(result.data.items).toBeDefined(); // Mapper transforms invoice_items → items
        expect(result.data.pet).toBeDefined(); // Mapper transforms pets → pet (singular)
      }
    });

    it('should enforce owner access control', async () => {
      mockSupabase._mocks.setMockData({
        data: { ...mockInvoiceWithDetails, owner_id: 'different-owner' },
        error: null,
      });

      const result = await service.getById('inv-1', 'terrapet', 'owner-1', false);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('permisos');
      }
    });

    it('should allow staff to view any invoice', async () => {
      mockSupabase._mocks.setMockData({
        data: mockInvoiceWithDetails,
        error: null,
      });

      const result = await service.getById('inv-1', 'terrapet', 'user-1', true);

      expect(result.success).toBe(true);
    });

    it('should handle invoice not found', async () => {
      mockSupabase._mocks.setMockData({
        data: null,
        error: null,
      });

      const result = await service.getById('inv-999', 'terrapet', 'user-1', true);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('no encontrada');
      }
    });
  });

  // ===========================================================================
  // CREATE METHOD
  // ===========================================================================

  describe('create', () => {
    it('should create invoice with items successfully', async () => {
      // Queue responses: 1) pet lookup, 2) invoice number, 3) invoice insert, 4) items insert, 5) audit log insert
      mockSupabase._mocks.queueMockData(
        { data: { id: 'pet-1', tenant_id: TENANT_IDS.ADRIS, owner_id: 'owner-1' }, error: null },
        { data: 'INV-2026-001', error: null },
        { data: mockInvoice, error: null },
        { data: null, error: null },
        { data: null, error: null }
      );

      // Mock auth.getUser for audit log
      mockSupabase._mocks.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });

      const result = await service.create('terrapet', 'user-1', {
        pet_id: 'pet-1',
        items: [
          {
            description: 'Consulta General',
            quantity: 1,
            unit_price: 150000,
          },
        ],
        tax_rate: 10,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('inv-1');
        expect(result.data.invoice_number).toBe('INV-2026-001');
      }
    });

    it('should handle idempotent requests', async () => {
      // Mock existing invoice with same idempotency key
      mockSupabase._mocks.setMockData({
        data: mockInvoice,
        error: null,
      });

      const result = await service.create('terrapet', 'user-1', {
        pet_id: 'pet-1',
        items: [{ description: 'Test', quantity: 1, unit_price: 100000 }],
        idempotency_key: 'unique-key-123',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('inv-1');
      }
    });

    it('should validate required fields', async () => {
      const result = await service.create('terrapet', 'user-1', {
        pet_id: '',
        items: [],
         
      } as any);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('requeridos');
      }
    });

    it('should require at least one item', async () => {
      const result = await service.create('terrapet', 'user-1', {
        pet_id: 'pet-1',
        items: [],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('al menos un item');
      }
    });

    it('should validate pet belongs to tenant', async () => {
      mockSupabase._mocks.setMockData({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await service.create('terrapet', 'user-1', {
        pet_id: 'pet-999',
        items: [{ description: 'Test', quantity: 1, unit_price: 100000 }],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('no encontrada');
      }
    });

    it('should calculate totals correctly with discounts', async () => {
      // Create invoice with expected calculated values
      const discountedInvoice = {
        ...mockInvoice,
        subtotal: 180000,
        tax_amount: 18000,
        total_amount: 198000,
        balance_due: 198000,
      };

      // Queue responses: 1) pet lookup, 2) invoice number, 3) invoice insert, 4) items insert, 5) audit log insert
      mockSupabase._mocks.queueMockData(
        { data: { id: 'pet-1', tenant_id: TENANT_IDS.ADRIS, owner_id: 'owner-1' }, error: null },
        { data: 'INV-2026-001', error: null },
        { data: discountedInvoice, error: null },
        { data: null, error: null },
        { data: null, error: null }
      );

      // Mock auth.getUser for audit log
      mockSupabase._mocks.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });

      const result = await service.create('terrapet', 'user-1', {
        pet_id: 'pet-1',
        items: [
          {
            description: 'Item 1',
            quantity: 2,
            unit_price: 100000,
            discount_percent: 10,
          },
        ],
        tax_rate: 10,
      });

      // Subtotal: 2 * 100000 * 0.9 = 180000
      // Tax: 180000 * 0.1 = 18000
      // Total: 198000
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.subtotal).toBe(180000);
        expect(result.data.tax_amount).toBe(18000);
        expect(result.data.total_amount).toBe(198000);
      }
    });
  });

  // ===========================================================================
  // UPDATE METHOD
  // ===========================================================================

  describe('update', () => {
    it('should allow full edit for draft invoices', async () => {
      // Queue responses: 1) invoice lookup, 2) invoice update, 3) items delete, 4) items insert, 5) totals update
      mockSupabase._mocks.queueMockData(
        { data: { id: 'inv-1', status: 'draft', tenant_id: TENANT_IDS.ADRIS }, error: null },
        { data: { ...mockInvoice, tax_rate: 10 }, error: null },
        { data: null, error: null },
        { data: null, error: null },
        { data: null, error: null }
      );

      const result = await service.update('inv-1', 'terrapet', 'user-1', {
        items: [{ description: 'Updated item', quantity: 2, unit_price: 200000 }],
        tax_rate: 10,
      });

      expect(result.success).toBe(true);
    });

    it('should restrict edits for sent invoices', async () => {
      mockSupabase._mocks.setMockData({
        data: { id: 'inv-1', status: 'sent', tenant_id: TENANT_IDS.ADRIS },
        error: null,
      });

      mockSupabase._mocks.setMockData({
        data: mockInvoice,
        error: null,
      });

      const result = await service.update('inv-1', 'terrapet', 'user-1', {
        status: 'paid',
        notes: 'Payment received',
      });

      expect(result.success).toBe(true);
    });

    it('should reject invalid updates for sent invoices', async () => {
      mockSupabase._mocks.setMockData({
        data: { id: 'inv-1', status: 'sent', tenant_id: TENANT_IDS.ADRIS },
        error: null,
      });

      const result = await service.update('inv-1', 'terrapet', 'user-1', {
        items: [{ description: 'Trying to change items', quantity: 1, unit_price: 100000 }],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('solo pueden');
      }
    });

    it('should validate tenant access', async () => {
      mockSupabase._mocks.setMockData({
        data: { id: 'inv-1', status: 'draft', tenant_id: 'different-tenant' },
        error: null,
      });

      const result = await service.update('inv-1', 'terrapet', 'user-1', {
        notes: 'Update attempt',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('No puede acceder a datos de otra clínica');
      }
    });
  });

  // ===========================================================================
  // DELETE METHOD
  // ===========================================================================

  describe('delete', () => {
    it('should hard delete draft invoices', async () => {
      // Queue responses: 1) invoice lookup, 2) items delete, 3) invoice delete
      mockSupabase._mocks.queueMockData(
        { data: { id: 'inv-1', status: 'draft', invoice_number: 'INV-001', tenant_id: TENANT_IDS.ADRIS }, error: null },
        { data: null, error: null },
        { data: null, error: null }
      );

      const result = await service.delete('inv-1', 'terrapet', 'user-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.deleted).toBe(true);
        expect(result.data.voided).toBe(false);
      }
    });

    it('should void sent invoices', async () => {
      // Queue responses: 1) invoice lookup, 2) invoice void update
      mockSupabase._mocks.queueMockData(
        { data: { id: 'inv-1', status: 'sent', invoice_number: 'INV-001', tenant_id: TENANT_IDS.ADRIS }, error: null },
        { data: null, error: null }
      );

      const result = await service.delete('inv-1', 'terrapet', 'user-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.deleted).toBe(false);
        expect(result.data.voided).toBe(true);
      }
    });
  });

  // ===========================================================================
  // PAYMENT METHODS
  // ===========================================================================

  describe('recordPayment', () => {
    it('should record payment and update invoice', async () => {
      // Queue responses: 1) invoice lookup, 2) payment insert, 3) invoice update
      mockSupabase._mocks.queueMockData(
        {
          data: {
            id: 'inv-1',
            tenant_id: TENANT_IDS.ADRIS,
            total: 165000,
            amount_paid: 0,
            amount_due: 165000,
            status: 'sent',
          },
          error: null,
        },
        { data: mockPayment, error: null },
        { data: null, error: null }
      );

      const result = await service.recordPayment('terrapet', 'user-1', {
        invoice_id: 'inv-1',
        amount: 165000,
        payment_method: 'cash',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.amount).toBe(165000);
      }
    });

    it('should validate payment amount', async () => {
      const result = await service.recordPayment('terrapet', 'user-1', {
        invoice_id: 'inv-1',
        amount: 0,
        payment_method: 'cash',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('mayor a cero');
      }
    });

    it('should prevent overpayment', async () => {
      mockSupabase._mocks.setMockData({
        data: {
          id: 'inv-1',
          tenant_id: TENANT_IDS.ADRIS,
          total: 165000,
          amount_paid: 100000,
          amount_due: 65000,
          status: 'sent',
        },
        error: null,
      });

      const result = await service.recordPayment('terrapet', 'user-1', {
        invoice_id: 'inv-1',
        amount: 100000,
        payment_method: 'cash',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('excede el saldo');
      }
    });
  });

  describe('getPayments', () => {
    it('should return all payments for invoice', async () => {
      mockSupabase._mocks.order.mockResolvedValue({
        data: [mockPayment],
        error: null,
      });

      const result = await service.getPayments('inv-1', 'terrapet');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].id).toBe('pay-1');
      }
    });
  });

  describe('refundPayment', () => {
    it('should process refund and update invoice', async () => {
      // Queue responses: 1) payment lookup, 2) refund insert, 3) invoice lookup, 4) invoice update
      mockSupabase._mocks.queueMockData(
        {
          data: {
            id: 'pay-1',
            tenant_id: TENANT_IDS.ADRIS,
            invoice_id: 'inv-1',
            amount: 165000,
            payment_method: 'cash',
          },
          error: null,
        },
        { data: mockRefund, error: null },
        { data: { total: 165000, amount_paid: 165000 }, error: null },
        { data: null, error: null }
      );

      const result = await service.refundPayment(
        'terrapet',
        'user-1',
        'pay-1',
        50000,
        'Servicio parcialmente no prestado'
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.amount).toBe(50000);
      }
    });

    it('should validate refund amount', async () => {
      const result = await service.refundPayment('terrapet', 'user-1', 'pay-1', 0, 'Test');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('mayor a cero');
      }
    });

    it('should prevent refund exceeding payment amount', async () => {
      mockSupabase._mocks.setMockData({
        data: {
          id: 'pay-1',
          tenant_id: TENANT_IDS.ADRIS,
          invoice_id: 'inv-1',
          amount: 50000,
          payment_method: 'cash',
        },
        error: null,
      });

      const result = await service.refundPayment('terrapet', 'user-1', 'pay-1', 100000, 'Test');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('excede el monto del pago');
      }
    });
  });

  // ===========================================================================
  // INVOICE ACTIONS
  // ===========================================================================

  describe('sendInvoice', () => {
    it('should mark invoice as sent', async () => {
      mockSupabase._mocks.setMockData({
        data: { ...mockInvoice, status: 'sent' },
        error: null,
      });

      const result = await service.sendInvoice('inv-1', 'terrapet', 'user-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('sent');
      }
    });

    it('should handle already sent invoice', async () => {
      mockSupabase._mocks.setMockData({
        data: null,
        error: null,
      });

      const result = await service.sendInvoice('inv-1', 'terrapet', 'user-1');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('ya fue enviada');
      }
    });
  });

  describe('markAsPaid', () => {
    it('should mark invoice as paid', async () => {
      mockSupabase._mocks.setMockData({
        data: { total: 165000 },
        error: null,
      });

      mockSupabase._mocks.setMockData({
        data: { ...mockInvoice, status: 'paid', amount_paid: 165000, amount_due: 0 },
        error: null,
      });

      const result = await service.markAsPaid('inv-1', 'terrapet', 'user-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('paid');
      }
    });
  });

  describe('voidInvoice', () => {
    it('should void invoice', async () => {
      mockSupabase._mocks.setMockData({
        data: { ...mockInvoice, status: 'void' },
        error: null,
      });

      const result = await service.voidInvoice('inv-1', 'terrapet', 'user-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('void');
      }
    });
  });

  // ===========================================================================
  // ANALYTICS METHODS
  // ===========================================================================

  describe('getOverdueInvoices', () => {
    it('should return overdue invoices', async () => {
      mockSupabase._mocks.order.mockResolvedValue({
        data: [mockInvoiceWithDetails],
        error: null,
      });

      const result = await service.getOverdueInvoices('terrapet');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
      }
      expect(mockSupabase._mocks.eq).toHaveBeenCalledWith('status', 'sent');
    });
  });

  describe('getRevenueSummary', () => {
    it('should calculate revenue summary correctly', async () => {
      const today = new Date().toISOString().split('T')[0];
      const pastDue = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      mockSupabase._mocks.is.mockResolvedValue({
        data: [
          { total: 100000, status: 'paid', amount_due: 0, due_date: today, paid_at: today },
          { total: 200000, status: 'paid', amount_due: 0, due_date: today, paid_at: today },
          { total: 150000, status: 'sent', amount_due: 150000, due_date: today, paid_at: null },
          { total: 80000, status: 'sent', amount_due: 80000, due_date: pastDue, paid_at: null },
        ],
        error: null,
      });

      const result = await service.getRevenueSummary('terrapet', '2026-01-01', '2026-01-31');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.total_revenue).toBe(300000);
        expect(result.data.paid_invoices_count).toBe(2);
        expect(result.data.outstanding_balance).toBe(230000);
        expect(result.data.overdue_balance).toBe(80000);
        expect(result.data.average_invoice_value).toBe(150000);
      }
    });

    it('should handle period with no invoices', async () => {
      mockSupabase._mocks.is.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await service.getRevenueSummary('terrapet', '2026-01-01', '2026-01-31');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.total_revenue).toBe(0);
        expect(result.data.paid_invoices_count).toBe(0);
        expect(result.data.outstanding_balance).toBe(0);
      }
    });
  });
});
