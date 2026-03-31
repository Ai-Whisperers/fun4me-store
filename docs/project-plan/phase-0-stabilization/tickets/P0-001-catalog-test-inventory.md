# P0-001: Catalog All Test Files

## Metadata

| Field | Value |
|-------|-------|
| **ID** | P0-001 |
| **Epic** | [EPIC-P0-01](../EPIC-P0-01-test-audit.md) |
| **Priority** | P0 - Critical |
| **Estimate** | 2 hours |
| **Status** | Not Started |
| **Assignee** | - |
| **Depends On** | None |
| **Blocks** | P0-002, P0-003 |

---

## Description

Create a comprehensive inventory of all test files in the codebase with metadata about each file's purpose, test count, and current health.

---

## Current State

- ~80 test files exist across multiple directories
- No central documentation of what tests cover
- Unknown which tests are critical path
- Mix of unit, integration, API, component, E2E tests

---

## Acceptance Criteria

- [ ] All test files under `web/tests/` are documented
- [ ] All E2E files under `web/e2e/` are documented
- [ ] Each file entry includes:
  - File path
  - Category (unit/integration/api/component/e2e)
  - Approximate test count
  - Last modified date
  - Brief description
  - Coverage contribution (if known)
- [ ] Output saved to `TEST_INVENTORY.md`

---

## Implementation Steps

1. **Scan test directories**
   ```bash
   find web/tests -name "*.test.ts" -o -name "*.test.tsx"
   find web/e2e -name "*.spec.ts"
   ```

2. **Extract metadata for each file**
   - Count `describe` and `it` blocks
   - Get git last modified date
   - Determine category from path

3. **Create markdown table**
   ```markdown
   | File | Category | Tests | Modified | Description |
   |------|----------|-------|----------|-------------|
   | tests/services/pet-service.test.ts | Unit | 45 | 2026-01-15 | Pet CRUD operations |
   ```

4. **Group by category** for easy navigation

5. **Add summary statistics**

---

## Output Template

```markdown
# Test Inventory

## Summary

| Category | Files | Tests | Coverage |
|----------|-------|-------|----------|
| Unit | X | Y | Z% |
| Integration | X | Y | Z% |
| API | X | Y | Z% |
| Component | X | Y | Z% |
| E2E | X | Y | - |

## Service Tests (Unit)

| File | Tests | Pass | Fail | Skip | Notes |
|------|-------|------|------|------|-------|
| pet-service.test.ts | 45 | 45 | 0 | 0 | ✅ Healthy |

## API Tests

...

## Component Tests

...
```

---

## Related Files

- `web/tests/` - Test directory
- `web/e2e/` - E2E tests
- `web/vitest.config.ts` - Test config

---

## Notes

This is foundational work. Quality of Phase 1 planning depends on accuracy here.

---

*Created: 2026-02-03*
