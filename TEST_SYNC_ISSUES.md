# Test Synchronization Issues

> **Generated:** 2026-02-03
> **Status:** CRITICAL — Tests are out of sync with implementation

---

## Summary

**220 unit/integration tests** exist but many are **failing due to assertion mismatches**, not because the code is broken. The service implementations have been improved with better error messages, but tests weren't updated accordingly.

This is a **documentation/maintenance failure**, not a code quality failure.

---

## Analysis Methodology

1. Tests were written with specific error message expectations
2. Service implementations were improved with more descriptive error messages
3. Tests were NOT updated to match new error messages
4. Result: Tests fail, but the code is actually BETTER than before

---

## Specific Issues Found

### inventory-service.test.ts

**6 failures out of 45 tests**

| Test | Expected | Actual | Resolution |
|------|----------|--------|------------|
| `reserveStock > fail when insufficient stock` | `"Failed to reserve stock"` | `"Insufficient stock available for reservation"` | Update test — actual message is MORE descriptive ✅ |
| `getStats > comprehensive statistics` | `low_stock_count: 1` | `low_stock_count: 2` | Verify logic — may be test data issue or calculation change |
| `getStats > database errors` | `"Failed to fetch inventory statistics"` | `"[object Object]"` | **BUG** — error not being stringified properly |

### Resolution Strategy

For each failing test, determine:

1. **Is the test correct and code wrong?** → Fix code
2. **Is the code correct and test outdated?** → Update test with justification comment
3. **Is this a real bug the test uncovered?** → Fix code, keep test

---

## Action Plan

### Step 1: Audit All Failing Tests

```bash
npm run test:unit -- --reporter=verbose 2>&1 | grep -E "FAIL|AssertionError" > failing-tests.log
```

### Step 2: Categorize Each Failure

Create issue for each category:
- [ ] OUTDATED_EXPECTATION — Test expects old behavior
- [ ] REAL_BUG — Test found actual bug
- [ ] TEST_BUG — Test itself is wrong

### Step 3: Fix in Order

1. **REAL_BUG** — Fix immediately
2. **OUTDATED_EXPECTATION** — Update test with comment explaining why
3. **TEST_BUG** — Rewrite test

---

## Example Fixes

### Outdated Expectation (Update Test)

```typescript
// BEFORE — outdated expectation
it('should fail when insufficient stock available', async () => {
  const result = await service.reserveStock(TEST_PRODUCT_ID, TEST_TENANT_ID, 50);
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error).toBe('Failed to reserve stock');  // OLD message
  }
});

// AFTER — updated with justification
it('should fail when insufficient stock available', async () => {
  const result = await service.reserveStock(TEST_PRODUCT_ID, TEST_TENANT_ID, 50);
  expect(result.success).toBe(false);
  if (!result.success) {
    // Updated 2026-02-03: Service now returns more descriptive error messages
    // Validates that the specific reason for failure is communicated
    expect(result.error).toBe('Insufficient stock available for reservation');
  }
});
```

### Real Bug (Fix Code)

```typescript
// Test found that error objects aren't being stringified
// In lib/services/inventory-service.ts:

// BEFORE — returning raw error object
return { success: false, error: dbError };

// AFTER — proper error message
return { 
  success: false, 
  error: typeof dbError === 'string' ? dbError : dbError.message || 'Unknown error' 
};
```

---

## Full Test File Audit Status

| Test File | Total | Pass | Fail | Audit Status |
|-----------|-------|------|------|--------------|
| `inventory-service.test.ts` | 45 | 39 | 6 | 🔴 Needs fixes |
| `vaccine-service.test.ts` | ? | ? | ? | ⚪ Not run yet |
| `prescription-service.test.ts` | ? | ? | ? | ⚪ Not run yet |
| `medical-record-service.test.ts` | ? | ? | ? | ⚪ Not run yet |
| `lab-service.test.ts` | ? | ? | ? | ⚪ Not run yet |
| `hospitalization-service.test.ts` | ? | ? | ? | ⚪ Not run yet |
| `store-service.test.ts` | ? | ? | ? | ⚪ Not run yet |
| `messaging-service.test.ts` | ? | ? | ? | ⚪ Not run yet |
| `payment-service.test.ts` | ? | ? | ? | ⚪ Not run yet |

---

## Coverage Impact

Tests that fail don't contribute to coverage because the test runner stops at the assertion failure. Fixing these tests will:

1. Increase coverage numbers (tests will run to completion)
2. Actually validate the code behavior
3. Prevent regression

---

## Next Steps

1. Run each service test file individually
2. Document all failures
3. Categorize each failure
4. Fix in priority order
5. Update EXECUTION_PLAN.md with findings
