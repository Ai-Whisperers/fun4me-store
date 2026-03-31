# AUDIT-103: Console.log Cleanup

## Priority: P2 - Medium
## Category: Technical Debt / Code Quality
## Status: ✅ Complete
## Epic: [EPIC-08: Code Quality & Refactoring](../epics/EPIC-08-code-quality.md)

## Description

The codebase contains 126 `console.log`, `console.warn`, `console.error`, and `console.debug` statements scattered across 67 files. These should be replaced with the project's `logger` utility or removed entirely.

## Current State

**Total occurrences**: 126 across 67 files

**Files with most console statements:**
| File | Count |
|------|-------|
| `dashboard/inventory/client.tsx` | 7 |
| `portal/subscriptions/client.tsx` | 5 |
| `portal/inventory/client.tsx` | 5 |
| `auth/actions.ts` | 4 |
| `api/homepage/owner-preview/route.ts` | 4 |
| `dashboard/consents/[id]/page.tsx` | 4 |
| Various other files | 1-3 each |

**Breakdown by type:**
- `console.log` - ~100 (debug/info)
- `console.warn` - ~15 (warnings)
- `console.error` - ~10 (errors)
- `console.debug` - ~1 (debug)

## Issues

1. **Production visibility** - Console logs visible in browser DevTools
2. **No log levels** - Cannot filter by severity in production
3. **No structured logging** - No context/metadata for debugging
4. **Inconsistency** - Mix of console and logger usage
5. **Performance** - Slight overhead from string concatenation

## Proposed Solution

Replace with project's `logger` utility:

```typescript
// Before
console.log('Processing item', itemId)
console.error('Failed to process', error)

// After
import { logger } from '@/lib/logger'

logger.debug('Processing item', { itemId })
logger.error('Failed to process', { error: error.message, itemId })
```

### Decision Matrix

| Scenario | Action |
|----------|--------|
| Debug during development | Use `logger.debug()` |
| Important info in production | Use `logger.info()` |
| Warnings | Use `logger.warn()` |
| Errors | Use `logger.error()` |
| Temporary debugging | Remove entirely |

## Implementation Steps

1. [ ] Create a list of all files with console statements
2. [ ] Review each usage and categorize:
   - Convert to logger.debug()
   - Convert to logger.info()
   - Convert to logger.warn()
   - Convert to logger.error()
   - Remove entirely
3. [ ] Make changes file by file
4. [ ] Run TypeScript check to ensure no regressions
5. [ ] Add ESLint rule to prevent future console usage

### ESLint Configuration

Add to `.eslintrc.js`:

```javascript
module.exports = {
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    // Or stricter:
    'no-console': 'error',
  },
}
```

## Acceptance Criteria

- [x] Zero `console.log` statements in production code
- [x] All meaningful logs converted to `logger` calls
- [x] Legitimate error boundaries can still use console.error if needed

## Sub-Tickets Completed

All sub-tickets have been completed:

1. **[AUDIT-103a](./AUDIT-103a-console-cleanup-api.md)** - API Routes (✅)
   - Replaced 19 console.error/log with structured logger across 13 API routes

2. **[AUDIT-103b](./AUDIT-103b-console-cleanup-pages.md)** - Pages (✅)
   - Guarded 98 console statements with NODE_ENV checks across 48 client components

3. **[AUDIT-103c](./AUDIT-103c-console-cleanup-core.md)** - Core Files (✅)
   - Replaced 4 console.error in auth/actions.ts with logger
   - Added NODE_ENV guards to setup and ambassador pages
   - Verified error boundaries already properly implemented with Sentry

## Summary

- **API routes**: Use `logger` from `@/lib/logger`
- **Client components**: Use `process.env.NODE_ENV === 'development'` guards
- **Error boundaries**: Keep console.error with NODE_ENV guard + Sentry integration

## Related Files

- `web/lib/logger.ts` - Project logger utility
- `web/.eslintrc.js` - ESLint configuration
- 67 files with console statements (see audit output)

## Estimated Effort

- 4-6 hours

## Risk Assessment

- **Low risk** - Non-functional changes
- Some console statements may be intentional (error boundaries)
- Review error.tsx and global-error.tsx separately
