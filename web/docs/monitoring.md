# Monitoring and Logging Configuration

This document describes how to configure external monitoring services for the Vete application.

## Overview

The Vete application includes comprehensive logging and monitoring capabilities:

- **Structured JSON logging** in production
- **Pretty console output** in development
- **Request tracing** with unique request IDs
- **Performance monitoring** with slow request detection
- **Audit logging** for security compliance (GDPR, HIPAA)
- **External service integrations** for production monitoring

## External Service Integrations

### 1. Sentry (Error Tracking) ✅

**What it does:** Captures errors, exceptions, and performance issues with full context and stack traces.

**Setup:**
```bash
npm install @sentry/nextjs
```

**Environment variables:**
```env
SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
```

**Features:**
- Automatic error capture with user context
- Release tracking and deploy notifications
- Performance monitoring for slow requests
- User session replay (with frontend SDK)

### 2. DataDog (Full Observability) ✅

**What it does:** Comprehensive monitoring including logs, metrics, APM, and infrastructure monitoring.

**Environment variables:**
```env
DATADOG_API_KEY=your-api-key
DATADOG_APP_KEY=your-app-key
DATADOG_SITE=datadoghq.com  # or datadoghq.eu for EU
```

**Features:**
- Centralized log aggregation and search
- Real-time metrics and custom dashboards
- Request performance tracking
- Multi-tenant filtering with tenant tags
- Automatic correlation with infrastructure metrics

### 3. LogRocket (User Session Monitoring) ✅

**What it does:** Records user sessions with network requests, console logs, and user interactions.

**Environment variables:**
```env
LOGROCKET_APP_ID=your-app-id
LOGROCKET_ORG_ID=your-org-id
LOGROCKET_API_TOKEN=your-api-token  # For backend events
```

**Features:**
- Client-side session recordings
- Server-side event correlation
- Performance monitoring
- User experience insights

### 4. Custom Monitoring API ✅

**What it does:** Send logs and metrics to your custom monitoring infrastructure.

**Environment variables:**
```env
MONITORING_API_URL=https://your-monitoring-api.com/logs
MONITORING_API_KEY=your-api-key
METRICS_API_URL=https://your-monitoring-api.com/metrics
METRICS_API_KEY=your-metrics-key
```

**Use cases:**
- Internal monitoring systems
- Custom alerting logic
- Data warehouse integration
- Compliance logging

### 5. Monitoring Webhook (Simple Integration) ✅

**What it does:** Send logs to any webhook endpoint (Slack, Discord, custom services).

**Environment variables:**
```env
MONITORING_WEBHOOK_URL=https://hooks.slack.com/services/...
MONITORING_WEBHOOK_SECRET=optional-auth-token
```

## Configuration

### Logger Configuration

**Environment variables:**
```env
# Logging
LOG_LEVEL=debug|info|warn|error          # Default: info (prod), debug (dev)
LOG_FORMAT=json|pretty                   # Default: json (prod), pretty (dev)

# Performance
SLOW_REQUEST_THRESHOLD_MS=1000           # Default: 1000ms

# Application metadata
APP_VERSION=1.0.0                        # For release tracking
HOSTNAME=vete-server-01                  # For service identification
```

### Production Recommendations

**Minimal setup (Sentry only):**
```env
SENTRY_DSN=https://your-dsn@sentry.io/project-id
LOG_LEVEL=info
LOG_FORMAT=json
```

**Full observability (Sentry + DataDog):**
```env
# Error tracking
SENTRY_DSN=https://your-dsn@sentry.io/project-id

# Full observability
DATADOG_API_KEY=your-api-key
DATADOG_APP_KEY=your-app-key
DATADOG_SITE=datadoghq.com

# Performance tuning
SLOW_REQUEST_THRESHOLD_MS=500
LOG_LEVEL=info
```

**Multi-tenant filtering:**
All logs automatically include tenant information for filtering:
```json
{
  "tenant": "clinic-terrapet",
  "userId": "user_123",
  "userRole": "vet",
  "action": "pet.create"
}
```

## Usage Examples

### Basic Logging
```typescript
import { logger } from '@/lib/logger'

logger.info('Server started', { port: 3000 })
logger.error('Database connection failed', { error })
```

### Request-Scoped Logging
```typescript
import { createRequestLogger } from '@/lib/logger'

export async function GET(request: Request) {
  const log = createRequestLogger(request, { 
    tenant: 'clinic-terrapet' 
  })
  
  log.info('Processing pet request')
  log.debug('Query parameters', { params })
  
  return Response.json({ success: true })
}
```

### Audit Logging
```typescript
import { auditLogger } from '@/lib/logger'

// Authentication events
auditLogger.auth('login', {
  userId: 'user_123',
  email: 'vet@clinic.com',
  tenant: 'clinic-terrapet',
  success: true
})

// Data access tracking
auditLogger.access('pet', 'pet_456', 'read', {
  userId: 'user_123',
  tenant: 'clinic-terrapet'
})

// Security events
auditLogger.security('unauthorized_access', {
  userId: 'user_789',
  severity: 'high',
  details: 'Attempted to access different tenant data'
})
```

### Performance Tracking
```typescript
import { createPerformanceTracker } from '@/lib/logger'

const perf = createPerformanceTracker(requestId)
perf.checkpoint('auth_complete')
perf.checkpoint('db_query_complete')
perf.checkpoint('response_ready')

const totalDuration = perf.finish({ 
  path: '/api/pets',
  statusCode: 200 
})
```

## Monitoring Dashboards

### Key Metrics to Track

**Application Performance:**
- Request duration (p50, p95, p99)
- Error rate by tenant and endpoint
- Slow query detection
- Database connection pool usage

**Business Metrics:**
- Appointments booked per tenant
- User login patterns
- Feature usage by role

**Security Metrics:**
- Failed authentication attempts
- Cross-tenant access violations
- Admin action auditing
- GDPR request processing

### DataDog Dashboard Query Examples

**Request Duration by Tenant:**
```
avg:vete.request.duration{*} by {tenant}
```

**Error Rate by Endpoint:**
```
sum:vete.request.count{status:error} by {path}.as_rate()
```

**Active Users by Tenant:**
```
count_nonzero:vete.user.active{*} by {tenant}
```

## Alerting

### Recommended Alerts

**Critical:**
- Error rate > 5% for any tenant
- Request duration p99 > 5 seconds
- Database connection failures
- Security violations (severity: critical)

**Warning:**
- Request duration p95 > 1 second
- Memory usage > 80%
- Failed login attempts > 10/min per tenant

**Info:**
- New tenant onboarding
- High traffic periods
- Performance improvements

## Troubleshooting

### Common Issues

**Logs not appearing in external services:**
1. Check environment variables are set
2. Verify network connectivity from your deployment
3. Check API keys and permissions
4. Review console for external service errors (only visible in dev)

**High log volume:**
1. Increase LOG_LEVEL to 'warn' or 'error'
2. Configure log sampling in external services
3. Add request filtering in the logger

**Performance impact:**
1. External service calls are fire-and-forget (won't block requests)
2. Failed external service calls are silently ignored
3. Consider batching for very high traffic scenarios

### Testing

**Development testing:**
```bash
LOG_LEVEL=debug npm run dev
```

**Production testing:**
```bash
# Send a test error to verify integrations
curl -X POST /api/test-logging
```

## Migration from Deprecated Logger

If you're using the deprecated `@/lib/monitoring/logger`, migrate to `@/lib/logger`:

**Before:**
```typescript
import { logger } from '@/lib/monitoring/logger'
logger.error('Something failed', error, { userId: '123' })
```

**After:**
```typescript
import { logger } from '@/lib/logger'
logger.error('Something failed', { userId: '123', error })
```

The new logger provides better performance, more features, and consistent external service integration.