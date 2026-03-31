# Load Tests

Load tests for verifying race condition fixes and system performance under concurrent load.

## Tests

### Appointment Booking Concurrency Test

**File**: `appointment-booking-concurrency.test.ts`

**Purpose**: Verify that atomic appointment booking functions prevent double-booking when multiple users try to book the same time slot simultaneously.

**Coverage**:
- ✅ Concurrent booking attempts to same slot (should allow only 1)
- ✅ Sequential bookings to different slots (should allow all)
- ✅ Past time validation
- ✅ Concurrent reschedule attempts
- ✅ Performance benchmarks (100 bookings)

**Prerequisites**:
1. Migrations 088-089 must be applied to test database
2. Test database with test tenant, vet, service, and pet data

## Running Load Tests

### Setup

```bash
# Ensure environment variables are set in .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
```

### Run Tests

```bash
# Run all load tests
npm run test:load

# Run specific test file
npm run test:load:appointments

# Or use vitest directly
npx vitest tests/load/appointment-booking-concurrency.test.ts
```

## Test Configuration

Edit the test file to configure:

```typescript
const CONCURRENT_REQUESTS = 10 // Number of simultaneous attempts
const TEST_TENANT_ID = 'test-clinic'
const TEST_VET_ID = 'test-vet-uuid'
const TEST_PET_ID = 'test-pet-uuid'
const TEST_SERVICE_ID = 'test-service-uuid'
```

## Expected Results

### Race Condition Test

When 10 users try to book the same slot:
- ✅ **1** booking succeeds
- ✅ **9** bookings rejected with "SLOT_UNAVAILABLE"
- ✅ **0** database errors
- ✅ Database contains exactly 1 appointment

### Performance Benchmark

100 bookings for different slots:
- ✅ Should complete in < 30 seconds
- ✅ Average < 300ms per booking
- ✅ Throughput > 3 bookings/second

## Interpreting Results

### Success Indicators

```
✅ Race condition test passed:
   - Successful bookings: 1
   - Rejected (slot unavailable): 9
   - Failed with errors: 0
   - Database verification: Exactly 1 appointment created ✓
```

This indicates the atomic function is working correctly - only one request succeeded even when 10 arrived simultaneously.

### Failure Indicators

```
❌ Multiple successful bookings detected!
   - Successful bookings: 3
```

This indicates a race condition - multiple requests were able to book the same slot. The atomic function may not be working correctly or migrations weren't applied.

## Troubleshooting

### Error: "Migration 088 not applied"

```bash
# Apply migrations
cd web/db/migrations
psql $DATABASE_URL -f 088_atomic_appointment_booking.sql
psql $DATABASE_URL -f 089_atomic_appointment_reschedule.sql
```

### Error: "Test data not found"

Create test data in your test database:

```sql
-- Create test tenant
INSERT INTO tenants (id, name) VALUES ('test-clinic', 'Test Clinic');

-- Create test vet
INSERT INTO profiles (id, tenant_id, role, full_name)
VALUES ('test-vet-uuid', 'test-clinic', 'vet', 'Dr. Test');

-- Create test pet
INSERT INTO pets (id, tenant_id, owner_id, name, species)
VALUES ('test-pet-uuid', 'test-clinic', 'test-owner-uuid', 'Test Pet', 'dog');

-- Create test service
INSERT INTO services (id, tenant_id, name, category, base_price)
VALUES ('test-service-uuid', 'test-clinic', 'Consulta', 'consultation', 50000);
```

## Adding New Load Tests

Template for new load test:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const CONCURRENT_REQUESTS = 10

describe('My Load Test', () => {
  let supabase: ReturnType<typeof createClient>

  beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  })

  it('should handle concurrent requests correctly', async () => {
    const promises = Array.from({ length: CONCURRENT_REQUESTS }, () =>
      // Your concurrent operation here
    )

    const results = await Promise.allSettled(promises)

    // Verify only expected number succeeded
    const successful = results.filter(r => r.status === 'fulfilled')
    expect(successful.length).toBe(1) // Or expected number
  })
})
```

## CI/CD Integration

These tests should be run:
- ✅ After applying migrations 088-089
- ✅ Before deploying to production
- ✅ As part of pre-release testing
- ⚠️  NOT in the standard CI pipeline (too slow, requires test data)

## Further Reading

- `web/db/migrations/088_atomic_appointment_booking.sql` - Atomic booking implementation
- `web/db/migrations/089_atomic_appointment_reschedule.sql` - Atomic reschedule implementation
- `web/app/actions/appointments.ts` - Server actions using atomic functions
- `documentation/CRITICAL_EPICS.md` - Race condition fixes documentation
