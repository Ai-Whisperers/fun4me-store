# SEC-010: Subscription Frequency Bounds Missing

## Priority: P3 (Low)
## Category: Security / Validation
## Status: COMPLETED

## Description
The subscription processing cron job uses `frequency_days` from the database without bounds checking, which could cause issues with extreme values.

## Current State
### Current Code
**`app/api/cron/process-subscriptions/route.ts:54`**
```typescript
const nextOrderDate = new Date()
nextOrderDate.setDate(nextOrderDate.getDate() + subscription.frequency_days)
// No validation on frequency_days
```

### Potential Issues
1. `frequency_days = 0`: Same-day reorder, potential infinite loop
2. `frequency_days = -1`: Past date, breaks scheduling
3. `frequency_days = 999999`: Year 4700+, timestamp overflow risk
4. `frequency_days = null/undefined`: NaN in date calculation

### Current Risk Assessment
- **Low** because database likely has constraints
- However, manual DB edits or migration errors could introduce bad data
- No defensive coding in the cron job

## Proposed Solution

### 1. Database Constraint
```sql
-- Add CHECK constraint to subscriptions table
ALTER TABLE store_subscriptions
ADD CONSTRAINT check_frequency_days
CHECK (frequency_days >= 1 AND frequency_days <= 365);
```

### 2. Defensive Validation in Code
```typescript
// lib/constants/subscriptions.ts
export const SUBSCRIPTION_LIMITS = {
  MIN_FREQUENCY_DAYS: 1,
  MAX_FREQUENCY_DAYS: 365, // Max 1 year between orders
  DEFAULT_FREQUENCY_DAYS: 30,
}

// In cron job
const frequencyDays = Math.min(
  Math.max(
    subscription.frequency_days ?? SUBSCRIPTION_LIMITS.DEFAULT_FREQUENCY_DAYS,
    SUBSCRIPTION_LIMITS.MIN_FREQUENCY_DAYS
  ),
  SUBSCRIPTION_LIMITS.MAX_FREQUENCY_DAYS
)

const nextOrderDate = new Date()
nextOrderDate.setDate(nextOrderDate.getDate() + frequencyDays)
```

### 3. Subscription Creation Validation
```typescript
// lib/schemas/subscription.ts
export const createSubscriptionSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().positive().max(100),
  frequency_days: z.number().int().min(1).max(365),
})
```

## Implementation Steps
1. Add database CHECK constraint
2. Add constants for subscription limits
3. Add defensive bounds checking in cron
4. Validate on subscription creation
5. Log warning for any corrected values

## Acceptance Criteria
- [ ] Database rejects invalid frequency_days
- [ ] Cron job handles edge cases gracefully
- [ ] Creating subscription validates frequency
- [ ] Warning logged for corrected values
- [ ] Existing subscriptions audited

## Related Files
- `web/db/migrations/xxx_subscription_frequency_constraint.sql` (new)
- `web/lib/constants/subscriptions.ts` (new or update)
- `web/app/api/cron/process-subscriptions/route.ts`
- `web/app/api/store/subscriptions/route.ts`

## Estimated Effort
- Migration: 30 minutes
- Code updates: 1 hour
- Testing: 30 minutes
- **Total: 2 hours**

---
## Implementation Summary (Completed)

**Files Created:**
- `db/migrations/047_subscription_frequency_constraint.sql`

**Files Modified:**
- `app/api/cron/process-subscriptions/route.ts`

**Changes Made:**
1. **Database constraint**: Added CHECK constraint enforcing `frequency_days >= 7 AND frequency_days <= 180`
2. **Data migration**: Auto-corrects any invalid existing values to 30 days
3. **Defensive validation in cron**: Added `SUBSCRIPTION_FREQUENCY` constants (MIN: 7, MAX: 180, DEFAULT: 30)
4. **Bounds clamping**: Uses Math.min/max to clamp frequency to valid range
5. **Warning logging**: Logs when a value is corrected for audit trail

**Existing API validation confirmed:**
- `store/subscriptions/route.ts` already validates 7-180 days via Zod schema
- Database constraint provides defense in depth

---
*Completed: January 2026*
