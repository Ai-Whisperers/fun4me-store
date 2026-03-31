# Performance Baseline Tests

Establish and track performance baselines for critical API endpoints.

## Purpose

These tests measure response times for the 10 most critical API endpoints to:
1. **Establish baseline metrics** - Know what "normal" performance looks like
2. **Detect regressions** - Alert when performance degrades
3. **Guide optimization** - Identify slow endpoints that need improvement
4. **Track trends** - Monitor performance over time

---

## Test Coverage

### Endpoints Tested (10 critical routes)

| Endpoint | Target | Complexity | Notes |
|----------|--------|------------|-------|
| `GET /api/pets` | <2000ms | Low | Simple list query |
| `GET /api/appointments/slots` | <2000ms | Medium | RPC function with date logic |
| `GET /api/store/products` | <2000ms | Low | Product listing |
| `GET /api/vaccines` | <2000ms | Medium | Join with pets + profiles |
| `GET /api/medical-records` | <2000ms | Medium | Join with pets + profiles |
| `GET /api/billing/invoices` | <2000ms | Medium | Join with customer data |
| `GET /api/inventory/catalog` | <2000ms | Low | Global catalog (no tenant) |
| `POST /api/store/cart` | <2000ms | Low | Single insert |
| `GET /api/prescriptions` | <2000ms | Medium | Join with pets + profiles |
| `GET /api/dashboard/expiring-products` | <3000ms | High | Complex RPC (2 calls) |

---

## Metrics Captured

Each endpoint is tested **10 times** and reports:

- **Average (avg)**: Mean response time across all iterations
- **Minimum (min)**: Fastest response time
- **Maximum (max)**: Slowest response time
- **Median (p50)**: 50th percentile - typical response time
- **95th Percentile (p95)**: 95% of requests complete within this time
- **99th Percentile (p99)**: 99% of requests complete within this time

---

## Performance Targets

### Response Time Targets

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Average** | <2000ms | Most endpoints should feel responsive |
| **P95** | <4000ms | Allow for occasional slow queries |
| **P99** | <6000ms | Extreme outliers (network issues, etc.) |

### Failure Conditions

Tests **fail** if:
- Average response time exceeds target
- P95 exceeds 2x target (e.g., >4000ms for 2000ms target)

---

## Running Performance Tests

### Local Development

```bash
cd web

# Run performance baseline tests
npm run test:performance

# Run with verbose output
npm run test:performance -- --reporter=verbose

# Run specific endpoint
npm run test -- tests/performance/baseline.test.ts -t "GET /api/pets"
```

### CI/CD Integration

```yaml
# .github/workflows/performance.yml
name: Performance Baseline

on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday
  workflow_dispatch:

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: cd web && npm install
      - run: cd web && npm run test:performance
      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: web/tests/performance/results.json
```

---

## Interpreting Results

### Example Output

```
📊 GET /api/pets Performance:
  Avg: 145.32ms
  Min: 98.12ms
  Max: 312.45ms
  P50: 132.78ms
  P95: 287.90ms
  P99: 312.45ms
```

### What Good Looks Like

- ✅ **Avg < 500ms**: Endpoint is very fast
- ✅ **Avg < 1000ms**: Endpoint is fast
- ⚠️ **Avg < 2000ms**: Endpoint is acceptable (meets target)
- ❌ **Avg > 2000ms**: Endpoint is slow (needs optimization)

### P95 Analysis

P95 represents the "worst-case typical" experience. If P95 is high:
- **2x avg**: Normal variation (database load, network)
- **3x avg**: Investigate query performance
- **5x+ avg**: Critical issue - likely N+1 queries or missing indexes

---

## Baseline Storage

### Recording Baselines

Store baseline results for comparison:

```json
// web/tests/performance/baselines.json
{
  "version": "1.0.0",
  "recorded_at": "2026-01-19T13:00:00Z",
  "endpoints": {
    "GET /api/pets": {
      "avg": 145.32,
      "p95": 287.90,
      "p99": 312.45
    },
    "GET /api/appointments/slots": {
      "avg": 456.78,
      "p95": 823.45,
      "p99": 912.34
    }
  }
}
```

### Comparing Baselines

```bash
# Record new baseline
npm run test:performance -- --record

# Compare against baseline
npm run test:performance -- --compare

# Alert on >20% regression
npm run test:performance -- --threshold=0.2
```

---

## Optimization Workflow

### When a Test Fails

1. **Identify the slow endpoint**:
   ```
   ❌ GET /api/vaccines responds within 2000ms (avg)
      Expected: avg < 2000ms
      Actual: avg = 2345ms
   ```

2. **Profile the endpoint**:
   - Check database query plan: `EXPLAIN ANALYZE`
   - Look for N+1 queries (multiple queries in loop)
   - Check for missing indexes
   - Review join complexity

3. **Optimize**:
   - Add database indexes
   - Reduce join depth
   - Use select() to limit columns
   - Add caching for static data
   - Use RPC functions for complex logic

4. **Re-test**:
   ```bash
   npm run test -- tests/performance/baseline.test.ts -t "GET /api/vaccines"
   ```

5. **Record new baseline** (if improvement is significant)

---

## Common Performance Issues

### N+1 Query Problem

❌ **BAD**: Multiple queries in a loop
```typescript
const pets = await supabase.from('pets').select('*')
for (const pet of pets) {
  const vaccines = await supabase.from('vaccines').select('*').eq('pet_id', pet.id)
  // N+1: 1 query for pets + N queries for vaccines
}
```

✅ **GOOD**: Single query with join
```typescript
const pets = await supabase
  .from('pets')
  .select('*, vaccines(*)')
// 1 query total
```

### Missing Indexes

Slow queries often lack indexes on filter columns:

```sql
-- Add index on frequently queried columns
CREATE INDEX idx_vaccines_pet_id ON vaccines(pet_id);
CREATE INDEX idx_vaccines_tenant_id ON vaccines(tenant_id);

-- Composite index for common filter combinations
CREATE INDEX idx_vaccines_tenant_pet ON vaccines(tenant_id, pet_id);
```

### Over-fetching Data

❌ **BAD**: Select all columns when only a few are needed
```typescript
const pets = await supabase.from('pets').select('*')
```

✅ **GOOD**: Select only needed columns
```typescript
const pets = await supabase
  .from('pets')
  .select('id, name, species, breed')
```

---

## Load Testing (Future)

Performance baseline tests measure **single-threaded** response times. For **concurrent load** testing:

### Tools
- **Artillery**: HTTP load testing
- **k6**: Modern load testing tool
- **Locust**: Python-based load testing

### Example k6 Test

```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 10 },  // Ramp up to 10 users
    { duration: '5m', target: 10 },  // Stay at 10 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% under 2s
  },
};

export default function () {
  const res = http.get('https://vete.app/api/pets');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });
}
```

---

## Performance Monitoring (Production)

### Real User Monitoring (RUM)

Capture real user performance metrics:

```typescript
// lib/monitoring/performance.ts
export function trackApiPerformance(endpoint: string, duration: number) {
  // Send to monitoring service (e.g., Datadog, New Relic)
  if (window.performance && window.performance.mark) {
    performance.mark(`api-${endpoint}`)
  }

  // Log slow requests
  if (duration > 2000) {
    console.warn(`Slow API: ${endpoint} took ${duration}ms`)
  }
}
```

### APM Integration

Use Application Performance Monitoring (APM) tools:
- **Vercel Analytics** - Built-in for Vercel deployments
- **Sentry Performance** - Error tracking + performance
- **Datadog APM** - Full observability
- **New Relic** - Application monitoring

---

## Maintenance

### Weekly Tasks
- [ ] Run performance tests
- [ ] Review results for regressions
- [ ] Update baselines if performance improved

### Monthly Tasks
- [ ] Analyze performance trends
- [ ] Identify optimization opportunities
- [ ] Update performance targets (if needed)

### Quarterly Tasks
- [ ] Comprehensive load testing
- [ ] Review database indexes
- [ ] Audit query performance
- [ ] Update performance documentation

---

## Troubleshooting

### Tests Timeout

If tests timeout:
- Increase Vitest timeout: `test.setTimeout(10000)`
- Check database connectivity
- Verify Supabase instance is responsive

### High Variability

If P95/P99 are much higher than average:
- Network issues (check internet connection)
- Database cold start (first query is slow)
- External service latency (email, SMS)
- Run more iterations (increase from 10 to 50)

### Environment Differences

Performance varies by environment:
- **Local**: Fastest (no network latency)
- **CI/CD**: Moderate (shared resources)
- **Production**: Varies (real user load)

Always compare like-to-like (local vs local, prod vs prod).

---

## Resources

- **Supabase Performance**: https://supabase.com/docs/guides/database/performance
- **PostgreSQL Indexing**: https://www.postgresql.org/docs/current/indexes.html
- **Next.js Performance**: https://nextjs.org/docs/app/building-your-application/optimizing
- **Web Performance Best Practices**: https://web.dev/performance/

---

---

## New Baseline Test Suite (baseline-test.ts)

### Overview

The enhanced baseline test suite (`baseline-test.ts`) provides comprehensive performance measurement with:

- **10 critical endpoints** measured
- **20 iterations** per endpoint (configurable)
- **3 warmup runs** to prime caches
- **Automatic baseline storage** in JSON format
- **Comparison tool** to detect regressions

### Quick Start

```bash
# Establish baseline
npm run test:performance:baseline

# Compare against saved baseline
npm run test:performance:compare -- --baseline=baseline-2026-01-19.json
```

### Endpoints Measured

| Endpoint | Description | P95 Target |
|----------|-------------|------------|
| `GET /api/pets` | List pets for user | < 500ms |
| `POST /api/pets` | Create new pet | < 800ms |
| `GET /api/booking` | Booking page data | < 600ms |
| `GET /api/appointments/slots` | Available slots | < 700ms |
| `GET /api/dashboard/vaccines` | Vaccine dashboard | < 600ms |
| `GET /api/vaccines` | List vaccines | < 500ms |
| `GET /api/billing/invoices` | List invoices | < 700ms |
| `GET /api/inventory/catalog` | Inventory catalog | < 800ms |
| `GET /api/dashboard/inventory` | Inventory dashboard | < 600ms |
| `GET /api/analytics` | Analytics overview | < 1000ms |

### Output Example

```
📊 Performance Baseline Report Generated
   File: tests/performance/results/baseline-2026-01-19.json
   Total endpoints: 10
   Total measurements: 200
   Average response time: 345.67ms

┌─────────────────────────────────────────────┬────────┬────────┬────────┬────────┐
│ Endpoint                                    │ Mean   │ P50    │ P95    │ P99    │
├─────────────────────────────────────────────┼────────┼────────┼────────┼────────┤
│ GET /api/pets                               │ 123.45 │ 120.12 │ 156.78 │ 189.23 │
│ POST /api/pets                              │ 234.56 │ 230.45 │ 289.12 │ 312.34 │
│ GET /api/booking                            │ 198.76 │ 195.23 │ 245.89 │ 278.45 │
└─────────────────────────────────────────────┴────────┴────────┴────────┴────────┘
```

### Baseline Storage

Baselines are saved in `tests/performance/results/`:

```json
{
  "timestamp": "2026-01-19T14:30:00.000Z",
  "environment": "test",
  "measurements_per_endpoint": 20,
  "warmup_runs": 3,
  "endpoints": [
    {
      "endpoint": "/api/pets",
      "method": "GET",
      "description": "List all pets for a user",
      "stats": {
        "min": 98.76,
        "max": 189.23,
        "mean": 123.45,
        "p50": 120.12,
        "p95": 156.78,
        "p99": 189.23
      }
    }
  ]
}
```

### Regression Detection

Run comparison tool to detect performance regressions:

```bash
npm run test:performance:compare -- --baseline=baseline-2026-01-19.json
```

**Output**:
```
📊 Performance Comparison Report

Baseline: 2026-01-19T10:30:00.000Z
Current:  2026-01-19T14:45:00.000Z
Threshold: ±20% (p95)

Summary:
  🔴 Regressions:  2
  🟢 Improvements: 3
  ⚪ Stable:       5

🔴 REGRESSIONS DETECTED:
  GET /api/analytics
    P95: 567.89ms → 723.45ms (+27.4%)
```

---

**Last Updated**: January 19, 2026  
**Status**: Performance baseline infrastructure complete  
**Next Steps**: Run baseline test, establish metrics, track over time
