# TST-017: Fixture Factory Patterns

## Summary

**Priority**: P2 - Medium
**Effort**: 4-6 hours
**Epic**: [EPIC-17](../epics/EPIC-17-comprehensive-test-coverage.md)
**Type**: Test Infrastructure
**Dependencies**: None

## Problem Statement

Current fixture creation is scattered and inconsistent. Tests create data inline, leading to:
- Code duplication
- Inconsistent test data
- Difficult maintenance
- Hard to understand relationships

## Current State

```
tests/__fixtures__/
└── users.ts    # Basic user fixtures only
```

Most tests create fixtures inline:

```typescript
// Scattered across test files
const pet = await supabase.from('pets').insert({
  tenant_id: testTenantId,
  owner_id: userId,
  name: 'Test Pet',
  species: 'dog',
  // ... more fields
}).select().single();
```

## Proposed Factory Pattern

### Base Factory Structure

```typescript
// tests/__fixtures__/factory.ts

export interface FactoryOptions<T> {
  overrides?: Partial<T>;
  traits?: string[];
  count?: number;
}

export abstract class BaseFactory<T> {
  protected abstract defaultAttrs(): T;
  protected abstract tableName: string;
  protected traits: Record<string, Partial<T>> = {};

  async create(options: FactoryOptions<T> = {}): Promise<T> {
    const attrs = this.buildAttrs(options);
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(attrs)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async createMany(count: number, options: FactoryOptions<T> = {}): Promise<T[]> {
    const items = Array(count).fill(null).map(() => this.buildAttrs(options));
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(items)
      .select();

    if (error) throw error;
    return data;
  }

  build(options: FactoryOptions<T> = {}): T {
    return this.buildAttrs(options);
  }

  private buildAttrs(options: FactoryOptions<T>): T {
    let attrs = { ...this.defaultAttrs() };

    // Apply traits
    if (options.traits) {
      for (const trait of options.traits) {
        if (this.traits[trait]) {
          attrs = { ...attrs, ...this.traits[trait] };
        }
      }
    }

    // Apply overrides
    if (options.overrides) {
      attrs = { ...attrs, ...options.overrides };
    }

    return attrs;
  }
}
```

### Entity Factories

```typescript
// tests/__fixtures__/factories/user.factory.ts

export class UserFactory extends BaseFactory<User> {
  protected tableName = 'profiles';

  protected traits = {
    owner: { role: 'owner' },
    vet: { role: 'vet' },
    admin: { role: 'admin' },
    verified: { email_verified: true },
    unverified: { email_verified: false },
  };

  protected defaultAttrs(): User {
    return {
      id: generate.uuid(),
      tenant_id: testTenantId,
      email: generate.email(),
      full_name: generate.name(),
      phone: generate.phone(),
      role: 'owner',
      email_verified: true,
      created_at: new Date().toISOString(),
    };
  }

  // Convenience methods
  async createOwner(overrides?: Partial<User>): Promise<User> {
    return this.create({ traits: ['owner'], overrides });
  }

  async createVet(overrides?: Partial<User>): Promise<User> {
    return this.create({ traits: ['vet'], overrides });
  }

  async createAdmin(overrides?: Partial<User>): Promise<User> {
    return this.create({ traits: ['admin'], overrides });
  }
}

export const userFactory = new UserFactory();
```

```typescript
// tests/__fixtures__/factories/pet.factory.ts

export class PetFactory extends BaseFactory<Pet> {
  protected tableName = 'pets';

  protected traits = {
    dog: { species: 'dog', breed: 'Labrador' },
    cat: { species: 'cat', breed: 'Siamese' },
    puppy: {
      species: 'dog',
      date_of_birth: subMonths(new Date(), 3).toISOString(),
    },
    senior: {
      date_of_birth: subYears(new Date(), 10).toISOString(),
    },
    microchipped: { microchip_id: generate.uuid() },
    withPhoto: { photo_url: 'https://example.com/pet.jpg' },
  };

  protected defaultAttrs(): Pet {
    return {
      id: generate.uuid(),
      tenant_id: testTenantId,
      owner_id: null, // Must be set
      name: generate.petName(),
      species: 'dog',
      breed: 'Mixed',
      sex: 'male',
      date_of_birth: subYears(new Date(), 2).toISOString(),
      weight_kg: 15,
      is_neutered: true,
      created_at: new Date().toISOString(),
    };
  }

  // Convenience methods with relationships
  async createWithOwner(overrides?: Partial<Pet>): Promise<{ pet: Pet; owner: User }> {
    const owner = await userFactory.createOwner();
    const pet = await this.create({
      overrides: { owner_id: owner.id, ...overrides }
    });
    return { pet, owner };
  }

  async createWithVaccines(
    count: number = 3,
    overrides?: Partial<Pet>
  ): Promise<{ pet: Pet; vaccines: Vaccine[] }> {
    const { pet } = await this.createWithOwner(overrides);
    const vaccines = await vaccineFactory.createMany(count, {
      overrides: { pet_id: pet.id },
    });
    return { pet, vaccines };
  }
}

export const petFactory = new PetFactory();
```

```typescript
// tests/__fixtures__/factories/appointment.factory.ts

export class AppointmentFactory extends BaseFactory<Appointment> {
  protected tableName = 'appointments';

  protected traits = {
    pending: { status: 'pending' },
    confirmed: { status: 'confirmed' },
    completed: { status: 'completed' },
    cancelled: { status: 'cancelled' },
    today: {
      start_time: new Date().toISOString(),
      end_time: addHours(new Date(), 1).toISOString(),
    },
    tomorrow: {
      start_time: addDays(new Date(), 1).toISOString(),
      end_time: addDays(addHours(new Date(), 1), 1).toISOString(),
    },
  };

  protected defaultAttrs(): Appointment {
    const startTime = addDays(new Date(), 7);
    return {
      id: generate.uuid(),
      tenant_id: testTenantId,
      pet_id: null, // Must be set
      owner_id: null, // Must be set
      vet_id: null,
      service_id: null,
      start_time: startTime.toISOString(),
      end_time: addHours(startTime, 1).toISOString(),
      status: 'pending',
      scheduling_status: 'pending_scheduling',
      notes: '',
      created_at: new Date().toISOString(),
    };
  }

  async createWithRelations(
    overrides?: Partial<Appointment>
  ): Promise<{
    appointment: Appointment;
    pet: Pet;
    owner: User;
    vet: User;
    service: Service;
  }> {
    const { pet, owner } = await petFactory.createWithOwner();
    const vet = await userFactory.createVet();
    const service = await serviceFactory.create();

    const appointment = await this.create({
      overrides: {
        pet_id: pet.id,
        owner_id: owner.id,
        vet_id: vet.id,
        service_id: service.id,
        ...overrides,
      },
    });

    return { appointment, pet, owner, vet, service };
  }
}

export const appointmentFactory = new AppointmentFactory();
```

### Invoice Factory (Complex Relationships)

```typescript
// tests/__fixtures__/factories/invoice.factory.ts

export class InvoiceFactory extends BaseFactory<Invoice> {
  protected tableName = 'invoices';

  protected traits = {
    draft: { status: 'draft', invoice_number: null },
    sent: { status: 'sent' },
    paid: { status: 'paid' },
    partial: { status: 'partial' },
    overdue: {
      status: 'sent',
      due_date: subDays(new Date(), 30).toISOString(),
    },
  };

  protected defaultAttrs(): Invoice {
    return {
      id: generate.uuid(),
      tenant_id: testTenantId,
      client_id: null,
      invoice_number: `INV-${Date.now()}`,
      subtotal: 100000,
      tax_amount: 10000,
      total: 110000,
      status: 'draft',
      due_date: addDays(new Date(), 30).toISOString(),
      created_at: new Date().toISOString(),
    };
  }

  async createWithLineItems(
    items: Array<{ type: 'service' | 'product'; price: number }>
  ): Promise<{ invoice: Invoice; items: InvoiceItem[] }> {
    const owner = await userFactory.createOwner();
    const subtotal = items.reduce((sum, i) => sum + i.price, 0);
    const tax = Math.round(subtotal * 0.1);

    const invoice = await this.create({
      overrides: {
        client_id: owner.id,
        subtotal,
        tax_amount: tax,
        total: subtotal + tax,
      },
    });

    const invoiceItems = await Promise.all(
      items.map((item) =>
        invoiceItemFactory.create({
          overrides: {
            invoice_id: invoice.id,
            item_type: item.type,
            unit_price: item.price,
            quantity: 1,
          },
        })
      )
    );

    return { invoice, items: invoiceItems };
  }

  async createPaidWithPayments(
    amount: number
  ): Promise<{ invoice: Invoice; payments: Payment[] }> {
    const owner = await userFactory.createOwner();
    const invoice = await this.create({
      traits: ['paid'],
      overrides: {
        client_id: owner.id,
        subtotal: amount,
        tax_amount: Math.round(amount * 0.1),
        total: amount + Math.round(amount * 0.1),
      },
    });

    const payment = await paymentFactory.create({
      overrides: {
        invoice_id: invoice.id,
        amount: invoice.total,
      },
    });

    return { invoice, payments: [payment] };
  }
}

export const invoiceFactory = new InvoiceFactory();
```

### Factory Registry

```typescript
// tests/__fixtures__/index.ts

import { userFactory } from './factories/user.factory';
import { petFactory } from './factories/pet.factory';
import { appointmentFactory } from './factories/appointment.factory';
import { invoiceFactory } from './factories/invoice.factory';
import { vaccineFactory } from './factories/vaccine.factory';
import { serviceFactory } from './factories/service.factory';
import { productFactory } from './factories/product.factory';
import { hospitalizationFactory } from './factories/hospitalization.factory';

export const factories = {
  user: userFactory,
  pet: petFactory,
  appointment: appointmentFactory,
  invoice: invoiceFactory,
  vaccine: vaccineFactory,
  service: serviceFactory,
  product: productFactory,
  hospitalization: hospitalizationFactory,
};

// Shorthand exports
export {
  userFactory,
  petFactory,
  appointmentFactory,
  invoiceFactory,
  vaccineFactory,
  serviceFactory,
  productFactory,
  hospitalizationFactory,
};
```

## File Structure

```
tests/__fixtures__/
├── factory.ts                    # BaseFactory class
├── factories/
│   ├── user.factory.ts           # User/Profile factory
│   ├── pet.factory.ts            # Pet factory
│   ├── appointment.factory.ts    # Appointment factory
│   ├── invoice.factory.ts        # Invoice + items factory
│   ├── vaccine.factory.ts        # Vaccine factory
│   ├── service.factory.ts        # Service factory
│   ├── product.factory.ts        # Product + inventory factory
│   ├── hospitalization.factory.ts # Hospitalization factory
│   ├── procurement.factory.ts    # Supplier + PO factory
│   └── messaging.factory.ts      # Conversation + message factory
├── users.ts                      # Legacy (migrate to factory)
└── index.ts                      # Registry and exports
```

## Usage Examples

```typescript
import { petFactory, appointmentFactory, factories } from '@/tests/__fixtures__';

describe('Appointment API', () => {
  it('should book appointment for pet', async () => {
    // Create pet with owner automatically
    const { pet, owner } = await petFactory.createWithOwner();

    // Create appointment with all relations
    const { appointment, vet, service } =
      await appointmentFactory.createWithRelations({
        pet_id: pet.id,
        owner_id: owner.id,
      });

    expect(appointment.pet_id).toBe(pet.id);
  });

  it('should list confirmed appointments', async () => {
    // Create multiple appointments with trait
    await appointmentFactory.createMany(5, { traits: ['confirmed'] });

    const res = await api.get('/api/appointments?status=confirmed');
    expect(res.data).toHaveLength(5);
  });

  it('should handle today appointments', async () => {
    // Use combined traits
    await appointmentFactory.create({
      traits: ['confirmed', 'today']
    });

    const res = await api.get('/api/appointments/today');
    expect(res.data).toHaveLength(1);
  });
});
```

## Acceptance Criteria

- [ ] BaseFactory class implemented
- [ ] 10 entity factories created
- [ ] Trait system working
- [ ] Relationship creation helpers
- [ ] Factory registry exported
- [ ] All existing fixtures migrated
- [ ] JSDoc documentation
- [ ] Example tests updated

## Migration Plan

1. Create BaseFactory and first factory (user)
2. Create remaining factories
3. Update existing tests to use factories
4. Remove inline fixture creation
5. Delete legacy fixture files

---

**Created**: 2026-01-12
**Status**: Not Started
