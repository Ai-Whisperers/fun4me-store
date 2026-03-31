# Remaining Test Fixes

**Status**: 18/920 tests failing (98% pass rate)  
**Files**: `appointment-service.test.ts` (8 failures), `invoice-service.test.ts` (10 failures)

## Root Cause

Service tests that perform **multi-step database operations** are failing because mock responses are not properly queued for sequential queries.

### The Problem

When a service method performs multiple database operations:

1. SELECT to validate entity
2. RPC to get next ID
3. INSERT to create record
4. INSERT to create related records

Tests were calling `setMockData()` multiple times, but each call **overwrites** the previous one. Only the LAST `setMockData()` is effective.

```typescript
// ❌ WRONG: Each call overwrites the previous
mockSupabase._mocks.setMockData({ data: pet, error: null })
mockSupabase._mocks.setMockData({ data: invoiceNumber, error: null })
mockSupabase._mocks.setMockData({ data: invoice, error: null })
// Only the last one is used!
```

### The Solution

Use `queueMockData()` to provide responses for sequential operations:

```typescript
// ✅ CORRECT: Queue responses for multiple queries
mockSupabase._mocks.queueMockData(
  { data: pet, error: null }, // Query 1: Pet validation
  { data: 'INV-2026-001', error: null }, // Query 2: Next invoice number
  { data: invoice, error: null }, // Query 3: Invoice insert
  { data: null, error: null } // Query 4: Items insert
)
```

## Affected Tests

### invoice-service.test.ts (10 failures)

1. **list > should filter invoices for pet owner** ✅ FIXED (mock exposure issue)
2. **list > should handle database errors** - Needs proper error mock
3. **getById > should return invoice with full details** - Missing related data
4. **create > should create invoice with items successfully** - Needs queueMockData
5. **create > should calculate totals correctly with discounts** ✅ FIXED (example)
6. **update > should allow full edit for draft invoices** - Needs queueMockData
7. **delete > should hard delete draft invoices** - Needs queueMockData
8. **delete > should void sent invoices** - Needs queueMockData
9. **recordPayment > should record payment and update invoice** - Needs queueMockData
10. **refundPayment > should process refund and update invoice** - Needs queueMockData

### appointment-service.test.ts (8 failures)

Similar issues - all need `queueMockData` for multi-step operations.

## Fix Pattern

For each failing test:

1. **Identify all database queries** the service method performs
2. **Replace sequential setMockData calls** with one `queueMockData` call
3. **Provide responses in order** of query execution
4. **Update assertions** to check result.success and result.data

### Example Fix

**Before:**

```typescript
it('should create invoice', async () => {
  mockSupabase._mocks.setMockData({ data: pet, error: null })
  mockSupabase._mocks.setMockData({ data: 'INV-001', error: null })
  mockSupabase._mocks.setMockData({ data: invoice, error: null })

  const result = await service.create('terrapet', 'user-1', data)
  // Test would fail because only last setMockData is used
})
```

**After:**

```typescript
it('should create invoice', async () => {
  mockSupabase._mocks.queueMockData(
    { data: pet, error: null }, // Pet validation
    { data: 'INV-001', error: null }, // Invoice number
    { data: invoice, error: null }, // Invoice insert
    { data: null, error: null } // Items insert
  )

  const result = await service.create('terrapet', 'user-1', data)
  expect(result.success).toBe(true)
  if (result.success) {
    expect(result.data.invoice_number).toBe('INV-001')
  }
})
```

## Mock Improvements Made

### Added to `tests/__helpers__/mocks.ts`:

1. **Exposed query methods** in `_mocks`:
   - `in`, `not`, `or`, `filter`, `neq`, `gt`, `lt`, `gte`, `lte`, `like`, `contains`
2. **Added queue functionality**:
   - `queueMockData(...responses)` - Queue multiple responses
   - `clearQueue()` - Clear the queue (use in `beforeEach`)
3. **Auto-dequeue logic**: When a query resolves, it uses the next item from the queue

## Next Steps

1. Fix remaining 17 tests using the pattern above
2. Run tests to verify: `npm run test:unit`
3. Expected result: 920/920 passing (100%)

## Reference

- Working example: `invoice-service.test.ts` line 424 (calculate totals test)
- Successful pattern: `pet-service.test.ts` (uses direct mock methods)
- Mock helper: `tests/__helpers__/mocks.ts`
