# EPIC-007: Testing Infrastructure

**Status**: Not Started  
**Priority**: MEDIUM  
**Estimated Effort**: 3 weeks  
**Risk Level**: LOW  
**Dependencies**: EPIC-001 (Security fixes must be tested)

## Overview

Add comprehensive test coverage for critical features including multi-tenant isolation, payment processing, ambassador program, and E2E flows.

## Current State

- Payment processing: 0% coverage
- Multi-tenant isolation: minimal
- Ambassador referrals: 0%
- E2E tests: basic only
- Test utilities: duplicated code

## Target State

- 80% overall test coverage
- 100% security-critical paths tested
- E2E tests for all user flows
- Clean, reusable test utilities

## Tickets

### TICKET-TEST-001: Multi-Tenant Isolation Tests

**Priority**: CRITICAL  
**Effort**: 3 days

Test that RLS prevents cross-tenant access:
```typescript
describe('Tenant Isolation', () => {
  it('prevents viewing other tenant pets', async () => {
    const adrisUser = await createUser({ tenant: 'adris' })
    const petlifePet = await createPet({ tenant: 'petlife' })
    
    const response = await fetch(`/api/pets/${petlifePet.id}`, {
      headers: { Authorization: adrisUser.token }
    })
    
    expect(response.status).toBe(404) // Not found, not 403
  })
})
```

---

### TICKET-TEST-002: Payment Processing Tests

**Priority**: CRITICAL  
**Effort**: 3 days

Test all payment flows:
- Invoice creation
- Payment recording
- Stripe integration
- Refund processing

---

### TICKET-TEST-003: Ambassador Program Tests

**Priority**: HIGH  
**Effort**: 2 days

Test referral tracking and commission calculation.

---

### TICKET-TEST-004: E2E Critical Flows

**Priority**: HIGH  
**Effort**: 5 days

Playwright tests for:
- Booking appointment (public)
- Creating prescription (vet)
- Processing payment (admin)
- Managing inventory (staff)

---

### TICKET-TEST-005: Test Utilities Cleanup

**Priority**: LOW  
**Effort**: 2 days

Create reusable utilities:
- `createTestUser()`
- `createTestPet()`
- `seedTestData()`
- `cleanupTestData()`

---

## Success Metrics

- [ ] 80% code coverage
- [ ] Zero cross-tenant data leaks in tests
- [ ] All critical flows have E2E tests
- [ ] CI/CD runs tests automatically

