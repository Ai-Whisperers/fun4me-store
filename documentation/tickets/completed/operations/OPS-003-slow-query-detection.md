# OPS-003: Slow Query Detection & Alerts

## Priority: P2
## Category: Operations
## Status: ✅ Complete
## Epic: [EPIC-11: Operations & Observability](../epics/EPIC-11-operations.md)

## Description
Implement automatic detection of slow database queries and alert when queries exceed acceptable thresholds.

## Current State (Before)
- No slow query logging
- Performance issues discovered reactively
- No visibility into database bottlenecks

## Implementation

### 1. Slow Query Tracker (`lib/monitoring/slow-query.ts`)

A comprehensive slow query detection module with:

- **Configurable thresholds**: Warning (100ms), Critical (500ms)
- **Rolling window tracking**: Last 1000 queries over 5 minutes
- **Per-table statistics**: Track operations, durations, percentiles
- **Automatic alerting**: Email alerts for critical queries with cooldown
- **Query wrapper utility**: Easy integration with existing queries

```typescript
// Usage
import { trackQuery, getSlowQueryStats, withQueryTracking } from '@/lib/monitoring'

// Manual tracking
const start = performance.now()
const result = await supabase.from('pets').select('*')
trackQuery('pets', 'select', performance.now() - start, result.data?.length)

// Automatic tracking with wrapper
const result = await withQueryTracking('pets', 'select',
  () => supabase.from('pets').select('*')
)

// Get statistics
const stats = getSlowQueryStats()
```

### 2. Scoped Queries Integration (`lib/supabase/scoped.ts`)

Integrated slow query tracking into the existing `scopedQueries` module:

- **select()**: Tracks duration and row count
- **insert()**: Tracks duration and record count
- **update()**: Tracks duration and affected rows
- **upsert()**: Tracks duration and record count
- **delete()**: Tracks duration
- **count()**: Tracks duration and count result

All tenant-scoped queries now automatically report timing to the slow query tracker.

### 3. Health Dashboard Endpoint (`/api/health/queries`)

API endpoint for monitoring slow query statistics:

```
GET /api/health/queries
Authorization: Bearer <CRON_SECRET>

Query params:
- table: Filter by specific table name
- format: 'summary' (default) or 'detailed'
```

Response:
```json
{
  "status": "healthy" | "degraded" | "unhealthy",
  "summary": {
    "totalQueries": 1234,
    "warningCount": 45,
    "criticalCount": 3,
    "slowQueryRate": 3.89,
    "avgDurationMs": 42,
    "p95DurationMs": 187,
    "p99DurationMs": 423,
    "maxDurationMs": 1250,
    "topSlowTables": [...],
    "recentCritical": [...]
  },
  "thresholds": {
    "warning_ms": 100,
    "critical_ms": 500,
    "unhealthy_rate_percent": 5
  },
  "recommendations": [...]
}
```

### 4. Alerting Integration

Leverages existing alert system (`lib/monitoring/alerts.ts`):

- Alerts via email using existing Resend integration
- 5-minute cooldown per table to prevent alert spam
- Minimum query threshold before alerting (prevents false positives on low traffic)
- Includes window statistics in alert context

### Health Status Thresholds

| Status | Condition |
|--------|-----------|
| Healthy | <5% critical queries |
| Degraded | >10% slow queries (warning+critical) |
| Unhealthy | >5% critical queries |

## Files Created/Modified

| File | Action |
|------|--------|
| `lib/monitoring/slow-query.ts` | **Created** - Core slow query detection module |
| `lib/monitoring/index.ts` | **Modified** - Export slow query functions |
| `lib/supabase/scoped.ts` | **Modified** - Integrated query tracking |
| `app/api/health/queries/route.ts` | **Created** - Dashboard API endpoint |

## Acceptance Criteria

- [x] Queries > 100ms logged (warning level)
- [x] Queries > 500ms trigger alerts (critical level)
- [x] Alert includes table name, operation, duration, and window statistics
- [x] Dashboard shows slow query trends via `/api/health/queries`
- [ ] Weekly slow query report (deferred - requires cron job for scheduled reports)

## Supabase Configuration Note

For PostgreSQL-level logging (optional, requires Supabase dashboard access):

```sql
-- Enable in Supabase Dashboard > Settings > Database > Log Settings
-- Or contact Supabase support for:
ALTER SYSTEM SET log_min_duration_statement = 100; -- Log queries > 100ms
```

The application-level tracking implemented here provides immediate visibility without requiring database configuration changes.

## Estimated Effort
- 5 hours (actual: ~4 hours)

## Resolution Summary

**Completed:** January 2026

Implemented comprehensive slow query detection at the application level:
- In-memory tracking with configurable thresholds
- Automatic integration with tenant-scoped queries
- Email alerting for critical queries
- REST API for dashboard visualization
- Health status classification with recommendations
