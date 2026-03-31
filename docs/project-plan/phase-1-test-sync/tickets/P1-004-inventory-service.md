# P1-004: Fix Inventory Service Tests

## Metadata

| Field | Value |
|-------|-------|
| **ID** | P1-004 |
| **Epic** | [EPIC-P1-01](../EPIC-P1-01-service-mocks.md) |
| **Priority** | P0 - Critical |
| **Estimate** | 4 hours |
| **Status** | Not Started |
| **Depends On** | Phase 0 Complete |
| **Blocks** | P1-011 (store-service), P2-005 |

---

## Description

Fix all failing tests in `inventory-service.test.ts`. This service manages product catalog, stock levels, and inventory movements.

---

## Current State

- **Failing Tests:** ~40
- **Test File:** `tests/services/inventory-service.test.ts`
- **Coverage:** 0% (all tests failing)

---

## Expected Functionality

```typescript
interface InventoryService {
  // Products
  listProducts(tenantId: string, filters?: ProductFilters): Promise<Result<Product[]>>;
  getProduct(productId: string, tenantId: string): Promise<Result<Product>>;
  createProduct(tenantId: string, data: ProductInput): Promise<Result<Product>>;
  updateProduct(productId: string, tenantId: string, updates: Partial<Product>): Promise<Result<Product>>;
  
  // Stock
  getStock(productId: string, tenantId: string): Promise<Result<number>>;
  adjustStock(productId: string, tenantId: string, adjustment: StockAdjustment): Promise<Result<StockMovement>>;
  
  // Alerts
  getLowStockItems(tenantId: string): Promise<Result<LowStockItem[]>>;
  
  // Movements
  getStockMovements(productId: string, tenantId: string): Promise<Result<StockMovement[]>>;
}
```

---

## Acceptance Criteria

- [ ] All tests in `inventory-service.test.ts` pass
- [ ] Product CRUD operations tested
- [ ] Stock adjustment operations tested
- [ ] Low stock alerts tested
- [ ] Tenant isolation verified

---

## Implementation Steps

1. **Analyze current test structure**
   ```bash
   npm test -- inventory-service.test.ts --reporter=verbose
   ```

2. **Update mock data**
   - Product mock data
   - Stock level mocks
   - Movement history mocks

3. **Fix query mocks**
   - Products table queries
   - Stock levels queries
   - Movements table queries

4. **Test scenarios:**
   - List products (with filters, pagination)
   - Get product by ID
   - Create product (validation)
   - Update product (partial updates)
   - Adjust stock (increase, decrease, negative check)
   - Low stock alerts (threshold logic)

---

## Related Files

- `web/tests/services/inventory-service.test.ts`
- `web/lib/services/inventory-service.ts`

---

*Created: 2026-02-03*
