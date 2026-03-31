# TECH-022: Add Request/Response Logging Middleware

**Category**: Technical Debt  
**Priority**: P2 - Medium  
**Status**: Open  
**Effort**: 1 day  
**Impact**: Medium - Debugging capability  
**Created**: 2025-01-19  
**Source**: critique/03-api-design-roast.md (API-008)

## Summary

No request/response logging exists. Debugging production issues is guesswork.

## Problem

**Current state:**
```
User: "My payment didn't go through"
You: "What did you send? What did we return? When?"
Database: *shrugs*
```

## Solution

### Logging Middleware

```typescript
// lib/api/logging.ts
import { logger } from '@/lib/logger';

export function withLogging(handler: Handler): Handler {
  return async (request, ...args) => {
    const requestId = crypto.randomUUID();
    const start = Date.now();
    
    // Log request
    logger.info('API Request', {
      requestId,
      method: request.method,
      path: new URL(request.url).pathname,
      userAgent: request.headers.get('user-agent'),
      // Don't log request body (may contain PII)
    });
    
    try {
      const response = await handler(request, ...args);
      
      // Log response
      logger.info('API Response', {
        requestId,
        status: response.status,
        duration: Date.now() - start,
      });
      
      // Add request ID to response headers
      response.headers.set('X-Request-ID', requestId);
      
      return response;
    } catch (error) {
      logger.error('API Error', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - start,
      });
      throw error;
    }
  };
}
```

### Integration

```typescript
// Integrate with withAuth
export const GET = withLogging(
  withAuth(async (ctx) => {
    // Handler code
  })
);
```

### Production Logging Service

Consider integrating with:
- Sentry (error tracking)
- LogRocket (session replay)
- Datadog (APM)
- CloudWatch (AWS)

## Implementation

1. Create logging middleware
2. Add request ID to all responses
3. Integrate with production logging service
4. Add log filtering (exclude sensitive data)
5. Set up log retention policy

## Acceptance Criteria
- [ ] All API requests logged
- [ ] Request IDs in responses
- [ ] Error logging with context
- [ ] PII excluded from logs
- [ ] Production logging service configured

## Related
- Error handling
- Monitoring and observability
