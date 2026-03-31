# Vete P0 Blocker Tickets - From Deep-Dive Analysis

**Created**: 2026-01-19  
**Source**: `critique/00-MASTER-DEEP-DIVE-REPORT.md`  
**Total Tickets**: 5 P0 blockers (3 detailed, 2 referenced)

---

## Overview

These tickets address the **5 critical P0 blockers** identified in the comprehensive deep-dive analysis of the Vete codebase. These issues **MUST be fixed immediately** as they:

1. Block all other quality improvements (build checks disabled)
2. Create active security vulnerabilities (credentials leaked, no rate limiting)
3. Risk production stability (no pagination, untested payment flows)

**Estimated Total Effort**: 10-12 days (1 senior developer)

---

## Priority Roadmap (From Master Report)

### Phase 1: Blockers (P0 - 1 Week) ⚠️ START HERE

| # | Ticket | Effort | Status | Blocks |
|---|--------|--------|--------|--------|
| 1 | [P0-001](./P0-001-enable-build-quality-gates.md) | 4-5 days | 📋 Ready | Everything (foundation) |
| 2 | [P0-002](../documentation/tickets/security/SEC-025-remove-credentials-from-git.md) | 0.5 days | 🚨 EMERGENCY | Security |
| 3 | [P0-003](./P0-003-add-rate-limiting-auth-endpoints.md) | 2 days | 📋 Ready | Security |
| 4 | [P0-004](#p0-004-add-pagination-to-list-endpoints) | 2 days | 📝 Summary | Scalability |
| 5 | [P0-005](#p0-005-add-payment-flow-tests) | 3 days | 📝 Summary | Financial safety |

**Total**: ~12 days (can parallelize some work)

---

## Detailed Tickets

### ✅ P0-001: Enable Build Quality Gates (BLOCKING)

**File**: [`P0-001-enable-build-quality-gates.md`](./P0-001-enable-build-quality-gates.md)

**Problem**: TypeScript and ESLint checks are **DISABLED** in production builds, allowing type errors to reach production.

```javascript
// web/next.config.js - CURRENT STATE
typescript: { ignoreBuildErrors: true }  // ❌ Type errors deploy!
eslint: { ignoreDuringBuilds: true }      // ❌ Lint failures ignored!
```

**Impact**: 
- Zero guarantee of type safety
- ~100+ hidden type errors
- Accumulated technical debt invisible

**Solution**: Enable checks, fix all exposed errors (~50-100 estimated), add pre-commit hooks

**Effort**: 4-5 days  
**Blocks**: All other refactoring work (can't safely refactor with broken types)

---

### 🚨 P0-002: SEC-025 - Credentials in Git History (EMERGENCY)

**File**: [`../documentation/tickets/security/SEC-025-remove-credentials-from-git.md`](../documentation/tickets/security/SEC-025-remove-credentials-from-git.md)

**Problem**: Production credentials (Supabase keys, database passwords, API keys) are in git history.

**Exposed Secrets**:
- Supabase service role key (FULL DATABASE ACCESS)
- Database connection string with password
- WhatsApp/Email/Payment API keys

**Immediate Actions** (within 4 hours):
1. Rotate ALL credentials
2. Check audit logs for exploits
3. Redeploy with new credentials
4. Clean git history with `git-filter-repo`

**Effort**: 0.5 days (emergency response + cleanup)  
**Blocks**: Security (credentials could be compromised RIGHT NOW)

---

### 🔒 P0-003: Add Rate Limiting to Auth & Financial Endpoints

**File**: [`P0-003-add-rate-limiting-auth-endpoints.md`](./P0-003-add-rate-limiting-auth-endpoints.md)

**Problem**: Critical endpoints lack rate limiting, vulnerable to brute-force attacks.

**Unprotected Endpoints**:
- `/api/auth/login` - No brute-force protection!
- `/api/auth/signup` - Spam account creation
- `/api/invoices/*` - Financial data enumeration
- `/api/payments/*` - Payment endpoint probing

**Solution**: Apply tiered rate limiting:
- Auth endpoints: 5 requests per 5 minutes (by IP)
- Financial endpoints: 10 requests per 1 minute (by user)

**Effort**: 2 days  
**Blocks**: Security (active vulnerability)

---

### 📊 P0-004: Add Pagination to List Endpoints

**Status**: Summary only (detailed ticket not yet created)

**Problem**: List endpoints return **ALL records** (potential 10,000+), causing:
- Slow response times (multi-second queries)
- Memory exhaustion on client/server
- Database overload under load

**Unprotected Endpoints** (Examples):
- `/api/pets` - Returns ALL pets in clinic
- `/api/invoices` - Returns ALL invoices
- `/api/appointments` - Returns ALL appointments
- `/api/medical-records` - Returns ALL records

**Solution**: Implement cursor-based pagination:

```typescript
// Example implementation
GET /api/invoices?limit=50&cursor=abc123

Response:
{
  data: [...],  // 50 invoices
  pagination: {
    nextCursor: "xyz789",
    hasMore: true,
    total: 5432  // Optional
  }
}
```

**Implementation Steps**:
1. Create reusable pagination utility (2 hours)
2. Apply to top 20 list endpoints (1 day)
3. Update clients to handle pagination (0.5 days)
4. Add tests (0.5 days)

**Effort**: 2 days  
**Blocks**: Scalability (will break at 10k+ records per tenant)

**Detailed Ticket**: To be created in `P0-004-add-pagination-to-list-endpoints.md`

---

### 💰 P0-005: Add Payment Flow Tests

**Status**: Summary only (detailed ticket not yet created)

**Problem**: **ZERO tests** for financial operations (invoices, payments, refunds).

**Risk**: Financial bugs go to production undetected.

**Untested Critical Paths**:
```
Invoice Creation → Payment Processing → Balance Update
Payment Refund → Inventory Restock → Invoice Adjustment
Subscription Charge → Payment Retry → Cancellation
```

**Solution**: Comprehensive payment flow tests:

```typescript
// Example test structure
describe('Payment Flows', () => {
  describe('Invoice Payment', () => {
    it('creates invoice with correct amounts')
    it('processes payment and updates balance')
    it('handles payment failures gracefully')
    it('prevents double payments')
    it('applies discounts correctly')
  })

  describe('Payment Refunds', () => {
    it('refunds payment and updates invoice')
    it('restocks inventory if applicable')
    it('prevents over-refunding')
    it('handles partial refunds')
  })

  describe('Subscription Billing', () => {
    it('charges subscription on schedule')
    it('retries failed payments')
    it('cancels after max retries')
    it('prevents duplicate charges')
  })
})
```

**Implementation Steps**:
1. Create test fixtures for invoices/payments (0.5 days)
2. Write invoice creation tests (0.5 days)
3. Write payment processing tests (1 day)
4. Write refund flow tests (0.5 days)
5. Write subscription billing tests (0.5 days)

**Effort**: 3 days  
**Blocks**: Financial safety (can't confidently modify payment code without tests)

**Detailed Ticket**: To be created in `P0-005-add-payment-flow-tests.md`

---

## Execution Order

### Sequential Dependencies

1. **P0-002 (SEC-025)** - FIRST (emergency, independent)
   - Rotate credentials immediately
   - Clean git history

2. **P0-001** - SECOND (foundation for all else)
   - Enable build checks
   - Fix exposed errors
   - Add pre-commit hooks

3. **Parallel** (after P0-001 completes):
   - **P0-003** (Rate limiting) - Security team
   - **P0-004** (Pagination) - Backend team
   - **P0-005** (Payment tests) - QA team

### Week 1 Schedule (Example)

| Day | Morning | Afternoon |
|-----|---------|-----------|
| **Mon** | P0-002: Rotate credentials | P0-002: Clean git history |
| **Tue** | P0-001: Discovery (catalog errors) | P0-001: Fix Category A errors |
| **Wed** | P0-001: Fix Category B errors | P0-001: Fix Category C errors |
| **Thu** | P0-001: Enable checks, test | P0-003 & P0-004: Start parallel |
| **Fri** | P0-003 & P0-004: Continue | P0-005: Start tests |
| **Mon** | P0-003 & P0-004: Complete | P0-005: Continue tests |
| **Tue** | P0-005: Complete tests | Final verification |

---

## Success Criteria

### Week 1 Complete When:
- [ ] All 5 P0 tickets marked complete
- [ ] Production build passes with checks enabled
- [ ] No credentials in git history
- [ ] Auth/financial endpoints rate limited
- [ ] Top 20 list endpoints paginated
- [ ] Payment flows have 80%+ test coverage
- [ ] No production incidents during rollout

---

## Communication Plan

### Before Starting (Team Announcement)
```
Subject: P0 Blockers - 1 Week Focus

Team,

Starting Monday, we're tackling 5 critical P0 blockers identified in the codebase audit:

1. Enable build quality gates (BLOCKING all other work)
2. Fix credentials leak (SECURITY EMERGENCY)
3. Add rate limiting (SECURITY)
4. Add pagination (SCALABILITY)
5. Add payment tests (FINANCIAL SAFETY)

Timeline: 1 week
Team: [assignments]

Non-critical work paused until P0s complete.

See: critique/tickets/README.md for details

- Tech Lead
```

### Daily Standups
- Report progress on assigned P0
- Flag blockers immediately
- Coordinate dependencies (P0-001 blocks others)

### Week 1 Complete Announcement
```
Subject: P0 Blockers Complete ✅

Team,

All 5 P0 blockers resolved:
✅ Build quality gates enabled
✅ Credentials rotated and cleaned
✅ Rate limiting on auth/financial
✅ Pagination on list endpoints
✅ Payment flows tested

Platform is now production-ready for scaling.

Next: Phase 2 quality gates (P1 tickets)

- Tech Lead
```

---

## Related Documentation

- **Master Report**: `critique/00-MASTER-DEEP-DIVE-REPORT.md`
- **API Analysis**: `critique/13-api-routes-deep-roast.md`
- **Services Analysis**: `critique/14-services-layer-deep-roast.md`
- **Component Analysis**: `critique/15-components-architecture-roast.md`
- **Database Analysis**: `critique/16-database-schema-roast.md`
- **Remaining Deep-Dives**: `critique/17-remaining-deep-dives.md`

---

## Post-P0 Roadmap

After P0 blockers complete, proceed to:

### Phase 2: Quality Gates (P1 - 2 Weeks)
6. Add component tests (50% coverage target)
7. Standardize error handling
8. Create reusable form hooks
9. Add code splitting
10. Fix/remove skipped E2E tests
11. Split top 3 mega-services

### Phase 3: Technical Debt (P2 - 1 Month)
12. Full services refactor (5 → 22 services)
13. Migrate to v2 database schema
14. Performance optimization
15. Component composition refactor

See `critique/00-MASTER-DEEP-DIVE-REPORT.md` for complete roadmap.

---

**Last Updated**: 2026-01-19  
**Status**: Ready for execution  
**Team**: [TBD]
