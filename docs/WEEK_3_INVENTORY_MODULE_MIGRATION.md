# Week 3 - Inventory Module Migration Ticket

**Created**: January 19, 2026  
**Priority**: P1 - HIGH  
**Effort**: 8-10 hours  
**Status**: Ready for implementation  
**Blocking**: E-commerce, warehouse operations

---

## Executive Summary

Migrate Inventory & Stock Management module from legacy service pattern (`lib/services/inventory-service.ts`) to domain-driven pattern (`lib/domain/inventory/`). Second highest priority migration after User module.

### Why This Module?
- **Business Critical**: Powers product sales, stock management, warehouse operations
- **Revenue Dependent**: Blocks checkout flow, purchase orders, receiving
- **High Complexity**: 588 lines, 11 public methods, transaction management
- **Data Integrity**: Stock tracking, reservations, cost calculations

---

## Current State Analysis

**File**: `web/lib/services/inventory-service.ts` (588 lines)  
**Pattern**: Monolithic service extending BaseService  

**Public Methods** (11 total):
1. `list(tenantId, filters)` - List inventory with filtering
2. `getByProduct(productId, tenantId)` - Get inventory for product
3. `create(data)` - Create inventory record
4. `update(productId, data, tenantId)` - Update inventory
5. `adjustStock(productId, tenantId, quantity, type, data)` - Adjust stock levels
6. `listTransactions(tenantId, filters)` - List transaction history
7. `getProductHistory(productId, tenantId)` - Get product's transaction history
8. `getLowStockItems(tenantId)` - Get items below reorder point
9. `getOutOfStockItems(tenantId)` - Get items with zero stock
10. `getExpiringSoon(tenantId)` - Get items expiring within 30 days
11. `getStats(tenantId)` - Get inventory statistics

**Key Features**:
- Stock level tracking
- Reserved quantity management
- Transaction history
- Low stock alerts
- Expiry date tracking
- Weighted average cost calculation
- Multi-location support (warehouse, store)
- Batch/lot tracking

---

## Target Architecture

```
web/lib/domain/inventory/
├── types.ts              # Types (Inventory, Transaction, TransactionType, etc.)
├── repository.ts         # Database queries (read operations)
├── service.ts            # Business logic (stock adjustments, reservations)
├── queries.ts            # Specialized queries (low stock, expiring, stats)
└── index.ts              # Public API exports
```

### Key Components

#### `types.ts` - Type Definitions
```typescript
export type TransactionType = 
  | 'purchase' | 'sale' | 'adjustment' | 'return' 
  | 'damage' | 'theft' | 'expired' | 'transfer';

export interface Inventory {
  id: string;
  product_id: string;
  tenant_id: string;
  stock_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  min_stock_level?: number | null;
  reorder_point?: number | null;
  weighted_average_cost?: number | null;
  location?: string | null;
  batch_number?: string | null;
  expiry_date?: string | null;
  // ... complete definition
}

export interface InventoryTransaction {
  id: string;
  tenant_id: string;
  product_id: string;
  type: TransactionType;
  quantity: number;
  unit_cost?: number | null;
  reference_type?: string | null;
  reference_id?: string | null;
  notes?: string | null;
  performed_by?: string | null;
  created_at: string;
}

export interface StockAdjustmentData {
  quantity: number;
  type: TransactionType;
  unit_cost?: number;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
  performed_by?: string;
}
```

#### `repository.ts` - Data Access Layer
```typescript
export class InventoryRepository {
  constructor(private supabase: SupabaseClient) {}

  // Read operations
  async findMany(tenantId: string, filters?: InventoryFilters): Promise<Inventory[]>
  async findByProduct(productId: string, tenantId: string): Promise<Inventory | null>
  async findLowStock(tenantId: string): Promise<Inventory[]>
  async findOutOfStock(tenantId: string): Promise<Inventory[]>
  async findExpiringSoon(tenantId: string, days: number): Promise<Inventory[]>
  
  // Transaction queries
  async findTransactions(tenantId: string, filters?: TransactionFilters): Promise<InventoryTransaction[]>
  async findProductTransactions(productId: string, tenantId: string): Promise<InventoryTransaction[]>
}
```

#### `service.ts` - Business Logic Layer
```typescript
export class InventoryService {
  constructor(
    private repository: InventoryRepository,
    private supabase: SupabaseClient
  ) {}

  // Write operations with business logic
  async create(data: CreateInventoryData): Promise<ServiceResult<Inventory>>
  async update(productId: string, data: UpdateInventoryData, tenantId: string): Promise<ServiceResult<Inventory>>
  
  // Stock management (CRITICAL)
  async adjustStock(
    productId: string,
    tenantId: string,
    quantity: number,
    type: TransactionType,
    data?: StockAdjustmentData
  ): Promise<ServiceResult<Inventory>>
  
  // Stock reservations (for cart/orders)
  async reserveStock(productId: string, quantity: number, tenantId: string): Promise<ServiceResult<void>>
  async releaseReservation(productId: string, quantity: number, tenantId: string): Promise<ServiceResult<void>>
  
  // Cost calculations
  async updateWeightedAverageCost(productId: string, tenantId: string): Promise<ServiceResult<void>>
}
```

#### `queries.ts` - Specialized Queries
```typescript
export async function getInventoryStats(tenantId: string, supabase: SupabaseClient): Promise<InventoryStats>
export async function getLowStockReport(tenantId: string, supabase: SupabaseClient): Promise<LowStockReport[]>
export async function getExpiryReport(tenantId: string, days: number, supabase: SupabaseClient): Promise<ExpiryReport[]>
export async function getStockValuation(tenantId: string, supabase: SupabaseClient): Promise<StockValuation>
export async function getTransactionSummary(tenantId: string, startDate: string, endDate: string, supabase: SupabaseClient): Promise<TransactionSummary>
```

---

## Migration Steps

### Phase 1: Foundation (3-4 hours)

1. **Create directory structure**
   ```bash
   mkdir -p web/lib/domain/inventory
   touch web/lib/domain/inventory/{types,repository,service,queries,index}.ts
   ```

2. **Extract types** (`types.ts`)
   - Copy all type definitions
   - Add missing types (filters, options, reports)

3. **Implement repository** (`repository.ts`)
   - Read-only database operations
   - No business logic, pure queries

4. **Implement service** (`service.ts`)
   - Stock adjustment logic
   - Transaction creation
   - Cost calculations
   - **CRITICAL**: Atomic stock updates (use database transactions)

5. **Implement queries** (`queries.ts`)
   - Low stock reports
   - Expiry reports
   - Statistics
   - Valuation calculations

6. **Create public API** (`index.ts`)
   - Export all types and classes

**Validation**: Types compile, repository queries work

---

### Phase 2: Migration (3-4 hours)

1. **Find all imports** (expected: 10+ files)
   ```bash
   grep -r "from.*inventory-service" web/ --include="*.ts" --include="*.tsx"
   ```

2. **Update imports file-by-file**
   - API routes (`/api/inventory/`, `/api/products/stock/`) - 5 files
   - Server actions (`/actions/inventory.ts`) - 2 files
   - Dashboard components (inventory management) - 3 files
   - Store/cart components (stock check) - 2 files

3. **Update tests**
   - Unit tests
   - Integration tests
   - Maintain 80%+ pass rate

---

### Phase 3: Cleanup (2 hours)

1. **Remove legacy code**
   ```bash
   rm web/lib/services/inventory-service.ts
   ```

2. **Full validation**
   - Test suite: 80%+ pass rate
   - TypeScript: 0 errors
   - Build: Success

3. **Create migration summary**

---

## Critical Business Logic

### Stock Adjustment (ATOMIC OPERATION)
```typescript
// Must be atomic - use database transaction
async adjustStock(
  productId: string,
  tenantId: string,
  quantity: number,
  type: TransactionType,
  data?: StockAdjustmentData
): Promise<ServiceResult<Inventory>> {
  try {
    // Start transaction
    const { data: inventory, error: invError } = await this.supabase.rpc(
      'adjust_stock_atomic',
      {
        p_product_id: productId,
        p_tenant_id: tenantId,
        p_quantity: quantity,
        p_transaction_type: type,
        p_unit_cost: data?.unit_cost,
        p_notes: data?.notes,
        p_performed_by: data?.performed_by
      }
    );
    
    if (invError) throw invError;
    return { success: true, data: inventory };
  } catch (error) {
    console.error('[InventoryService/adjustStock] Failed:', { productId, tenantId, quantity, type, error });
    return { success: false, error: 'Error al ajustar inventario' };
  }
}
```

**Why atomic?**: 
- Prevents race conditions (multiple simultaneous stock changes)
- Ensures transaction record + stock update happen together
- Maintains data consistency (no partial updates)

### Weighted Average Cost Calculation
```typescript
// Recalculate after purchases
async updateWeightedAverageCost(productId: string, tenantId: string): Promise<ServiceResult<void>> {
  const transactions = await this.repository.findProductTransactions(productId, tenantId);
  const purchases = transactions.filter(t => t.type === 'purchase' && t.unit_cost);
  
  if (purchases.length === 0) return { success: true, data: undefined };
  
  const totalCost = purchases.reduce((sum, t) => sum + (t.quantity * (t.unit_cost || 0)), 0);
  const totalQuantity = purchases.reduce((sum, t) => sum + t.quantity, 0);
  const weightedAverage = totalCost / totalQuantity;
  
  await this.supabase
    .from('inventory')
    .update({ weighted_average_cost: weightedAverage })
    .eq('product_id', productId)
    .eq('tenant_id', tenantId);
  
  return { success: true, data: undefined };
}
```

---

## Acceptance Criteria

### Must Have (Blocking)
- [ ] Domain types defined
- [ ] Repository with all read operations
- [ ] Service with atomic stock adjustments
- [ ] Specialized queries for reports
- [ ] All 11 methods migrated
- [ ] All imports updated (0 legacy imports)
- [ ] Legacy file deleted
- [ ] Tests passing at 80%+
- [ ] TypeScript 0 errors
- [ ] Build successful
- [ ] **Stock adjustments are atomic** (database transactions)
- [ ] **Cost calculations accurate**

### Should Have
- [ ] Unit tests for stock logic
- [ ] Integration tests for transactions
- [ ] Performance equivalent to legacy

### Nice to Have
- [ ] Migration guide
- [ ] Rollback plan
- [ ] Performance benchmarks

---

## Files to Create (5 files)

```
web/lib/domain/inventory/
├── types.ts              # 150-200 lines
├── repository.ts         # 200-250 lines
├── service.ts            # 250-300 lines
├── queries.ts            # 150-200 lines
└── index.ts              # 30-40 lines
```

**Total new code**: ~780-990 lines

---

## Files to Update (10+ files)

### API Routes (5 files)
- `web/app/api/inventory/route.ts`
- `web/app/api/inventory/[productId]/route.ts`
- `web/app/api/inventory/transactions/route.ts`
- `web/app/api/products/[id]/stock/route.ts`
- `web/app/api/inventory/low-stock/route.ts`

### Server Actions (2 files)
- `web/app/[clinic]/actions/inventory.ts`
- `web/app/[clinic]/actions/stock.ts`

### Components (3+ files)
- `web/components/dashboard/inventory-management.tsx`
- `web/components/store/stock-indicator.tsx`
- `web/components/admin/low-stock-alerts.tsx`

---

## Files to Delete (1 file)

```
web/lib/services/inventory-service.ts  # 588 lines
```

---

## Testing Strategy

**Unit Tests**:
- Stock adjustment logic
- Cost calculations
- Reservation management

**Integration Tests**:
- Purchase flow (stock in)
- Sale flow (stock out)
- Reservation flow (cart → order)
- Low stock alerts

**Critical Test**: Concurrent stock adjustments
```typescript
it('should handle concurrent stock adjustments atomically', async () => {
  // Simulate 10 simultaneous sales of same product
  const promises = Array(10).fill(null).map(() => 
    service.adjustStock(productId, 'adris', -1, 'sale')
  );
  
  await Promise.all(promises);
  
  // Final stock should be initial - 10 (not race condition)
  const inventory = await repository.findByProduct(productId, 'adris');
  expect(inventory.stock_quantity).toBe(100 - 10); // Correct
  // Not 92 or 95 (race condition)
})
```

---

## Security Considerations

1. **Tenant Isolation**: ALWAYS filter by `tenant_id`
2. **Atomic Updates**: Use database functions for stock changes
3. **Audit Trail**: Every transaction must have `performed_by`
4. **Negative Stock Prevention**: Database constraint `stock_quantity >= 0`
5. **Reserved Quantity Logic**: `available = stock - reserved`

---

## Rollback Plan

If migration introduces stock calculation errors or data corruption:

1. **Immediate rollback** from git
2. **Verify stock integrity** in database
3. **Fix any data inconsistencies** (manual reconciliation if needed)
4. **Deploy hotfix**
5. **Post-mortem and retry**

**CRITICAL**: Test thoroughly before deploying to production. Stock errors = revenue loss.

---

## Timeline

**Week 3 Day 2-3** (10 hours total)
- Day 2 Morning (4h): Phase 1 - Foundation
- Day 2 Afternoon (4h): Phase 2 - Migration
- Day 3 Morning (2h): Phase 3 - Cleanup & Testing

---

## Related Documentation

- [DOMAIN_MIGRATION_AUDIT.md](docs/archive/analysis/DOMAIN_MIGRATION_AUDIT.md)
- [WEEK_3_USER_MODULE_MIGRATION.md](WEEK_3_USER_MODULE_MIGRATION.md) - Similar pattern

---

**Status**: Ready for Implementation  
**Depends On**: User module migration complete  
**Next Steps**: Begin Phase 1 after User module is done
