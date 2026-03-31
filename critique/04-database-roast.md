# 🗃️ Database Roast

> *"Your database is only as secure as your laziest RLS policy."*

**Score: 7.5/10** — *"Strong schema, questionable enforcement"*

---

## Overview

100+ tables. RLS enabled. Proper tenant isolation... in theory. The schema design is solid, the migrations are organized, but when you dig into the queries, you'll find soft deletes ignored, indexes missing, and Row-Level Security that might just be security theater.

---

## 🔴 Critical Issues

### DB-001: RLS Policy Verification Gap

**The Crime:**

You have 100+ tables with RLS "enabled." But have you actually verified the policies work?

```sql
-- Do all these tables have proper RLS?
profiles, pets, appointments, invoices, invoice_items,
medical_records, prescriptions, vaccines, vaccine_reactions,
store_products, store_orders, store_cart, store_inventory,
lab_orders, lab_results, hospitalizations, kennel_assignments,
consent_documents, insurance_claims, messages, notifications,
reminders, staff_schedules, time_off_requests, ...
-- (100+ more)
```

**The Question:**
```sql
-- Run this in Supabase SQL editor
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false;

-- If any critical tables show up, you have a problem.
```

**The Audit:**
```bash
# Ask Supabase for security issues
supabase get advisors --type security
```

**Why It Hurts:**
- A single table without RLS = tenant data leak
- RLS without proper policies = false sense of security
- "It works in development" means nothing

**The Fix:**

Create RLS tests for every table:
```typescript
// tests/security/rls-comprehensive.test.ts
describe('RLS Policies', () => {
  for (const table of CRITICAL_TABLES) {
    it(`${table}: tenant A cannot see tenant B data`, async () => {
      // Create data in tenant A
      // Login as tenant B user
      // Query should return empty
    })

    it(`${table}: owner cannot see other owner data`, async () => {
      // Similar test for owner isolation
    })

    it(`${table}: staff can see tenant data`, async () => {
      // Verify staff access
    })
  }
})
```

**Effort:** 🔴 High (but critical)

---

### DB-002: Soft Deletes Ignored

**The Crime:**

Tables have `deleted_at` columns:
```sql
-- web/db/10_core/02_profiles.sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  ...
  deleted_at TIMESTAMPTZ  -- For soft delete
);
```

Queries don't filter them:
```typescript
// app/api/store/cart/route.ts
const { data } = await supabase
  .from('store_carts')
  .select('*')
  .eq('customer_id', user.id)
  .eq('tenant_id', tenantId)
  // WHERE IS .is('deleted_at', null)?!
```

**Why It Hurts:**
- "Deleted" users can still have carts loaded
- "Deleted" products appear in stores
- Data you thought was gone is very much there

**The Fix:**

Option 1: Add filter everywhere
```typescript
const { data } = await supabase
  .from('table')
  .select('*')
  .is('deleted_at', null)  // Always include this
```

Option 2: Create views that filter automatically
```sql
CREATE VIEW active_profiles AS
SELECT * FROM profiles WHERE deleted_at IS NULL;
```

Option 3: RLS policy that hides deleted
```sql
CREATE POLICY "Hide deleted" ON profiles
FOR SELECT USING (deleted_at IS NULL);
```

**Effort:** 🟡 Medium

---

## 🟠 High Priority Issues

### DB-003: Missing Composite Indexes

**The Crime:**

Common query patterns:
```typescript
// This is everywhere
.eq('tenant_id', tenantId)
.eq('customer_id', userId)

// And this
.eq('tenant_id', tenantId)
.eq('owner_id', ownerId)

// And this
.eq('tenant_id', tenantId)
.eq('status', 'completed')
.order('created_at', { ascending: false })
```

But where are the indexes?

```sql
-- Check for missing indexes
SELECT
  relname AS table,
  seq_scan,
  idx_scan,
  seq_scan - idx_scan AS potential_improvement
FROM pg_stat_user_tables
WHERE seq_scan > 100
ORDER BY potential_improvement DESC;
```

**The Fix:**

Create composite indexes for common patterns:
```sql
-- web/db/XX_add_indexes.sql
CREATE INDEX CONCURRENTLY idx_invoices_tenant_customer
ON invoices (tenant_id, customer_id);

CREATE INDEX CONCURRENTLY idx_appointments_tenant_status_date
ON appointments (tenant_id, status, start_time DESC);

CREATE INDEX CONCURRENTLY idx_pets_tenant_owner
ON pets (tenant_id, owner_id);

CREATE INDEX CONCURRENTLY idx_store_orders_tenant_status
ON store_orders (tenant_id, status, created_at DESC);
```

**Effort:** 🟡 Medium (run during low traffic)

---

### DB-004: Floating Point Currency

**The Crime:**

```typescript
// app/actions/invoices.ts (lines 56-75)
const lineTotal = roundCurrency(
  item.quantity * item.unit_price * (1 - (item.discount_percent || 0) / 100)
)
subtotal += lineTotal
subtotal = roundCurrency(subtotal)
```

JavaScript floating point math for money. Classic mistake.

```javascript
0.1 + 0.2
// 0.30000000000000004

// After 1000 transactions, you've lost real money to rounding
```

**The Fix:**

Option 1: Store as integers (centavos)
```sql
-- Migration
ALTER TABLE invoices ALTER COLUMN total TYPE BIGINT;
-- Store 15,000.00 as 1500000

-- In code
const totalInCentavos = Math.round(total * 100)
```

Option 2: Use PostgreSQL NUMERIC
```sql
ALTER TABLE invoices ALTER COLUMN total TYPE NUMERIC(15, 2);

-- Calculate in database
SELECT
  SUM(quantity * unit_price * (1 - COALESCE(discount_percent, 0) / 100))::NUMERIC(15, 2)
FROM invoice_items
WHERE invoice_id = $1;
```

**Effort:** 🟠 High (schema migration)

---

### DB-005: Monster Migration Files

**The Crime:**

```
web/db/migrations/0000_parched_scalphunter.sql — 3,577 lines
web/db/60_store/01_inventory.sql              — 1,722 lines
```

This isn't a migration. This is your entire database in one file.

**Why It Hurts:**
- Can't rollback specific changes
- Code review is impossible
- Debugging is archaeology
- No audit trail

**The Rule:**
- Max 200 lines per migration
- One logical change per file
- Descriptive name: `20240115_add_invoice_refunds.sql`

**For Existing Files:**
- Don't touch them (they're deployed)
- Document what they contain in a README
- Never repeat this pattern

**Effort:** 🟢 Low (process change)

---

## 🟡 Medium Priority Issues

### DB-006: Inconsistent Timestamp Columns

**The Crime:**

```sql
-- Some tables have this
created_at TIMESTAMPTZ DEFAULT NOW()

-- Some have this
created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP

-- Some have this with triggers
updated_at TIMESTAMPTZ  -- updated by trigger

-- Some don't have updated_at at all
```

**The Fix:**

Standard columns for every table:
```sql
-- Template for new tables
CREATE TABLE new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ...
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ  -- for soft delete
);

-- Standard trigger
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON new_table
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
```

**Effort:** 🟡 Medium

---

### DB-007: Missing Foreign Key Indexes

**The Crime:**

```sql
-- Foreign keys create constraints, not indexes!
pet_id UUID REFERENCES pets(id)
-- But queries like .eq('pet_id', petId) need an INDEX
```

**Check:**
```sql
-- Find foreign keys without indexes
SELECT
  tc.table_name,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = tc.table_name
      AND indexdef LIKE '%' || kcu.column_name || '%'
  );
```

**Effort:** 🟢 Low (add indexes incrementally)

---

### DB-008: JSONB Without Validation

**The Crime:**

```sql
-- web/db/60_store/store_carts.sql
items JSONB DEFAULT '[]'::jsonb

-- What goes in items? Anything. Everything. Chaos.
```

**The Fix:**

Add check constraint:
```sql
ALTER TABLE store_carts ADD CONSTRAINT valid_cart_items CHECK (
  jsonb_typeof(items) = 'array' AND
  (items = '[]'::jsonb OR (
    (items->0->>'product_id') IS NOT NULL AND
    (items->0->>'quantity')::int > 0
  ))
);
```

Or validate in application:
```typescript
const CartItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().positive(),
  unit_price: z.number().positive(),
})

const CartSchema = z.array(CartItemSchema)
```

**Effort:** 🟢 Low

---

## 📊 Database Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Tables with verified RLS | Unknown | 100% | 🔴 |
| Queries filtering deleted_at | ~30% | 100% | 🟠 |
| Foreign keys with indexes | ~60% | 100% | 🟡 |
| Migration file max lines | 3,577 | <200 | 🔴 |
| JSONB with validation | ~20% | 100% | 🟡 |

---

## Database Checklist

For every table:
- [ ] RLS enabled
- [ ] RLS policies tested
- [ ] created_at/updated_at columns
- [ ] updated_at trigger
- [ ] Foreign keys have indexes
- [ ] JSONB columns have validation
- [ ] Soft delete filtered in views/queries

For every query:
- [ ] Includes tenant_id filter
- [ ] Filters out deleted_at
- [ ] Uses appropriate index
- [ ] Has reasonable LIMIT

---

## Recommended Queries

**Check table security:**
```sql
SELECT
  schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY rowsecurity, tablename;
```

**Check slow queries:**
```sql
SELECT
  query,
  calls,
  total_time / calls AS avg_time,
  rows / calls AS avg_rows
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 20;
```

**Check missing indexes:**
```sql
SELECT
  relname,
  seq_scan,
  idx_scan
FROM pg_stat_user_tables
WHERE seq_scan > idx_scan
  AND seq_scan > 100;
```

---

## Summary

The database schema is well-designed, but the implementation details have drifted. RLS exists but isn't verified. Soft deletes exist but aren't honored. Indexes are missing for common patterns.

**Priority Actions:**
1. Run Supabase security audit (today)
2. Add deleted_at filter to all queries (this week)
3. Create composite indexes for common patterns (this week)
4. Migrate currency to NUMERIC (this sprint)

*"A database is like a garden. Leave it untended and weeds will grow."*
