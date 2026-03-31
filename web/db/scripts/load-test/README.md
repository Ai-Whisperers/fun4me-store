# Load Testing Guide

This directory contains scripts and configurations for load testing the Vete platform at scale (10K+ tenants).

## Overview

The load testing suite simulates:
- **10,000 clinics** (tenants)
- **100,000 users** (10 per clinic average)
- **1,000,000 pets** (100 per clinic average)
- **Realistic query patterns** based on production workloads

## Prerequisites

```bash
# Install k6 for load testing
# Windows (with Chocolatey)
choco install k6

# macOS
brew install k6

# Or download from https://k6.io/docs/get-started/installation/
```

## Quick Start

```bash
# 1. Generate test data
npm run db:load-test:generate

# 2. Seed test tenants (takes ~30 minutes for 10K tenants)
npm run db:load-test:seed

# 3. Run load tests
npm run db:load-test:run

# 4. View results
npm run db:load-test:report
```

## Test Scenarios

### Scenario 1: Dashboard Load (Most Common)
- Staff logs in and views dashboard
- Fetches today's appointments, recent patients, pending invoices
- **Target**: 500 requests/second, <200ms p95 latency

### Scenario 2: Appointment Booking (Peak Hours)
- Pet owners booking appointments
- Checks availability, creates appointment, sends confirmation
- **Target**: 100 requests/second, <500ms p95 latency

### Scenario 3: Medical Records Query (Heavy Read)
- Vet searches patient history
- Pagination through records with filters
- **Target**: 200 requests/second, <300ms p95 latency

### Scenario 4: Checkout Flow (Transaction Heavy)
- E-commerce checkout with inventory reservation
- Creates order, updates stock, processes payment
- **Target**: 50 requests/second, <1000ms p95 latency

### Scenario 5: Mixed Workload (Realistic)
- 60% reads, 30% writes, 10% heavy queries
- Simulates normal business hours
- **Target**: 1000 requests/second aggregate

## Files

```
load-test/
├── README.md                    # This file
├── config.ts                    # Test configuration
├── generate-tenants.ts          # Generate test tenant data
├── seed-tenants.ts              # Seed tenants to database
├── scenarios/
│   ├── dashboard.js             # Dashboard load scenario
│   ├── booking.js               # Appointment booking scenario
│   ├── medical-records.js       # Medical records queries
│   ├── checkout.js              # E-commerce checkout
│   └── mixed.js                 # Mixed workload
├── utils/
│   ├── auth.js                  # Authentication helpers
│   ├── data.js                  # Test data generators
│   └── metrics.js               # Custom metrics
└── reports/                     # Generated test reports
```

## Configuration

Edit `config.ts` to adjust test parameters:

```typescript
export const config = {
  // Target environment
  baseUrl: process.env.LOAD_TEST_URL || 'http://localhost:3000',

  // Scale parameters
  tenants: 10000,
  usersPerTenant: 10,
  petsPerTenant: 100,

  // Load parameters
  virtualUsers: 100,
  duration: '10m',
  rampUp: '2m',
  rampDown: '1m',

  // Thresholds
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
}
```

## Running Tests

### Local Development

```bash
# Run against local server
LOAD_TEST_URL=http://localhost:3000 npm run db:load-test:run
```

### Staging Environment

```bash
# Run against staging
LOAD_TEST_URL=https://staging.vete.app npm run db:load-test:run -- --scenario=mixed
```

### Production Baseline

```bash
# Run minimal test against production (off-peak hours only!)
LOAD_TEST_URL=https://vete.app npm run db:load-test:run -- --scenario=dashboard --vus=10 --duration=1m
```

## Interpreting Results

### Key Metrics

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| p95 Latency | <200ms | <500ms | >1000ms |
| Error Rate | <0.1% | <1% | >5% |
| Throughput | >target | 80% target | <50% target |
| DB Connections | <80% pool | <90% pool | 100% pool |

### Sample Output

```
          /\      |‾‾| /‾‾/   /‾‾/
     /\  /  \     |  |/  /   /  /
    /  \/    \    |     (   /   ‾‾\
   /          \   |  |\  \ |  (‾)  |
  / __________ \  |__| \__\ \_____/ .io

  execution: local
     script: scenarios/mixed.js
     output: -

  scenarios: (100.00%) 1 scenario, 100 max VUs, 12m30s max duration
           * default: Up to 100 VUs, 10m0s duration

  ✓ status is 200
  ✓ response time < 500ms

  checks.........................: 99.82% ✓ 298451  ✗ 541
  data_received..................: 1.2 GB 2.0 MB/s
  data_sent......................: 89 MB  148 kB/s
  http_req_blocked...............: avg=1.02ms  p(95)=2.31ms
  http_req_connecting............: avg=0.89ms  p(95)=1.98ms
  http_req_duration..............: avg=87.3ms  p(95)=198.4ms
  http_req_failed................: 0.18%  ✓ 541     ✗ 298451
  http_reqs......................: 298992 498.32/s
  iteration_duration.............: avg=201ms   p(95)=412ms
  iterations.....................: 149496 249.16/s
  vus............................: 100    min=1     max=100
  vus_max........................: 100    min=100   max=100
```

## Troubleshooting

### High Latency

1. Check database connection pool (may need to increase)
2. Verify indexes are being used (`EXPLAIN ANALYZE`)
3. Check for RLS policy performance
4. Enable session context (`set_tenant_context()`)

### Connection Errors

1. Increase connection pool size
2. Check Supabase connection limits
3. Verify PgBouncer/Supavisor configuration
4. Check for connection leaks

### Memory Issues

1. Reduce batch sizes in queries
2. Enable cursor-based pagination
3. Check for N+1 query patterns
4. Optimize large JSON responses

## Best Practices

1. **Always test on staging first** - Never load test production without approval
2. **Start small** - Begin with 10 VUs and increase gradually
3. **Monitor everything** - Watch database, API, and infrastructure metrics
4. **Test during off-peak** - Schedule intensive tests appropriately
5. **Clean up test data** - Remove test tenants after testing
6. **Document baseline** - Record performance before and after changes

---

_Last updated: January 2026_
