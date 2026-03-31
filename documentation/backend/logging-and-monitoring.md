# Logger and Monitoring System

Centralized logging utility with structured output, request context, and performance tracking.

> **Location**: `web/lib/logger.ts`
> **Last Updated**: January 2026

---

## Overview

The Vete logging system provides:
- Structured JSON logging in production
- Pretty console output in development
- Request-scoped logging with context
- Performance timing utilities
- Database query logging
- Automatic error serialization

---

## Quick Start

### Simple Logging

```typescript
import { logger } from '@/lib/logger'

// Basic logging
logger.info('Server started', { port: 3000 })
logger.error('Failed to fetch', new Error('Network error'))
logger.warn('Deprecated API usage', { endpoint: '/old-endpoint' })
logger.debug('Query params', { params })
```

### Request-Scoped Logging

```typescript
import { createRequestLogger } from '@/lib/logger'

export async function GET(request: Request) {
  const log = createRequestLogger(request, { tenant: 'adris' })

  log.info('Processing request')
  log.debug('Query params', { params: request.url })

  // Auto-includes: requestId, method, path, tenant
  log.error('Database error', new Error('Connection failed'))
}
```

---

## Log Levels

| Level | Priority | Use Case | Production Default |
|-------|----------|----------|-------------------|
| `debug` | 0 | Detailed debugging info | Hidden |
| `info` | 1 | General information | Shown |
| `warn` | 2 | Warnings and deprecations | Shown |
| `error` | 3 | Errors and exceptions | Shown |

### Environment Configuration

```env
# Log level (default: info in prod, debug in dev)
LOG_LEVEL=debug|info|warn|error

# Output format (default: json in prod, pretty in dev)
LOG_FORMAT=json|pretty
```

---

## Log Entry Structure

### JSON Format (Production)

```json
{
  "timestamp": "2026-01-04T10:30:00.000Z",
  "level": "info",
  "message": "Processing checkout",
  "context": {
    "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "tenant": "adris",
    "userId": "user-123",
    "method": "POST",
    "path": "/api/store/checkout",
    "orderId": "order-456"
  }
}
```

### Pretty Format (Development)

```
10:30:00 INFO  Processing checkout [req=a1b2c3d4 | tenant=adris | POST /api/store/checkout]
  {"orderId":"order-456"}
```

### Error Log Entry

```json
{
  "timestamp": "2026-01-04T10:30:00.000Z",
  "level": "error",
  "message": "Database connection failed",
  "context": {
    "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "operation": "checkout"
  },
  "error": {
    "name": "PostgresError",
    "message": "Connection refused",
    "stack": "..."  // Only in development
  }
}
```

---

## API Reference

### Global Logger

```typescript
import { logger } from '@/lib/logger'

// Type signature
const logger = {
  debug: (message: string, context?: LogContext) => void
  info: (message: string, context?: LogContext) => void
  warn: (message: string, context?: LogContext) => void
  error: (message: string, contextOrError?: LogContext | Error) => void
}
```

### Request Logger

```typescript
import { createRequestLogger } from '@/lib/logger'

// Creates a logger with automatic request context
const log = createRequestLogger(
  request: Request,
  additionalContext?: Partial<LogContext>
)

// Auto-includes: requestId, method, path
// Plus any additional context you provide
```

### Performance Timing

```typescript
import { withTiming } from '@/lib/logger'

// Measure and log execution time
const result = await withTiming(
  'Database query',           // Operation name
  async () => fetchData(),    // Async function
  log                         // Optional logger (defaults to global)
)

// Output: "Database query completed" with duration in context
```

### Database Query Logging

```typescript
import { logQuery } from '@/lib/logger'

// Log database queries with performance thresholds
logQuery('pets', 'SELECT', 150, 25)  // table, operation, duration, rowCount

// Auto-selects log level:
// - debug: < 200ms
// - info: 200-1000ms
// - warn: > 1000ms (slow query warning)
```

---

## LogContext Type

```typescript
interface LogContext {
  requestId?: string    // Unique request identifier
  tenant?: string       // Tenant slug (e.g., 'adris')
  userId?: string       // User ID
  method?: string       // HTTP method
  path?: string         // Request path
  duration?: number     // Operation duration in ms
  [key: string]: unknown  // Any additional context
}
```

---

## Usage Patterns

### API Route Logging

```typescript
import { createRequestLogger, withTiming } from '@/lib/logger'

export async function POST(request: Request) {
  const log = createRequestLogger(request, { tenant: 'adris' })
  const startTime = performance.now()

  try {
    log.info('Checkout started')

    const order = await withTiming(
      'Create order',
      () => createOrder(data),
      log
    )

    log.info('Checkout completed', {
      orderId: order.id,
      total: order.total,
      duration: performance.now() - startTime
    })

    return NextResponse.json(order)
  } catch (error) {
    log.error('Checkout failed', error as Error)
    throw error
  }
}
```

### Server Action Logging

```typescript
'use server'

import { logger } from '@/lib/logger'

export async function createPet(formData: FormData) {
  logger.info('Creating pet', {
    name: formData.get('name'),
    species: formData.get('species')
  })

  try {
    const pet = await supabase.from('pets').insert(data)
    logger.info('Pet created', { petId: pet.id })
    return { success: true, data: pet }
  } catch (error) {
    logger.error('Pet creation failed', error as Error)
    return { success: false, error: 'Failed to create pet' }
  }
}
```

### Cron Job Logging

```typescript
import { logger } from '@/lib/logger'

export async function GET(request: Request) {
  const startTime = Date.now()
  logger.info('Cron job started', { job: 'release-reservations' })

  try {
    const released = await releaseExpiredReservations()

    logger.info('Cron job completed', {
      job: 'release-reservations',
      released_count: released,
      duration_ms: Date.now() - startTime
    })

    return NextResponse.json({ success: true, released })
  } catch (error) {
    logger.error('Cron job failed', {
      job: 'release-reservations',
      error
    })
    throw error
  }
}
```

---

## Best Practices

### DO

- Use structured logging with context objects
- Include request IDs for traceability
- Log entry and exit points of important operations
- Use appropriate log levels
- Include tenant context for multi-tenant debugging
- Measure and log performance of slow operations

### DON'T

- Log sensitive data (passwords, tokens, PII)
- Use console.log directly (use logger instead)
- Log excessively in hot paths
- Ignore errors without logging them
- Include full stack traces in production

### Sensitive Data Handling

```typescript
// BAD - leaks password
logger.info('User login', { email, password })

// GOOD - redacted
logger.info('User login', { email, password: '[REDACTED]' })

// BETTER - omit entirely
logger.info('User login attempt', { email })
```

---

## Integration with Error Handling

```typescript
import { logger } from '@/lib/logger'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'

export async function GET(request: Request) {
  try {
    const data = await fetchData()
    return NextResponse.json(data)
  } catch (error) {
    // Log the error with full details
    logger.error('API request failed', error as Error)

    // Return sanitized error to client
    return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
}
```

---

## Vercel Integration

Logs are automatically streamed to Vercel's log viewer:

1. **Vercel Dashboard** → Project → Functions → Logs
2. Filter by level, time range, or search
3. JSON logs are automatically parsed

### Log Retention

- Vercel Pro: 1 day retention
- Vercel Enterprise: 30 day retention

For longer retention, consider integrating with:
- Datadog
- LogDNA
- Axiom
- Sentry

---

## Performance Considerations

### Slow Query Detection

```typescript
// Automatic warning for slow queries
logQuery('appointments', 'SELECT', 1500, 100)
// Logs at WARN level: "DB SELECT appointments" with slow: true
```

### Request Duration Tracking

```typescript
const log = createRequestLogger(request)

// At end of request
log.info('Request completed', {
  duration: performance.now() - startTime
})
```

---

## Related Documentation

- [Error Handling](error-handling.md)
- [Rate Limiting](rate-limiting.md)
- [Cron Jobs](../development/cron-jobs.md)
- [API Overview](../api/overview.md)
