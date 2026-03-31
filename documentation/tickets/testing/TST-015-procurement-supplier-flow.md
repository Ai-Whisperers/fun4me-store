# TST-015: Procurement & Supplier Flow Tests

## Summary

**Priority**: P1 - High
**Effort**: 6-8 hours
**Epic**: [EPIC-17](../epics/EPIC-17-comprehensive-test-coverage.md)
**Type**: Integration Testing
**Dependencies**: TST-006 (API Audit)

## Problem Statement

The procurement module is newly added with minimal test coverage. Critical flows for:
- Supplier management
- Purchase order lifecycle
- Inventory receiving
- Price comparison
- Reorder automation

## Flows to Test

### Flow 1: Supplier Management (8 tests)

```
Add Supplier → Verify → Add Products → Compare Prices
```

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Create new supplier | Supplier created |
| 2 | Create duplicate supplier | 409, already exists |
| 3 | Update supplier contact | Contact updated |
| 4 | Verify supplier | Verification status updated |
| 5 | Add supplier product catalog | Products linked |
| 6 | Update product pricing | Price history tracked |
| 7 | Deactivate supplier | Supplier inactive |
| 8 | View supplier history | Order history shown |

### Flow 2: Purchase Order Lifecycle (12 tests)

```
Create Draft → Add Items → Submit → Approve → Receive → Close
```

| Step | Test | Validation |
|------|------|------------|
| 1 | Create draft PO | PO created, status draft |
| 2 | Add line items | Items added with pricing |
| 3 | Calculate totals | Subtotal, tax, total correct |
| 4 | Submit for approval | Status pending_approval |
| 5 | Reject with reason | Status rejected, reason stored |
| 6 | Resubmit after changes | Status pending again |
| 7 | Approve PO | Status approved |
| 8 | Send to supplier | Email/notification sent |
| 9 | Partial receive | Status partial_received |
| 10 | Complete receive | Status received |
| 11 | Close PO | Status closed |
| 12 | Cancel approved PO | Status cancelled, reason |

### Flow 3: Inventory Receiving (10 tests)

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Receive full order | Stock incremented |
| 2 | Receive partial order | Partial status, backorder |
| 3 | Receive with variance | Variance logged |
| 4 | WAC recalculation | Weighted average updated |
| 5 | Receive damaged goods | Reject quantity noted |
| 6 | Update expiry dates | Expiry tracked per batch |
| 7 | Generate receiving report | PDF with details |
| 8 | Receive without PO | Direct receiving allowed |
| 9 | Barcode scanning | Quick item lookup |
| 10 | Receive to multiple locations | Location tracking |

### Flow 4: Price Comparison (6 tests)

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Compare prices across suppliers | Comparison table |
| 2 | Include shipping costs | Total cost calculation |
| 3 | Historical price trends | Chart data |
| 4 | Best price recommendation | Suggested supplier |
| 5 | Bulk discount calculation | Tier pricing |
| 6 | Lead time consideration | Delivery factor |

### Flow 5: Reorder Automation (8 tests)

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Stock below reorder point | Suggestion generated |
| 2 | Generate reorder suggestions | Grouped by supplier |
| 3 | Convert suggestion to PO | PO created from suggestion |
| 4 | Dismiss suggestion | Marked dismissed |
| 5 | Auto-create PO (if enabled) | PO created automatically |
| 6 | Economic order quantity | EOQ calculation |
| 7 | Safety stock calculation | Buffer included |
| 8 | Seasonal adjustment | Demand forecasting |

### Flow 6: Procurement Reporting (6 tests)

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Spending by supplier | Accurate breakdown |
| 2 | Spending by category | Category totals |
| 3 | Order history export | CSV/Excel download |
| 4 | Lead time analysis | Average by supplier |
| 5 | Price variance report | Budget vs actual |
| 6 | Supplier performance | Delivery accuracy |

## Test Implementation

### Purchase Order Lifecycle Test

```typescript
// tests/integration/procurement/purchase-order.test.ts
describe('Purchase Order Lifecycle', () => {
  let supplier: Supplier;
  let product: SupplierProduct;
  let approver: User;

  beforeEach(async () => {
    supplier = await fixtures.createVerifiedSupplier();
    product = await fixtures.createSupplierProduct(supplier.id);
    approver = await fixtures.createAdmin();
  });

  it('should complete full PO lifecycle', async () => {
    // Create draft PO
    const createRes = await api.post('/api/procurement/orders', {
      supplier_id: supplier.id,
      tenant_id: testTenantId,
    });
    expect(createRes.status).toBe(201);
    const po = createRes.data;
    expect(po.status).toBe('draft');

    // Add line item
    const itemRes = await api.post(`/api/procurement/orders/${po.id}/items`, {
      product_id: product.id,
      quantity: 100,
      unit_cost: product.unit_cost,
    });
    expect(itemRes.status).toBe(201);

    // Verify totals
    let getRes = await api.get(`/api/procurement/orders/${po.id}`);
    expect(getRes.data.total).toBe(product.unit_cost * 100);

    // Submit for approval
    const submitRes = await api.post(`/api/procurement/orders/${po.id}/submit`);
    expect(submitRes.data.status).toBe('pending_approval');

    // Approve
    const approveRes = await api.post(
      `/api/procurement/orders/${po.id}/approve`,
      { approved_by: approver.id }
    );
    expect(approveRes.data.status).toBe('approved');

    // Receive items
    const receiveRes = await api.post(`/api/procurement/orders/${po.id}/receive`, {
      items: [
        { item_id: itemRes.data.id, quantity_received: 100 },
      ],
    });
    expect(receiveRes.data.status).toBe('received');

    // Verify inventory updated
    const inventoryRes = await api.get(
      `/api/inventory/${product.internal_product_id}`
    );
    expect(inventoryRes.data.stock_quantity).toBeGreaterThanOrEqual(100);
  });
});
```

### WAC Calculation Test

```typescript
describe('Weighted Average Cost', () => {
  let product: StoreProduct;

  beforeEach(async () => {
    product = await fixtures.createProduct({
      stock_quantity: 100,
      weighted_average_cost: 1000, // ₲1,000 per unit
    });
  });

  it('should recalculate WAC on receiving', async () => {
    // Current: 100 units @ ₲1,000 = ₲100,000 total value
    // Receiving: 50 units @ ₲1,200 = ₲60,000
    // New WAC: (100,000 + 60,000) / 150 = ₲1,066.67

    const po = await fixtures.createApprovedPO(product.id, {
      quantity: 50,
      unit_cost: 1200,
    });

    await api.post(`/api/procurement/orders/${po.id}/receive`, {
      items: [{ item_id: po.items[0].id, quantity_received: 50 }],
    });

    const inventoryRes = await api.get(`/api/inventory/${product.id}`);
    expect(inventoryRes.data.stock_quantity).toBe(150);
    expect(inventoryRes.data.weighted_average_cost).toBeCloseTo(1066.67, 0);
  });
});
```

### Reorder Suggestions Test

```typescript
describe('Reorder Suggestions', () => {
  it('should generate suggestions for low stock items', async () => {
    // Create products below reorder point
    const lowStock = await fixtures.createProduct({
      stock_quantity: 5,
      reorder_point: 10,
    });

    const supplier = await fixtures.createSupplierWithProduct(lowStock.id);

    // Generate suggestions
    const suggestRes = await api.get('/api/procurement/suggestions');
    expect(suggestRes.data).toContainEqual(
      expect.objectContaining({
        product_id: lowStock.id,
        current_stock: 5,
        reorder_point: 10,
        suggested_quantity: expect.any(Number),
        preferred_supplier_id: supplier.id,
      })
    );
  });

  it('should group suggestions by supplier', async () => {
    // Create multiple low-stock items from same supplier
    const supplier = await fixtures.createVerifiedSupplier();
    await fixtures.createLowStockProduct({ supplier_id: supplier.id });
    await fixtures.createLowStockProduct({ supplier_id: supplier.id });

    const groupedRes = await api.get('/api/procurement/suggestions/grouped');
    const supplierGroup = groupedRes.data.find(
      g => g.supplier_id === supplier.id
    );
    expect(supplierGroup.items).toHaveLength(2);
    expect(supplierGroup.total_value).toBeGreaterThan(0);
  });
});
```

## Data Fixtures

```typescript
// tests/__fixtures__/procurement.ts
export const procurementFixtures = {
  async createVerifiedSupplier(overrides = {}) {
    return supabase.from('suppliers').insert({
      tenant_id: testTenantId,
      name: `Supplier-${Date.now()}`,
      contact_info: {
        email: 'supplier@test.com',
        phone: '+595981234567',
      },
      is_verified: true,
      ...overrides,
    }).select().single();
  },

  async createSupplierProduct(supplierId: string, overrides = {}) {
    return supabase.from('supplier_products').insert({
      supplier_id: supplierId,
      product_name: 'Test Product',
      unit_cost: 5000,
      lead_time_days: 3,
      minimum_order: 10,
      ...overrides,
    }).select().single();
  },

  async createApprovedPO(productId: string, { quantity, unit_cost }) {
    const supplier = await this.createVerifiedSupplier();
    const po = await supabase.from('procurement_orders').insert({
      tenant_id: testTenantId,
      supplier_id: supplier.id,
      status: 'approved',
      total: quantity * unit_cost,
    }).select().single();

    const item = await supabase.from('procurement_order_items').insert({
      order_id: po.id,
      product_id: productId,
      quantity,
      unit_cost,
    }).select().single();

    return { ...po, items: [item] };
  },
};
```

## Acceptance Criteria

- [ ] 50 procurement tests implemented
- [ ] Supplier CRUD coverage >= 90%
- [ ] PO lifecycle coverage >= 95%
- [ ] Receiving workflow coverage >= 90%
- [ ] WAC calculations verified
- [ ] Reorder automation tested
- [ ] Multi-tenant isolation verified

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Receive more than ordered | Allow with variance log |
| Negative unit cost | Validation error |
| Supplier without products | Cannot create PO |
| Duplicate PO number | Auto-increment |
| Cancel after partial receive | Partial status kept |

---

**Created**: 2026-01-12
**Status**: Not Started
