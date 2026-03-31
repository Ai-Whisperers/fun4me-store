# TECH-009: Enable TypeScript Checking in Builds

**Category**: Technical Debt  
**Priority**: P1 - High  
**Status**: Open  
**Effort**: 1-2 days  
**Impact**: High - Type safety enforcement  
**Created**: 2025-01-19  
**Source**: critique/10-dependencies-roast.md (DEP-005)

## Summary

TypeScript build errors are ignored (`ignoreBuildErrors: true`), defeating the purpose of using TypeScript.

## Problem

**Current configuration:**
```typescript
// next.config.ts
{
  typescript: {
    ignoreBuildErrors: true  // ❌ "Types are just suggestions"
  }
}
```

**Current error count:**
```bash
npx tsc --noEmit
# ERROR count: 47

# Errors in:
#   - db/seeds/scripts/orchestrator.ts
#   - db/seeds/scripts/seeders/*.ts
#   - db/seeds/scripts/utils/*.ts
```

**Impact:**
TypeScript exists to catch bugs at compile time. Ignoring type errors means shipping code that TypeScript explicitly warned about.

## Solution

### Step 1: Audit Current Type Errors
```bash
cd web
npx tsc --noEmit > typescript-errors.txt
# Review all 47 errors
```

### Step 2: Fix Type Errors by Category

**Common fixes:**
1. **Implicit any** - Add explicit types
2. **Null/undefined** - Add null checks or non-null assertions (!)
3. **Type mismatches** - Fix incorrect types or add type casts
4. **Missing properties** - Add required properties to interfaces

### Step 3: Enable Enforcement
```typescript
// next.config.ts
{
  typescript: {
    ignoreBuildErrors: false  // ✅ Enforce type safety
  }
}
```

### Step 4: Add Type-check Script
```json
// package.json
{
  "scripts": {
    "type-check": "tsc --noEmit"
  }
}
```

### Step 5: Add Pre-commit Hook
```bash
# .husky/pre-commit
npm run type-check
```

## Implementation Plan

### Phase 1: Fix Seeding Scripts (1 day)
- `db/seeds/scripts/orchestrator.ts`
- `db/seeds/scripts/seeders/*.ts`
- `db/seeds/scripts/utils/*.ts`

### Phase 2: Fix Remaining Errors (4-6 hours)
- Review and fix remaining ~20 errors
- Add proper type definitions

### Phase 3: Enable Enforcement (30 min)
- Update next.config.ts
- Test build
- Add pre-commit hook

## Acceptance Criteria
- [ ] `npx tsc --noEmit` returns 0 errors
- [ ] `next.config.ts` has `ignoreBuildErrors: false`
- [ ] Production build succeeds with type checking
- [ ] Pre-commit hook blocks commits with type errors
- [ ] All seeding scripts properly typed

## Type Error Categories

Based on the critique, common errors include:
1. Implicit `any` types (need explicit types)
2. Accessing potentially undefined properties
3. Type mismatches in function returns
4. Missing type imports

## Related
- TECH-008: Enable ESLint in builds
- TST-020: Add pre-commit hooks
- TECH-006: Create validated environment module
