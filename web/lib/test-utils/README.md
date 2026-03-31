# Test Utilities

Unified testing infrastructure for the Vete veterinary platform. Provides factories, mocks, fixtures, and test generators.

## Quick Start

```typescript
import {
  // Fixtures - consolidated test data
  TENANTS, USERS, PETS, INVOICES,

  // Mocks - stateful Supabase mocking
  mockState, AUTH_SCENARIOS, createStatefulSupabaseMock,

  // Auth tests - generate authorization tests
  testStaffOnlyEndpoint, testAdminOnlyEndpoint,

  // Factories - builder pattern
  PetFactory, OwnerFactory, AppointmentFactory,

  // Core infrastructure
  idGenerator, factoryMode,
} from '@/lib/test-utils';
```

---

## Table of Contents

1. [Fixtures](#fixtures) - Consolidated test data constants
2. [Mock Presets](#mock-presets) - Stateful Supabase mocking
3. [Authorization Tests](#authorization-tests) - Test generators for auth
4. [Factory Infrastructure](#factory-infrastructure) - Core factory system
5. [Builder Factories](#builder-factories) - Rich data generation
6. [Legacy Factories](#legacy-factories) - Simple factory functions
7. [Cleanup Manager](#cleanup-manager) - Test data cleanup

---

## Fixtures

Consolidated test data constants. Single source of truth for IDs and test entities.

### Tenants

```typescript
import { TENANTS, DEFAULT_TENANT, ALL_TENANT_IDS } from '@/lib/test-utils';

TENANTS.ADRIS      // { id: 'terrapet', name: 'Veterinaria Adris', slug: 'terrapet' }
TENANTS.PETLIFE    // { id: 'petlife', name: 'PetLife Center', slug: 'petlife' }
TENANTS.TEST       // { id: 'test-tenant', name: 'Test Clinic', slug: 'test' }

DEFAULT_TENANT     // TENANTS.ADRIS
ALL_TENANT_IDS     // ['terrapet', 'petlife', 'test-tenant']
```

### Users

```typescript
import { USERS, DEFAULT_OWNER, DEFAULT_VET, DEFAULT_ADMIN } from '@/lib/test-utils';

// Owners
USERS.OWNER_JUAN    // Pet owner for ADRIS tenant
USERS.OWNER_MARIA   // Another owner for ADRIS
USERS.OWNER_PETLIFE // Owner for PETLIFE tenant

// Vets
USERS.VET_CARLOS    // Dr. Carlos at ADRIS
USERS.VET_ANA       // Dra. Ana at ADRIS

// Admins
USERS.ADMIN_PRINCIPAL  // Admin at ADRIS
USERS.ADMIN_PETLIFE    // Admin at PETLIFE

// Defaults
DEFAULT_OWNER  // USERS.OWNER_JUAN
DEFAULT_VET    // USERS.VET_CARLOS
DEFAULT_ADMIN  // USERS.ADMIN_PRINCIPAL
```

### Pets

```typescript
import { PETS, DEFAULT_PET } from '@/lib/test-utils';

PETS.MAX_DOG     // Labrador owned by Juan
PETS.LUNA_CAT    // Siamese owned by Juan
PETS.ROCKY_DOG   // Bulldog owned by Maria
PETS.MILO_PETLIFE // Golden at PETLIFE

DEFAULT_PET  // PETS.MAX_DOG
```

### Other Fixtures

```typescript
import { INVOICES, HOSPITALIZATIONS, KENNELS, SERVICES } from '@/lib/test-utils';

// Invoices in different states
INVOICES.DRAFT
INVOICES.SENT
INVOICES.PARTIAL
INVOICES.PAID

// Hospitalizations
HOSPITALIZATIONS.ACTIVE
HOSPITALIZATIONS.CRITICAL

// Kennels
KENNELS.K001  // Occupied
KENNELS.K002  // Available
KENNELS.K003  // VIP

// Services
SERVICES.CONSULTATION
SERVICES.VACCINATION
SERVICES.SURGERY_MINOR
SERVICES.GROOMING
```

### Helper Functions

```typescript
import { tenantUrl, toProfile, getUsersByRole, getUsersByTenant } from '@/lib/test-utils';

// Generate tenant-prefixed URLs
tenantUrl(TENANTS.ADRIS, '/dashboard')  // '/terrapet/dashboard'

// Convert UserFixture to ProfileFixture (for DB inserts)
const profile = toProfile(USERS.OWNER_JUAN);

// Filter users
const owners = getUsersByRole('owner');
const terrapetUsers = getUsersByTenant('terrapet');
```

---

## Mock Presets

Stateful Supabase mocking that eliminates boilerplate. Configure once, use everywhere.

### Auth Scenarios

```typescript
import { mockState, AUTH_SCENARIOS } from '@/lib/test-utils';

// Set auth state in one line (replaces 5+ let variables)
mockState.setAuthScenario('VET');       // Authenticated as vet
mockState.setAuthScenario('ADMIN');     // Authenticated as admin
mockState.setAuthScenario('OWNER');     // Authenticated as owner
mockState.setAuthScenario('UNAUTHENTICATED'); // No auth
```

### Table Results

```typescript
// Set query results for specific tables
mockState.setTableResult('invoices', [mockInvoice]);
mockState.setTableResult('pets', [pet1, pet2]);

// Set RPC results
mockState.setRpcResult('calculate_total', { total: 150000 });

// Set errors
mockState.setTableError('invoices', new Error('Database error'));
```

### In Test Files

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { mockState, createStatefulSupabaseMock, getSupabaseServerMock } from '@/lib/test-utils';

// Mock Supabase at module level
vi.mock('@/lib/supabase/server', () => getSupabaseServerMock());

describe('Invoice API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.reset();  // Reset between tests
  });

  it('should allow vet to view invoice', async () => {
    mockState.setAuthScenario('VET');
    mockState.setTableResult('invoices', [mockInvoice]);

    const response = await GET(request);
    expect(response.status).toBe(200);
  });

  it('should reject unauthenticated request', async () => {
    mockState.setAuthScenario('UNAUTHENTICATED');

    const response = await GET(request);
    expect(response.status).toBe(401);
  });
});
```

---

## Authorization Tests

Generate complete authorization test suites in 1-5 lines instead of 40-60.

### Staff-Only Endpoints

```typescript
import { testStaffOnlyEndpoint } from '@/lib/test-utils';
import { POST } from '@/app/api/invoices/[id]/record-payment/route';

// Generates 5 tests:
// - should reject unauthenticated requests with 401
// - should reject owner role
// - should allow vet role
// - should allow admin role
// - should reject user with missing profile
testStaffOnlyEndpoint(
  POST,
  () => new NextRequest(url, { method: 'POST', body: JSON.stringify(payload) }),
  'Record Payment',
  () => ({ params: Promise.resolve({ id: 'invoice-123' }) })
);
```

### Other Convenience Wrappers

```typescript
import {
  testAdminOnlyEndpoint,      // Only admin allowed
  testAuthenticatedEndpoint,  // All roles allowed
  testOwnerOnlyEndpoint,      // Only owner allowed
} from '@/lib/test-utils';

// Admin-only
testAdminOnlyEndpoint(DELETE, createRequest, 'Delete User');

// Any authenticated user
testAuthenticatedEndpoint(GET, createRequest, 'View Profile');
```

### Custom Authorization

```typescript
import { testAuthorizationScenarios } from '@/lib/test-utils';

testAuthorizationScenarios({
  handler: POST,
  createRequest: () => new NextRequest(url, options),
  createContext: () => ({ params: Promise.resolve({ id: 'xyz' }) }),
  allowedRoles: ['vet', 'admin'],
  resourceName: 'Discharge Patient',
  unauthorizedCode: 'AUTH_REQUIRED',
  forbiddenCode: 'INSUFFICIENT_ROLE',
  skip: {
    missingProfile: true,  // Skip specific tests
  },
});
```

### Individual Test Helpers

```typescript
import { expectUnauthorized, expectForbidden, testAuthScenario } from '@/lib/test-utils';

// Test specific scenarios
await expectUnauthorized(handler, createRequest);
await expectForbidden(handler, createRequest, 'OWNER');
await testAuthScenario(handler, createRequest, 'VET', 200);
```

---

## Factory Infrastructure

Core infrastructure for test data generation.

### ID Generator

```typescript
import { idGenerator, generateId, resetIdCounter } from '@/lib/test-utils';

// Sequential mode (for unit tests)
idGenerator.useSequentialMode();
generateId('pet');  // 'pet-1'
generateId('pet');  // 'pet-2'

// UUID mode (for integration tests)
idGenerator.useUuidMode();
generateId('pet');  // 'pet-a1b2c3d4-...'

// Reset counter
resetIdCounter();
```

### Factory Mode

```typescript
import { factoryMode } from '@/lib/test-utils';

// Unit test configuration
factoryMode.configureForUnitTests();
// - Memory mode (no DB)
// - Sequential IDs
// - Test tenant default

// Integration test configuration
factoryMode.configureForIntegrationTests();
// - Persist mode (writes to DB)
// - UUID mode
// - Tracks for cleanup

// Manual configuration
factoryMode.setMode('memory');
factoryMode.setMode('persist');
factoryMode.setDefaultTenant('terrapet');
```

---

## Builder Factories

Rich data generation with fluent API.

### Pet Factory

```typescript
import { PetFactory } from '@/lib/test-utils';

// Basic usage
const pet = PetFactory.create()
  .forTenant('terrapet')
  .forOwner('owner-123')
  .asDog('Labrador')
  .build();

// With vaccines
const { pet, vaccines } = await PetFactory.create()
  .forTenant('terrapet')
  .forOwner('owner-123')
  .asDog()
  .withVaccines()
  .build();

// Create multiple
const pets = await createPetsForOwner('owner-123', 3, 'terrapet');
```

### Owner Factory

```typescript
import { OwnerFactory, PREDEFINED_OWNERS } from '@/lib/test-utils';

// With persona
const owner = await OwnerFactory.create()
  .forTenant('terrapet')
  .withPersona('vip')      // VIP customer
  .build();

// Predefined owners
const standard = PREDEFINED_OWNERS.standardOwner('terrapet');
const vip = PREDEFINED_OWNERS.vipOwner('terrapet');
const new_ = PREDEFINED_OWNERS.newOwner('terrapet');
```

### Appointment Factory

```typescript
import { AppointmentFactory, createAppointmentHistory } from '@/lib/test-utils';

const appointment = AppointmentFactory.create()
  .forTenant('terrapet')
  .forPet('pet-123')
  .withVet('vet-456')
  .withStatus('confirmed')
  .build();

// Create history
const history = await createAppointmentHistory('pet-123', 'terrapet', 6);
```

### Invoice Factory

```typescript
import { InvoiceFactory, createInvoiceHistory } from '@/lib/test-utils';

const invoice = InvoiceFactory.create()
  .forTenant('terrapet')
  .forClient('client-123')
  .withStatus('sent')
  .withAmount(150000)
  .build();

// Auto-calculates: tax, total, balance_due
```

### Store Order Factory

```typescript
import { StoreOrderFactory, CartFactory } from '@/lib/test-utils';

const order = StoreOrderFactory.create()
  .forTenant('terrapet')
  .forCustomer('customer-123')
  .withItems([{ product_id: 'prod-1', quantity: 2 }])
  .build();

const cart = CartFactory.create()
  .forTenant('terrapet')
  .forCustomer('customer-123')
  .withItems([{ product_id: 'prod-1', quantity: 1 }])
  .build();
```

---

## Legacy Factories

Simple factory functions for quick data creation. Still fully supported.

### Basic Usage

```typescript
import {
  createMockPet,
  createMockProfile,
  createMockAppointment,
  createMockInvoice,
  createMockService,
  resetIdCounter,
} from '@/lib/test-utils';

beforeEach(() => {
  resetIdCounter();
});

const pet = createMockPet({ name: 'Fido', species: 'dog' });
const profile = createMockProfile({ role: 'vet' });
const appointment = createMockAppointment({ status: 'confirmed' });
```

### Supabase Mock

```typescript
import { createSupabaseMock } from '@/lib/test-utils';

const { supabase, helpers } = createSupabaseMock();

helpers.setQueryResult(mockPet);
helpers.setUser({ id: 'user-123', email: 'test@example.com' });
helpers.setError(new Error('Database error'));
helpers.reset();
```

---

## Cleanup Manager

For integration tests that write to the database.

```typescript
import { CleanupManager, cleanupManager } from '@/tests/__helpers__/cleanup-manager';

// Track resources as you create them
cleanupManager.track('pets', pet.id);
cleanupManager.track('invoices', invoice.id);

// Cleanup with retry (handles FK constraints)
const result = await cleanupManager.cleanupWithRetry();

// Verify cleanup
const { clean, orphans } = await cleanupManager.verifyCleanup();

// Cleanup entire tenant
await cleanupManager.cleanupTenant('test-tenant');
```

### In Test Setup

```typescript
import { cleanupManager } from '@/tests/__helpers__/cleanup-manager';

describe('Integration Tests', () => {
  afterEach(async () => {
    await cleanupManager.cleanupWithRetry();
  });

  it('creates and cleans up pet', async () => {
    const pet = await createPetInDB();
    cleanupManager.track('pets', pet.id);
    // ... test
  });
});
```

---

## Best Practices

### Unit Tests

```typescript
import { factoryMode, idGenerator, mockState, resetIdCounter } from '@/lib/test-utils';

beforeAll(() => {
  factoryMode.configureForUnitTests();
  idGenerator.useSequentialMode();
});

beforeEach(() => {
  resetIdCounter();
  mockState.reset();
});
```

### Integration Tests

```typescript
import { factoryMode, idGenerator, cleanupManager } from '@/lib/test-utils';

beforeAll(() => {
  factoryMode.configureForIntegrationTests();
  idGenerator.useUuidMode();
});

afterEach(async () => {
  await cleanupManager.cleanupWithRetry();
});
```

### API Route Tests

```typescript
import { mockState, testStaffOnlyEndpoint, INVOICES } from '@/lib/test-utils';

// 1. Use testStaffOnlyEndpoint for auth (saves 40+ lines)
testStaffOnlyEndpoint(POST, createRequest, 'Resource Name');

// 2. Use mockState for business logic tests
describe('Business Logic', () => {
  beforeEach(() => mockState.reset());

  it('processes invoice', async () => {
    mockState.setAuthScenario('VET');
    mockState.setTableResult('invoices', [INVOICES.SENT]);
    // ...
  });
});
```

---

## Migration Guide

### From Inline Mocks to MockState

**Before:**
```typescript
let mockUser: MockUser | null = null;
let mockProfile: MockProfile | null = null;
let mockInvoice: Invoice | null = null;
// ... more let declarations

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: { getUser: vi.fn(() => ({ data: { user: mockUser } })) },
    from: vi.fn((table) => {
      if (table === 'profiles') return createChain(mockProfile);
      if (table === 'invoices') return createChain(mockInvoice);
      // ... more conditions
    }),
  })),
}));
```

**After:**
```typescript
import { mockState, getSupabaseServerMock } from '@/lib/test-utils';

vi.mock('@/lib/supabase/server', () => getSupabaseServerMock());

beforeEach(() => mockState.reset());

it('test', () => {
  mockState.setAuthScenario('VET');
  mockState.setTableResult('invoices', [invoice]);
});
```

### From Manual Auth Tests to Generators

**Before:**
```typescript
it('should reject unauthenticated', async () => { /* 8 lines */ });
it('should reject owner role', async () => { /* 10 lines */ });
it('should allow vet role', async () => { /* 10 lines */ });
it('should allow admin role', async () => { /* 10 lines */ });
it('should reject missing profile', async () => { /* 10 lines */ });
// Total: ~50 lines
```

**After:**
```typescript
testStaffOnlyEndpoint(POST, createRequest, 'Resource Name', createContext);
// Total: 1 line
```
