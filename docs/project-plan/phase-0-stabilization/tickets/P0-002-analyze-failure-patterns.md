# P0-002: Analyze Failure Patterns

## Metadata

| Field | Value |
|-------|-------|
| **ID** | P0-002 |
| **Epic** | [EPIC-P0-01](../EPIC-P0-01-test-audit.md) |
| **Priority** | P0 - Critical |
| **Estimate** | 4 hours |
| **Status** | Not Started |
| **Assignee** | - |
| **Depends On** | P0-001 |
| **Blocks** | P0-004, P0-005, Phase 1 |

---

## Description

Analyze all 508 failing tests to identify root cause patterns. Group failures by cause to enable batch fixes rather than individual debugging.

---

## Current State

- 508 tests failing (26.1% failure rate)
- Unknown root causes
- Some failures may share common issues (mock problems, schema changes, etc.)

---

## Expected Failure Categories

Based on initial analysis, expect these categories:

### 1. Mock Issues (~40%)
- Supabase mock not returning expected format
- Chainable query mock incomplete
- Missing mock implementations

### 2. Schema Drift (~25%)
- Test expects old field names
- Missing new required fields
- Type mismatches

### 3. Async Issues (~15%)
- Missing `await`
- Timeout issues
- Race conditions in tests

### 4. Environment Issues (~10%)
- Missing env vars in test
- Wrong test setup/teardown

### 5. Actual Bugs (~10%)
- Real code issues caught by tests

---

## Acceptance Criteria

- [ ] Every failing test is categorized by root cause
- [ ] Categories are specific enough to guide fixes
- [ ] Similar failures are grouped for batch fixing
- [ ] Priority assigned based on:
  - Impact (how many tests blocked)
  - Effort (how hard to fix)
  - Risk (does failure indicate real bug?)
- [ ] Output saved to `FAILURE_ANALYSIS.md`

---

## Implementation Steps

1. **Run tests with verbose output**
   ```bash
   npm test -- --reporter=verbose 2>&1 | tee test-failures.log
   ```

2. **Parse failure messages**
   - Extract error type
   - Extract expected vs received
   - Identify common patterns

3. **Categorize each failure**
   ```markdown
   | Test | File | Error Type | Category | Notes |
   |------|------|------------|----------|-------|
   | should return pets | pet-service | TypeError | Mock | `.from` not mocked |
   ```

4. **Group by root cause**
   - Mock: which mock needs fixing?
   - Schema: which fields changed?
   - Async: what timing issue?

5. **Prioritize fixes**
   - Fix with highest unblock count first
   - Group similar fixes together

---

## Output Template

```markdown
# Failure Analysis

## Summary

| Category | Count | % | Fix Strategy |
|----------|-------|---|--------------|
| Mock Issues | 203 | 40% | P0-007: Standardize mocks |
| Schema Drift | 127 | 25% | Update test expectations |
| Async Issues | 76 | 15% | Add proper async handling |
| Environment | 51 | 10% | Fix test setup |
| Real Bugs | 51 | 10% | Fix production code |

## Mock Issues (203 failures)

### Supabase `from()` not chainable (89 failures)

**Files affected:**
- pet-service.test.ts (23)
- appointment-service.test.ts (18)
- ...

**Root cause:** Mock returns object instead of chainable

**Fix:** Update mock to use `createChainableQueryMock()`

### Missing RPC mock (45 failures)

...

## Schema Drift (127 failures)

### `clinic_id` → `tenant_id` rename (52 failures)

**Files affected:** ...
**Fix:** Update test data to use `tenant_id`

...
```

---

## Related Files

- `web/tests/services/__mocks__/supabase-mock.ts`
- `TEST_SYNC_ISSUES.md` - Initial analysis

---

## Notes

This analysis directly drives Phase 1 planning. Accurate categorization = efficient fixes.

---

*Created: 2026-02-03*
