# Testing Utilities

Reusable test utilities, mock factories, and helpers for testing the Vete veterinary platform.

> **Location**: `web/lib/test-utils/`
> **Last Updated**: January 2026
> **Framework**: Vitest + React Testing Library

---

## Overview

The testing system provides:
- Builder-pattern factories for complex test data
- Simple factory functions for quick mocking
- Supabase client mocking with helpers
- Test context management
- Zod schemas for validation in tests

---

## Architecture

```
lib/test-utils/
├── index.ts              # Main exports
├── factories.ts          # Simple legacy factories
├── supabase-mock.ts      # Supabase client mock
├── context.ts            # Test mode management
├── api-client.ts         # API client for seeding
├── factories/            # Builder-pattern factories
│   ├── index.ts
│   ├── base.ts           # Utilities (generators, constants)
│   ├── types.ts          # Type definitions
│   ├── pet-factory.ts
│   ├── owner-factory.ts
│   ├── appointment-factory.ts
│   ├── invoice-factory.ts
│   ├── loyalty-factory.ts
│   └── store-order-factory.ts
└── schemas/              # Test validation schemas
    ├── pet.schema.ts
    ├── profile.schema.ts
    ├── invoice.schema.ts
    └── ...
```

---

## Quick Start

```typescript
import {
  createMockPet,
  createMockProfile,
  createSupabaseMock,
  resetIdCounter,
  render,
  screen,
  waitFor,
} from '@/lib/test-utils'

describe('Pet Management', () => {
  beforeEach(() => {
    resetIdCounter()
  })

  it('should display pet name', async () => {
    const pet = createMockPet({ name: 'Luna' })

    render(<PetCard pet={pet} />)

    expect(screen.getByText('Luna')).toBeInTheDocument()
  })
})
```

---

## Factory Types

### Simple Factories (Legacy)

Quick mock object creation with sensible defaults.

```typescript
import {
  createMockPet,
  createMockProfile,
  createMockAppointment,
  createMockInvoice,
  createMockService,
} from '@/lib/test-utils'

// Single item with overrides
const pet = createMockPet({ name: 'Fido', species: 'dog' })

// Multiple items
const pets = createMockPets(5, { species: 'cat' })
```

### Builder-Pattern Factories

For complex test scenarios with related data.

```typescript
import {
  OwnerFactory,
  PetFactory,
  AppointmentFactory,
} from '@/lib/test-utils/factories'

// Create owner with VIP persona
const owner = await OwnerFactory.create()
  .forTenant('adris')
  .withPersona('vip')
  .build()

// Create pet with vaccines
const { pet, vaccines } = await PetFactory.create()
  .forTenant('adris')
  .forOwner(owner.id)
  .asDog('Labrador')
  .withVaccines()
  .build()

// Create appointment history
const appointments = await createAppointmentHistory(
  pet.id,
  owner.id,
  vetId,
  'adris',
  { past: 5, future: 2, includeRecords: true }
)
```

---

## Simple Factory Reference

### createMockPet

```typescript
const pet = createMockPet({
  name: 'Fido',
  species: 'dog',      // default
  breed: 'Labrador',
  sex: 'male',
  weight_kg: 25,
})
```

**Defaults:**
- `species`: 'dog'
- `breed`: 'Mixed'
- `sex`: Random male/female
- `weight_kg`: Random 0-30 kg
- `tenant_id`: 'test-tenant'

### createMockProfile

```typescript
const vet = createMockProfile({
  role: 'vet',
  full_name: 'Dr. Smith',
  tenant_id: 'adris',
})
```

**Defaults:**
- `role`: 'owner'
- `email`: 'user{id}@test.com'
- `phone`: Random Paraguayan phone
- `is_active`: true

### createMockAppointment

```typescript
const appointment = createMockAppointment({
  status: 'confirmed',
  vet_id: 'vet-123',
  pet_id: 'pet-456',
})
```

**Defaults:**
- `status`: 'pending'
- `start_time`: Random time in next 7 days
- `end_time`: 30 minutes after start
- `reason`: 'Test appointment'

### createMockInvoice

```typescript
const invoice = createMockInvoice({
  subtotal: 100000,
  status: 'paid',
})
```

**Features:**
- Auto-calculates tax (10%)
- Sets `total_amount` = subtotal + tax
- Sets `balance_due` = total - amount_paid

---

## Builder Factory Reference

### PetFactory

```typescript
const { pet, vaccines } = await PetFactory.create()
  .forTenant('adris')           // Required
  .forOwner(ownerId)            // Required
  .withName('Luna')             // Optional
  .asDog('Labrador')            // or .asCat('Persian')
  .withSex('female')
  .asYoung()                    // or .asSenior()
  .withWeight(25)
  .neutered(true)
  .withMicrochip('985...')
  .withColor('Golden')
  .withProfile('healthy')       // healthy, chronic, senior, puppy, etc.
  .withVaccines()               // Generate vaccine history
  .build()
```

**Pet Profiles:**
- `healthy` - No conditions, standard diet
- `chronic` - Allergies and chronic conditions
- `senior` - Age-related conditions
- `puppy` - Young, active pet
- `exotic` - Specialized care
- `rescue` - Unknown history
- `show` - Competition animal
- `reactive` - Nervous temperament
- `overweight` - Weight management
- `standard` - Default

### OwnerFactory

```typescript
const owner = await OwnerFactory.create()
  .forTenant('adris')
  .withPersona('vip')           // vip, regular, new, inactive
  .withName('María García')
  .withEmail('maria@example.com')
  .withPhone('+595981234567')
  .verified(true)
  .build()
```

### AppointmentFactory

```typescript
const appointment = await AppointmentFactory.create()
  .forTenant('adris')
  .forPet(petId)
  .forOwner(ownerId)
  .forVet(vetId)
  .forService(serviceId)
  .withStatus('confirmed')
  .scheduledFor(new Date('2026-01-15T10:00:00'))
  .withDuration(30)
  .build()
```

### InvoiceFactory

```typescript
const invoice = await InvoiceFactory.create()
  .forTenant('adris')
  .forClient(clientId)
  .withItems([
    { description: 'Consulta', amount: 150000 },
    { description: 'Vacuna', amount: 50000 },
  ])
  .withStatus('paid')
  .build()
```

### StoreOrderFactory

```typescript
const order = await StoreOrderFactory.create()
  .forTenant('adris')
  .forCustomer(customerId)
  .withItems([
    { productId, quantity: 2, unitPrice: 50000 },
  ])
  .withStatus('completed')
  .build()
```

---

## Supabase Mock

Full Supabase client mocking with query chain support.

### Setup

```typescript
import { createSupabaseMock } from '@/lib/test-utils'

const { supabase, helpers, mocks } = createSupabaseMock()
```

### Setting Query Results

```typescript
// Single item
helpers.setQueryResult(mockPet)
const result = await supabase.from('pets').select('*').single()
// result.data === mockPet

// Array of items
helpers.setQueryResult([pet1, pet2, pet3])
const result = await supabase.from('pets').select('*')
// result.data === [pet1, pet2, pet3]
```

### Setting Authenticated User

```typescript
helpers.setUser({ id: 'user-123', email: 'test@example.com' })

const { data: { user } } = await supabase.auth.getUser()
// user.id === 'user-123'
```

### Setting Errors

```typescript
helpers.setError(new Error('Database error'))

const result = await supabase.from('pets').select('*')
// result.error !== null
// result.data === null
```

### Reset Mocks

```typescript
helpers.reset()
```

### Mocked Features

**Query Builder:**
- `from()`, `select()`, `insert()`, `update()`, `delete()`, `upsert()`
- `eq()`, `neq()`, `gt()`, `gte()`, `lt()`, `lte()`
- `like()`, `ilike()`, `is()`, `in()`
- `order()`, `limit()`, `range()`
- `single()`, `maybeSingle()`

**Authentication:**
- `auth.getUser()`
- `auth.getSession()`
- `auth.signIn()`
- `auth.signOut()`
- `auth.signUp()`

**Storage:**
- `storage.from().upload()`
- `storage.from().download()`
- `storage.from().getPublicUrl()`
- `storage.from().remove()`
- `storage.from().list()`

**RPC:**
- `rpc()`

---

## Test Context

Manage test mode and cleanup.

```typescript
import {
  testContext,
  setMode,
  getMode,
  isTestMode,
  isSeedMode,
} from '@/lib/test-utils'

// Set mode
setMode('test')  // or 'seed'

// Check mode
if (isTestMode()) {
  // Running in test mode
}

// Track created entities for cleanup
testContext.track('pets', petId, tenantId)

// Cleanup after tests
await testContext.cleanup()
```

---

## Utility Functions

### ID Generation

```typescript
import {
  generateId,
  generateSequence,
  resetSequence,
} from '@/lib/test-utils/factories'

// Generate UUID
const id = generateId()  // 'test-1', 'test-2', etc.

// Reset for consistent tests
resetSequence()
```

### Random Data Generators

```typescript
import {
  randomPhone,
  randomEmail,
  randomWeight,
  randomBirthDate,
  randomAmount,
  randomBusinessDate,
  randomPastDate,
  randomFutureDate,
  pick,
  pickN,
} from '@/lib/test-utils/factories'

const phone = randomPhone()           // '+595981234567'
const email = randomEmail('test')     // 'test.abc123@test.com'
const weight = randomWeight('dog', 3) // Weight for 3-year-old dog
const amount = randomAmount(10000, 100000) // Random amount

// Pick from arrays
const breed = pick(DOG_BREEDS)        // Random dog breed
const breeds = pickN(DOG_BREEDS, 3)   // 3 random breeds
```

### Constants

```typescript
import {
  PARAGUAYAN_FIRST_NAMES,
  PARAGUAYAN_LAST_NAMES,
  DOG_BREEDS,
  CAT_BREEDS,
  PET_NAMES,
  PET_COLORS,
} from '@/lib/test-utils/factories'
```

---

## Complete Test Example

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import {
  createMockPet,
  createMockProfile,
  createSupabaseMock,
  resetIdCounter,
  render,
  screen,
  waitFor,
} from '@/lib/test-utils'
import { PetList } from '@/components/pets/pet-list'

describe('PetList Component', () => {
  const { supabase, helpers } = createSupabaseMock()

  beforeEach(() => {
    resetIdCounter()
    helpers.reset()
  })

  it('should display pet list', async () => {
    // Arrange
    const owner = createMockProfile({ role: 'owner' })
    const pets = [
      createMockPet({ name: 'Fido', owner_id: owner.id }),
      createMockPet({ name: 'Whiskers', owner_id: owner.id }),
    ]

    helpers.setUser({ id: owner.id, email: owner.email })
    helpers.setQueryResult(pets)

    // Act
    render(<PetList supabase={supabase} />)

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Fido')).toBeInTheDocument()
      expect(screen.getByText('Whiskers')).toBeInTheDocument()
    })
  })

  it('should handle database errors', async () => {
    // Arrange
    helpers.setError(new Error('Connection failed'))

    // Act
    render(<PetList supabase={supabase} />)

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
  })
})
```

---

## Best Practices

### DO

- Reset ID counter in `beforeEach()` for predictable test data
- Use factories over manual objects for type safety
- Override only what you need - factories have good defaults
- Test both success and error paths
- Use builder factories for complex scenarios
- Clean up test data with `testContext.cleanup()`

### DON'T

- Skip `resetIdCounter()` - IDs will be unpredictable
- Manually construct complex objects
- Mock internal implementation details
- Share state between tests without cleanup

### Test File Organization

```
tests/
├── unit/
│   ├── components/
│   │   └── pet-card.test.tsx
│   ├── hooks/
│   │   └── use-async-data.test.ts
│   └── utils/
│       └── format-price.test.ts
├── integration/
│   ├── api/
│   │   └── pets-api.test.ts
│   └── actions/
│       └── create-pet.test.ts
└── e2e/
    └── pet-management.spec.ts
```

---

## Related Documentation

- [Validation System](../backend/validation-system.md)
- [API Overview](../api/overview.md)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
