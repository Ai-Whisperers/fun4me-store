# Factory Fixture Expansion

Analyze and expand test fixtures in `lib/test-utils/fixtures/`.

## Current Fixtures

Review `web/lib/test-utils/fixtures/index.ts`:
- TENANTS (adris, petlife, test)
- USERS (owners, vets, admins)
- PETS (dogs, cats by owner)
- INVOICES (draft, sent, partial, paid)
- HOSPITALIZATIONS
- KENNELS
- SERVICES

## Missing Fixtures

Check `web/lib/types/` for entity types and create fixtures for:

### Clinical
- [ ] PRESCRIPTIONS (active, expired, filled)
- [ ] MEDICAL_RECORDS (consultation, surgery, vaccination)
- [ ] VACCINES (administered, scheduled, overdue)
- [ ] LAB_ORDERS (ordered, in_progress, completed)
- [ ] LAB_RESULTS (normal, abnormal, critical)

### Appointments
- [ ] APPOINTMENTS (scheduled, confirmed, completed, cancelled)

### Store
- [ ] PRODUCTS (in_stock, low_stock, out_of_stock, prescription_required)
- [ ] ORDERS (pending, processing, shipped, delivered)
- [ ] CARTS (with items, empty)

### Messaging
- [ ] CONVERSATIONS (open, closed)
- [ ] MESSAGES (sent, delivered, read)

## Fixture Pattern

```typescript
export const PRESCRIPTIONS = {
  ACTIVE: {
    id: 'prescription-active-001',
    tenant_id: TENANTS.ADRIS.id,
    pet_id: PETS.MAX_DOG.id,
    vet_id: USERS.VET_CARLOS.id,
    status: 'active',
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    medications: [{ name: 'Amoxicillin', dosage: '250mg', frequency: 'twice daily' }],
  },
  EXPIRED: { /* ... */ },
} as const
```

## Ensure Consistency

- All fixtures use `TENANTS.ADRIS.id` as default tenant
- Cross-references are valid (pet_id matches existing pet)
- IDs follow pattern: `{entity}-{descriptor}-{number}`
