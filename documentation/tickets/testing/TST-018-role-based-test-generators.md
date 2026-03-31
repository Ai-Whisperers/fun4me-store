# TST-018: Role-Based Test Generators

## Summary

**Priority**: P2 - Medium
**Effort**: 8-10 hours
**Epic**: [EPIC-17](../epics/EPIC-17-comprehensive-test-coverage.md)
**Type**: Test Infrastructure
**Dependencies**: TST-016 (Helper Expansion), TST-017 (Fixture Factories)

## Problem Statement

Writing comprehensive permission tests is tedious and error-prone. Each endpoint needs tests for all role combinations (unauthenticated, owner, vet, admin). A generator system would:
- Automatically create permission test suites
- Ensure consistent coverage across all roles
- Reduce boilerplate code
- Make it easy to add new endpoints

## Proposed Solution

### Test Generator Framework

```typescript
// tests/generators/permission-test-generator.ts

export interface EndpointSpec {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  allowedRoles: ('owner' | 'vet' | 'admin')[];
  ownershipCheck?: {
    field: string; // Field that links to owner
    resourceFactory: string; // Factory to create the resource
  };
  requestBody?: object | (() => object);
  pathParams?: Record<string, string | (() => string)>;
  expectedStatus?: {
    success?: number;
    unauthorized?: number;
    forbidden?: number;
  };
}

export function generatePermissionTests(
  suiteName: string,
  endpoints: EndpointSpec[]
): void {
  describe(suiteName, () => {
    for (const endpoint of endpoints) {
      generateEndpointTests(endpoint);
    }
  });
}

function generateEndpointTests(spec: EndpointSpec): void {
  const { method, path, description, allowedRoles } = spec;
  const successStatus = spec.expectedStatus?.success ?? (method === 'POST' ? 201 : 200);
  const unauthorizedStatus = spec.expectedStatus?.unauthorized ?? 401;
  const forbiddenStatus = spec.expectedStatus?.forbidden ?? 403;

  describe(`${method} ${path} - ${description}`, () => {
    // Test: Unauthenticated access
    it('should reject unauthenticated requests', async () => {
      mockState.setAuthScenario('UNAUTHENTICATED');
      const res = await makeRequest(method, resolvePath(spec), spec.requestBody);
      expect(res.status).toBe(unauthorizedStatus);
    });

    // Test each role
    const allRoles = ['owner', 'vet', 'admin'] as const;

    for (const role of allRoles) {
      const isAllowed = allowedRoles.includes(role);
      const expectedStatus = isAllowed ? successStatus : forbiddenStatus;

      it(`should ${isAllowed ? 'allow' : 'reject'} ${role} access`, async () => {
        mockState.setAuthScenario(role.toUpperCase() as any);

        // Setup ownership if needed
        if (spec.ownershipCheck && role === 'owner') {
          await setupOwnershipContext(spec.ownershipCheck);
        }

        const res = await makeRequest(method, resolvePath(spec), spec.requestBody);

        if (isAllowed) {
          expect([successStatus, 200, 201, 204]).toContain(res.status);
        } else {
          expect([forbiddenStatus, 404]).toContain(res.status);
        }
      });
    }

    // Test cross-owner isolation if applicable
    if (spec.ownershipCheck && allowedRoles.includes('owner')) {
      it('should prevent cross-owner access', async () => {
        const resource = await createResourceWithDifferentOwner(spec.ownershipCheck);
        mockState.setAuthScenario('OWNER');

        const res = await makeRequest(
          method,
          resolvePath(spec, { [spec.ownershipCheck.field]: resource.id }),
          spec.requestBody
        );

        expect([forbiddenStatus, 404]).toContain(res.status);
      });
    }
  });
}
```

### Endpoint Specification DSL

```typescript
// tests/generators/specs/portal-endpoints.ts

export const portalEndpoints: EndpointSpec[] = [
  // Profile endpoints
  {
    method: 'GET',
    path: '/api/portal/profile',
    description: 'Get own profile',
    allowedRoles: ['owner', 'vet', 'admin'],
  },
  {
    method: 'PATCH',
    path: '/api/portal/profile',
    description: 'Update own profile',
    allowedRoles: ['owner', 'vet', 'admin'],
    requestBody: { full_name: 'Updated Name' },
  },

  // Pet endpoints
  {
    method: 'GET',
    path: '/api/portal/pets',
    description: 'List own pets',
    allowedRoles: ['owner'],
    ownershipCheck: { field: 'owner_id', resourceFactory: 'pet' },
  },
  {
    method: 'GET',
    path: '/api/portal/pets/:id',
    description: 'Get specific pet',
    allowedRoles: ['owner'],
    ownershipCheck: { field: 'owner_id', resourceFactory: 'pet' },
    pathParams: { id: () => testPetId },
  },
  {
    method: 'POST',
    path: '/api/portal/pets',
    description: 'Create new pet',
    allowedRoles: ['owner'],
    requestBody: () => ({
      name: 'New Pet',
      species: 'dog',
      breed: 'Mixed',
    }),
  },
  {
    method: 'PUT',
    path: '/api/portal/pets/:id',
    description: 'Update pet',
    allowedRoles: ['owner'],
    ownershipCheck: { field: 'owner_id', resourceFactory: 'pet' },
    pathParams: { id: () => testPetId },
    requestBody: { name: 'Updated Name' },
  },
  {
    method: 'DELETE',
    path: '/api/portal/pets/:id',
    description: 'Delete pet',
    allowedRoles: ['owner'],
    ownershipCheck: { field: 'owner_id', resourceFactory: 'pet' },
    pathParams: { id: () => testPetId },
  },

  // Appointment endpoints
  {
    method: 'GET',
    path: '/api/portal/appointments',
    description: 'List own appointments',
    allowedRoles: ['owner'],
    ownershipCheck: { field: 'owner_id', resourceFactory: 'appointment' },
  },
  {
    method: 'POST',
    path: '/api/portal/appointments/request',
    description: 'Request appointment',
    allowedRoles: ['owner'],
    requestBody: () => ({
      pet_id: testPetId,
      service_id: testServiceId,
      preferred_date_start: addDays(new Date(), 7).toISOString(),
    }),
  },
  {
    method: 'DELETE',
    path: '/api/portal/appointments/:id',
    description: 'Cancel appointment',
    allowedRoles: ['owner'],
    ownershipCheck: { field: 'owner_id', resourceFactory: 'appointment' },
    pathParams: { id: () => testAppointmentId },
  },
];
```

```typescript
// tests/generators/specs/admin-endpoints.ts

export const adminEndpoints: EndpointSpec[] = [
  // Analytics
  {
    method: 'GET',
    path: '/api/analytics',
    description: 'Dashboard analytics',
    allowedRoles: ['admin'],
  },
  {
    method: 'GET',
    path: '/api/analytics/revenue',
    description: 'Revenue analytics',
    allowedRoles: ['admin'],
  },

  // Staff management
  {
    method: 'GET',
    path: '/api/staff',
    description: 'List staff members',
    allowedRoles: ['admin'],
  },
  {
    method: 'POST',
    path: '/api/staff/invite',
    description: 'Invite staff member',
    allowedRoles: ['admin'],
    requestBody: {
      email: 'new@staff.com',
      role: 'vet',
    },
  },

  // Settings
  {
    method: 'GET',
    path: '/api/settings',
    description: 'Clinic settings',
    allowedRoles: ['admin'],
  },
  {
    method: 'PUT',
    path: '/api/settings',
    description: 'Update settings',
    allowedRoles: ['admin'],
    requestBody: { clinic_name: 'Updated Clinic' },
  },

  // Audit logs
  {
    method: 'GET',
    path: '/api/audit-logs',
    description: 'View audit logs',
    allowedRoles: ['admin'],
  },
];
```

```typescript
// tests/generators/specs/staff-endpoints.ts

export const staffEndpoints: EndpointSpec[] = [
  // Patient management (vet + admin)
  {
    method: 'GET',
    path: '/api/patients',
    description: 'List all patients',
    allowedRoles: ['vet', 'admin'],
  },
  {
    method: 'GET',
    path: '/api/patients/:id',
    description: 'Get patient details',
    allowedRoles: ['vet', 'admin'],
    pathParams: { id: () => testPatientId },
  },

  // Medical records
  {
    method: 'POST',
    path: '/api/medical-records',
    description: 'Create medical record',
    allowedRoles: ['vet', 'admin'],
    requestBody: () => ({
      pet_id: testPetId,
      record_type: 'consultation',
      diagnosis: 'Healthy',
    }),
  },

  // Prescriptions
  {
    method: 'POST',
    path: '/api/prescriptions',
    description: 'Create prescription',
    allowedRoles: ['vet', 'admin'],
    requestBody: () => ({
      pet_id: testPetId,
      medications: [{ name: 'Antibiotic', dosage: '10mg' }],
    }),
  },

  // Appointments (staff view)
  {
    method: 'GET',
    path: '/api/appointments',
    description: 'List all appointments',
    allowedRoles: ['vet', 'admin'],
  },
  {
    method: 'PUT',
    path: '/api/appointments/:id/status',
    description: 'Update appointment status',
    allowedRoles: ['vet', 'admin'],
    pathParams: { id: () => testAppointmentId },
    requestBody: { status: 'confirmed' },
  },
];
```

### Test Generation CLI

```typescript
// scripts/generate-permission-tests.ts

import {
  portalEndpoints,
  adminEndpoints,
  staffEndpoints
} from '../tests/generators/specs';
import { generatePermissionTests } from '../tests/generators/permission-test-generator';

// Generate test files
const testSuites = [
  { name: 'Portal API Permissions', specs: portalEndpoints, file: 'portal-permissions' },
  { name: 'Admin API Permissions', specs: adminEndpoints, file: 'admin-permissions' },
  { name: 'Staff API Permissions', specs: staffEndpoints, file: 'staff-permissions' },
];

for (const suite of testSuites) {
  const testCode = generateTestFileCode(suite.name, suite.specs);
  fs.writeFileSync(
    `tests/generated/${suite.file}.test.ts`,
    testCode
  );
  console.log(`Generated: tests/generated/${suite.file}.test.ts`);
}

function generateTestFileCode(suiteName: string, specs: EndpointSpec[]): string {
  return `
// AUTO-GENERATED - DO NOT EDIT
// Generated by: npm run generate:permission-tests
// Regenerate with: npm run generate:permission-tests

import { describe, it, expect, beforeEach } from 'vitest';
import { mockState } from '@/tests/__helpers__/auth';
import { makeRequest } from '@/tests/__helpers__/request';
import { factories } from '@/tests/__fixtures__';

describe('${suiteName}', () => {
  ${specs.map(spec => generateSpecTests(spec)).join('\n\n  ')}
});
`;
}
```

### Runtime Test Runner

```typescript
// tests/generated/run-permission-tests.ts

import { portalEndpoints } from '../generators/specs/portal-endpoints';
import { adminEndpoints } from '../generators/specs/admin-endpoints';
import { staffEndpoints } from '../generators/specs/staff-endpoints';
import { generatePermissionTests } from '../generators/permission-test-generator';

// Run at test time instead of generating files
generatePermissionTests('Portal API Permissions', portalEndpoints);
generatePermissionTests('Admin API Permissions', adminEndpoints);
generatePermissionTests('Staff API Permissions', staffEndpoints);
```

## File Structure

```
tests/
├── generators/
│   ├── permission-test-generator.ts  # Core generator
│   ├── specs/
│   │   ├── portal-endpoints.ts       # Portal API specs
│   │   ├── admin-endpoints.ts        # Admin API specs
│   │   ├── staff-endpoints.ts        # Staff API specs
│   │   ├── store-endpoints.ts        # Store API specs
│   │   └── index.ts                  # Export all specs
│   └── templates/
│       └── permission-test.ts.tpl    # Test file template
├── generated/                        # Generated test files
│   ├── portal-permissions.test.ts
│   ├── admin-permissions.test.ts
│   └── staff-permissions.test.ts
└── ...
```

## npm Scripts

```json
{
  "scripts": {
    "generate:permission-tests": "ts-node scripts/generate-permission-tests.ts",
    "test:permissions": "vitest run tests/generated/",
    "test:permissions:watch": "vitest tests/generated/"
  }
}
```

## Coverage Report

The generator should also produce a coverage report:

```typescript
// scripts/permission-coverage-report.ts

export function generateCoverageReport(specs: EndpointSpec[]): string {
  const byRole = {
    owner: specs.filter(s => s.allowedRoles.includes('owner')),
    vet: specs.filter(s => s.allowedRoles.includes('vet')),
    admin: specs.filter(s => s.allowedRoles.includes('admin')),
  };

  return `
Permission Test Coverage Report
================================

Total Endpoints: ${specs.length}
Total Tests Generated: ${specs.length * 4} (unauthenticated + 3 roles each)

By Role:
- Owner: ${byRole.owner.length} endpoints
- Vet: ${byRole.vet.length} endpoints
- Admin: ${byRole.admin.length} endpoints

By Method:
- GET: ${specs.filter(s => s.method === 'GET').length}
- POST: ${specs.filter(s => s.method === 'POST').length}
- PUT: ${specs.filter(s => s.method === 'PUT').length}
- PATCH: ${specs.filter(s => s.method === 'PATCH').length}
- DELETE: ${specs.filter(s => s.method === 'DELETE').length}

Ownership Checks: ${specs.filter(s => s.ownershipCheck).length}
`;
}
```

## Usage Example

```typescript
// Adding a new endpoint to test
// Just add to the spec file:

// tests/generators/specs/portal-endpoints.ts
export const portalEndpoints: EndpointSpec[] = [
  // ... existing specs

  // NEW: Add loyalty endpoints
  {
    method: 'GET',
    path: '/api/portal/loyalty/balance',
    description: 'View loyalty balance',
    allowedRoles: ['owner'],
    ownershipCheck: { field: 'user_id', resourceFactory: 'loyaltyPoints' },
  },
  {
    method: 'POST',
    path: '/api/portal/loyalty/redeem',
    description: 'Redeem loyalty points',
    allowedRoles: ['owner'],
    requestBody: { points: 100, reward_id: 'REWARD-001' },
  },
];

// Then regenerate: npm run generate:permission-tests
```

## Acceptance Criteria

- [ ] Permission test generator implemented
- [ ] Endpoint specification DSL defined
- [ ] Portal endpoints spec (20+ endpoints)
- [ ] Admin endpoints spec (15+ endpoints)
- [ ] Staff endpoints spec (15+ endpoints)
- [ ] Cross-owner isolation tests generated
- [ ] CLI for generating tests
- [ ] Coverage report generation
- [ ] 200+ permission tests auto-generated
- [ ] Tests run in < 30 seconds

## Benefits

| Metric | Before | After |
|--------|--------|-------|
| Lines of test code | ~2000 | ~500 (specs) |
| Time to add endpoint test | ~30 min | ~2 min |
| Consistency | Variable | 100% |
| Coverage gaps | Many | None |

---

**Created**: 2026-01-12
**Status**: Not Started
