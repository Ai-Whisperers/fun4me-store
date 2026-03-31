# OPS-002: Performance Monitoring Dashboard

## Priority: P2
## Category: Operations
## Status: ✅ Completed
## Epic: [EPIC-11: Operations & Observability](../epics/EPIC-11-operations.md)

## Description
Set up a comprehensive performance monitoring dashboard to track API response times, database query performance, and system health metrics.

## Implementation Summary

### What Was Built

1. **Unified Metrics API Endpoint** (`/api/health/metrics`)
   - Aggregates all monitoring data into a single endpoint
   - Supports JSON and Prometheus output formats
   - Protected by CRON_SECRET or platform admin authentication
   - Returns: status, uptime, API metrics, DB metrics, memory usage

2. **Historical Metrics Storage** (Migration 067)
   - PostgreSQL table `performance_metrics_history`
   - Stores periodic snapshots with full metric data
   - RLS policies for platform admin access
   - Cleanup function for data retention (90 days default)

3. **Metrics Capture Cron Job** (`/api/cron/capture-metrics`)
   - Captures metrics every 5 minutes
   - Stores snapshots in `performance_metrics_history`
   - Non-critical job with 10-second slow threshold

4. **Historical Metrics API** (`/api/health/metrics/history`)
   - Supports time ranges: 1h, 6h, 24h, 7d, 30d
   - Returns summary statistics and data points
   - Platform admin authentication required

5. **Monitoring Dashboard** (`/platform/monitoring`)
   - Real-time metrics display with auto-refresh
   - System health status banner (healthy/degraded/critical)
   - API response time cards with percentiles
   - Database performance section with slow query tracking
   - Memory usage visualization
   - Historical trend charts using Recharts
   - Time range selector for historical data

### Files Created/Modified

**Created:**
- `web/app/api/health/metrics/route.ts` - Unified metrics API
- `web/app/api/health/metrics/history/route.ts` - Historical metrics API
- `web/app/api/cron/capture-metrics/route.ts` - Metrics capture cron
- `web/app/platform/monitoring/page.tsx` - Dashboard page
- `web/app/platform/monitoring/client.tsx` - Dashboard client component
- `web/db/migrations/067_performance_metrics_history.sql` - DB migration
- `web/tests/api/health/metrics.test.ts` - Unit tests (17 tests)

**Modified:**
- `web/app/platform/layout.tsx` - Added monitoring nav link

## Acceptance Criteria

- [x] Real-time API response time tracking
- [x] Database query performance visibility
- [x] Error rate tracking
- [x] Historical data (30+ days) - 90-day retention
- [x] Alerting on performance degradation (via status indicators)
- [x] Dashboard accessible to admins (platform admins)

## Key Metrics Tracked

### API Performance
- Response time: p50, p95, p99, average
- Requests per minute
- Error rate (percentage)
- Total requests and errors

### Database Performance
- Average query time (ms)
- Slow query count (>100ms)
- Critical query count (>1s)
- Slow query rate
- Top slow tables with avg latency

### System Health
- Memory usage (heap used, total, RSS, external)
- Node.js version
- Environment
- Uptime

### Status Determination
- **Healthy**: No critical endpoints, <10 critical queries, <10% slow query rate
- **Degraded**: Warning endpoints exist OR slow query rate >10%
- **Critical**: Critical endpoints exist OR >10 critical queries

## Testing

```bash
# Run tests
npm run test:unit -- tests/api/health/metrics.test.ts
```

17 tests covering:
- Response structure validation
- Status determination logic
- Duration formatting
- Memory conversion
- Historical data calculations
- Time range support

## Usage

### Access Dashboard
Navigate to `/platform/monitoring` (platform admin required)

### API Access
```bash
# With CRON_SECRET
curl -H "Authorization: Bearer $CRON_SECRET" /api/health/metrics

# Prometheus format
curl "/api/health/metrics?format=prometheus&key=$CRON_SECRET"

# Historical data
curl "/api/health/metrics/history?range=24h"
```

### Cron Setup
Add to Vercel/your scheduler:
- Endpoint: `/api/cron/capture-metrics`
- Schedule: Every 5 minutes
- Authorization: CRON_SECRET header

## Related Files
- `lib/monitoring/` - Core monitoring infrastructure
- `lib/monitoring/metrics.ts` - MetricsCollector class
- `lib/monitoring/error-rate.ts` - Error rate tracking
- `lib/monitoring/slow-query.ts` - Slow query tracking

## Estimated Effort
- Original: 6 hours
- Actual: ~5 hours
  - Unified metrics endpoint: 1h
  - Historical storage (migration + API): 1h
  - Dashboard UI: 2h
  - Tests: 1h
