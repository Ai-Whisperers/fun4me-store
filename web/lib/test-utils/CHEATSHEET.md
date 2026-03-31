# Test Utilities - Quick Reference

## New Unified API (Recommended)

```typescript
import {
  // Fixtures - use these for common test data
  TENANTS, USERS, PETS, INVOICES, SERVICES,
  DEFAULT_TENANT, DEFAULT_OWNER, DEFAULT_VET, DEFAULT_PET,

  // Mocks - stateful Supabase mocking
  mockState, AUTH_SCENARIOS, getSupabaseServerMock,

  // Auth test generators
  testStaffOnlyEndpoint, testAdminOnlyEndpoint,

  // Factory infrastructure
  idGenerator, factoryMode, resetIdCounter,

  // Builder factories
  PetFactory, OwnerFactory, AppointmentFactory, InvoiceFactory,
} from '@/lib/test-utils';
```

---

## Quick Setup

### Unit Tests

```typescript
import { mockState, resetIdCounter, PETS } from '@/lib/test-utils';

beforeEach(() => {
  resetIdCounter();
  mockState.reset();
});

it('should use fixture data', () => {
  const pet = PETS.MAX_DOG;
  expect(pet.name).toBe('Max');
});
```

### API Route Tests

```typescript
import { vi, mockState, getSupabaseServerMock, testStaffOnlyEndpoint } from '@/lib/test-utils';
import { POST } from '@/app/api/resource/route';

vi.mock('@/lib/supabase/server', () => getSupabaseServerMock());

// Generate 5 auth tests in one line
testStaffOnlyEndpoint(POST, createRequest, 'Resource Name');

// Business logic tests
describe('Business Logic', () => {
  beforeEach(() => mockState.reset());

  it('handles request', async () => {
    mockState.setAuthScenario('VET');
    mockState.setTableResult('pets', [PETS.MAX_DOG]);

    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});
```

---

## Fixtures Cheat Sheet

```typescript
// Tenants
TENANTS.ADRIS     // { id: 'terrapet', name: 'Veterinaria Adris', slug: 'terrapet' }
TENANTS.PETLIFE   // { id: 'petlife', ... }
TENANTS.TEST      // { id: 'test-tenant', ... }

// Users by role
USERS.OWNER_JUAN    // Owner at ADRIS
USERS.OWNER_MARIA   // Owner at ADRIS
USERS.VET_CARLOS    // Vet at ADRIS
USERS.VET_ANA       // Vet at ADRIS
USERS.ADMIN_PRINCIPAL // Admin at ADRIS

// Pets
PETS.MAX_DOG      // Labrador, owned by Juan
PETS.LUNA_CAT     // Siamese, owned by Juan
PETS.ROCKY_DOG    // Bulldog, owned by Maria

// Invoices
INVOICES.DRAFT    // Draft status
INVOICES.SENT     // Sent status
INVOICES.PARTIAL  // Partially paid
INVOICES.PAID     // Fully paid

// Services
SERVICES.CONSULTATION  // Consulta General
SERVICES.VACCINATION   // Vacunación
SERVICES.SURGERY_MINOR // Cirugía Menor
SERVICES.GROOMING      // Baño y Peluquería
```

---

## MockState Cheat Sheet

### Set Auth Scenario

```typescript
mockState.setAuthScenario('UNAUTHENTICATED'); // No auth
mockState.setAuthScenario('OWNER');           // Pet owner
mockState.setAuthScenario('VET');             // Veterinarian
mockState.setAuthScenario('ADMIN');           // Admin
```

### Set Table Results

```typescript
mockState.setTableResult('invoices', [invoice1, invoice2]);
mockState.setTableResult('pets', PETS.MAX_DOG);  // Single item
mockState.setRpcResult('calculate_total', { total: 150000 });
mockState.setTableError('invoices', new Error('DB error'));
```

### Reset Between Tests

```typescript
beforeEach(() => {
  mockState.reset();  // Clears user, profile, and all results
});
```

---

## Auth Test Generators

```typescript
// Staff only (vet + admin)
testStaffOnlyEndpoint(POST, createRequest, 'Resource Name');

// Admin only
testAdminOnlyEndpoint(DELETE, createRequest, 'Delete User');

// Any authenticated user
testAuthenticatedEndpoint(GET, createRequest, 'View Profile');

// Custom roles
testAuthorizationScenarios({
  handler: POST,
  createRequest: () => new NextRequest(url, options),
  allowedRoles: ['vet', 'admin'],
  resourceName: 'Discharge Patient',
});
```

**Generated tests (5 per endpoint):**
- should reject unauthenticated requests with 401
- should reject owner role (if not allowed)
- should allow vet role (if allowed)
- should allow admin role (if allowed)
- should reject user with missing profile

---

## Builder Factories

```typescript
// Pet
const pet = PetFactory.create()
  .forTenant('terrapet')
  .forOwner('owner-123')
  .asDog('Labrador')
  .build();

// Appointment
const appointment = AppointmentFactory.create()
  .forTenant('terrapet')
  .forPet('pet-123')
  .withVet('vet-456')
  .withStatus('confirmed')
  .build();

// Invoice
const invoice = InvoiceFactory.create()
  .forTenant('terrapet')
  .forClient('client-123')
  .withStatus('sent')
  .withAmount(150000)
  .build();
```

---

## Legacy Factories (Still Supported)

```typescript
import {
  createMockPet,
  createMockProfile,
  createMockAppointment,
  createMockInvoice,
  createSupabaseMock,
  resetIdCounter,
} from '@/lib/test-utils';

const pet = createMockPet({ name: 'Fido' });
const vet = createMockProfile({ role: 'vet' });
const appointment = createMockAppointment({ status: 'confirmed' });

const { supabase, helpers } = createSupabaseMock();
helpers.setQueryResult(pet);
helpers.setUser({ id: 'user-123', email: 'test@example.com' });
```

---

## Common Patterns

### API Route with Auth + Business Logic

```typescript
import { vi, mockState, getSupabaseServerMock, testStaffOnlyEndpoint, INVOICES } from '@/lib/test-utils';
import { POST } from '@/app/api/invoices/[id]/record-payment/route';

vi.mock('@/lib/supabase/server', () => getSupabaseServerMock());

const createRequest = () => new NextRequest(url, {
  method: 'POST',
  body: JSON.stringify({ amount: 50000 }),
});

const createContext = () => ({
  params: Promise.resolve({ id: INVOICES.SENT.id }),
});

// Auth tests (1 line = 5 tests)
testStaffOnlyEndpoint(POST, createRequest, 'Record Payment', createContext);

// Business logic tests
describe('Record Payment - Business Logic', () => {
  beforeEach(() => mockState.reset());

  it('records payment successfully', async () => {
    mockState.setAuthScenario('VET');
    mockState.setTableResult('invoices', [INVOICES.SENT]);

    const response = await POST(createRequest(), createContext());
    expect(response.status).toBe(200);
  });

  it('rejects overpayment', async () => {
    mockState.setAuthScenario('VET');
    mockState.setTableResult('invoices', [INVOICES.PAID]);

    const response = await POST(createRequest(), createContext());
    expect(response.status).toBe(400);
  });
});
```

### Multi-Tenant Testing

```typescript
import { TENANTS, USERS, PETS } from '@/lib/test-utils';

it('isolates tenant data', () => {
  // ADRIS tenant
  expect(PETS.MAX_DOG.tenant_id).toBe(TENANTS.ADRIS.id);
  expect(USERS.OWNER_JUAN.tenantId).toBe(TENANTS.ADRIS.id);

  // PETLIFE tenant
  expect(PETS.MILO_PETLIFE.tenant_id).toBe(TENANTS.PETLIFE.id);
  expect(USERS.OWNER_PETLIFE.tenantId).toBe(TENANTS.PETLIFE.id);
});
```

---

## Migration Quick Reference

### Inline Mocks → MockState

```typescript
// BEFORE
let mockUser = null;
let mockProfile = null;
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: { getUser: vi.fn(() => ({ data: { user: mockUser } })) },
    from: vi.fn((table) => { /* complex logic */ }),
  })),
}));

// AFTER
vi.mock('@/lib/supabase/server', () => getSupabaseServerMock());
mockState.setAuthScenario('VET');
mockState.setTableResult('invoices', [invoice]);
```

### Manual Auth Tests → Generator

```typescript
// BEFORE: ~50 lines of repetitive tests
it('should reject unauthenticated', async () => { /* 8 lines */ });
it('should reject owner role', async () => { /* 10 lines */ });
it('should allow vet role', async () => { /* 10 lines */ });
it('should allow admin role', async () => { /* 10 lines */ });
it('should reject missing profile', async () => { /* 10 lines */ });

// AFTER: 1 line
testStaffOnlyEndpoint(POST, createRequest, 'Resource Name', createContext);
```

---

## Tips

1. **Use fixtures first** - `PETS.MAX_DOG` instead of `createMockPet()`
2. **Reset mockState in beforeEach** - `mockState.reset()`
3. **Use auth generators** - Saves 40+ lines per endpoint
4. **Test both paths** - Auth tests + business logic tests
5. **Match tenant IDs** - Fixtures are pre-configured for ADRIS

## File Locations

- Source: `web/lib/test-utils/`
- Fixtures: `web/lib/test-utils/fixtures/`
- Cleanup: `web/tests/__helpers__/cleanup-manager.ts`
- Docs: `web/lib/test-utils/README.md`
