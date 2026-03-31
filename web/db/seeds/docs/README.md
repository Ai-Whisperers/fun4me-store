# Database Seeding

## Overview

Database seeding for the Vete veterinary platform uses **API-based seeding with factory patterns** instead of raw SQL inserts. This approach:

- Uses Supabase service role for database operations
- Leverages builder-pattern factories for realistic data generation
- Supports both test (cleanup after) and seed (persist) modes
- Is idempotent (safe to run multiple times)

## Quick Start

```bash
# Full demo environment (recommended for development)
npm run seed:demo

# Basic clinic setup only (services, kennels, payment methods)
npm run seed:basic

# Reference data only (diagnosis codes, drugs, etc.)
npm run seed:reference

# Full setup with store products
npm run seed:full

# Clear existing data and reseed
npm run seed:reset
```

## Seed Script

The main seeding script is located at `db/seeds/scripts/seed.ts`.

### Usage

```bash
npx tsx db/seeds/scripts/seed.ts [options]

Options:
  --type, -t <type>     Seed type: basic, reference, full, demo (default: demo)
  --tenant <id>         Tenant ID to seed (default: terrapet)
  --tenants <ids>       Comma-separated tenant IDs
  --clear               Clear existing tenant data first
  --verbose, -v         Verbose output
  --help, -h            Show help
```

### Examples

```bash
# Seed demo data for terrapet tenant
npx tsx db/seeds/scripts/seed.ts --type demo --tenant terrapet

# Seed both terrapet and petlife with full data
npx tsx db/seeds/scripts/seed.ts --type full --tenants terrapet,petlife

# Clear existing data and reseed with demo data
npx tsx db/seeds/scripts/seed.ts --clear --type demo
```

## Seed Types

| Type        | Description           | What's Seeded                                                      |
| ----------- | --------------------- | ------------------------------------------------------------------ |
| `basic`     | Minimal clinic setup  | Services, kennels, payment methods                                 |
| `reference` | Reference data only   | Diagnosis codes, drug dosages, growth standards, lab tests         |
| `full`      | Complete setup        | Reference data + clinic data + store products + inventory          |
| `demo`      | Full demo environment | Everything from `full` + demo owners, pets, appointments, invoices |

## Factory System

Seeding uses builder-pattern factories located in `lib/test-utils/factories/`:

### Available Factories

| Factory              | Purpose                                                               |
| -------------------- | --------------------------------------------------------------------- |
| `OwnerFactory`       | Create pet owner profiles with personas (VIP, budget, new, etc.)      |
| `PetFactory`         | Create pets with species, breeds, vaccines, and health profiles       |
| `AppointmentFactory` | Create appointments with various scenarios (routine, emergency, etc.) |
| `InvoiceFactory`     | Create invoices with line items and payments                          |
| `LoyaltyFactory`     | Create loyalty points and transaction history                         |
| `StoreOrderFactory`  | Create store orders with items                                        |
| `CartFactory`        | Create shopping carts (abandoned cart scenarios)                      |

### Factory Usage Example

```typescript
import { OwnerFactory, PetFactory, createAppointmentHistory } from '@/lib/test-utils/factories'
import { setMode } from '@/lib/test-utils/context'

// Set mode: 'seed' (persist) or 'test' (cleanup after)
setMode('seed')

// Create an owner with VIP persona
const owner = await OwnerFactory.create()
  .forTenant('terrapet')
  .withPersona('vip')
  .withName('Carlos Benítez')
  .withAddress()
  .build()

// Create a pet with vaccines
const { pet, vaccines } = await PetFactory.create()
  .forTenant('terrapet')
  .forOwner(owner.id)
  .asDog('Labrador Retriever')
  .withProfile('healthy')
  .withVaccines()
  .build()

// Create appointment history
const appointments = await createAppointmentHistory(pet.id, owner.id, vetId, 'terrapet', {
  past: 5,
  future: 2,
  includeRecords: true,
})
```

## Data Structure

Seed data is organized in JSON files under `db/seeds/data/`:

```
data/
├── 00-core/               # Core tenant configuration
│   ├── tenants.json       # Clinic tenants (terrapet, petlife)
│   └── demo-accounts.json # Demo user credentials
│
├── 01-reference/          # Medical reference data (global)
│   ├── diagnosis-codes.json
│   ├── drug-dosages.json
│   ├── growth-standards.json
│   ├── lab-tests.json
│   ├── vaccine-protocols.json
│   └── insurance-providers.json
│
├── 02-clinic/             # Clinic-specific operational data
│   ├── _global/           # Shared templates
│   │   ├── consent-templates.json
│   │   ├── message-templates.json
│   │   └── time-off-types.json
│   ├── terrapet/             # Adris clinic data
│   │   ├── services.json
│   │   ├── payment-methods.json
│   │   └── kennels.json
│   └── petlife/           # PetLife clinic data
│
└── 03-store/              # E-commerce data
    ├── brands.json
    ├── categories.json
    ├── suppliers.json
    ├── products/          # Product files by brand
    └── tenant-products/   # Tenant-specific pricing
```

## Environment Variables

Required environment variables for seeding:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

The seed script will automatically load from `.env.local` if available.

## Test vs Seed Mode

The factory system supports two modes:

- **`test` mode**: Resources are tracked and cleaned up after tests
- **`seed` mode**: Resources persist (for development/demo data)

```typescript
import { setMode, testContext } from '@/lib/test-utils/context'

// For development seeding
setMode('seed')

// For tests (auto-cleanup)
setMode('test')

// Manual cleanup (in test mode)
await testContext.cleanup()
```

## Data Volumes

When running `seed:demo`, the following is created:

| Entity          | Count | Notes                                           |
| --------------- | ----- | ----------------------------------------------- |
| Owners          | 10    | With distinct personas (VIP, budget, new, etc.) |
| Pets            | 20    | 2 per owner, with vaccines and health profiles  |
| Appointments    | ~50   | Past and future, with medical records           |
| Invoices        | ~20   | With line items and payments                    |
| Store Products  | 1000+ | From 64 brands                                  |
| Diagnosis Codes | 100+  | VeNom standard codes                            |

## Troubleshooting

### "Missing environment variables" error

Ensure `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in `.env.local`.

### Foreign key constraint errors

Run seeds in order: `reference` → `basic` → `demo`. Or use `seed:demo` which handles ordering.

### Duplicate key errors

The script uses `upsert` with conflict resolution. If you still see errors, run with `--clear` first.

## Migration from SQL-Based Seeding

The previous SQL-based seeding (`seed-from-json.ts`, `generated-seed.sql`) has been replaced by the API-based approach. Benefits:

- **No hardcoded UUIDs**: IDs are generated at runtime
- **Business logic validation**: Data goes through normal validation
- **Proper relationships**: Foreign keys are maintained by the backend
- **Idempotent**: Safe to run multiple times
- **Realistic data**: Factories generate realistic Paraguayan names, addresses, etc.

## See Also

- [Factory Types](../../../lib/test-utils/factories/types.ts) - Type definitions for factories
- [API Client](../../../lib/test-utils/api-client.ts) - HTTP/Supabase client for seeding
- [Test Context](../../../lib/test-utils/context.ts) - Mode and cleanup management
