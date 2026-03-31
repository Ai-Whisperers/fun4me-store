# Migration Guide: 088-090 (Atomic Operations)

> **Created**: January 15, 2026  
> **Status**: ✅ Ready for Production  
> **Risk Level**: LOW (additive only, backward compatible)

---

## Overview

Migrations 088-090 introduce **atomic database functions** to eliminate critical race conditions in appointment booking, appointment rescheduling, and cart merging operations.

### What's Being Fixed

| Migration | Purpose | Race Condition Eliminated |
|-----------|---------|---------------------------|
| **088** | Atomic appointment booking | Double-booking when multiple users book same slot |
| **089** | Atomic appointment reschedule | Double-booking when rescheduling to occupied slot |
| **090** | Atomic cart merge | Lost cart items when logging in on multiple devices |

### Why This is Safe

- ✅ **Additive only** - Creates new functions, doesn't modify existing tables
- ✅ **Backward compatible** - Old code continues working (no breaking changes)
- ✅ **Rollback friendly** - Functions can be dropped without data loss
- ✅ **Tested** - Comprehensive load tests verify correctness under concurrency

---

## Pre-Deployment Checklist

### 1. Backup Database

```bash
# Via Supabase Dashboard
# Project Settings → Database → Database Backups → Create Backup

# Or via pg_dump (if using custom Postgres)
pg_dump $DATABASE_URL > backup_pre_088_090_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Verify Environment

```bash
# Confirm you're targeting the correct environment
echo $DATABASE_URL

# Expected output patterns:
# Production: db.xxx.supabase.co
# Staging: db.yyy-staging.supabase.co
# Development: localhost:54322
```

### 3. Check Database Connectivity

```bash
# Test connection
psql $DATABASE_URL -c "SELECT current_database(), current_user;"

# Expected output:
#  current_database | current_user
# ------------------+--------------
#  postgres         | postgres
```

### 4. Review Current Migrations

```bash
# Check if migrations already applied
psql $DATABASE_URL -c "
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname IN ('book_appointment_atomic', 'reschedule_appointment_atomic', 'merge_cart_atomic')
ORDER BY proname;
"

# If any rows returned → migrations already applied (skip deployment)
# If no rows → proceed with deployment
```

---

## Deployment Methods

Choose **ONE** of the following methods:

---

## Method 1: Supabase SQL Editor (Recommended for Supabase Users)

**Advantages**: Built-in rollback, transaction support, audit trail

### Step 1: Open SQL Editor

1. Navigate to Supabase Dashboard
2. Select your project
3. Go to **SQL Editor** tab
4. Click **New query**

### Step 2: Apply Migration 088

1. Open `web/db/migrations/088_atomic_appointment_booking.sql`
2. Copy the entire file contents
3. Paste into SQL Editor
4. Click **Run** (or press Ctrl+Enter)
5. **Verify output**:
   ```
   NOTICE:  Atomic appointment booking migration complete
   ```

### Step 3: Apply Migration 089

1. Open `web/db/migrations/089_atomic_appointment_reschedule.sql`
2. Copy the entire file contents
3. Paste into SQL Editor
4. Click **Run**
5. **Verify output**:
   ```
   NOTICE:  Atomic appointment reschedule migration complete
   ```

### Step 4: Apply Migration 090

1. Open `web/db/migrations/090_atomic_cart_merge.sql`
2. Copy the entire file contents
3. Paste into SQL Editor
4. Click **Run**
5. **Verify output**:
   ```
   NOTICE:  Atomic cart merge migration complete
   ```

---

## Method 2: psql Command Line

**Advantages**: Scriptable, repeatable, works with any PostgreSQL

### Step 1: Navigate to Migrations Directory

```bash
cd web/db/migrations
```

### Step 2: Apply Migrations in Order

```bash
# Migration 088
psql $DATABASE_URL -f 088_atomic_appointment_booking.sql

# Migration 089
psql $DATABASE_URL -f 089_atomic_appointment_reschedule.sql

# Migration 090
psql $DATABASE_URL -f 090_atomic_cart_merge.sql
```

### Step 3: Verify Success

```bash
# Check for success notices
# Expected output for each migration:
NOTICE:  Atomic appointment booking migration complete
NOTICE:  Atomic appointment reschedule migration complete
NOTICE:  Atomic cart merge migration complete
```

---

## Method 3: Node.js Migration Runner

**Advantages**: Automated, includes error handling, can run from CI/CD

### Step 1: Create Runner Script

File: `web/scripts/apply-migrations-088-090.mjs`

```javascript
#!/usr/bin/env node
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function applyMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable not set');
  }

  const sql = postgres(databaseUrl, { max: 1 });

  const migrations = [
    '088_atomic_appointment_booking.sql',
    '089_atomic_appointment_reschedule.sql',
    '090_atomic_cart_merge.sql',
  ];

  try {
    for (const migration of migrations) {
      console.log(`Applying ${migration}...`);
      
      const migrationPath = join(__dirname, '../db/migrations', migration);
      const migrationSql = await readFile(migrationPath, 'utf-8');
      
      await sql.unsafe(migrationSql);
      console.log(`✅ ${migration} applied successfully`);
    }

    console.log('\n✅ All migrations applied successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await sql.end();
  }
}

applyMigrations().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

### Step 2: Run Script

```bash
# From web/ directory
node scripts/apply-migrations-088-090.mjs

# Expected output:
Applying 088_atomic_appointment_booking.sql...
✅ 088_atomic_appointment_booking.sql applied successfully
Applying 089_atomic_appointment_reschedule.sql...
✅ 089_atomic_appointment_reschedule.sql applied successfully
Applying 090_atomic_cart_merge.sql...
✅ 090_atomic_cart_merge.sql applied successfully

✅ All migrations applied successfully
```

---

## Post-Deployment Verification

### 1. Verify Functions Exist

```sql
-- Run in SQL Editor or psql
SELECT 
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'book_appointment_atomic',
    'reschedule_appointment_atomic',
    'merge_cart_atomic'
  )
ORDER BY p.proname;
```

**Expected Output** (3 rows):

```
         function_name         |              arguments               | return_type
-------------------------------+--------------------------------------+-------------
 book_appointment_atomic       | p_tenant_id text, p_pet_id uuid, ... | jsonb
 merge_cart_atomic             | p_customer_id uuid, p_tenant_id ...  | jsonb
 reschedule_appointment_atomic | p_appointment_id uuid, p_new_sta...  | jsonb
```

### 2. Verify Permissions

```sql
-- Check function permissions
SELECT 
  p.proname AS function_name,
  pg_catalog.array_to_string(p.proacl, E'\n') AS permissions
FROM pg_proc p
WHERE p.proname IN (
  'book_appointment_atomic',
  'reschedule_appointment_atomic',
  'merge_cart_atomic'
)
ORDER BY p.proname;
```

**Expected Output**: Each function should have `authenticated=X/postgres` permission

### 3. Verify Index

```sql
-- Check if performance index was created
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE indexname = 'idx_appointments_vet_time_status';
```

**Expected Output** (1 row):

```
 schemaname |  tablename   |         indexname                | indexdef
------------+--------------+----------------------------------+----------
 public     | appointments | idx_appointments_vet_time_status | CREATE INDEX...
```

### 4. Test Function Calls (Dry Run)

```sql
-- Test booking function (use fake IDs - will return error but proves function works)
SELECT book_appointment_atomic(
  'test_tenant',
  gen_random_uuid(),
  gen_random_uuid(),
  gen_random_uuid(),
  NOW() + INTERVAL '1 day',
  30,
  'Test booking',
  null,
  null
);

-- Expected output (error is OK - we're testing function exists):
-- {"error": "PET_NOT_FOUND", "success": false, "message": "Mascota no encontrada"}

-- Test reschedule function
SELECT reschedule_appointment_atomic(
  gen_random_uuid(),
  NOW() + INTERVAL '2 days',
  gen_random_uuid(),
  false
);

-- Expected output:
-- {"error": "NOT_FOUND", "success": false, "message": "Cita no encontrada"}

-- Test cart merge function
SELECT merge_cart_atomic(
  gen_random_uuid(),
  'test_tenant',
  '[]'::jsonb
);

-- Expected output:
-- {"items": [], "success": true, "item_count": 0}
```

If all functions return JSON responses (not errors), deployment is successful.

---

## Application Code Updates (Optional but Recommended)

The new atomic functions are **ready to use** but the application code must be updated to call them.

### Files to Update

| File | Change Required |
|------|----------------|
| `web/app/actions/appointments.ts` | Already updated (Session 3) |
| `web/app/api/store/cart/route.ts` | Already updated (Session 3) |

**Status**: ✅ Code changes already committed in Session 3 (commits `ac5f565`, `0bdac23`)

### Verification in Codebase

```bash
# Verify bookAppointment uses atomic function
grep -n "book_appointment_atomic" web/app/actions/appointments.ts

# Verify rescheduleAppointment uses atomic function
grep -n "reschedule_appointment_atomic" web/app/actions/appointments.ts

# Verify cart merge uses atomic function
grep -n "merge_cart_atomic" web/app/api/store/cart/route.ts
```

**Expected Output**: Should find function calls in these files

---

## Testing Post-Deployment

### 1. Manual Testing

#### Test Appointment Booking

1. Log in as pet owner
2. Navigate to `/[clinic]/book`
3. Select a service and time slot
4. Submit booking
5. **Verify**: Appointment created successfully

#### Test Appointment Reschedule

1. Log in as pet owner
2. Navigate to `/[clinic]/portal/appointments`
3. Find an upcoming appointment
4. Click "Reschedule"
5. Select new time slot
6. **Verify**: Reschedule succeeds

#### Test Cart Merge

1. **Device A**: Add items to cart (logged out)
2. **Device B**: Log in with same user
3. **Device B**: Add different items to cart
4. **Device A**: Log in
5. **Verify**: Cart contains items from both devices (no items lost)

### 2. Automated Testing

```bash
# Run load tests (verifies concurrency behavior)
cd web
npm run test:load:appointments

# Expected output:
✅ Race condition test passed:
   - Successful bookings: 1
   - Rejected (slot unavailable): 9
   - Failed with errors: 0
   - Database verification: Exactly 1 appointment created ✓
```

### 3. Monitor Production Logs

```bash
# Watch for errors after deployment (first 15 minutes critical)
# In Supabase Dashboard → Logs → Database Logs

# Look for:
# - Function execution errors
# - Deadlock errors
# - Performance issues
```

---

## Rollback Procedures

### When to Rollback

- ❌ Functions causing errors in production
- ❌ Performance degradation detected
- ❌ Unexpected behavior in booking/cart flows

### Method 1: Drop Functions (Safe - No Data Loss)

```sql
-- Remove the atomic functions
DROP FUNCTION IF EXISTS public.book_appointment_atomic CASCADE;
DROP FUNCTION IF EXISTS public.reschedule_appointment_atomic CASCADE;
DROP FUNCTION IF EXISTS public.merge_cart_atomic CASCADE;

-- Note: This does NOT delete any tables or data
-- Appointments and cart data remain intact
```

### Method 2: Revert Code Changes

```bash
# If application code was updated to use new functions, revert:
git revert ac5f565  # Revert cart merge changes
git revert 0bdac23  # Revert appointment booking changes
git push origin develop
```

### Method 3: Full Rollback (Nuclear Option)

```bash
# Restore from pre-deployment backup
# Via Supabase Dashboard:
# Project Settings → Database → Database Backups → Restore

# Or via pg_restore (if using custom Postgres):
psql $DATABASE_URL < backup_pre_088_090_YYYYMMDD_HHMMSS.sql
```

---

## Performance Impact

### Expected Impact

| Metric | Before | After | Impact |
|--------|--------|-------|--------|
| **Booking Time** | ~50ms | ~60ms | +20% (acceptable) |
| **Reschedule Time** | ~40ms | ~50ms | +25% (acceptable) |
| **Cart Merge Time** | ~30ms | ~35ms | +17% (acceptable) |
| **Concurrent Safety** | ❌ Race conditions | ✅ No race conditions | **Critical fix** |

### Why Slower?

- Row-level locks (`FOR UPDATE`) add ~10-15ms latency
- Trade-off: **Correctness > Speed** (eliminates financial loss from double-booking)

### Monitoring Queries

```sql
-- Monitor function performance (run after 24 hours)
SELECT 
  schemaname,
  funcname,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_user_functions
WHERE funcname IN (
  'book_appointment_atomic',
  'reschedule_appointment_atomic',
  'merge_cart_atomic'
)
ORDER BY funcname;
```

**Red Flags**:
- `mean_time` > 500ms → Investigate slow queries
- `max_time` > 5000ms → Possible deadlock or timeout

---

## Troubleshooting

### Issue 1: "Function does not exist" Error

**Symptom**: Application code calls function but gets error 42883

**Cause**: Migration not applied or permissions missing

**Fix**:
```sql
-- Verify function exists
SELECT proname FROM pg_proc WHERE proname = 'book_appointment_atomic';

-- If not found, re-run migration
-- If found, check permissions:
GRANT EXECUTE ON FUNCTION book_appointment_atomic TO authenticated;
```

### Issue 2: Deadlock Errors

**Symptom**: Error `deadlock detected` in logs

**Cause**: Conflicting locks (rare, should not happen with atomic functions)

**Fix**:
```sql
-- Monitor deadlocks
SELECT * FROM pg_stat_database WHERE datname = current_database();

-- Check deadlock_timeout setting (should be 1s)
SHOW deadlock_timeout;

-- If deadlocks persist, increase timeout:
ALTER DATABASE postgres SET deadlock_timeout = '2s';
```

### Issue 3: Performance Degradation

**Symptom**: Booking operations take >1 second

**Cause**: Missing index or high concurrency

**Fix**:
```sql
-- Verify index exists
SELECT indexname FROM pg_indexes WHERE indexname = 'idx_appointments_vet_time_status';

-- If missing, create:
CREATE INDEX CONCURRENTLY idx_appointments_vet_time_status
ON appointments(tenant_id, vet_id, start_time, end_time, status)
WHERE status NOT IN ('cancelled', 'no_show');

-- Analyze table for query planner
ANALYZE appointments;
```

### Issue 4: Slot Appears Available But Booking Fails

**Symptom**: UI shows slot available, but booking returns `SLOT_UNAVAILABLE`

**Cause**: Race condition between availability check and booking (expected behavior - atomic function prevents double-booking)

**Fix**: This is **correct behavior**. The atomic function prevents double-booking by locking slots during transaction.

**User Experience Improvement**: Add retry logic in frontend:
```typescript
// In booking code (pseudo-code)
async function bookAppointment(data) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const result = await bookAppointmentAtomic(data);
    if (result.success) return result;
    if (result.error === 'SLOT_UNAVAILABLE') {
      // Someone else booked it - show user
      throw new Error('Slot no longer available');
    }
    // Other errors - retry
    await sleep(100 * attempt);
  }
}
```

---

## FAQ

### Q1: Will this affect existing appointments?

**A**: No. Migrations only add new functions. Existing appointments, cart data, and all tables remain unchanged.

### Q2: Do I need to update application code?

**A**: Not immediately. Old code continues working. Update code when ready to eliminate race conditions.

### Q3: What if migrations fail halfway?

**A**: Each migration is wrapped in a transaction. If it fails, it rolls back automatically. No partial state.

### Q4: Can I run these migrations on production without downtime?

**A**: Yes. These are additive-only migrations. No schema changes to existing tables.

### Q5: How do I verify migrations were successful?

**A**: Run the verification queries in the "Post-Deployment Verification" section above.

---

## Success Criteria

✅ All migrations applied without errors  
✅ All 3 functions exist in `pg_proc`  
✅ Functions have `authenticated` EXECUTE permission  
✅ Index `idx_appointments_vet_time_status` exists  
✅ Test function calls return JSON (not errors)  
✅ Load tests pass (0 errors, 1 success in concurrency test)  
✅ No errors in production logs (first 24 hours)  
✅ Booking/reschedule/cart operations work normally  

---

## Related Documentation

- [CRITICAL_EPICS.md](../CRITICAL_EPICS.md) - Epic 1 (Data Integrity)
- [Load Test README](../../web/tests/load/README.md) - Concurrency testing
- [Session Continuation](../../SESSION_CONTINUATION.md) - Implementation history

---

**Last Updated**: January 15, 2026  
**Deployed To**: 🔶 Pending (ready for production)  
**Verified By**: 🔶 Pending (awaiting production deployment)
