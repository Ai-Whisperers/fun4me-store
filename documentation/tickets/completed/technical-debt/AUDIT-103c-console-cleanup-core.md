# AUDIT-103c: Console.log Cleanup - Core Files (Auth, Setup, Errors)

## Priority: P2 - Medium
## Category: Technical Debt / Code Quality
## Status: ✅ Complete
## Epic: [EPIC-08: Code Quality & Refactoring](../epics/EPIC-08-code-quality.md)
## Parent Ticket: [AUDIT-103](./AUDIT-103-console-log-cleanup.md)

## Description

Handle console statements in core application files including authentication, setup, and error boundaries. These require special consideration as some console.error calls may be intentional.

## Affected Files (5 files)

| File | Est. Count | Consideration |
|------|------------|---------------|
| `auth/actions.ts` | 4 | Server actions - use logger |
| `setup/page.tsx` | 1-2 | Onboarding flow |
| `error.tsx` | 1-2 | Error boundary - may be intentional |
| `global-error.tsx` | 1-2 | Root error boundary - may be intentional |
| `ambassador/referrals/page.tsx` | 1-2 | Ambassador portal |
| `ambassador/payouts/page.tsx` | 1-2 | Ambassador portal |

## Special Considerations

### Error Boundaries (`error.tsx`, `global-error.tsx`)

Error boundaries are a special case. Console.error in error boundaries serves a critical purpose:

1. **Production debugging** - Errors are captured by error tracking services
2. **Browser DevTools** - Last resort for debugging in production
3. **React requirement** - Error boundaries often log for debugging

**Recommendation**: Keep `console.error` in error boundaries but ensure they include structured data:

```typescript
// error.tsx - Keep but improve
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to error tracking service
    console.error('Application error:', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    })

    // If error tracking service configured:
    // Sentry.captureException(error)
  }, [error])

  return (
    // ... error UI
  )
}
```

### Auth Actions (`auth/actions.ts`)

Server actions should use the project's logger:

```typescript
// Before
export async function signIn(formData: FormData) {
  const email = formData.get('email')
  console.log('Sign in attempt for:', email)

  try {
    // ... auth logic
  } catch (error) {
    console.error('Sign in error:', error)
    return { error: 'Error al iniciar sesión' }
  }
}

// After
import { logger } from '@/lib/logger'

export async function signIn(formData: FormData) {
  const email = formData.get('email')
  logger.info('Sign in attempt', { email })

  try {
    // ... auth logic
  } catch (error) {
    logger.error('Sign in failed', {
      email,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return { error: 'Error al iniciar sesión' }
  }
}
```

### Setup Page (`setup/page.tsx`)

Onboarding flow logs can be converted to logger or removed:

```typescript
// Setup progress tracking - use logger
logger.info('Setup step completed', { step: currentStep, tenantId })
```

### Ambassador Pages

Standard client component cleanup - remove debug logs:

```typescript
// Before
console.log('Fetched referrals:', referrals)

// After
// Removed - debug log not needed in production
```

## Implementation Steps

### Phase 1: Auth Actions
1. [ ] Review `auth/actions.ts`
2. [ ] Replace console.log with logger.info/debug
3. [ ] Replace console.error with logger.error
4. [ ] Ensure sensitive data not logged (passwords, tokens)
5. [ ] Test auth flows (sign in, sign up, sign out)

### Phase 2: Setup Page
6. [ ] Review `setup/page.tsx`
7. [ ] Remove debug logs or replace with logger
8. [ ] Test onboarding flow

### Phase 3: Error Boundaries
9. [ ] Review `error.tsx`
10. [ ] Improve console.error with structured data (keep the log)
11. [ ] Review `global-error.tsx`
12. [ ] Improve console.error with structured data (keep the log)
13. [ ] Consider adding error tracking service integration

### Phase 4: Ambassador Pages
14. [ ] Clean up `ambassador/referrals/page.tsx`
15. [ ] Clean up `ambassador/payouts/page.tsx`
16. [ ] Test ambassador portal

### Final
17. [ ] Run `npm run build`
18. [ ] Run `npm run lint`
19. [ ] Test critical auth flows

## Security Considerations

**NEVER log in auth/actions.ts:**
- Passwords
- Session tokens
- API keys
- Full email addresses (use first few chars + domain)

```typescript
// BAD - Never do this
logger.info('User authenticated', { password, token })

// GOOD - Safe logging
logger.info('User authenticated', {
  email: email.substring(0, 3) + '***@' + email.split('@')[1],
  userId: user.id
})
```

## Acceptance Criteria

- [x] `auth/actions.ts` uses logger (no console)
- [x] `setup/page.tsx` cleaned up
- [x] Error boundaries have improved logging (console.error kept with NODE_ENV guard)
- [x] Ambassador pages cleaned up
- [x] No sensitive data in logs

## Resolution Summary

**Completed:** January 2026

### Changes Made

| File | Action Taken |
|------|-------------|
| `auth/actions.ts` | Replaced 4 console.error calls with logger.error (OAuth, password reset, update password, logout) |
| `setup/page.tsx` | Added NODE_ENV guard around console.error |
| `error.tsx` | Already had NODE_ENV guard + Sentry integration - no changes needed |
| `global-error.tsx` | Already had NODE_ENV guard + Sentry integration - no changes needed |
| `ambassador/referrals/page.tsx` | Added NODE_ENV guard around console.error |
| `ambassador/payouts/page.tsx` | Added NODE_ENV guard around console.error |

### Key Notes

- **Error boundaries** were already properly implemented with:
  - Sentry error tracking integration
  - NODE_ENV guard for console logging
  - Structured error data in logs

- **Auth actions** now use structured logger with descriptive messages and safe context (no passwords/tokens logged)

## Estimated Effort

- 1-1.5 hours

## Risk Assessment

- **Medium risk** - Auth changes need careful testing
- Error boundaries are sensitive - keep error logging
- Test sign in/sign up/sign out after changes
- Verify error boundaries still work in dev and prod modes
