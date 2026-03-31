# Scoped Queries Migration Guide

## Overview

The `scopedQueries` helper (`lib/supabase/scoped.ts`) provides automatic tenant isolation for database queries. It's already integrated into `withApiAuth` and available as `scoped` in the handler context.

## When to Use `scoped`

### ✅ Best for Simple CRUD Operations

**INSERT operations:**
```typescript
// Before (manual tenant_id)
const { data, error } = await supabase
  .from('services')
  .insert({
    tenant_id: profile.tenant_id,
    name,
    category,
    base_price,
  })
  .select()
  .single()

// After (using scoped)
const { data, error } = await scoped.insert('services', {
  name,
  category,
  base_price,
})
```

**Simple SELECT operations:**
```typescript
// Before
const { data, error } = await supabase
  .from('kennels')
  .select('*')
  .eq('tenant_id', profile.tenant_id)
  .single()

// After
const { data, error } = await scoped.select('kennels', '*', { single: true })
```

**UPDATE operations:**
```typescript
// Before
const { error } = await supabase
  .from('services')
  .update({ is_active: false })
  .eq('tenant_id', profile.tenant_id)
  .eq('id', serviceId)

// After
const { error } = await scoped.update(
  'services',
  { is_active: false },
  (q) => q.eq('id', serviceId)
)
```

**DELETE operations:**
```typescript
// Before
const { error } = await supabase
  .from('services')
  .delete()
  .eq('tenant_id', profile.tenant_id)
  .eq('id', serviceId)

// After
const { error } = await scoped.delete('services', (q) => q.eq('id', serviceId))
```

**Existence checks:**
```typescript
// Before
const { count } = await supabase
  .from('pets')
  .select('*', { count: 'exact', head: true })
  .eq('id', petId)
  .eq('tenant_id', profile.tenant_id)

// After
const { exists } = await scoped.exists('pets', petId)
```

### ❌ Keep Explicit Pattern for Complex Queries

**Complex queries with joins and conditional filters:**
```typescript
// Keep this pattern - more readable with chained conditions
let query = supabase
  .from('invoices')
  .select(`
    *,
    pets(id, name, species),
    invoice_items(id, description, quantity, unit_price),
    payments(id, amount, payment_method)
  `, { count: 'exact' })
  .eq('tenant_id', profile.tenant_id)
  .is('deleted_at', null)
  .order('created_at', { ascending: false })

// Conditional filters
if (status) {
  query = query.eq('status', status)
}
if (petId) {
  query = query.eq('pet_id', petId)
}

const { data, error, count } = await query.range(offset, offset + limit - 1)
```

**Public endpoints without auth:**
```typescript
// Can't use scoped - no profile available
const supabase = await createClient()
const { data } = await supabase
  .from('services')
  .select('*')
  .eq('tenant_id', clinic)
  .eq('is_active', true)
```

## API Reference

### `scopedQueries(supabase, tenantId)`

Returns an object with these methods:

| Method | Description | Auto tenant_id |
|--------|-------------|----------------|
| `select(table, columns, options)` | Query with tenant filter | WHERE filter |
| `insert(table, data, options)` | Insert with tenant_id | Added to data |
| `update(table, data, filter, options)` | Update within tenant | WHERE filter |
| `upsert(table, data, options)` | Upsert with tenant_id | Added to data |
| `delete(table, filter)` | Delete within tenant | WHERE filter |
| `count(table, filter)` | Count within tenant | WHERE filter |
| `exists(table, id)` | Check existence | WHERE filter |
| `verify(table, id, columns)` | Verify ownership | WHERE filter |

### Options

```typescript
// select options
{
  filter?: (query) => query,  // Additional filters
  single?: boolean,           // Return single record
  count?: 'exact' | 'planned' | 'estimated'
}

// insert/upsert options
{
  returning?: boolean,        // Return inserted data (default: true)
  onConflict?: string,        // For upsert conflict handling
}

// update options
{
  returning?: boolean,        // Return updated data (default: true)
}
```

## Migration Priority

### High Priority (Migrate These)
1. Simple INSERT handlers in POST routes
2. Single-record UPDATE handlers in PUT/PATCH routes
3. DELETE handlers

### Low Priority (Keep Explicit)
1. Complex SELECT with joins
2. Queries with pagination
3. Queries with conditional filters
4. Public endpoints

## Security Benefits

Using `scoped` provides:
1. **Automatic tenant isolation** - Can't accidentally forget `.eq('tenant_id', ...)`
2. **Prevention of cross-tenant moves** - `update()` strips tenant_id from data
3. **Consistent query patterns** - Same API across all handlers
4. **Audit trail** - Easy to verify tenant isolation in code reviews

## Current Adoption

- **Using scoped:** 3 files
- **Manual tenant filter:** 150 files (323 occurrences)

Gradual migration is recommended. Prioritize new code and simple CRUD operations.
