# TECH-013: Eliminate TypeScript `any` Types

**Category**: Technical Debt  
**Priority**: P2 - Medium  
**Status**: Open  
**Effort**: Ongoing (fix as you go)  
**Impact**: Medium - Type safety  
**Created**: 2025-01-19  
**Source**: critique/02-code-quality-roast.md (QUAL-005)

## Summary

30+ instances of `any` types exist, defeating TypeScript's purpose and hiding potential bugs.

## Problem

**Current pattern:**
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
catch (error: any) {
  console.error(error);
}
```

Every `any` is a lie to the compiler. Every `eslint-disable` is technical debt.

## Solution

### Create Proper Type Guards

```typescript
// lib/utils/errors.ts
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

export function hasMessage(error: unknown): error is { message: string } {
  return typeof error === 'object' && error !== null && 'message' in error;
}

// Usage
try {
  await riskyOperation();
} catch (error) {
  if (isError(error)) {
    logger.error('Operation failed', { message: error.message });
  } else if (hasMessage(error)) {
    logger.error('Operation failed', { message: error.message });
  } else {
    logger.error('Unknown error', { error });
  }
}
```

### Enable Strict TypeScript Rules

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### Add ESLint Rule

```json
// eslint.config.js
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error"
  }
}
```

## Implementation Strategy

**Fix as you go:**
1. Don't introduce new `any` types
2. When touching a file, fix existing `any` types
3. Track progress with `grep` count

## Acceptance Criteria
- [ ] ESLint rule `no-explicit-any` enabled
- [ ] Type guards created for common patterns
- [ ] `any` count reduced from 30+ to <5
- [ ] No new `any` types introduced

## Related
- TECH-009: Enable TypeScript checking in builds
- Code quality metrics tracking
