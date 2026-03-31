# FEAT-007: External Logging Service Integration

## Priority: P3 (Low)
## Category: Feature
## Status: Not Started

## Description
Application logging exists but external logging service integration is not implemented. TODOs indicate planned integration with DataDog, LogRocket, or Sentry.

## Current State
### TODO Comments Found
1. **`lib/monitoring/logger.ts:161`**
   - "TODO: Send to external logging service (e.g., DataDog, LogRocket, etc.)"

2. **`lib/monitoring/logger.ts:190`**
   - "TODO: Implement external logging service integration"

### Existing Implementation
- Local logger class exists
- Console output for development
- No production logging persistence
- No error tracking service

## Proposed Solution

### Option 1: Sentry (Recommended)
- Error tracking with stack traces
- Performance monitoring
- Session replay for debugging
- Next.js integration available
- Free tier available

### Option 2: DataDog
- APM and infrastructure monitoring
- Log aggregation
- RUM (Real User Monitoring)
- Higher cost, more features

### Option 3: LogRocket
- Session replay
- Error tracking
- Performance monitoring
- Good for UX debugging

## Implementation Steps (Sentry)

### 1. Install and Configure
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

### 2. Update Logger
```typescript
// lib/monitoring/logger.ts
import * as Sentry from '@sentry/nextjs';

class Logger {
  error(message: string, context?: Record<string, unknown>) {
    console.error(message, context);

    if (process.env.NODE_ENV === 'production') {
      Sentry.captureException(new Error(message), {
        extra: context,
      });
    }
  }

  // ... other methods
}
```

### 3. Configure Error Boundary
```typescript
// app/error.tsx
'use client';
import * as Sentry from '@sentry/nextjs';

export default function ErrorPage({ error }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return <ErrorComponent />;
}
```

## Acceptance Criteria
- [ ] External logging service configured
- [ ] Errors captured with stack traces
- [ ] Performance monitoring enabled
- [ ] User session context included
- [ ] Environment-based configuration
- [ ] Source maps uploaded for debugging
- [ ] Dashboard access for team

## Environment Variables Required
```
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_AUTH_TOKEN=xxx
```

## Related Files
- `web/lib/monitoring/logger.ts`
- `web/sentry.client.config.ts` (new)
- `web/sentry.server.config.ts` (new)
- `web/sentry.edge.config.ts` (new)

## Estimated Effort
- Setup: 2 hours
- Integration: 3 hours
- Testing: 1 hour
- **Total: 6 hours**

---
*Ticket created: January 2026*
*Based on TODO analysis*
