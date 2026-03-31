# BUG-006 Console.error in withActionAuth Wrapper

## Priority: P2

## Category: Bug / Technical Debt

## Status: ✅ Completed

## Epic: [EPIC-08: Code Quality & Refactoring](../epics/EPIC-08-code-quality.md)

## Completed: January 2026

## Description

The `withActionAuth` wrapper uses `console.error` for error logging instead of the project's `logger` utility. This is inconsistent with the codebase standard where all server-side code uses the structured logger.

```typescript
// lib/actions/with-action-auth.ts line 75
} catch (error) {
  if (isRedirectError(error)) {
    throw error
  }
  console.error('Action error:', error)  // <-- Should use logger
  return { success: false, error: 'Error interno' }
}
```

## Impact

1. **Inconsistent Logging**: All other server code uses `logger.error()` which provides:
   - Structured JSON output for log aggregation
   - Context metadata (tenantId, userId, action name)
   - Integration with monitoring systems

2. **Missing Context**: The console.error lacks context about which action failed, for which user, in which tenant.

3. **Debug Difficulty**: When debugging production issues, this error won't appear in structured logs, making it harder to correlate with other events.

## Location

`web/lib/actions/with-action-auth.ts` line 75

## Proposed Fix

Replace console.error with logger.error and add context:

```typescript
import { logger } from '@/lib/logger'

// In the catch block:
} catch (error) {
  if (isRedirectError(error)) {
    throw error
  }
  logger.error('Server action failed', {
    tenantId: profile?.tenant_id,
    userId: user?.id,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  })
  return { success: false, error: 'Error interno' }
}
```

## Acceptance Criteria

- [x] Replace `console.error` with `logger.error`
- [x] Include relevant context (userId, tenantId if available)
- [x] Error message remains generic to client ('Error interno')
- [x] Verify all 38+ server actions still work correctly
- [x] Run existing test suite to confirm no regressions

## Related Files

- `web/lib/actions/with-action-auth.ts` - Needs fix
- `web/lib/logger.ts` - Logger utility to use
- `web/app/actions/*.ts` - All actions using this wrapper

## Estimated Effort

30 minutes

## Testing Notes

1. Trigger an error in a server action (e.g., temporarily break a query)
2. Verify error appears in structured logs with proper context
3. Verify client receives generic 'Error interno' message
