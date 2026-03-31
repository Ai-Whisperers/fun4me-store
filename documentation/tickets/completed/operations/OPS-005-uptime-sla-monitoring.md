# OPS-005: Uptime SLA Monitoring

## Priority: P2
## Category: Operations
## Status: ✅ Completed (Code)
## Epic: [EPIC-11: Operations & Observability](../epics/EPIC-11-operations.md)

## Description
Implement uptime monitoring with SLA tracking to ensure service availability meets commitments.

## Implementation Summary

### Completed Components ✅

**Health Check Endpoint** (`app/api/health/route.ts`):
- Database connectivity check with latency measurement
- Supabase Auth service check
- Environment configuration validation
- Returns `healthy`, `degraded`, or `unhealthy` status
- HTTP 200 for healthy/degraded, 503 for unhealthy
- Response includes all checks with individual latencies

**SLA Calculation Utilities** (`lib/monitoring/sla.ts`):
- `calculateSLA()` - Main SLA metrics calculation
- `calculateDowntime()` - From incident records
- `calculateMTTR()` - Mean Time To Recovery
- `calculateMTBF()` - Mean Time Between Failures
- Period support: daily, weekly, monthly, quarterly, yearly
- SLA status: `met`, `at_risk`, `breached`
- Helper functions: `formatUptime()`, `formatDuration()`, `getAllowedDowntime()`

### External Service Setup (Manual)

The code implementation is complete. The following items require external service configuration:

1. **External Monitoring Service** (Betterstack, UptimeRobot, etc.):
   - Configure to poll `/api/health` every 1 minute
   - Set up alerting thresholds

2. **Status Page** (Betterstack, Statuspage.io, etc.):
   - Create public status page
   - Link to health check endpoint
   - Configure incident management

3. **Subscriber Notifications**:
   - Email/SMS notifications for downtime
   - Configure in external service

## Acceptance Criteria
- [x] Health endpoint checks all services (database, auth, environment)
- [ ] External monitoring every 1 minute - *Requires Betterstack/similar setup*
- [ ] Public status page available - *Requires Betterstack/similar setup*
- [x] SLA calculation utilities implemented (uptime %, MTTR, MTBF)
- [ ] Automatic incident creation - *Requires external service*
- [x] 99.9% uptime target tracked in SLA utilities

## Related Files
- `app/api/health/route.ts` - Comprehensive health check endpoint
- `lib/monitoring/sla.ts` - SLA calculation utilities

## Completed
- January 2026 (Code implementation)
- External service setup: Pending manual configuration
