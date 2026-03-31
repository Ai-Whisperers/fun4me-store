# TECH-015: Remove Commented-Out Code and TODOs

**Category**: Technical Debt  
**Priority**: P3 - Low  
**Status**: Open  
**Effort**: 1 day  
**Impact**: Low - Code cleanliness  
**Created**: 2025-01-19  
**Source**: critique/02-code-quality-roast.md (QUAL-009)

## Summary

Commented-out code and TODO/FIXME comments clutter the codebase.

## Problem

```typescript
// TODO: implement this later
// const oldImplementation = () => {
//   // 50 lines of dead code
// }

// FIXME: this is broken but we'll fix it later
// (narrator: they did not fix it later)
```

## Solution

**Delete it.** Git remembers everything.

### Find Commented Code

```bash
# Find all TODOs/FIXMEs
grep -r "// TODO\|// FIXME\|// HACK" --include="*.ts" --include="*.tsx"

# Find large commented blocks
# (manual review needed)
```

### Process for TODOs

For each TODO:
1. If it's actionable → Create a ticket
2. If it's done → Delete it
3. If it's not happening → Delete it

### Process for Commented Code

1. Check git history to understand why it was commented
2. If needed for reference → It's in git history
3. Delete it

## Implementation Plan

1. Audit all TODOs/FIXMEs/HACKs
2. Convert actionable items to tickets
3. Delete dead code
4. Add ESLint rule to prevent new ones (optional)

## Acceptance Criteria
- [ ] No commented-out code blocks
- [ ] All TODOs either resolved or converted to tickets
- [ ] Codebase is clean and focused

## Related
- Code organization improvements
- Technical debt tracking
