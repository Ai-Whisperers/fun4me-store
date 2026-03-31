# Domain Layer

## Overview

The domain layer implements Domain-Driven Design (DDD) patterns for clean separation of concerns:

```
domain/{entity}/
├── repository.ts    # Data access (CRUD operations)
├── service.ts       # Business logic
├── types.ts         # Entity types and interfaces
├── queries.ts       # Complex/read-only queries (optional)
└── index.ts         # Barrel exports
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   UI Layer                          │
│              (React Components)                     │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│               Server Actions                        │
│          (app/actions/*.ts)                         │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│               Domain Layer                          │
│    ┌─────────────┐      ┌──────────────┐           │
│    │  Services   │──────│ Repositories │           │
│    │  (business  │      │ (data access)│           │
│    │   logic)    │      │              │           │
│    └─────────────┘      └──────────────┘           │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│              Supabase Client                        │
│           (PostgreSQL + RLS)                        │
└─────────────────────────────────────────────────────┘
```

## Migration Status

### ✅ Fully Migrated (9 domains)

Complete implementations with Repository + Service layers:

| Domain | Repository | Service | Status |
|--------|-----------|---------|--------|
| **Appointments** | ✅ | ✅ | Complete - booking, cancellation, status updates |
| **Pets** | ✅ | ✅ | Complete - registration, transfers, CRUD |
| **Invoices** | ✅ | ✅ | Complete - create, send, void, payments |
| **Payments** | ✅ | ✅ | Complete - record, refund, summaries |
| **Messaging** | ✅ | ✅ | Complete - conversations, quick replies |
| **Vaccines** | ✅ | ✅ | Complete - schedules, reminders, tracking |
| **Clinical Tools** | ✅ | ✅ | Complete - dosage calc, growth charts |
| **Reminders** | ✅ | ✅ | Complete - appointment, vaccine, medication |
| **Safety** | ✅ | ✅ | Complete - lost pets, sightings, disease surveillance |

### ⚠️ Partial Migration (3 domains)

Repository implemented, Service layer needed:

| Domain | Repository | Service | Next Step |
|--------|-----------|---------|-----------|
| **Medical Records** | ✅ | ❌ | Create `service.ts` for business logic |
| **Hospitalizations** | ✅ | ❌ | Create `service.ts` for admission/discharge |
| **Lab** | ✅ | ❌ | Create `service.ts` for order processing |

These domains currently use repositories directly from Server Actions. They need service layers to:
- Centralize business logic
- Add validation workflows
- Implement complex operations (e.g., atomic lab order creation)
- Improve testability

**Effort**: ~4-6 hours per domain to complete service layer

### 🔄 Legacy Services (4 remaining)

Still using old `lib/services/` pattern:

| Service | Location | Migration Priority |
|---------|----------|-------------------|
| **Inventory** | `lib/services/inventory-service.ts` | P2 - Medium (complex, heavy usage) |
| **Store** | `lib/services/store-service.ts` | P2 - Medium (e-commerce critical) |
| **User** | `lib/services/user-service.ts` | P3 - Low (simple CRUD) |
| **Consent** | `lib/services/consent-service.ts` | P3 - Low (specialized) |

**Effort**: ~8-12 hours per service (complex domains)

### 📊 Summary

- **Total Domains**: 16
- **Fully Migrated**: 9 (56%)
- **Partial Migration**: 3 (19%)
- **Legacy**: 4 (25%)

**Target**: Complete all migrations by Q2 2026

## Using the Domain Layer

### Import Pattern

```typescript
import { getDomainFactory } from '@/lib/domain'

// In a server action or API route
const factory = await getDomainFactory()
const appointmentService = factory.appointments()
const petService = factory.pets()
```

### Example: Creating an Appointment

```typescript
'use server'

import { getDomainFactory } from '@/lib/domain'

export async function createAppointment(data: CreateAppointmentInput) {
  const factory = await getDomainFactory()
  const service = factory.appointments()

  const result = await service.create(data)

  if (!result.success) {
    return { error: result.error }
  }

  return { data: result.data }
}
```

## Repository Pattern

Repositories handle data access only. No business logic.

```typescript
// domain/pets/repository.ts
export class PetRepository extends BaseService {
  private readonly TABLE = 'pets'

  async findAll(tenantId: string): Promise<ServiceResult<Pet[]>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from(this.TABLE)
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name')
      if (error) throw error
      return data
    }, 'Error al listar mascotas')
  }

  async findById(id: string, tenantId: string): Promise<ServiceResult<Pet | null>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from(this.TABLE)
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single()
      if (error && error.code !== 'PGRST116') throw error
      return data
    }, 'Error al obtener mascota')
  }

  // ... create, update, delete methods
}
```

## Service Pattern

Services contain business logic and orchestrate repositories.

```typescript
// domain/pets/service.ts
export class PetService {
  constructor(private readonly repository: PetRepository) {}

  async registerPet(input: RegisterPetInput): Promise<ServiceResult<Pet>> {
    // Business validation
    if (!input.owner_id) {
      return { success: false, error: 'Se requiere un propietario' }
    }

    // Delegate to repository
    return this.repository.create({
      ...input,
      status: 'active',
    })
  }

  async transferOwnership(
    petId: string,
    newOwnerId: string,
    tenantId: string
  ): Promise<ServiceResult<Pet>> {
    // Get existing pet
    const pet = await this.repository.findById(petId, tenantId)
    if (!pet.success || !pet.data) {
      return { success: false, error: 'Mascota no encontrada' }
    }

    // Update owner
    return this.repository.update(petId, tenantId, {
      owner_id: newOwnerId,
    })
  }
}
```

## Migration from Services Layer

The `lib/services/` directory contains the legacy service layer. To migrate:

1. **Create domain structure** in `lib/domain/{entity}/`
2. **Move types** to `domain/{entity}/types.ts`
3. **Extract CRUD** to repository
4. **Move business logic** to service
5. **Update imports** across codebase
6. **Deprecate** old service

See `REFACTORING_PLAN.md` for detailed migration plans.

## Key Principles

1. **Repositories are dumb** - Only data access, no business logic
2. **Services orchestrate** - Business rules, validations, workflows
3. **Always filter by tenant_id** - Multi-tenant requirement
4. **Spanish error messages** - User-facing errors in Spanish
5. **Use ServiceResult** - Consistent error handling pattern

## Adding a New Domain

1. Create directory: `lib/domain/{entity}/`
2. Define types: `types.ts`
3. Create repository: `repository.ts`
4. Create service: `service.ts`
5. Create barrel export: `index.ts`
6. Register in factory: `lib/domain/index.ts`

## Testing

Each domain should have:

- Unit tests for service business logic
- Integration tests for repository operations
- End-to-end tests for full workflows

See `tests/unit/domain/` for examples.
