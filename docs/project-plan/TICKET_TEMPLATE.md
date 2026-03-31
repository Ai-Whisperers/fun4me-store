# Ticket Template

Use this template when creating new tickets.

---

```markdown
# [ID]: [Title]

## Metadata

| Field | Value |
|-------|-------|
| **ID** | [P0-XXX / P1-XXX / etc.] |
| **Epic** | [Link to epic] |
| **Priority** | P0-Critical / P1-High / P2-Medium / P3-Low |
| **Estimate** | X hours |
| **Status** | Not Started / In Progress / Complete |
| **Depends On** | [Ticket IDs or "None"] |
| **Blocks** | [Ticket IDs or "None"] |

---

## Description

[What needs to be done and why]

---

## Current State

[How it works/looks now - the problem]

---

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

---

## Implementation Steps

1. Step 1
2. Step 2
3. Step 3

---

## Test Cases

```typescript
describe('Feature', () => {
  it('does X', () => {});
  it('handles Y', () => {});
});
```

---

## Related Files

- `path/to/file1.ts`
- `path/to/file2.ts`

---

## Notes

[Any additional context, risks, or considerations]

---

*Created: YYYY-MM-DD*
```
