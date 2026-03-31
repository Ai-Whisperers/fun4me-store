# FEAT-022: Loyalty Points Redemption System

## Priority: P2 - Medium
## Category: Feature
## Status: Completed
## Epic: [EPIC-09: Feature Expansion](../../epics/EPIC-09-feature-expansion.md)

## Description

Complete the loyalty points system with a full redemption workflow, rewards catalog, and customer portal integration.

## Implementation Summary

### Database Schema (Migration 068)

Created two new tables with RLS policies:

1. **`loyalty_rewards`** - Rewards catalog
   - Points cost, reward type/value
   - Category (discount, service, product, experience, general)
   - Stock tracking, max per user limits
   - Validity dates, featured flag
   - Image support

2. **`loyalty_redemptions`** - Redemption tracking
   - User and reward references
   - Unique redemption codes
   - Status tracking (pending, approved, used, expired, cancelled)
   - Usage tracking (invoice/order reference)
   - Expiration dates

### Helper Functions

- `generate_redemption_code()` - Generates unique 8-char alphanumeric codes
- `get_user_loyalty_balance(user_id)` - Gets total points across all user's pets
- `can_afford_reward(user_id, reward_id)` - Checks affordability

### Portal Pages

1. **`/portal/loyalty`** - Points dashboard
   - Points balance display with tier badge
   - Progress bar to next tier
   - Lifetime earned/redeemed stats
   - Transaction history with type icons
   - Redemption history with status badges
   - Copy-to-clipboard for active redemption codes

2. **`/portal/rewards`** - Rewards catalog
   - Grid layout with reward cards
   - Category filtering
   - Stock availability indicators
   - Featured rewards highlighted
   - Point affordability status
   - Redeem confirmation dialog
   - Success dialog with redemption code

### API Endpoints

1. **`POST /api/loyalty/redeem`**
   - Uses atomic `redeem_loyalty_reward` function (migration 041)
   - Race condition protection via row-level locking
   - Validates stock, max per user, points balance
   - Returns redemption code and expiration

2. **`GET /api/loyalty/rewards`**
   - Lists available rewards for tenant
   - Enriches with user's affordability status
   - Filters by validity dates

## Acceptance Criteria

- [x] Users can view their points balance and tier
- [x] Users can browse available rewards catalog
- [x] Points can be redeemed for rewards
- [x] Unique redemption codes generated
- [x] Transaction history shows all point activity
- [x] Redemption status tracked (pending → used/expired)
- [x] Stock limits enforced
- [x] Max per user limits enforced
- [x] Race conditions prevented (atomic redemption)

### Partially Completed / Future Enhancements

- [ ] Admin rewards catalog management page
- [ ] Checkout integration (use points at checkout)
- [ ] Points expiry cron job
- [ ] Admin loyalty config page (earn rates, tier thresholds)
- [ ] Email notifications for redemptions

## Files Created

- `web/db/migrations/068_loyalty_rewards_redemptions.sql`
- `web/app/[clinic]/portal/loyalty/page.tsx`
- `web/app/[clinic]/portal/loyalty/client.tsx`
- `web/app/[clinic]/portal/rewards/page.tsx`
- `web/app/[clinic]/portal/rewards/client.tsx`
- `web/app/api/loyalty/redeem/route.ts`
- `web/app/api/loyalty/rewards/route.ts`

## Pre-existing Infrastructure Used

- `web/db/migrations/041_atomic_loyalty_redeem.sql` - Atomic redemption function
- `web/db/50_finance/02_expenses.sql` - loyalty_points, loyalty_transactions, loyalty_rules tables
- `web/app/api/clients/[id]/loyalty/route.ts` - Existing loyalty API
- `web/lib/test-utils/factories/loyalty-factory.ts` - Test factory
- `web/e2e/portal/loyalty.spec.ts` - E2E tests

## Technical Details

### Tier System
- Bronze: 0-499 lifetime points
- Silver: 500-1,999 lifetime points
- Gold: 2,000-4,999 lifetime points
- Platinum: 5,000+ lifetime points

### Reward Types
- `discount_percentage` - Percentage off purchase
- `discount_fixed` - Fixed amount off
- `free_service` - Free clinic service
- `free_product` - Free product
- `custom` - Special rewards

### Redemption Flow
1. User views rewards catalog at `/portal/rewards`
2. User clicks "Canjear" on affordable reward
3. Confirmation dialog shows reward details
4. On confirm, `POST /api/loyalty/redeem` called
5. Atomic function validates and creates redemption
6. Success dialog shows unique redemption code
7. Code valid for 30 days, shown in `/portal/loyalty`

## Estimated Effort
- Original: 24 hours
- Actual: ~8 hours (core redemption flow, used existing infrastructure)

---
*Completed: January 2026*
