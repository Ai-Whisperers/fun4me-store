# Rate Limiting Migration Guide

## Overview

This document tracks the migration of all mutation endpoints to include rate limiting.

**Status**: In Progress (Phase 1 - Financial Operations)

## Progress Summary

- **Total endpoints needing rate limiting**: ~183
- **Already protected**: 16
- **Completed in this session**: 0
- **Remaining**: 183

## Migration Pattern

### For routes using `withApiAuth` or `withApiAuthParams`

Simply add the `rateLimit` option:

```typescript
// BEFORE
export const POST = withApiAuth(
  async ({ profile, supabase, log }) => {
    // Logic
  },
  { roles: ['admin'] }
)

// AFTER
export const POST = withApiAuth(
  async ({ profile, supabase, log }) => {
    // Logic
  },
  {
    roles: ['admin'],
    rateLimit: 'financial'  // Add this
  }
)
```

### For routes using manual auth

Migrate to `withApiAuth` AND add rate limiting:

```typescript
// BEFORE
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single();
  
  if (profile.role !== 'admin') {
    return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
  }
  
  // ... rest of logic
}

// AFTER
import { withApiAuth } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api/errors';

export const POST = withApiAuth(
  async ({ profile, supabase, user, log }) => {
    // Logic here - auth handled automatically
    return apiSuccess(data);
  },
  {
    roles: ['admin'],
    rateLimit: 'financial'
  }
)
```

## Rate Limit Tier Selection

| Tier | Limit | Use Cases |
|------|-------|-----------|
| `refund` | 5/hour | Refund operations only |
| `financial` | 10/min | Payments, invoices, billing |
| `auth` | 5/min | Login, signup, user preferences |
| `booking` | 5/hour | Appointment booking |
| `checkout` | 5/min | Store checkout, orders |
| `cart` | 60/min | Cart operations, wishlist |
| `write` | 20/min | Standard mutations |
| `search` | 30/min | Search endpoints |
| `default` | 60/min | Fallback |

## Phase 1: Financial Operations (HIGH PRIORITY)

### Tier: `refund` (5 req/hour)

- [x] `invoices/[id]/refund/route.ts` - **Already has rate limiting** ✅

### Tier: `financial` (10 req/min)

#### Billing Routes (23 files)

- [ ] `billing/bank-transfer/route.ts`
- [ ] `billing/confirm-transfer/route.ts`
- [ ] `billing/pay-invoice/route.ts` ⚠️ **Needs migration to withApiAuth**
- [ ] `billing/payment-methods/route.ts` ⚠️ **Needs migration**
- [ ] `billing/payment-methods/[id]/route.ts` ⚠️ **Needs migration**
- [ ] `billing/stripe/setup-intent/route.ts` ⚠️ **Needs migration**
- [ ] `billing/invoices/route.ts`
- [ ] `billing/invoices/[id]/route.ts`
- [ ] `billing/invoices/[id]/send/route.ts`
- [ ] `billing/commissions/services/route.ts`
- [ ] `billing/commissions/store/route.ts`
- [ ] `billing/overview/route.ts` (if has mutations)
- [ ] `platform/billing/pending-transfers/route.ts`
- [ ] `platform/billing/pending-transfers/[id]/verify/route.ts` ⚠️ **Needs migration**
- [ ] `platform/commission-invoices/route.ts`
- [ ] `platform/commission-invoices/[id]/route.ts`
- [ ] `platform/commission-invoices/[id]/send/route.ts`
- [ ] `platform/commission-invoices/[id]/paid/route.ts`
- [ ] `store/commission-invoices/route.ts`

#### Invoice Routes (7 files)

- [ ] `invoices/route.ts` (if has mutations)
- [ ] `invoices/[id]/route.ts` (PATCH, DELETE)
- [ ] `invoices/[id]/send/route.ts`
- [ ] `invoices/[id]/payments/route.ts`
- [ ] `hospitalizations/[id]/invoice/route.ts`

#### Cron Jobs (5 files) - ⚠️ **Special case: use `'default'` tier**

Cron jobs should NOT use financial tier (would break scheduled operations).
Use `'default'` or no rate limiting (internal only).

- [ ] `cron/billing/auto-charge/route.ts` - Check if needs RL
- [ ] `cron/billing/evaluate-grace/route.ts` - Check if needs RL
- [ ] `cron/billing/generate-platform-invoices/route.ts` - Check if needs RL
- [ ] `cron/billing/send-reminders/route.ts` - Check if needs RL
- [ ] `cron/generate-commission-invoices/route.ts` - Check if needs RL

## Phase 2: Authentication & User Operations (HIGH PRIORITY)

### Tier: `auth` (5 req/min)

- [ ] `user/preferences/route.ts` (POST) ⚠️ **Needs migration**
- [ ] `user/onboarding-complete/route.ts` (POST)
- [ ] `user/notification-settings/route.ts` (POST)
- [ ] `consents/requests/route.ts` (POST)
- [ ] `setup/route.ts` (POST)
- [ ] Other auth-related routes (scan for `auth`, `login`, `signup` in path)

## Phase 3: Appointment & Booking (HIGH PRIORITY)

### Tier: `booking` (5 req/hour)

- [ ] `appointments/[id]/complete/route.ts`
- [ ] `appointments/waitlist/route.ts`
- [ ] `appointments/waitlist/[id]/route.ts`
- [ ] `appointments/recurrences/route.ts`
- [ ] `appointments/recurrences/[id]/route.ts`
- [ ] `appointments/recurrences/[id]/pause/route.ts`
- [ ] `appointments/recurrences/[id]/generate/route.ts`
- [ ] `calendar/check-availability/route.ts`

## Phase 4: Store Operations (MEDIUM PRIORITY)

### Tier: `checkout` (5 req/min)

- [ ] `store/orders/[id]/prescription/route.ts`
- [ ] `dashboard/orders/[id]/route.ts`
- [ ] `store/subscriptions/route.ts` (POST) ⚠️ **Needs migration**
- [ ] `store/subscriptions/[id]/skip/route.ts` ⚠️ **Needs migration**

### Tier: `cart` (60 req/min)

- [ ] `store/wishlist/route.ts`
- [ ] `store/stock-alerts/route.ts` ⚠️ **Needs migration**
- [ ] `store/coupons/validate/route.ts`
- [ ] `store/reviews/route.ts`

## Phase 5: Clinical & General Operations (MEDIUM/LOW PRIORITY)

### Tier: `write` (20 req/min)

All remaining mutation endpoints (~130+ files):

- [ ] `pets/*` routes
- [ ] `vaccines/*` routes
- [ ] `vaccine_reactions/*` routes
- [ ] `growth_charts/*` routes (some already protected)
- [ ] `reproductive_cycles/*` routes
- [ ] `euthanasia_assessments/*` routes
- [ ] `medical_records/*` routes
- [ ] `lab-orders/*` routes
- [ ] `hospitalizations/*` routes
- [ ] `procurement/*` routes
- [ ] `suppliers/*` routes
- [ ] `insurance/*` routes
- [ ] `lost-found/*` routes
- [ ] `messages/*` routes
- [ ] `whatsapp/*` routes
- [ ] `sms/*` routes
- [ ] `reminders/*` routes
- [ ] `platform/*` routes
- [ ] `staff/*` routes ⚠️ **Multiple need migration**
- [ ] `dashboard/*` routes
- [ ] `services/*` routes
- [ ] `clients/*` routes
- [ ] `consents/*` routes
- [ ] `epidemiology/*` routes
- [ ] `finance/*` routes
- [ ] `notifications/*` routes
- [ ] `settings/*` routes

## Files Requiring Migration to `withApiAuth`

These files use manual auth and need full refactoring:

1. `billing/stripe/setup-intent/route.ts`
2. `billing/confirm-transfer/route.ts`
3. `billing/pay-invoice/route.ts`
4. `billing/payment-methods/route.ts`
5. `billing/payment-methods/[id]/route.ts`
6. `platform/billing/pending-transfers/[id]/verify/route.ts`
7. `store/subscriptions/route.ts` (POST, PATCH, DELETE)
8. `store/subscriptions/[id]/skip/route.ts`
9. `staff/time-off/types/route.ts` (POST, PATCH, DELETE)
10. `staff/time-off/route.ts` (POST, PATCH)
11. `staff/schedule/route.ts` (POST, PATCH, DELETE)
12. `dashboard/coupons/route.ts` (POST)
13. `store/stock-alerts/route.ts` (POST, DELETE)
14. `messages/quick-replies/route.ts` (POST, DELETE)
15. `user/preferences/route.ts` (POST)

## Implementation Strategy

### Quick Wins (For routes already using withApiAuth)

1. Open file
2. Find the `withApiAuth` call
3. Add `rateLimit: 'tier'` to options object
4. Save

**Example**: Can process 10+ files in 15 minutes

### Full Migrations (For manual auth routes)

1. Import `withApiAuth` from `@/lib/auth`
2. Import `apiSuccess`, `apiError` from `@/lib/api/errors`
3. Convert function signature
4. Remove manual auth code
5. Remove manual role checks
6. Update return statements to use `apiSuccess`/`apiError`
7. Add rate limiting
8. Test

**Example**: 10-20 minutes per file

## Testing

After adding rate limiting to a file, test locally:

```bash
# Start
