# TECH-008: Enable ESLint in Production Builds

**Category**: Technical Debt  
**Priority**: P1 - High  
**Status**: Open  
**Effort**: 4-6 hours (depends on current error count)  
**Impact**: High - Code quality enforcement  
**Created**: 2025-01-19  
**Source**: critique/10-dependencies-roast.md (DEP-004)

## Summary

ESLint is currently disabled in production builds (`ignoreDuringBuilds: true`), allowing code quality issues to slip into production.

## Problem

**Current configuration:**
```typescript
// next.config.ts
{
  eslint: {
    ignoreDuringBuilds: true  // ❌ Silently ignores lint errors
  }
}
```

**Impact:**
- Lint errors silently ignored in production
- Type safety bypassed
- Code quality degrades over time
- Issues discovered at runtime instead of build time

## Solution

### Step 1: Check Current Error Count
```bash
cd web
npm run lint
# Count errors/warnings
```

### Step 2: Fix All Lint Errors
- Use auto-fix where possible: `npm run lint -- --fix`
- Manually fix remaining issues
- Update ESLint configuration if rules are too strict

### Step 3: Enable Enforcement
```typescript
// next.config.ts
{
  eslint: {
    ignoreDuringBuilds: false  // ✅ Enforce lint rules
  }
}
```

### Step 4: Add Pre-commit Hook
Prevent future lint errors:
```json
// .husky/pre-commit
npm run lint
```

## Acceptance Criteria
- [ ] `npm run lint` returns 0 errors, 0 warnings
- [ ] `next.config.ts` has `ignoreDuringBuilds: false`
- [ ] Production build succeeds with lint enforcement
- [ ] Pre-commit hook blocks commits with lint errors

## Implementation Notes

Common issues to fix:
- Unused variables (`no-unused-vars`)
- Missing dependencies in useEffect (`react-hooks/exhaustive-deps`)
- Console statements in production code
- Missing key props in lists

## Related
- TECH-009: Enable TypeScript checking in builds
- TST-020: Add pre-commit hooks
