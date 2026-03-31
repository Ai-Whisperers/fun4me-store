# TST-009: Loyalty & Referrals API Tests

## Summary

**Priority**: P1 - High
**Effort**: 6-8 hours
**Epic**: [EPIC-17](../epics/EPIC-17-comprehensive-test-coverage.md)
**Type**: Test Coverage
**Dependencies**: TST-006 (API Audit)

## Problem Statement

The loyalty points system and referral program have ~20% test coverage. These are revenue-impacting features that need comprehensive testing.

## Routes to Test

### Loyalty Points (5 routes)

| Route | Methods | Tests Needed |
|-------|---------|--------------|
| /api/loyalty/balance | GET | 4 |
| /api/loyalty/transactions | GET | 5 |
| /api/loyalty/earn | POST | 6 |
| /api/loyalty/redeem | POST | 8 |
| /api/loyalty/rewards | GET | 3 |

### Referral Codes (4 routes)

| Route | Methods | Tests Needed |
|-------|---------|--------------|
| /api/referrals/code | GET, POST | 5 |
| /api/referrals/apply | POST | 8 |
| /api/referrals/stats | GET | 3 |
| /api/referrals/transactions | GET | 4 |

### Ambassador Program (5 routes)

| Route | Methods | Tests Needed |
|-------|---------|--------------|
| /api/ambassador/register | POST | 6 |
| /api/ambassador/profile | GET, PATCH | 4 |
| /api/ambassador/referrals | GET | 3 |
| /api/ambassador/payouts | GET, POST | 5 |
| /api/ambassador/tier | GET | 3 |

## Test Cases

### Loyalty Points (26 tests)

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | View own balance | 200, balance shown |
| 2 | Cannot view other's balance | 403 |
| 3 | View transaction history | 200, sorted by date |
| 4 | Earn points on purchase | Points added |
| 5 | Redeem points | Balance reduced |
| 6 | Redeem more than balance | 400, insufficient |
| 7 | Redeem negative amount | 400, validation |
| 8 | Concurrent redemption race | One succeeds |
| ... | ... | ... |

### Referral Codes (20 tests)

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Generate referral code | 201, unique code |
| 2 | Apply valid code | 200, discount applied |
| 3 | Apply own code | 400, self-referral blocked |
| 4 | Apply expired code | 400, code expired |
| 5 | Apply used code (if one-time) | 400, already used |
| 6 | View referral stats | 200, counts shown |
| 7 | Cross-tenant code | 400, wrong clinic |
| ... | ... | ... |

### Ambassador (21 tests)

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Register as ambassador | 201, ambassador created |
| 2 | Register duplicate email | 409, already exists |
| 3 | View own profile | 200, stats included |
| 4 | View referrals list | 200, conversions shown |
| 5 | Request payout | 201, payout pending |
| 6 | Request payout < minimum | 400, minimum not met |
| 7 | Check tier upgrade | Tier calculated correctly |
| ... | ... | ... |

## Acceptance Criteria

- [ ] 67 loyalty/referral tests implemented
- [ ] Points operations coverage >= 90%
- [ ] Referral code coverage >= 85%
- [ ] Ambassador coverage >= 80%
- [ ] Race condition on redemption tested
- [ ] Cross-tenant isolation verified

---

**Created**: 2026-01-12
**Status**: Not Started
