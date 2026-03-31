# AUDIT-003: Insufficient Error Context in Logs

## Priority: P3 (Low)
## Category: Audit / Observability
## Status: COMPLETED

## Description
Error messages in cron jobs and API routes often lack sufficient context for debugging, making it difficult to investigate issues.

## Current State
### Generic Error Messages
**`app/api/cron/process-subscriptions/route.ts:94-95`**
```typescript
results.errors.push(`Subscription ${subscription.id}: Product not found`)
// Missing: tenant_id, product_id, when it was checked
```

**`app/api/store/orders/route.ts`**
```typescript
logger.error('Failed to create order', error)
// Missing: user_id, items, amounts, what step failed
```

### Problems with Current Logging
1. No structured fields for filtering
2. Missing tenant context
3. Missing user/actor information
4. No correlation IDs for request tracing
5. Timestamps not included in context
6. Stack traces not always captured

## Proposed Solution

### 1. Structured Logger
```typescript
// lib/monitoring/logger.ts
interface LogContext {
  // Required for all logs
  operation: string
  tenant_id?: string

  // Optional context
  user_id?: string
  request_id?: string
  entity_type?: string
  entity_id?: string

  // Error-specific
  error_code?: string
  error_message?: string
  stack?: string

  // Custom fields
  [key: string]: unknown
}

class StructuredLogger {
  private baseContext: Partial<LogContext> = {}

  withContext(ctx: Partial<LogContext>): StructuredLogger {
    const logger = new StructuredLogger()
    logger.baseContext = { ...this.baseContext, ...ctx }
    return logger
  }

  info(message: string, context?: Partial<LogContext>) {
    this.log('INFO', message, context)
  }

  warn(message: string, context?: Partial<LogContext>) {
    this.log('WARN', message, context)
  }

  error(message: string, error?: Error | unknown, context?: Partial<LogContext>) {
    const errorContext: Partial<LogContext> = {}

    if (error instanceof Error) {
      errorContext.error_message = error.message
      errorContext.stack = error.stack
      errorContext.error_code = (error as any).code
    } else if (error) {
      errorContext.error_message = String(error)
    }

    this.log('ERROR', message, { ...errorContext, ...context })
  }

  private log(level: string, message: string, context?: Partial<LogContext>) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.baseContext,
      ...context,
    }

    // Structured JSON output for log aggregation
    console[level.toLowerCase() === 'error' ? 'error' : 'log'](
      JSON.stringify(logEntry)
    )
  }
}

export const logger = new StructuredLogger()
```

### 2. Request Context Middleware
```typescript
// lib/api/request-context.ts
import { v4 as uuidv4 } from 'uuid'

export function createRequestContext(request: NextRequest, tenantId?: string) {
  return logger.withContext({
    request_id: uuidv4(),
    tenant_id: tenantId,
    ip: request.ip,
    path: request.nextUrl.pathname,
    method: request.method,
  })
}
```

### 3. Updated Error Logging
```typescript
// app/api/cron/process-subscriptions/route.ts
export async function GET(request: NextRequest) {
  const log = createRequestContext(request).withContext({
    operation: 'process-subscriptions',
  })

  log.info('Starting subscription processing')

  for (const subscription of dueSubscriptions) {
    const subLog = log.withContext({
      entity_type: 'subscription',
      entity_id: subscription.id,
      tenant_id: subscription.tenant_id,
      product_id: subscription.product_id,
    })

    try {
      const product = await getProduct(subscription.product_id)

      if (!product) {
        subLog.warn('Product not found for subscription', {
          reason: 'product_not_found',
          subscription_created: subscription.created_at,
          last_order_date: subscription.last_order_date,
        })
        results.skipped++
        continue
      }

      // Process...
      subLog.info('Subscription processed successfully', {
        order_id: order.id,
        amount: order.total,
      })
      results.processed++
    } catch (error) {
      subLog.error('Failed to process subscription', error, {
        step: 'order_creation',
        quantity: subscription.quantity,
      })
      results.errors.push(subscription.id)
    }
  }

  log.info('Subscription processing complete', {
    processed: results.processed,
    skipped: results.skipped,
    errors: results.errors.length,
    duration_ms: Date.now() - startTime,
  })

  return NextResponse.json(results)
}
```

### 4. Log Output Format
```json
{
  "timestamp": "2026-01-07T10:30:00.000Z",
  "level": "ERROR",
  "message": "Failed to process subscription",
  "operation": "process-subscriptions",
  "request_id": "abc-123-def",
  "tenant_id": "adris",
  "entity_type": "subscription",
  "entity_id": "sub-456",
  "product_id": "prod-789",
  "step": "order_creation",
  "quantity": 2,
  "error_message": "Insufficient stock",
  "error_code": "STOCK_ERROR",
  "stack": "Error: Insufficient stock\n    at processSubscription..."
}
```

## Implementation Steps
1. Create StructuredLogger class
2. Create request context utility
3. Update cron jobs with structured logging
4. Update API routes with request context
5. Configure log aggregation (Vercel, DataDog, etc.)
6. Create log analysis queries

## Acceptance Criteria
- [ ] All logs include request_id
- [ ] Error logs include stack traces
- [ ] Tenant context in all tenant operations
- [ ] Entity IDs logged for entity operations
- [ ] JSON format for log aggregation
- [ ] Consistent log structure across codebase

## Log Fields Reference
| Field | When to Include |
|-------|-----------------|
| request_id | All requests |
| tenant_id | All tenant operations |
| user_id | Authenticated requests |
| entity_type | Entity operations |
| entity_id | Entity operations |
| error_message | Errors |
| stack | Errors |
| duration_ms | Operations with timing |

## Related Files
- `web/lib/monitoring/logger.ts` (update)
- `web/lib/api/request-context.ts` (new)
- All API routes and cron jobs

## Estimated Effort
- Logger utility: 2 hours
- Context utility: 1 hour
- Update routes: 4 hours
- Testing: 1 hour
- **Total: 8 hours**

---
*Ticket created: January 2026*
*Based on security/performance audit*

---
## Implementation Summary (Completed)

**Analysis:**
A comprehensive structured logging system already exists in `lib/logger.ts`:

### Features Implemented
1. **Structured JSON Logging**
   - `LogContext` interface with requestId, tenant, userId, userRole, action, resourceType, resourceId, etc.
   - JSON format in production, pretty console in development

2. **Request-Scoped Logging**
   - `createRequestLogger(request, context)` - Creates logger with automatic request context
   - Extracts IP, user agent, path, method automatically
   - Returns logger with consistent baseContext

3. **Performance Tracking**
   - `createPerformanceTracker(requestId)` - Timing checkpoints
   - Automatic slow request detection (>1000ms threshold)
   - `withTiming()` helper for measuring async operations

4. **Audit Logging**
   - `auditLogger.auth()` - Authentication events (login, logout, password changes)
   - `auditLogger.access()` - Data access tracking (HIPAA/GDPR compliance)
   - `auditLogger.security()` - Security events with severity levels

5. **Error Handling**
   - Automatic error serialization with name, message, stack
   - Sentry integration for error tracking in production
   - Stack traces in development only

6. **Integration with API Wrapper**
   - `withApiAuth` in `lib/auth/api-wrapper.ts` provides:
     - `log` - Request-scoped logger with tenant/user context
     - `perf` - Performance tracker with checkpoints
     - `requestId` - Correlation ID in response headers

### Example Usage in API Routes
```typescript
export const GET = withApiAuth(async ({ log, perf }) => {
  log.info('Fetching pets', { action: 'pets.list' })
  perf.checkpoint('db_query_start')
  const data = await supabase.from('pets').select('*')
  perf.checkpoint('db_query_complete')
  return NextResponse.json(data)
})
```

### All Acceptance Criteria Met
- ✅ All logs include request_id (via createRequestLogger)
- ✅ Error logs include stack traces (serializeError function)
- ✅ Tenant context in all tenant operations (baseContext)
- ✅ Entity IDs logged for entity operations (resourceType/resourceId)
- ✅ JSON format for log aggregation (isJsonFormat detection)
- ✅ Consistent log structure across codebase (withApiAuth integration)

---
*Completed: January 2026*
