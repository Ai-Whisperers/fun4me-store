# TST-004: Owner Permission Boundary Tests

## Summary

**Priority**: P0 - Critical
**Effort**: 10-14 hours
**Epic**: [EPIC-17](../epics/EPIC-17-comprehensive-test-coverage.md)
**Type**: Test Coverage
**Dependencies**: TST-018 (Role-Based Test Generators)

## Problem Statement

Current tests verify that owners get 403 on staff endpoints sporadically. There's no **systematic verification** that owners cannot access any staff-only functionality. This creates security risk gaps.

### Missing Boundary Tests

| Category | Staff Endpoints | Owner Tests |
|----------|-----------------|-------------|
| Dashboard | 45+ endpoints | 0 tests |
| Clinical Tools | 15 endpoints | 2 tests |
| Staff Management | 12 endpoints | 0 tests |
| Inventory | 20 endpoints | 0 tests |
| Financial/Reports | 18 endpoints | 0 tests |
| Settings | 10 endpoints | 0 tests |

### Impact

- Privilege escalation vulnerabilities undetected
- Authorization bypass not caught in CI
- Role boundary changes could break silently

## Scope

### In Scope

1. **All Staff-Only Endpoints**
   - Systematic 403 verification for OWNER role
   - Verify error message and code
   - Test with valid vs invalid resource IDs

2. **All Admin-Only Endpoints**
   - Verify both OWNER and VET get 403
   - Admin settings, team management

3. **Mixed Permission Endpoints**
   - Endpoints accessible by multiple roles
   - Verify correct scope per role

4. **Data Mutation Protection**
   - POST/PUT/DELETE on staff resources
   - Cannot create staff content as owner

### Out of Scope

- Testing staff CAN access endpoints (already done)
- Detailed functionality tests (other tickets)

## Technical Approach

### Test Generator Pattern

```typescript
// lib/test-utils/permission-generators.ts
export interface EndpointConfig {
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  allowedRoles: ('owner' | 'vet' | 'admin')[]
  requiresParams?: boolean
  sampleParams?: Record<string, string>
}

export const STAFF_ONLY_ENDPOINTS: EndpointConfig[] = [
  // Dashboard
  { path: '/api/dashboard/stats', method: 'GET', allowedRoles: ['vet', 'admin'] },
  { path: '/api/dashboard/today', method: 'GET', allowedRoles: ['vet', 'admin'] },
  { path: '/api/dashboard/waiting-room', method: 'GET', allowedRoles: ['vet', 'admin'] },

  // Clinical
  { path: '/api/dosages', method: 'GET', allowedRoles: ['vet', 'admin'] },
  { path: '/api/diagnosis-codes', method: 'GET', allowedRoles: ['vet', 'admin'] },

  // Staff Management
  { path: '/api/staff', method: 'GET', allowedRoles: ['admin'] },
  { path: '/api/staff/schedules', method: 'GET', allowedRoles: ['admin'] },
  { path: '/api/staff/invites', method: 'POST', allowedRoles: ['admin'] },

  // Inventory
  { path: '/api/inventory', method: 'GET', allowedRoles: ['vet', 'admin'] },
  { path: '/api/inventory/adjustments', method: 'POST', allowedRoles: ['vet', 'admin'] },

  // Financial
  { path: '/api/analytics', method: 'GET', allowedRoles: ['admin'] },
  { path: '/api/expenses', method: 'GET', allowedRoles: ['admin'] },
  { path: '/api/invoices', method: 'POST', allowedRoles: ['vet', 'admin'] },

  // Settings
  { path: '/api/settings', method: 'GET', allowedRoles: ['admin'] },
  { path: '/api/settings', method: 'PUT', allowedRoles: ['admin'] },
]

export function testOwnerCantAccess(endpoint: EndpointConfig) {
  return async () => {
    mockState.setAuthScenario('OWNER')

    const response = await makeRequest(endpoint.method, endpoint.path, endpoint.sampleParams)

    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.code).toBe('INSUFFICIENT_ROLE')
  }
}

export function generatePermissionBoundaryTests(endpoints: EndpointConfig[]) {
  for (const endpoint of endpoints) {
    if (!endpoint.allowedRoles.includes('owner')) {
      it(`OWNER cannot ${endpoint.method} ${endpoint.path}`, testOwnerCantAccess(endpoint))
    }
  }
}
```

### Test Structure

```typescript
// tests/security/permission-boundaries.test.ts
describe('Permission Boundaries', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  describe('Owner Cannot Access Staff Endpoints', () => {
    generatePermissionBoundaryTests(STAFF_ONLY_ENDPOINTS)
  })

  describe('Owner and Vet Cannot Access Admin Endpoints', () => {
    const adminOnly = STAFF_ONLY_ENDPOINTS.filter(
      e => e.allowedRoles.length === 1 && e.allowedRoles[0] === 'admin'
    )

    describe('As Owner', () => {
      beforeEach(() => mockState.setAuthScenario('OWNER'))
      generatePermissionBoundaryTests(adminOnly)
    })

    describe('As Vet', () => {
      beforeEach(() => mockState.setAuthScenario('VET'))
      for (const endpoint of adminOnly) {
        it(`VET cannot ${endpoint.method} ${endpoint.path}`, async () => {
          const response = await makeRequest(endpoint.method, endpoint.path)
          expect(response.status).toBe(403)
        })
      }
    })
  })
})
```

## Endpoint Categories to Test

### 1. Dashboard Endpoints (15 tests)

| Endpoint | Owner | Vet | Admin |
|----------|-------|-----|-------|
| GET /api/dashboard/stats | 403 | 200 | 200 |
| GET /api/dashboard/today | 403 | 200 | 200 |
| GET /api/dashboard/waiting-room | 403 | 200 | 200 |
| GET /api/dashboard/revenue | 403 | 403 | 200 |
| GET /api/appointments/today | 403 | 200 | 200 |

### 2. Clinical Tool Endpoints (12 tests)

| Endpoint | Owner | Vet | Admin |
|----------|-------|-----|-------|
| GET /api/dosages | 403 | 200 | 200 |
| GET /api/diagnosis-codes | 403 | 200 | 200 |
| POST /api/prescriptions | 403 | 200 | 200 |
| POST /api/medical-records | 403 | 200 | 200 |
| POST /api/lab/orders | 403 | 200 | 200 |

### 3. Staff Management (10 tests)

| Endpoint | Owner | Vet | Admin |
|----------|-------|-----|-------|
| GET /api/staff | 403 | 403 | 200 |
| POST /api/staff/invites | 403 | 403 | 200 |
| GET /api/staff/schedules | 403 | 200 | 200 |
| PUT /api/staff/[id] | 403 | 403 | 200 |
| DELETE /api/staff/[id] | 403 | 403 | 200 |

### 4. Inventory (12 tests)

| Endpoint | Owner | Vet | Admin |
|----------|-------|-----|-------|
| GET /api/inventory | 403 | 200 | 200 |
| POST /api/inventory/adjustments | 403 | 200 | 200 |
| POST /api/inventory/receiving | 403 | 200 | 200 |
| GET /api/inventory/expiring | 403 | 200 | 200 |
| GET /api/procurement | 403 | 403 | 200 |

### 5. Financial/Analytics (15 tests)

| Endpoint | Owner | Vet | Admin |
|----------|-------|-----|-------|
| GET /api/analytics | 403 | 403 | 200 |
| GET /api/analytics/export | 403 | 403 | 200 |
| GET /api/expenses | 403 | 403 | 200 |
| POST /api/expenses | 403 | 403 | 200 |
| GET /api/invoices | 403 | 200 | 200 |
| POST /api/invoices | 403 | 200 | 200 |
| POST /api/payments | 403 | 200 | 200 |

### 6. Settings (8 tests)

| Endpoint | Owner | Vet | Admin |
|----------|-------|-----|-------|
| GET /api/settings | 403 | 403 | 200 |
| PUT /api/settings | 403 | 403 | 200 |
| PUT /api/settings/branding | 403 | 403 | 200 |
| GET /api/audit-logs | 403 | 403 | 200 |

### 7. Hospitalization (10 tests)

| Endpoint | Owner | Vet | Admin |
|----------|-------|-----|-------|
| POST /api/hospitalizations | 403 | 200 | 200 |
| POST /api/hospitalizations/[id]/vitals | 403 | 200 | 200 |
| POST /api/hospitalizations/[id]/discharge | 403 | 200 | 200 |
| GET /api/kennels | 403 | 200 | 200 |

## Acceptance Criteria

- [ ] 82+ permission boundary tests implemented
- [ ] All staff-only endpoints verified
- [ ] All admin-only endpoints verified
- [ ] Test generator pattern implemented
- [ ] Consistent 403 response format verified
- [ ] Error code 'INSUFFICIENT_ROLE' verified
- [ ] Tests run in < 60 seconds
- [ ] No false positives (endpoints correctly accessible)

## Files to Create

- `lib/test-utils/permission-generators.ts`
- `lib/test-utils/endpoint-configs.ts`
- `tests/security/permission-boundaries.test.ts`
- `tests/security/admin-only-boundaries.test.ts`
- `tests/security/mixed-permissions.test.ts`

---

**Created**: 2026-01-12
**Status**: Not Started
