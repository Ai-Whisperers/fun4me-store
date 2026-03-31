# TST-012: Invoice & Payment Flow Integration Tests

## Summary

**Priority**: P1 - High
**Effort**: 8-10 hours
**Epic**: [EPIC-17](../epics/EPIC-17-comprehensive-test-coverage.md)
**Type**: Integration Testing
**Dependencies**: TST-006 (API Audit)

## Problem Statement

Invoicing and payment processing is business-critical with ~60% test coverage. Missing tests for:
- Complete invoice lifecycle
- Payment recording accuracy
- Refund processing
- Multi-payment invoices
- Commission calculations
- Tax calculations

## Flows to Test

### Flow 1: Invoice Creation to Payment (12 tests)

```
Create Draft → Add Items → Send → Record Payment → Mark Paid
```

| Step | Test | Validation |
|------|------|------------|
| 1 | Create draft invoice | Draft created, no number |
| 2 | Add service line item | Subtotal updated |
| 3 | Add product line item | Subtotal updated, stock decremented |
| 4 | Add custom line item | Subtotal updated |
| 5 | Apply discount | Discount calculated correctly |
| 6 | Calculate tax | Tax amount correct |
| 7 | Send invoice | Status sent, number assigned |
| 8 | Owner views invoice | Invoice visible in portal |
| 9 | Record partial payment | Balance updated |
| 10 | Record remaining payment | Status paid |
| 11 | Generate PDF | Valid PDF with all data |
| 12 | Send receipt email | Email sent with PDF |

### Flow 2: Refund Processing (8 tests)

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Full refund on paid invoice | Refund created, invoice voided |
| 2 | Partial refund | Balance adjusted |
| 3 | Refund exceeds amount | 400, validation error |
| 4 | Refund on unpaid invoice | 400, cannot refund |
| 5 | Refund with reason | Reason stored |
| 6 | Refund updates inventory | Stock restored if product |
| 7 | Refund notification | Owner notified |
| 8 | Audit log created | Refund logged |

### Flow 3: Multi-Payment Scenarios (6 tests)

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Split payment (cash + card) | Both payments recorded |
| 2 | Payment in installments | Partial status until complete |
| 3 | Overpayment handling | Credit created or refunded |
| 4 | Payment method tracking | Methods accurately recorded |
| 5 | Payment date tracking | Dates stored correctly |
| 6 | Currency handling | Amounts in correct currency |

### Flow 4: Subscription Billing (10 tests)

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Create subscription | Recurring invoice scheduled |
| 2 | Auto-charge success | Invoice paid, next scheduled |
| 3 | Auto-charge failure | Retry scheduled, owner notified |
| 4 | Grace period handling | Access during grace |
| 5 | Subscription cancellation | No future charges |
| 6 | Subscription upgrade | Prorated charge |
| 7 | Subscription downgrade | Credit applied |
| 8 | Subscription renewal | New period activated |
| 9 | Failed payment retry | 3 attempts, then suspend |
| 10 | Reactivation after payment | Access restored |

### Flow 5: Commission & Platform Fees (8 tests)

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Store sale commission | Platform fee calculated |
| 2 | Commission invoice generated | Monthly invoice created |
| 3 | Ambassador referral commission | Correct percentage applied |
| 4 | Tier-based commission rates | Rate matches tenant tier |
| 5 | Commission payout | Payout processed correctly |
| 6 | Commission audit trail | All calculations logged |
| 7 | Multi-tenant commission | Correct tenant attribution |
| 8 | Commission report accuracy | Report matches transactions |

### Flow 6: Tax Calculations (6 tests)

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Standard tax rate | Correct calculation |
| 2 | Exempt items | No tax applied |
| 3 | Mixed tax rates | Per-item calculation |
| 4 | Tax on discounted items | Tax on discounted amount |
| 5 | Tax report generation | Accurate summary |
| 6 | Tax by period | Correct date filtering |

## Test Implementation

### Invoice Lifecycle Test

```typescript
// tests/integration/invoicing/invoice-lifecycle.test.ts
describe('Invoice Lifecycle', () => {
  let invoice: Invoice;
  let owner: User;
  let service: Service;

  beforeEach(async () => {
    owner = await fixtures.createOwner();
    service = await fixtures.createService();
  });

  it('should complete full invoice lifecycle', async () => {
    // Create draft
    const createRes = await api.post('/api/invoices', {
      client_id: owner.id,
      tenant_id: testTenantId,
    });
    expect(createRes.status).toBe(201);
    invoice = createRes.data;
    expect(invoice.status).toBe('draft');

    // Add line item
    const itemRes = await api.post(`/api/invoices/${invoice.id}/items`, {
      item_type: 'service',
      service_id: service.id,
      quantity: 1,
      unit_price: service.base_price,
    });
    expect(itemRes.status).toBe(201);

    // Verify subtotal
    const getRes = await api.get(`/api/invoices/${invoice.id}`);
    expect(getRes.data.subtotal).toBe(service.base_price);

    // Send invoice
    const sendRes = await api.post(`/api/invoices/${invoice.id}/send`);
    expect(sendRes.status).toBe(200);
    expect(sendRes.data.status).toBe('sent');
    expect(sendRes.data.invoice_number).toBeTruthy();

    // Record payment
    const payRes = await api.post(`/api/invoices/${invoice.id}/payments`, {
      amount: invoice.total,
      payment_method: 'card',
    });
    expect(payRes.status).toBe(201);

    // Verify paid status
    const finalRes = await api.get(`/api/invoices/${invoice.id}`);
    expect(finalRes.data.status).toBe('paid');
  });
});
```

### Payment Accuracy Test

```typescript
describe('Payment Accuracy', () => {
  it('should handle multi-payment invoice correctly', async () => {
    const invoice = await fixtures.createSentInvoice({ total: 10000 });

    // First payment
    await api.post(`/api/invoices/${invoice.id}/payments`, {
      amount: 6000,
      payment_method: 'cash',
    });

    let res = await api.get(`/api/invoices/${invoice.id}`);
    expect(res.data.status).toBe('partial');
    expect(res.data.amount_paid).toBe(6000);
    expect(res.data.balance_due).toBe(4000);

    // Second payment
    await api.post(`/api/invoices/${invoice.id}/payments`, {
      amount: 4000,
      payment_method: 'card',
    });

    res = await api.get(`/api/invoices/${invoice.id}`);
    expect(res.data.status).toBe('paid');
    expect(res.data.amount_paid).toBe(10000);
    expect(res.data.balance_due).toBe(0);
  });
});
```

## Data Fixtures

```typescript
// tests/__fixtures__/invoicing.ts
export const invoiceFixtures = {
  async createDraftInvoice(overrides = {}) {
    return supabase.from('invoices').insert({
      tenant_id: testTenantId,
      status: 'draft',
      subtotal: 0,
      tax_amount: 0,
      total: 0,
      ...overrides,
    }).select().single();
  },

  async createSentInvoice(overrides = {}) {
    const invoice = await this.createDraftInvoice({
      status: 'sent',
      invoice_number: `INV-${Date.now()}`,
      subtotal: 10000,
      tax_amount: 1000,
      total: 11000,
      ...overrides,
    });
    return invoice;
  },

  async createPaidInvoice(overrides = {}) {
    const invoice = await this.createSentInvoice({
      status: 'paid',
      amount_paid: 11000,
      ...overrides,
    });
    await this.createPayment(invoice.id, invoice.total);
    return invoice;
  },
};
```

## Acceptance Criteria

- [ ] 50 invoice/payment tests implemented
- [ ] Complete lifecycle coverage
- [ ] Refund scenarios covered
- [ ] Commission calculations verified
- [ ] Tax calculations verified
- [ ] Subscription billing tested
- [ ] Multi-tenant isolation verified
- [ ] Audit logging verified

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Invoice with zero amount | Allow, mark as paid |
| Negative line items | Allow for credits |
| Payment on cancelled invoice | Reject |
| Currency mismatch | Reject or convert |
| Duplicate payment | Prevent or refund |

---

**Created**: 2026-01-12
**Status**: Not Started
