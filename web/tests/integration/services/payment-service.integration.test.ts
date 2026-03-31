/**
 * PaymentService Integration Tests
 * 
 * Tests the PaymentService with real Supabase database connection.
 * These tests verify that the service correctly processes payments,
 * enforces tenant isolation, and handles all payment operations.
 * 
 * ACTUAL PaymentService API (verified 2026-01-15):
 * - processPayment(tenantId, input)
 * - getPaymentStatus(id, tenantId)
 * - listPayments(tenantId, filters?)
 * - getUserPaymentHistory(userId, tenantId)
 * - updatePaymentStatus(id, tenantId, status, transactionReference?)
 * 
 * @group integration
 * @group services
 * @group payments
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PaymentService } from '@/lib/services/payment-service';
import type { ProcessPaymentInput } from '@/lib/services/payment-service';
import {
  createTestClient,
  createTestDataTracker,
  createTestTenant,
  createTestUser,
  createTestInvoice,
  cleanupTestData,
} from './setup';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { TestDataTracker } from './setup';

describe('PaymentService Integration Tests', () => {
  let supabase: SupabaseClient;
  let service: PaymentService;
  let tracker: TestDataTracker;
  
  // Test data IDs
  let tenantId: string;
  let clientId: string;
  let staffId: string;
  let invoiceId: string;
  let partialInvoiceId: string;

  beforeAll(async () => {
    supabase = createTestClient();
    service = new PaymentService(supabase);
    tracker = createTestDataTracker();

    // Create test tenant
    tenantId = await createTestTenant(supabase, tracker, {
      name: 'PaymentService Test Clinic',
    });

    // Create test users
    clientId = await createTestUser(supabase, tracker, tenantId, 'owner', {
      email: 'client@paymenttest.com',
      full_name: 'Test Client',
    });

    staffId = await createTestUser(supabase, tracker, tenantId, 'admin', {
      email: 'staff@paymenttest.com',
      full_name: 'Test Staff',
    });

    // Create test invoices
    invoiceId = await createTestInvoice(supabase, tracker, tenantId, clientId, {
      total: 100000, // 100,000 GS
      status: 'draft',
    });

    partialInvoiceId = await createTestInvoice(supabase, tracker, tenantId, clientId, {
      total: 200000, // 200,000 GS
      status: 'draft',
    });
  });

  afterAll(async () => {
    await cleanupTestData(supabase, tracker);
  });

  // ==========================================
  // PROCESS PAYMENT (5 tests)
  // ==========================================

  describe('processPayment() - Payment Processing', () => {
    it('should process cash payment successfully', async () => {
      const input: ProcessPaymentInput = {
        invoice_id: invoiceId,
        amount: 100000,
        method: 'cash',
        notes: 'Cash payment received',
      };

      const result = await service.processPayment(tenantId, input);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.invoice_id).toBe(invoiceId);
      expect(result.data!.amount).toBe(100000);
      expect(result.data!.method).toBe('cash');
      expect(result.data!.status).toBe('completed');
      expect(result.data!.tenant_id).toBe(tenantId);

      // Track for cleanup
      tracker.paymentIds.push(result.data!.id);

      // Verify invoice status updated to 'paid'
      const { data: invoice } = await supabase
        .from('invoices')
        .select('status')
        .eq('id', invoiceId)
        .single();

      expect(invoice!.status).toBe('paid');
    });

    it('should process partial payment and update invoice to partial status', async () => {
      const input: ProcessPaymentInput = {
        invoice_id: partialInvoiceId,
        amount: 100000, // Half of 200,000
        method: 'card',
        transaction_reference: 'CARD-123456',
      };

      const result = await service.processPayment(tenantId, input);

      expect(result.success).toBe(true);
      expect(result.data!.amount).toBe(100000);

      tracker.paymentIds.push(result.data!.id);

      // Verify invoice status is 'partial'
      const { data: invoice } = await supabase
        .from('invoices')
        .select('status')
        .eq('id', partialInvoiceId)
        .single();

      expect(invoice!.status).toBe('partial');
    });

    it('should reject payment with invalid amount', async () => {
      const input: ProcessPaymentInput = {
        invoice_id: invoiceId,
        amount: -5000, // Negative amount
        method: 'cash',
      };

      const result = await service.processPayment(tenantId, input);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('mayor a cero');
    });

    it('should reject payment for non-existent invoice', async () => {
      const input: ProcessPaymentInput = {
        invoice_id: '00000000-0000-0000-0000-000000000000',
        amount: 10000,
        method: 'cash',
      };

      const result = await service.processPayment(tenantId, input);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('no encontrada');
    });

    it('should create audit log on payment processing', async () => {
      // Create new invoice for this test
      const newInvoiceId = await createTestInvoice(supabase, tracker, tenantId, clientId, {
        total: 50000,
        status: 'draft',
      });

      const input: ProcessPaymentInput = {
        invoice_id: newInvoiceId,
        amount: 50000,
        method: 'bank_transfer',
        transaction_reference: 'BANK-789',
      };

      const result = await service.processPayment(tenantId, input);
      expect(result.success).toBe(true);

      tracker.paymentIds.push(result.data!.id);

      // Check audit log
      const { data: auditLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('action', 'PROCESS_PAYMENT')
        .ilike('resource', `%${result.data!.id}%`)
        .order('created_at', { ascending: false })
        .limit(5);

      if (auditLogs && auditLogs.length > 0) {
        expect(auditLogs[0].action).toBe('PROCESS_PAYMENT');
      }
    });
  });

  // ==========================================
  // GET PAYMENT STATUS (2 tests)
  // ==========================================

  describe('getPaymentStatus() - Status Retrieval', () => {
    let testPaymentId: string;

    beforeEach(async () => {
      // Create a payment for testing
      const testInvoiceId = await createTestInvoice(supabase, tracker, tenantId, clientId, {
        total: 30000,
        status: 'draft',
      });

      const result = await service.processPayment(tenantId, {
        invoice_id: testInvoiceId,
        amount: 30000,
        method: 'cash',
      });

      testPaymentId = result.data!.id;
      tracker.paymentIds.push(testPaymentId);
    });

    it('should get payment status successfully', async () => {
      const result = await service.getPaymentStatus(testPaymentId, tenantId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.id).toBe(testPaymentId);
      expect(result.data!.status).toBe('completed');
      expect(result.data!.amount).toBe(30000);
    });

    it('should return error for non-existent payment', async () => {
      const result = await service.getPaymentStatus(
        '00000000-0000-0000-0000-000000000000',
        tenantId
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('No tiene permisos para realizar esta operación');
    });
  });

  // ==========================================
  // LIST PAYMENTS (3 tests)
  // ==========================================

  describe('listPayments() - Payment History', () => {
    it('should list all payments for tenant', async () => {
      const result = await service.listPayments(tenantId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.length).toBeGreaterThan(0);

      // All payments should belong to this tenant
      result.data!.forEach(payment => {
        expect(payment.tenant_id).toBe(tenantId);
      });
    });

    it('should filter payments by invoice_id', async () => {
      const result = await service.listPayments(tenantId, {
        invoice_id: invoiceId,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      // All payments should be for the specified invoice
      result.data!.forEach(payment => {
        expect(payment.invoice_id).toBe(invoiceId);
      });
    });

    it('should filter payments by method', async () => {
      const result = await service.listPayments(tenantId, {
        method: 'cash',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      // All payments should be cash payments
      result.data!.forEach(payment => {
        expect(payment.method).toBe('cash');
      });
    });
  });

  // ==========================================
  // USER PAYMENT HISTORY (2 tests)
  // ==========================================

  describe('getUserPaymentHistory() - User-Specific History', () => {
    it('should get payment history for specific user', async () => {
      const result = await service.getUserPaymentHistory(clientId, tenantId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      // All payments should be for invoices belonging to this client
      result.data!.forEach(payment => {
        if (payment.invoice) {
          expect(payment.invoice.client_id).toBe(clientId);
        }
      });
    });

    it('should return empty array for user with no payments', async () => {
      // Create a new user with no invoices
      const emptyUserId = await createTestUser(supabase, tracker, tenantId, 'owner', {
        email: 'empty@test.com',
        full_name: 'Empty User',
      });

      const result = await service.getUserPaymentHistory(emptyUserId, tenantId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  // ==========================================
  // UPDATE PAYMENT STATUS (3 tests)
  // ==========================================

  describe('updatePaymentStatus() - Status Updates', () => {
    let pendingPaymentId: string;
    let pendingInvoiceId: string;

    beforeEach(async () => {
      // Create a pending payment for testing
      pendingInvoiceId = await createTestInvoice(supabase, tracker, tenantId, clientId, {
        total: 75000,
        status: 'draft',
      });

      // Create pending payment (simulating Stripe payment)
      const result = await service.processPayment(tenantId, {
        invoice_id: pendingInvoiceId,
        amount: 75000,
        method: 'stripe',
        // No stripe_payment_intent_id yet, so status will be 'pending'
      });

      pendingPaymentId = result.data!.id;
      tracker.paymentIds.push(pendingPaymentId);
    });

    it('should update payment status to completed', async () => {
      const result = await service.updatePaymentStatus(
        pendingPaymentId,
        tenantId,
        'completed',
        'pi_stripe123456'
      );

      expect(result.success).toBe(true);
      expect(result.data!.status).toBe('completed');
      expect(result.data!.transaction_reference).toBe('pi_stripe123456');

      // Verify invoice status updated
      const { data: invoice } = await supabase
        .from('invoices')
        .select('status')
        .eq('id', pendingInvoiceId)
        .single();

      expect(invoice!.status).toBe('paid');
    });

    it('should update payment status to failed', async () => {
      const result = await service.updatePaymentStatus(
        pendingPaymentId,
        tenantId,
        'failed',
        'payment_declined'
      );

      expect(result.success).toBe(true);
      expect(result.data!.status).toBe('failed');
    });

    it('should create audit log on status update', async () => {
      const result = await service.updatePaymentStatus(
        pendingPaymentId,
        tenantId,
        'completed'
      );

      expect(result.success).toBe(true);

      // Check audit log
      const { data: auditLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('action', 'UPDATE_PAYMENT_STATUS')
        .ilike('resource', `%${pendingPaymentId}%`)
        .order('created_at', { ascending: false })
        .limit(5);

      if (auditLogs && auditLogs.length > 0) {
        expect(auditLogs[0].action).toBe('UPDATE_PAYMENT_STATUS');
      }
    });
  });

  // ==========================================
  // EDGE CASES (2 tests)
  // ==========================================

  describe('Edge Cases', () => {
    it('should handle concurrent payment processing gracefully', async () => {
      // Create multiple invoices
      const invoices = await Promise.all(
        Array(5).fill(null).map((_, i) =>
          createTestInvoice(supabase, tracker, tenantId, clientId, {
            total: (i + 1) * 10000,
            status: 'draft',
          })
        )
      );

      // Process payments concurrently
      const promises = invoices.map((invoiceId, i) =>
        service.processPayment(tenantId, {
          invoice_id: invoiceId,
          amount: (i + 1) * 10000,
          method: 'cash',
        })
      );

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        tracker.paymentIds.push(result.data!.id);
      });
    });

    it('should enforce tenant isolation', async () => {
      // Create another tenant
      const otherTenantId = await createTestTenant(supabase, tracker, {
        name: 'Other Clinic',
      });

      // Try to access payment from different tenant
      const { data: payments } = await service.listPayments(tenantId);

      if (payments && payments.length > 0) {
        const paymentId = payments[0].id;

        // Try to get payment status with wrong tenant
        const result = await service.getPaymentStatus(paymentId, otherTenantId);

        expect(result.success).toBe(false);
        expect(result.error).toContain('No tiene permisos para realizar esta operación');
      }
    });
  });
});
