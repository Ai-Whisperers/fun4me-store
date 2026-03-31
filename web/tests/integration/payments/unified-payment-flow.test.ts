/**
 * Unified Payment Flow Integration Test
 * 
 * Verifies the full integration between:
 * 1. Database (process_checkout RPC)
 * 2. Payment Service (Intent creation)
 * 3. Webhook Handling (Payment recording via RPC)
 * 
 * @group integration
 * @group payments
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient, createTestDataTracker, createTestTenant, createTestUser, createTestProduct, cleanupTestData } from '../services/setup';
import { PaymentService } from '@/lib/payments/service';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { TestDataTracker } from '../services/setup';

describe('Unified Payment Flow', () => {
  let supabase: SupabaseClient;
  let tracker: TestDataTracker;
  let paymentService: PaymentService;
  
  let tenantId: string;
  let userId: string;
  let productId: string;

  beforeAll(async () => {
    supabase = createTestClient();
    tracker = createTestDataTracker();
    paymentService = new PaymentService('mock'); // Use mock for integration test to avoid real Stripe calls

    tenantId = await createTestTenant(supabase, tracker);
    userId = await createTestUser(supabase, tracker, tenantId);
    productId = await createTestProduct(supabase, tracker, tenantId, {
      base_price: 150000,
      stock_quantity: 10,
    });
  });

  afterAll(async () => {
    await cleanupTestData(supabase, tracker);
  });

  it('should complete a full checkout and payment cycle', async () => {
    // 1. ATOMIC CHECKOUT
    // Simulate the call to process_checkout RPC
    const { data: checkoutData, error: checkoutError } = await supabase.rpc('process_checkout', {
      p_tenant_id: tenantId,
      p_user_id: userId,
      p_items: JSON.stringify([{
        id: productId,
        name: 'Test Product',
        price: 150000,
        quantity: 1,
        type: 'product',
      }]),
      p_notes: 'Integration Test Order',
    });

    expect(checkoutError).toBeNull();
    const checkoutResult = checkoutData as any;
    expect(checkoutResult.success).toBe(true);
    const invoiceId = checkoutResult.invoice.id;
    tracker.invoiceIds.push(invoiceId);

    // 2. CREATE PAYMENT INTENT
    const intentResult = await paymentService.createPaymentIntent({
      amount: 150000,
      currency: 'PYG',
      invoiceId: invoiceId,
      tenantId: tenantId,
      metadata: { order_type: 'store' }
    });

    expect(intentResult.success).toBe(true);
    expect(intentResult.data?.id).toContain('mock_pi_');

    // 3. SIMULATE WEBHOOK (RECORD PAYMENT)
    // Directly call the RPC that the webhook uses to verify it works with the generated invoice
    const { data: recordData, error: recordError } = await supabase.rpc('record_invoice_payment', {
      p_invoice_id: invoiceId,
      p_tenant_id: tenantId,
      p_amount: 150000,
      p_payment_method: 'stripe',
      p_reference_number: intentResult.data?.id,
      p_notes: 'Simulated Webhook Payment',
    });

    expect(recordError).toBeNull();
    const recordResult = recordData as any;
    expect(recordResult.success).toBe(true);
    tracker.paymentIds.push(recordResult.payment_id);

    // 4. VERIFY FINAL STATE
    const { data: invoice } = await supabase
      .from('invoices')
      .select('status, amount_paid, balance_due')
      .eq('id', invoiceId)
      .single();

    expect(invoice?.status).toBe('paid');
    expect(Number(invoice?.amount_paid)).toBe(150000);
    expect(Number(invoice?.balance_due)).toBe(0);
  });
});
