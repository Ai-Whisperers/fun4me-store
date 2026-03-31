# TECH-014: Remove Console Statements from Production Code

**Category**: Technical Debt  
**Priority**: P2 - Medium  
**Status**: Open  
**Effort**: 1 day  
**Impact**: Medium - Code cleanliness  
**Created**: 2025-01-19  
**Source**: critique/02-code-quality-roast.md (QUAL-006)

## Summary

20+ `console.log` statements exist in production code. Should use proper logging instead.

## Problem

```typescript
// Found throughout production code
console.log('DEBUG: user data', user);
console.log('appointment created:', data);
console.warn('TODO: implement this');
```

Production code should never have `console.log`.

## Solution

### Use Existing Logger

```typescript
// You already have lib/logger.ts!
import { logger } from '@/lib/logger';

// Instead of console.log
logger.debug('User data', { userId: user.id });
logger.info('Appointment created', { appointmentId: data.id });
logger.warn('Feature not implemented', { feature: 'something' });
```

### Configure Logger

```typescript
// lib/logger.ts
const logger = {
  debug: (...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(...args);
    }
  },
  info: (...args) => console.info(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};
```

### Add ESLint Rule

```json
// eslint.config.js
{
  "rules": {
    "no-console": ["error", { "allow": ["warn", "error"] }]
  }
}
```

## Implementation Plan

1. Find all console statements: `grep -r "console.log\|console.debug" --include="*.ts" --include="*.tsx"`
2. Replace with logger calls
3. Add ESLint rule
4. Fix any remaining violations

## Acceptance Criteria
- [ ] No `console.log` or `console.debug` in production code
- [ ] All logging uses `logger` utility
- [ ] ESLint rule prevents new console statements
- [ ] Logger properly configured for dev/prod

## Related
- TECH-008: Enable ESLint in builds
