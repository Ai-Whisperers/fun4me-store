# Service Layer Migration Guide

> **Migration from Legacy BaseService to DDD (Domain-Driven Design) Pattern**  
> Created: January 2026

---

## Overview

The Vete platform is currently migrating from a **Legacy BaseService pattern** to a modern **Domain-Driven Design (DDD)** architecture using separate **Repository** and **Service** layers.

### Current State

| Pattern | Location | Status | Description |
|---------|----------|--------|-------------|
| **Legacy** | `web/lib/services/` | 🟡 Active | Original monolithic service classes |
| **DDD** | `web/lib/domain/` | ✅ New Standard | Modular domain-based architecture |

---

## Why We're Migrating

### Problems with Legacy Pattern

1. **Monolithic Services**: Single class handles data access + business logic + validation
2. **Tight Coupling**: Hard to test business logic separately from database
3. **Code Duplication**: Similar patterns repeated across services
4. **Unclear Boundaries**: Business logic mixed with infrastructure concerns

### Benefits of DDD Pattern

1. **Separation of Concerns**: Repository (data) vs Service (business logic)
2. **Testability**: Mock repositories for unit testing business logic
3. **Modularity**: Each domain is self-contained with clear interfaces
4. **Scalability**: Easy to add new domains without affecting existing code

---

## Architecture Comparison

### Legacy Pattern (BaseService)

```
web/lib/services/
├── base-service.ts         # Abstract base class
├── appointment-service.ts  # Data + Logic mixed
├── inventory-service.ts    # Data + Logic mixed
├── store-service.ts        # Data + Logic mixed
└── ...
```

**Example**:
```typescript
// Legacy: appointment-service.ts
export class AppointmentService extends BaseService {
  async create(data: AppointmentData) {
    // Validation
    // Database access
    // Business logic
    // All in one method
  }
}
```

### New DDD Pattern

```
web/lib/domain/
├── factory.ts                    # Domain factory
├── appointments/
│   ├── repository.ts             # Data access ONLY
│   ├── service.ts                # Business logic ONLY
│   └── types.ts                  # Domain types
├── pets/
│   ├── repository.ts
│   ├── service.ts
│   └── types.ts
└── ...
```

**Example**:
```typescript
// New: appointments/repository.ts (Data Access Layer)
export class AppointmentRepository {
  async findById(id: string): Promise<Appointment | null> {
    // Database query only
  }
  
  async create(data: CreateAppointmentData): Promise<Appointment> {
    // Insert query only
  }
}

// New: appointments/service.ts (Business Logic Layer)
export class AppointmentService {
  constructor(private repository: AppointmentRepository) {}
  
  async bookAppointment(data: BookingData): Promise<ServiceResult<Appointment>> {
    // 1. Validate business rules
    // 2. Call repository methods
    // 3. Apply business logic
    // 4. Return structured result
  }
}
```

---

## Migration Status

### ✅ Fully Migrated Domains (9)

| Domain | Repository | Service | Status |
|--------|------------|---------|--------|
| **Appointments** | ✅ | ✅ | Complete - includes atomic RPC |
| **Pets** | ✅ | ✅ | Complete - with ownership transfer |
| **Invoices** | ✅ | ✅ | Complete - with payment tracking |
| **Payments** | ✅ | ✅ | Complete - with refunds |
| **Messaging** | ✅ | ✅ | Complete - internal messaging |
| **Vaccines** | ✅ | ✅ | Complete - immunization schedules |
| **Clinical Tools** | ✅ | ✅ | Complete - dosages, diagnosis codes |
| **Reminders** | ✅ | ✅ | Complete - automated reminders |
| **Safety** | ✅ | ✅ | Complete - public health protocols |

### ⚠️ Partial Domains (3)

| Domain | Repository | Service | Next Steps |
|--------|------------|---------|------------|
| **Medical Records** | ✅ | ❌ | Create service with clinical logic |
| **Hospitalizations** | ✅ | ❌ | Create service with kennel management |
| **Lab** | ✅ | ❌ | Create service with result processing |

### 🔴 Legacy Services (Not Migrated)

| Service | Complexity | Priority | Reason Not Migrated |
|---------|------------|----------|---------------------|
| `inventory-service.ts` | High | P1 | Complex WAC calculations, needs careful migration |
| `store-service.ts` | High | P1 | E-commerce logic, cart management |
| `user-service.ts` | Medium | P2 | Profile management, straightforward |
| `consent-service.ts` | Medium | P3 | Legal compliance, low change frequency |

---

## How to Migrate a Service

### Step 1: Create Domain Directory

```bash
mkdir -p web/lib/domain/my-domain
```

### Step 2: Define Types

```typescript
// web/lib/domain/my-domain/types.ts
export interface MyEntity {
  id: string;
  tenant_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMyEntityData {
  name: string;
  // ... other fields
}

export interface UpdateMyEntityData {
  name?: string;
  // ... other fields
}
```

### Step 3: Create Repository

```typescript
// web/lib/domain/my-domain/repository.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { MyEntity, CreateMyEntityData, UpdateMyEntityData } from './types';

export class MyEntityRepository {
  constructor(private supabase: SupabaseClient) {}

  async findAll(tenantId: string): Promise<MyEntity[]> {
    const { data, error } = await this.supabase
      .from('my_entities')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async findById(id: string, tenantId: string): Promise<MyEntity | null> {
    const { data, error } = await this.supabase
      .from('my_entities')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  }

  async create(data: CreateMyEntityData, tenantId: string): Promise<MyEntity> {
    const { data: created, error } = await this.supabase
      .from('my_entities')
      .insert({ ...data, tenant_id: tenantId })
      .select()
      .single();

    if (error) throw error;
    return created;
  }

  async update(id: string, data: UpdateMyEntityData, tenantId: string): Promise<MyEntity> {
    const { data: updated, error } = await this.supabase
      .from('my_entities')
      .update(data)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;
    return updated;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const { error } = await this.supabase
      .from('my_entities')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) throw error;
  }
}
```

### Step 4: Create Service

```typescript
// web/lib/domain/my-domain/service.ts
import { MyEntityRepository } from './repository';
import { CreateMyEntityData, UpdateMyEntityData, MyEntity } from './types';

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class MyEntityService {
  constructor(private repository: MyEntityRepository) {}

  async list(tenantId: string): Promise<ServiceResult<MyEntity[]>> {
    try {
      const entities = await this.repository.findAll(tenantId);
      return { success: true, data: entities };
    } catch (error) {
      console.error('[MyEntityService] list error:', error);
      return { success: false, error: 'Error al cargar entidades' };
    }
  }

  async getById(id: string, tenantId: string): Promise<ServiceResult<MyEntity>> {
    try {
      const entity = await this.repository.findById(id, tenantId);
      if (!entity) {
        return { success: false, error: 'Entidad no encontrada' };
      }
      return { success: true, data: entity };
    } catch (error) {
      console.error('[MyEntityService] getById error:', error);
      return { success: false, error: 'Error al cargar entidad' };
    }
  }

  async create(data: CreateMyEntityData, tenantId: string): Promise<ServiceResult<MyEntity>> {
    try {
      // Business logic validation
      if (!data.name || data.name.trim().length === 0) {
        return { success: false, error: 'El nombre es requerido' };
      }

      const entity = await this.repository.create(data, tenantId);
      return { success: true, data: entity };
    } catch (error) {
      console.error('[MyEntityService] create error:', error);
      return { success: false, error: 'Error al crear entidad' };
    }
  }

  async update(id: string, data: UpdateMyEntityData, tenantId: string): Promise<ServiceResult<MyEntity>> {
    try {
      // Verify existence
      const existing = await this.repository.findById(id, tenantId);
      if (!existing) {
        return { success: false, error: 'Entidad no encontrada' };
      }

      const updated = await this.repository.update(id, data, tenantId);
      return { success: true, data: updated };
    } catch (error) {
      console.error('[MyEntityService] update error:', error);
      return { success: false, error: 'Error al actualizar entidad' };
    }
  }

  async delete(id: string, tenantId: string): Promise<ServiceResult<void>> {
    try {
      await this.repository.delete(id, tenantId);
      return { success: true };
    } catch (error) {
      console.error('[MyEntityService] delete error:', error);
      return { success: false, error: 'Error al eliminar entidad' };
    }
  }
}
```

### Step 5: Register in DomainFactory

```typescript
// web/lib/domain/factory.ts
import { MyEntityRepository } from './my-domain/repository';
import { MyEntityService } from './my-domain/service';

export class DomainFactory {
  // ... existing code ...

  getMyEntityService(): MyEntityService {
    const repository = new MyEntityRepository(this.supabase);
    return new MyEntityService(repository);
  }

  getMyEntityRepository(): MyEntityRepository {
    return new MyEntityRepository(this.supabase);
  }
}
```

### Step 6: Use in API Routes/Actions

```typescript
// web/app/api/my-entities/route.ts
import { createClient } from '@/lib/supabase/server';
import { DomainFactory } from '@/lib/domain/factory';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const factory = new DomainFactory(supabase);
  const service = factory.getMyEntityService();

  // Get tenant ID (implementation depends on your auth setup)
  const tenantId = 'adris'; // Replace with actual tenant resolution

  const result = await service.list(tenantId);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json(result.data);
}
```

### Step 7: Mark Legacy Service as Deprecated

```typescript
// web/lib/services/my-entity-service.ts (legacy)
/**
 * @deprecated Use MyEntityService from lib/domain/my-domain instead
 * This service will be removed in v2.0
 */
export class LegacyMyEntityService extends BaseService {
  // ... existing code ...
}
```

### Step 8: Update Imports Gradually

```bash
# Find all usages of legacy service
grep -r "LegacyMyEntityService" web/app

# Update one by one, testing thoroughly
```

---

## Testing Strategy

### Unit Testing (New Pattern)

```typescript
// web/lib/domain/my-domain/__tests__/service.test.ts
import { describe, it, expect, vi } from 'vitest';
import { MyEntityService } from '../service';
import { MyEntityRepository } from '../repository';

describe('MyEntityService', () => {
  it('should create entity successfully', async () => {
    // Mock repository
    const mockRepository = {
      create: vi.fn().mockResolvedValue({ id: '1', name: 'Test' }),
    } as any;

    const service = new MyEntityService(mockRepository);
    const result = await service.create({ name: 'Test' }, 'tenant1');

    expect(result.success).toBe(true);
    expect(result.data?.name).toBe('Test');
    expect(mockRepository.create).toHaveBeenCalledWith(
      { name: 'Test' },
      'tenant1'
    );
  });

  it('should return error when name is empty', async () => {
    const mockRepository = {} as any;
    const service = new MyEntityService(mockRepository);
    
    const result = await service.create({ name: '' }, 'tenant1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('El nombre es requerido');
  });
});
```

---

## Migration Checklist

When migrating a legacy service, ensure:

- [ ] Created domain directory with `repository.ts`, `service.ts`, `types.ts`
- [ ] Repository only handles data access (no business logic)
- [ ] Service implements business logic and validation
- [ ] All methods return `ServiceResult<T>` with error handling
- [ ] Error messages in Spanish
- [ ] Tenant isolation enforced in all queries
- [ ] Registered in `DomainFactory`
- [ ] Unit tests written (mocking repository)
- [ ] Integration tests pass
- [ ] Legacy service marked `@deprecated`
- [ ] Imports updated in API routes/actions
- [ ] Documentation updated

---

## Common Patterns

### Atomic Operations (Using RPC)

For operations requiring database transactions:

```typescript
// Repository
async bookAppointmentAtomic(data: BookingData): Promise<Appointment> {
  const { data: result, error } = await this.supabase
    .rpc('book_appointment_atomic', {
      p_pet_id: data.pet_id,
      p_service_id: data.service_id,
      p_date: data.date,
      p_time: data.time,
    });

  if (error) throw error;
  return result;
}

// Service
async bookAppointment(data: BookingData, tenantId: string): Promise<ServiceResult<Appointment>> {
  try {
    // Validation
    if (!data.pet_id) {
      return { success: false, error: 'Pet ID requerido' };
    }

    // Use atomic RPC
    const appointment = await this.repository.bookAppointmentAtomic(data);
    return { success: true, data: appointment };
  } catch (error) {
    console.error('[AppointmentService] bookAppointment error:', error);
    return { success: false, error: 'Error al reservar cita' };
  }
}
```

### Soft Deletes

```typescript
// Repository
async softDelete(id: string, tenantId: string): Promise<void> {
  const { error } = await this.supabase
    .from('my_entities')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) throw error;
}

// Service includes business rules
async delete(id: string, tenantId: string): Promise<ServiceResult<void>> {
  try {
    // Check if entity can be deleted
    const hasReferences = await this.checkReferences(id);
    if (hasReferences) {
      return { success: false, error: 'No se puede eliminar: tiene referencias' };
    }

    await this.repository.softDelete(id, tenantId);
    return { success: true };
  } catch (error) {
    console.error('[MyEntityService] delete error:', error);
    return { success: false, error: 'Error al eliminar entidad' };
  }
}
```

---

## FAQs

### Q: Why not migrate everything at once?

**A**: Gradual migration reduces risk. We migrate high-change domains first, stable domains last.

### Q: Can legacy and new patterns coexist?

**A**: Yes! They share the same Supabase client. Migrate when convenient.

### Q: What about existing API routes using legacy services?

**A**: Update them gradually. Both patterns work during transition.

### Q: Do I need to migrate tests?

**A**: Yes. New pattern tests are simpler (mock repository instead of Supabase).

### Q: What if I need both patterns in the same file?

**A**: Acceptable temporarily. Add TODO comment for future cleanup.

---

## Related Documentation

- [Domain Architecture README](../../web/lib/domain/README.md)
- [BaseService Pattern](../../web/lib/services/base-service.ts)
- [Code Patterns Guide](../architecture/CODE_PATTERNS.md)
- [Testing Guide](./testing.md)

---

**Last Updated**: January 2026  
**Migration Progress**: 9/12 domains completed (75%)
