# Scoped Queries System

Tenant-isolated query builders that enforce multi-tenancy at the application level.

> **Location**: `web/lib/supabase/scoped.ts`
> **Ticket**: ARCH-010
> **Last Updated**: January 2026

---

## Overview

The scoped queries system provides query builders that **automatically enforce tenant isolation**, preventing cross-tenant data access. This works alongside RLS policies as defense-in-depth.

### Key Benefits

- **Automatic tenant_id filtering** on all SELECT queries
- **Automatic tenant_id injection** on all INSERT/UPSERT operations
- **Prevents tenant_id modification** in UPDATE operations
- **Type-safe** query results with generics
- **Consistent API** across all CRUD operations

---

## Quick Start

```typescript
import { scopedQueries } from '@/lib/supabase/scoped'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const profile = await getProfile(supabase)

  // Create scoped query builder
  const { select, insert, update, delete: del } = scopedQueries(supabase, profile.tenant_id)

  // All queries automatically filtered by tenant_id
  const { data: invoices } = await select<Invoice>('invoices', '*')

  // Inserts automatically include tenant_id
  await insert('invoices', { client_id, total: 150000 })
}
```

---

## API Reference

### scopedQueries(supabase, tenantId)

Creates a scoped query builder object.

```typescript
function scopedQueries(supabase: SupabaseClient, tenantId: string): ScopedQueries
```

**Parameters:**
- `supabase` - Supabase client instance
- `tenantId` - Tenant ID for isolation (required)

**Returns:** Object with scoped query methods

---

### select()

Execute a SELECT query scoped to tenant.

```typescript
select<T>(
  table: string,
  columns?: string,
  options?: {
    filter?: (query) => query,
    single?: boolean,
    count?: 'exact' | 'planned' | 'estimated'
  }
): Promise<{ data: T[] | T | null; error: Error | null; count?: number }>
```

**Examples:**

```typescript
// Basic select
const { data: pets } = await select<Pet>('pets', '*')

// With columns
const { data } = await select('invoices', 'id, invoice_number, total')

// With additional filters
const { data: pending } = await select<Invoice>('invoices', '*', {
  filter: (q) => q.eq('status', 'pending').order('created_at', { ascending: false })
})

// Single record
const { data: invoice } = await select<Invoice>('invoices', '*', {
  filter: (q) => q.eq('id', invoiceId),
  single: true
})

// With count
const { data, count } = await select<Pet>('pets', '*', { count: 'exact' })
```

---

### insert()

Execute an INSERT with automatic tenant_id.

```typescript
insert<T>(
  table: string,
  data: Record<string, unknown> | Record<string, unknown>[],
  options?: { returning?: boolean }
): Promise<{ data: T[] | null; error: Error | null }>
```

**Examples:**

```typescript
// Single insert
const { data: [newPet] } = await insert<Pet>('pets', {
  name: 'Luna',
  species: 'dog',
  owner_id: userId,
})
// tenant_id automatically added!

// Bulk insert
const { data: invoices } = await insert<Invoice>('invoices', [
  { client_id: 'a', total: 50000 },
  { client_id: 'b', total: 75000 },
])

// Without returning data
await insert('audit_logs', { action: 'LOGIN', user_id: userId }, { returning: false })
```

---

### update()

Execute an UPDATE scoped to tenant. Automatically removes `tenant_id` from update data to prevent cross-tenant moves.

```typescript
update<T>(
  table: string,
  data: Record<string, unknown>,
  filter: (query) => query,
  options?: { returning?: boolean }
): Promise<{ data: T[] | null; error: Error | null }>
```

**Examples:**

```typescript
// Update single record
const { data: [updated] } = await update<Invoice>(
  'invoices',
  { status: 'paid', paid_at: new Date().toISOString() },
  (q) => q.eq('id', invoiceId)
)

// Update multiple records
await update(
  'reminders',
  { status: 'sent' },
  (q) => q.in('id', reminderIds)
)

// Note: Even if you include tenant_id in data, it's stripped out
await update('pets', { tenant_id: 'evil', name: 'Hacked' }, (q) => q.eq('id', petId))
// Only name is updated, tenant_id is ignored
```

---

### upsert()

Execute an UPSERT with automatic tenant_id.

```typescript
upsert<T>(
  table: string,
  data: Record<string, unknown> | Record<string, unknown>[],
  options?: { onConflict?: string; returning?: boolean }
): Promise<{ data: T[] | null; error: Error | null }>
```

**Examples:**

```typescript
// Upsert with conflict column
const { data } = await upsert<StoreCart>('store_carts', {
  customer_id: userId,
  items: cartItems,
  updated_at: new Date().toISOString(),
}, { onConflict: 'customer_id' })

// Bulk upsert
await upsert('product_mappings', products, { onConflict: 'barcode' })
```

---

### delete()

Execute a DELETE scoped to tenant.

```typescript
delete(
  table: string,
  filter: (query) => query
): Promise<{ error: Error | null }>
```

**Examples:**

```typescript
// Delete single record
await del('invoices', (q) => q.eq('id', invoiceId))

// Delete with conditions
await del('reminders', (q) => q.eq('status', 'completed').lt('created_at', cutoffDate))
```

---

### count()

Count records scoped to tenant.

```typescript
count(
  table: string,
  filter?: (query) => query
): Promise<{ count: number; error: Error | null }>
```

**Examples:**

```typescript
// Count all pets
const { count: totalPets } = await count('pets')

// Count with filter
const { count: pendingInvoices } = await count('invoices', (q) => q.eq('status', 'pending'))
```

---

### exists()

Check if a record exists and belongs to this tenant.

```typescript
exists(
  table: string,
  id: string
): Promise<{ exists: boolean; error: Error | null }>
```

**Examples:**

```typescript
const { exists } = await exists('invoices', invoiceId)
if (!exists) {
  return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
}
```

---

### verify()

Verify a resource belongs to this tenant and return it.

```typescript
verify<T>(
  table: string,
  id: string,
  columns?: string
): Promise<{ data: T | null; valid: boolean; error: Error | null }>
```

**Examples:**

```typescript
const { valid, data: pet } = await verify<Pet>('pets', petId, 'id, name, owner_id')
if (!valid) {
  return NextResponse.json({ error: 'Mascota no encontrada' }, { status: 404 })
}
// pet is now typed and verified to belong to tenant
```

---

## Helper Properties

### client

Access the raw Supabase client for edge cases.

```typescript
const { client } = scopedQueries(supabase, tenantId)
// WARNING: Use with caution - not scoped
await client.from('global_settings').select('*')
```

### tenantId

Get the tenant ID being used.

```typescript
const { tenantId } = scopedQueries(supabase, profile.tenant_id)
console.log(`Operating in tenant: ${tenantId}`)
```

---

## Tenant-Scoped Tables

The system includes a reference list of all tables requiring tenant isolation:

```typescript
import { TENANT_SCOPED_TABLES, isTenantScopedTable } from '@/lib/supabase/scoped'

// Check if a table requires tenant isolation
if (isTenantScopedTable('invoices')) {
  // Use scoped queries
}

// Full list includes 50+ tables:
// Core: profiles
// Pets: pets, vaccines, medical_records, qr_tags, vaccine_reactions, growth_standards
// Clinical: prescriptions, diagnosis_codes, drug_dosages, euthanasia_assessments
// Appointments: services, appointments
// Invoicing: invoices, invoice_items, payments, refunds, payment_methods
// Store: store_categories, store_products, store_inventory, store_orders, etc.
// Finance: expenses, loyalty_points, loyalty_transactions
// Hospitalization: kennels, hospitalizations, hospitalization_vitals, etc.
// Laboratory: lab_test_catalog, lab_panels, lab_orders, lab_results, etc.
// Consent: consent_templates, consent_documents
// Insurance: insurance_policies, insurance_claims
// Messaging: conversations, messages, whatsapp_messages
// Reminders: reminders, reminder_templates
// Staff: staff_profiles, staff_schedules, staff_time_off
// Audit: audit_logs, notifications
// Safety: lost_pets, disease_reports
```

---

## Integration with Auth Wrappers

Scoped queries work seamlessly with the auth wrapper system:

```typescript
import { withApiAuth } from '@/lib/auth'
import { scopedQueries } from '@/lib/supabase/scoped'

export const GET = withApiAuth(async ({ profile, supabase }) => {
  // tenant_id already validated by withApiAuth
  const { select } = scopedQueries(supabase, profile.tenant_id)

  const { data: invoices } = await select<Invoice>('invoices', '*', {
    filter: (q) => q.order('created_at', { ascending: false }).limit(50)
  })

  return NextResponse.json(invoices)
})
```

---

## Security Considerations

### Defense in Depth

Scoped queries work **alongside** RLS policies, not instead of them:

1. **RLS (Database Level)** - Ultimate security boundary
2. **Scoped Queries (Application Level)** - Developer convenience + defense in depth
3. **Auth Wrappers** - Authentication + authorization

### What Scoped Queries Prevent

- Forgetting to add `.eq('tenant_id', ...)` on queries
- Accidentally modifying `tenant_id` in updates
- Cross-tenant data leakage from application bugs
- Inconsistent tenant filtering across codebase

### What RLS Still Handles

- Direct database access (SQL injection, admin console)
- Supabase Edge Functions with raw queries
- Any bypass of application layer

---

## Best Practices

### DO

```typescript
// Use scoped queries for all tenant-scoped tables
const { select, insert } = scopedQueries(supabase, profile.tenant_id)

// Use verify() before operations that reference other records
const { valid } = await verify('pets', petId)
if (!valid) return notFound()

// Chain filters in the filter function
const { data } = await select('invoices', '*', {
  filter: (q) => q
    .eq('status', 'pending')
    .gte('created_at', startDate)
    .order('created_at', { ascending: false })
    .limit(10)
})
```

### DON'T

```typescript
// Don't mix scoped and unscoped queries for same table
await supabase.from('invoices').select('*')  // BAD: No tenant filter
await select('invoices', '*')  // GOOD: Scoped

// Don't trust client input for tenant_id
const tenantId = request.body.tenant_id  // BAD: User-supplied
const tenantId = profile.tenant_id  // GOOD: Server-derived

// Don't use raw client unless absolutely necessary
const { client } = scopedQueries(supabase, tenantId)
await client.from('invoices').select('*')  // BAD: Bypasses scoping
```

---

## TypeScript Types

```typescript
import type { ScopedQueries, TenantScopedTable } from '@/lib/supabase/scoped'

// Full type of scoped queries object
type ScopedQueries = ReturnType<typeof scopedQueries>

// Union of all tenant-scoped table names
type TenantScopedTable = 'profiles' | 'pets' | 'vaccines' | 'invoices' | ...
```

---

## Related Documentation

- [Authentication Patterns](../backend/authentication-patterns.md)
- [Error Handling](../backend/error-handling.md)
- [Multi-Tenancy Architecture](../architecture/multi-tenancy.md)
- [RLS Policies](rls-policies.md)
