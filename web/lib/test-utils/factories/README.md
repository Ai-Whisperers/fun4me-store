# Test Factories

Builder-pattern factories for creating test and demo data with full control over entity attributes and relationships.

## Architecture

```
Factory → API Client → Database + Side Effects
              ↓
         testContext (tracks for cleanup in test mode)
```

## Modes

- **seed**: Data persists (for demo environments)
- **test**: Data is tracked and cleaned up after tests

```typescript
import { setMode, cleanup } from '@/lib/test-utils'

// For seeding demo data
setMode('seed')

// For tests with cleanup
setMode('test')
// ... run tests ...
await cleanup()
```

## Factories

### OwnerFactory

Creates pet owner profiles with distinct personas.

```typescript
import { OwnerFactory, createPredefinedOwners } from '@/lib/test-utils/factories'

// Single owner with specific persona
const owner = await OwnerFactory.create()
  .forTenant('terrapet')
  .withPersona('vip')
  .withName('Carlos Benítez')
  .withAddress()
  .build()

// All 10 predefined owners (idempotent)
const owners = await createPredefinedOwners('terrapet')
```

**Personas**: `vip`, `budget`, `new`, `frequent`, `breeder`, `senior`, `emergency`, `loyal`, `inactive`, `standard`

### PetFactory

Creates pets with optional vaccine history.

```typescript
import { PetFactory, createPetsForOwner } from '@/lib/test-utils/factories'

// Single pet
const { pet, vaccines } = await PetFactory.create()
  .forTenant('terrapet')
  .forOwner(ownerId)
  .asDog('Labrador Retriever')
  .withProfile('healthy')
  .withVaccines()
  .withMicrochip()
  .build()

// Multiple pets for an owner
const pets = await createPetsForOwner(ownerId, 5, 'terrapet')
```

**Profiles**: `healthy`, `chronic`, `senior`, `puppy`, `exotic`, `rescue`, `show`, `reactive`, `overweight`, `standard`

### AppointmentFactory

Creates appointments with optional medical records.

```typescript
import { AppointmentFactory, createAppointmentHistory } from '@/lib/test-utils/factories'

// Single appointment
const { appointment, medicalRecord } = await AppointmentFactory.create()
  .forTenant('terrapet')
  .forPet(petId)
  .createdBy(ownerId)
  .withScenario('routine')
  .withVet(vetId)
  .inPast()
  .completed()
  .withMedicalRecord()
  .build()

// Appointment history (past + future)
const history = await createAppointmentHistory(petId, ownerId, vetId, 'terrapet', {
  past: 5,
  future: 2,
  includeRecords: true,
})
```

**Scenarios**: `routine`, `vaccine`, `emergency`, `surgery`, `followup`, `grooming`, `dental`, `lab`, `consultation`

### InvoiceFactory

Creates invoices with line items and payments.

```typescript
import { InvoiceFactory, createInvoiceHistory } from '@/lib/test-utils/factories'

// Single invoice
const { invoice, items, payments } = await InvoiceFactory.create()
  .forTenant('terrapet')
  .forClient(clientId)
  .forPet(petId)
  .addService('Consulta general', 80000)
  .addProduct('Alimento Premium', 450000, 2)
  .withDiscount(50000, 'Cliente frecuente')
  .paid('card')
  .build()

// Invoice history
const invoices = await createInvoiceHistory(clientId, petId, 'terrapet', {
  count: 5,
  includeUnpaid: true,
})
```

### LoyaltyFactory

Creates loyalty points and transaction history.

```typescript
import { LoyaltyFactory, createLoyaltyForPersona } from '@/lib/test-utils/factories'

// Custom loyalty data
const { points, transactions } = await LoyaltyFactory.forUser(userId)
  .forTenant('terrapet')
  .earnFromPurchase(500000, invoiceId)
  .earnFromAppointment(appointmentId)
  .earnFromReferral()
  .redeem(100, 'Descuento en compra')
  .build()

// Based on persona
const loyalty = await createLoyaltyForPersona(userId, 'vip', 'terrapet')
```

**Tiers**: Bronze (0-499), Silver (500-1999), Gold (2000-4999), Platinum (5000+)

### StoreOrderFactory

Creates e-commerce orders with various scenarios.

```typescript
import {
  StoreOrderFactory,
  createOrderHistory,
  createAbandonedCarts,
} from '@/lib/test-utils/factories'

// Single order
const { order, items } = await StoreOrderFactory.create()
  .forTenant('terrapet')
  .forCustomer(customerId)
  .withScenario('prescription')
  .addRandomProducts(3, true)
  .withCoupon('WELCOME10')
  .withShipping()
  .paidWith('card')
  .delivered()
  .prescriptionApproved()
  .build()

// Order history
const orders = await createOrderHistory(customerId, 'terrapet', {
  count: 5,
  scenarios: ['simple', 'prescription', 'coupon'],
})

// Abandoned carts
const carts = await createAbandonedCarts([customer1, customer2], 'terrapet')
```

**Scenarios**: `simple`, `prescription`, `abandoned`, `coupon`, `bulk`, `mixed`

## Seeding Script

Run the full seed for Adris clinic:

```bash
npx tsx web/db/seeds/scripts/seed-terrapet-demo.ts
```

With test mode (tracks for cleanup):

```bash
npx tsx web/db/seeds/scripts/seed-terrapet-demo.ts --test
```

## Testing

Run E2E verification tests:

```bash
npm test -- tests/e2e/seeded-data-verification.test.ts
```

## Data Summary

| Entity          | Target Count | Notes                      |
| --------------- | ------------ | -------------------------- |
| Owners          | 10           | Distinct personas          |
| Pets            | 50           | 5 per owner, mixed species |
| Vaccines        | ~350         | Based on age/species       |
| Appointments    | ~200         | Past, present, future      |
| Medical Records | ~100         | For completed appointments |
| Invoices        | ~30          | Various statuses           |
| Payments        | ~25          | Multiple methods           |
| Store Orders    | ~30          | Various scenarios          |
| Loyalty Points  | 10           | Different tiers            |
