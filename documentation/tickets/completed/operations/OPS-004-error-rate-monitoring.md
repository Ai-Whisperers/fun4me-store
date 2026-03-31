# OPS-004: Error Rate Monitoring

## Priority: P2
## Category: Operations
## Status: ✅ Complete
## Epic: [EPIC-11: Operations & Observability](../epics/EPIC-11-operations.md)
## Completion Date: January 2026

## Description
Implement comprehensive error rate monitoring with alerting when error rates exceed acceptable thresholds.

## Current State
- Sentry captures individual errors
- No aggregate error rate tracking
- No automated alerting on error spikes
- Cron monitoring exists but limited scope

## Proposed Solution
Build on existing monitoring infrastructure to track error rates across all endpoints and alert on anomalies.

### Error Rate Tracking
```typescript
// lib/monitoring/error-rate.ts
interface ErrorMetrics {
  endpoint: string;
  totalRequests: number;
  errorCount: number;
  errorRate: number;
  timestamp: Date;
}

export class ErrorRateTracker {
  private metrics: Map<string, ErrorMetrics> = new Map();

  recordRequest(endpoint: string, isError: boolean) {
    const current = this.metrics.get(endpoint) || {
      endpoint,
      totalRequests: 0,
      errorCount: 0,
      errorRate: 0,
      timestamp: new Date(),
    };

    current.totalRequests++;
    if (isError) current.errorCount++;
    current.errorRate = current.errorCount / current.totalRequests;

    this.metrics.set(endpoint, current);

    // Check threshold
    if (current.errorRate > 0.10 && current.totalRequests > 10) {
      this.alertHighErrorRate(current);
    }
  }

  private async alertHighErrorRate(metrics: ErrorMetrics) {
    await sendAlert({
      severity: 'high',
      title: `High error rate on ${metrics.endpoint}`,
      message: `Error rate: ${(metrics.errorRate * 100).toFixed(1)}%`,
    });
  }
}
```

### API Middleware
```typescript
// middleware/error-tracking.ts
export function withErrorTracking(handler: Function) {
  return async (req: Request) => {
    try {
      const result = await handler(req);
      errorTracker.recordRequest(req.url, result.status >= 400);
      return result;
    } catch (error) {
      errorTracker.recordRequest(req.url, true);
      throw error;
    }
  };
}
```

## Implementation Steps
1. [x] Create error rate tracking service
2. [x] Add middleware wrapper for API routes
3. [x] Set up 10% error rate threshold alerts
4. [x] Create error rate API endpoint for dashboard
5. [x] Add Prometheus format export
6. [x] Write unit tests

## Acceptance Criteria
- [x] Error rate tracked per endpoint
- [x] Alert when error rate > 10%
- [x] Dashboard API shows error trends
- [x] Prometheus format for external monitoring
- [ ] Weekly error rate reports (future enhancement)

## Implementation Notes

### Files Created:
- `lib/monitoring/error-rate.ts` - ErrorRateTracker class with sliding window aggregation
- `lib/api/with-error-tracking.ts` - Middleware wrapper for API routes
- `app/api/health/errors/route.ts` - Dashboard API endpoint (JSON + Prometheus)
- `tests/unit/lib/monitoring/error-rate.test.ts` - Unit tests (27 tests)

### Key Features:
1. **Sliding Window Tracking**: 5-minute windows for error rate calculation
2. **Endpoint Normalization**: UUIDs, numeric IDs, query params normalized
3. **Threshold Alerting**: Automatic alerts at 10% error rate (configurable)
4. **Status Categories**: healthy (<5%), warning (5-10%), critical (>10%)
5. **Prometheus Export**: `/api/health/errors?format=prometheus`
6. **Recent Errors**: Tracks last 10 error status codes per endpoint

### Usage:
```typescript
// Wrap API handlers
import { withErrorTracking } from '@/lib/api/with-error-tracking'
export const GET = withErrorTracking(handler)

// Or track manually
import { trackApiResponse } from '@/lib/api/with-error-tracking'
trackApiResponse(request, response, startTime)
```

### API Endpoints:
- `GET /api/health/errors` - JSON summary
- `GET /api/health/errors?format=prometheus` - Prometheus format
- `POST /api/health/errors` - Reset metrics (requires cron auth)

## Related Files
- `lib/monitoring/alerts.ts` - Existing alert system
- `lib/monitoring/index.ts` - Updated exports
- `app/api/**/*.ts` - API routes (can use middleware)

## Estimated Effort
- 4 hours (actual: ~3.5h)
