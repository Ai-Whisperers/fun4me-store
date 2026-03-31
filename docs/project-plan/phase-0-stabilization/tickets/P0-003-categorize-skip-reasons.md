# P0-003: Categorize Skipped Tests

## Metadata

| Field | Value |
|-------|-------|
| **ID** | P0-003 |
| **Epic** | [EPIC-P0-01](../EPIC-P0-01-test-audit.md) |
| **Priority** | P0 - Critical |
| **Estimate** | 2 hours |
| **Status** | Not Started |
| **Depends On** | P0-001 |
| **Blocks** | Phase 1 |

---

## Description

Document why each of the ~100 skipped tests is skipped. Each skip must have a justification and a plan to re-enable.

---

## Current State

- 100 tests currently skipped
- Unknown reasons for most skips
- Some may be obsolete, some may be blocking issues

---

## Acceptance Criteria

- [ ] Every `.skip()` and `.todo()` is documented
- [ ] Each skip has a categorization:
  - `FEATURE_REMOVED` - Test for deleted feature
  - `FLAKY` - Intermittent failures
  - `BLOCKED` - Waiting on dependency
  - `WIP` - Work in progress
  - `DEPRECATED` - Old approach, needs rewrite
- [ ] GitHub issue created for each non-removed skip
- [ ] Output saved to `SKIP_REASONS.md`

---

## Implementation Steps

1. **Find all skipped tests**
   ```bash
   grep -rn "\.skip\|\.todo\|it\.skip\|describe\.skip" tests/
   ```

2. **For each skip:**
   - Read surrounding code/comments
   - Check git blame for context
   - Categorize the reason
   - Create issue if needed

3. **Document in table**
   ```markdown
   | File | Test | Reason | Category | Issue |
   |------|------|--------|----------|-------|
   ```

---

## Output Template

```markdown
# Skipped Tests Analysis

## Summary
| Category | Count |
|----------|-------|
| FEATURE_REMOVED | X |
| FLAKY | X |
| BLOCKED | X |
| WIP | X |
| DEPRECATED | X |

## By Category

### FEATURE_REMOVED (can delete)
| File | Test | Notes |
|------|------|-------|

### FLAKY (need fix)
| File | Test | Issue |
|------|------|-------|

### BLOCKED (need unblock)
| File | Test | Blocker | Issue |
|------|------|---------|-------|
```

---

*Created: 2026-02-03*
