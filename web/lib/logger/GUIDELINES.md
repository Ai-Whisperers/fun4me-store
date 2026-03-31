# Structured Logging Guidelines

## Overview

Vete uses a structured logger (`@/lib/logger`) for all application logging. This provides consistent, searchable logs with automatic context enrichment.

## Quick Reference

```typescript
import { logger, createRequestLogger, auditLogger } from '@/lib/logger'

// Simple logging
logger.debug('Processing data', { count: 10 })
logger.info('User created', { userId, tenantId })
logger.warn('Slow query', { duration: 1200, table: 'pets' })
logger.error('Failed to save', { error, userId })

// Request-scoped logging (in API routes)
const log = createRequestLogger(request, { tenant: 'terrapet' })
log.info('Processing request')
log.error('Request failed', { error })

// Audit logging (security/compliance)
auditLogger.auth('login', { userId, success: true, ip })
auditLogger.access('pet', petId, 'write', { userId, tenant })
auditLogger.security('role_violation', { severity: 'high', userId })
```

## When to Use Which Level

| Level | When to Use | Examples |
|-------|-------------|----------|
| `debug` | Development insights, verbose details | Query parameters, internal state, feature flags |
| `info` | Normal operations, business events | User created, order placed, email sent |
| `warn` | Recoverable issues, degraded performance | Slow query, retry triggered, fallback used |
| `error` | Failures requiring attention | Database error, API call failed, validation error |

## Best Practices

### ✅ DO

```typescript
// Include relevant context
logger.info('Pet registered', { petId, ownerId, species, tenantId })

// Use request logger for request context
const log = createRequestLogger(request, { tenant })
log.info('Booking created', { appointmentId })

// Log errors with full context
logger.error('Failed to create invoice', { 
  error, 
  userId, 
  tenantId,
  items: items.length 
})

// Use audit logger for security events
auditLogger.auth('password_change', { userId, success: true })
```

### ❌ DON'T

```typescript
// Don't use console.log (except in CLI tools)
console.log('User created') // NO!

// Don't log sensitive data
logger.info('Login', { password, creditCard }) // NO!

// Don't log too verbosely in production
logger.debug('Loop iteration ' + i) // NO! (use sparingly)

// Don't use string concatenation
logger.info('User ' + userId + ' created') // NO! Use context object
```

## Context Fields

The logger automatically enriches logs with context when available:

| Field | Description | Example |
|-------|-------------|---------|
| `requestId` | Unique request identifier | `uuid` |
| `tenant` | Multi-tenant identifier | `terrapet`, `petlife` |
| `userId` | Current user ID | `uuid` |
| `userRole` | User's role | `owner`, `vet`, `admin` |
| `action` | Operation being performed | `pet.create`, `appointment.book` |
| `duration` | Operation duration (ms) | `245` |
| `ip` | Client IP address | `192.168.1.1` |

## Special Use Cases

### 1. Request Logging (API Routes)

```typescript
import { createRequestLogger } from '@/lib/logger'

export async function POST(request: Request) {
  const log = createRequestLogger(request, { 
    tenant: 'terrapet',
    action: 'pet.create'
  })
  
  log.info('Creating pet')
  
  try {
    const pet = await createPet(data)
    log.info('Pet created', { petId: pet.id })
    return NextResponse.json(pet)
  } catch (error) {
    log.error('Failed to create pet', error)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
```

### 2. Audit Logging (Security/Compliance)

```typescript
import { auditLogger } from '@/lib/logger'

// Authentication events
auditLogger.auth('login', { 
  userId, 
  email,
  tenant,
  ip,
  success: true 
})

// Data access (GDPR/HIPAA compliance)
auditLogger.access('medical_record', recordId, 'read', {
  userId,
  tenant,
  userRole: 'vet'
})

// Security incidents
auditLogger.security('unauthorized_access', {
  severity: 'high',
  userId,
  tenant,
  resourceType: 'invoice',
  resourceId
})
```

### 3. Performance Tracking

```typescript
import { createPerformanceTracker, withTiming } from '@/lib/logger'

// Method 1: Manual checkpoints
const perf = createPerformanceTracker(requestId)
perf.checkpoint('auth_complete')
perf.checkpoint('db_query_complete')
const duration = perf.finish({ path: '/api/pets' })

// Method 2: Wrap async operations
await withTiming('loadPetData', async () => {
  return await fetchPetData(petId)
})
```

### 4. Database Query Logging

```typescript
import { logQuery } from '@/lib/logger'

const start = performance.now()
const { data } = await supabase.from('pets').select('*')
const duration = performance.now() - start

logQuery('pets', 'SELECT', duration, data.length)
// Automatically logs as WARN if >1000ms, INFO if >200ms, DEBUG otherwise
```

## Environment Configuration

Set these environment variables to control logging behavior:

```bash
# Log level (default: info in prod, debug in dev)
LOG_LEVEL=debug|info|warn|error

# Log format (default: json in prod, pretty in dev)
LOG_FORMAT=json|pretty

# Slow request threshold in milliseconds (default: 1000)
SLOW_REQUEST_THRESHOLD_MS=1000
```

## Output Formats

### Pretty Format (Development)

```
14:32:15 INFO  Pet created [req=a1b2c3d4 | tenant=terrapet | user=e5f6g7h8 | 125ms]
  {"petId": "uuid-here", "species": "dog"}
```

### JSON Format (Production)

```json
{
  "timestamp": "2026-01-18T14:32:15.123Z",
  "level": "info",
  "message": "Pet created",
  "context": {
    "requestId": "a1b2c3d4-...",
    "tenant": "terrapet",
    "userId": "e5f6g7h8-...",
    "petId": "uuid-here",
    "species": "dog",
    "duration": 125
  }
}
```

## Integration with Monitoring

- **Sentry**: Errors (level=error) are automatically sent to Sentry with full context
- **Log Aggregation**: JSON logs can be ingested by DataDog, CloudWatch, etc.
- **Metrics**: Performance data can be extracted from structured logs

## Migration from console.log

```typescript
// BEFORE
console.log('User created:', userId)
console.error('Error:', error)

// AFTER
logger.info('User created', { userId })
logger.error('Failed operation', { error, userId })
```

## CLI Tools Exception

Command-line tools (migrations, seeders, dev scripts) can use `console.log` for user-facing output:

```typescript
// migrations/runner.ts - This is acceptable
console.log('✅ Migration 001 applied successfully')

// API routes - Use logger instead
logger.info('Migration applied', { migrationId: '001' })
```

## References

- Main logger: `/lib/logger.ts`
- API helpers: `/lib/logger/api-helpers.ts`
- Type definitions: See `LogContext`, `LogLevel` in `/lib/logger.ts`
