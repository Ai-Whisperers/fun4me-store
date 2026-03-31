# 🌱 Seeding Roast

> *"Seed data is like a first date. It sets expectations that production will shatter."*

**Score: 7/10** — *"Infrastructure is solid, data quality is questionable"*

---

## Overview

You have a modern, variant-aware seeding system with TypeScript orchestration, JSON data files, and multi-tenant support. The architecture is impressive. The data inside it... could use some work.

---

## 🔴 Critical Issues

### SEED-001: No Foreign Key Validation

**The Crime:**

```json
// db/seeds/data/02-clinic/adris/appointments.json
{
  "appointments": [
    {
      "pet_id": "uuid-123",      // Does this pet exist?
      "vet_id": "uuid-vet-456",   // Does this vet exist?
      "owner_id": "uuid-789",     // Does this owner exist?
      "service_id": "uuid-svc"    // Does this service exist?
    }
  ]
}
```

There's no validation that these UUIDs reference actual records in other seed files.

**Why It Hurts:**
- Seeds can fail silently with FK constraint errors
- Broken references create broken demo data
- Debugging seed failures is painful

**The Fix:**

Add validation in orchestrator:
```typescript
// db/seeds/scripts/orchestrator.ts
async function validateReferences(data: SeedData): Promise<ValidationResult> {
  const errors: string[] = []

  // Check pet_id references
  for (const appointment of data.appointments) {
    if (!data.pets.find(p => p.id === appointment.pet_id)) {
      errors.push(`Appointment ${appointment.id} references non-existent pet ${appointment.pet_id}`)
    }
  }

  // Check vet_id references
  for (const appointment of data.appointments) {
    if (!data.profiles.find(p => p.id === appointment.vet_id && p.role === 'vet')) {
      errors.push(`Appointment ${appointment.id} references non-existent vet ${appointment.vet_id}`)
    }
  }

  return { valid: errors.length === 0, errors }
}
```

**Effort:** 🟡 Medium

---

### SEED-002: Password Hints in JSON

**The Crime:**

```json
// db/seeds/data/00-core/demo-accounts.json
{
  "demo_accounts": [
    {
      "email": "admin@adris.demo",
      "password_hint": "demo123",  // 🚨 SECURITY ISSUE
      "role": "admin"
    }
  ]
}
```

Password hints in seed files. In a git repository. That anyone can see.

**Why It Hurts:**
- Security anti-pattern
- If seed runs in production (it shouldn't, but...), known passwords
- Bad practice to demonstrate to new developers

**The Fix:**

```json
// Use environment variables for passwords
{
  "demo_accounts": [
    {
      "email": "admin@adris.demo",
      "password_env": "DEMO_ADMIN_PASSWORD",  // Read from env
      "role": "admin"
    }
  ]
}
```

```typescript
// In seeder
const password = process.env[account.password_env] || generateSecurePassword()
```

**Effort:** 🟢 Low

---

## 🟠 High Priority Issues

### SEED-003: Fixed Dates

**The Crime:**

```json
// db/seeds/data/02-clinic/adris/appointments.json
{
  "appointments": [
    {
      "start_time": "2024-12-20T09:00:00Z",
      "status": "scheduled"
    }
  ]
}
```

That date is in the past (or future, depending on when you read this). Your seed data ages like milk.

**Why It Hurts:**
- "Scheduled" appointments show as past dates
- "Recent" visits are months old
- Time-based business logic breaks
- Confusing demo experience

**The Fix:**

Use relative dates:
```typescript
// db/seeds/scripts/utils/dates.ts
export function relativeDays(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

// In seed data generator
const appointments = [
  {
    start_time: relativeDays(-7),   // Last week
    status: 'completed',
  },
  {
    start_time: relativeDays(3),    // In 3 days
    status: 'scheduled',
  },
  {
    start_time: relativeDays(0),    // Today
    status: 'confirmed',
  },
]
```

**Effort:** 🟡 Medium

---

### SEED-004: Product File Fragmentation

**The Crime:**

```
db/seeds/data/03-store/products/
├── products-dog-chow.json
├── products-excellent.json
├── products-pedigree.json
├── products-primocao.json
├── products-primogato.json
├── products-pro-plan.json
├── products-antiparasitarios-adris.json
├── products-arena-sandcat.json
├── products-belcan.json
├── products-belcats.json
├── products-bravo.json
├── products-collares-antiparasitarios.json
└── ... (12+ more files)
```

25+ files for products. Do you hate scrolling, or do you hate finding things?

**Why It Hurts:**
- Hard to understand total inventory
- No overview of all products
- Category relationships unclear
- Duplicate SKUs possible

**The Fix:**

Option 1: Single structured file
```json
// products.json
{
  "products": [
    {
      "brand": "Dog Chow",
      "category": "food/dry/dog",
      "items": [...]
    },
    {
      "brand": "Pro Plan",
      "category": "food/dry/dog",
      "items": [...]
    }
  ]
}
```

Option 2: One file per category (not brand)
```
products/
├── food-dog.json
├── food-cat.json
├── medicine.json
├── accessories.json
└── hygiene.json
```

**Effort:** 🟡 Medium

---

### SEED-005: Incomplete Cleanup Order

**The Crime:**

```typescript
// db/seeds/scripts/orchestrator.ts
const CLEANUP_ORDER = [
  'lab_result_comments',
  'lab_result_attachments',
  'lab_results',
  // ... 70 more tables
  'pets',
  'profiles',
]
// But you have 100+ tables...
```

The cleanup order is incomplete. Missing tables will cause FK constraint errors during cleanup.

**The Fix:**

Auto-generate cleanup order:
```sql
-- Get proper cleanup order from database
WITH RECURSIVE table_deps AS (
  SELECT
    tc.table_name,
    ccu.table_name AS references_table,
    1 as depth
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'

  UNION ALL

  SELECT
    tc.table_name,
    td.references_table,
    td.depth + 1
  FROM table_deps td
  JOIN information_schema.table_constraints tc
    ON td.table_name = tc.table_name
  WHERE td.depth < 20
)
SELECT DISTINCT table_name
FROM table_deps
ORDER BY depth DESC;
```

**Effort:** 🟡 Medium

---

## 🟡 Medium Priority Issues

### SEED-006: Missing Edge Case Data

**The Crime:**

All pets are "normal":
```json
{
  "pets": [
    { "name": "Fido", "weight": 25, "species": "dog" },
    { "name": "Whiskers", "weight": 4, "species": "cat" }
  ]
}
```

Where's the data for:
- 1kg chihuahua
- 80kg great dane
- Pet with special characters in name ("Ñoño")
- Pet with extremely long name
- Exotic species
- Multiple pets same owner same name

**Why It Hurts:**
- Edge cases never tested
- UI breaks on unusual data
- Validation gaps undiscovered

**The Fix:**

Add edge case fixtures:
```json
{
  "edge_case_pets": [
    { "name": "A", "weight": 0.5 },           // Minimum
    { "name": "Ñoño", "weight": 3 },          // Special chars
    { "name": "X".repeat(100), "weight": 80 }, // Maximum
    { "name": "Fido 🐕", "weight": 25 },       // Emoji
    { "name": "'; DROP TABLE pets;--", "weight": 5 }  // SQL injection test
  ]
}
```

**Effort:** 🟢 Low

---

### SEED-007: No Data Documentation

**The Crime:**

```
db/seeds/data/00-core/tenants.json
// What fields are required?
// What are valid values?
// What relationships exist?
// WHO KNOWS
```

No schema documentation for seed data.

**The Fix:**

Create data dictionary:
```markdown
# Seed Data Schema

## tenants.json
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | yes | Unique tenant slug |
| name | string | yes | Display name |
| settings.timezone | string | yes | IANA timezone |
| settings.currency | string | yes | ISO 4217 code |

## demo-accounts.json
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | yes | Must end with @tenant.demo |
| role | enum | yes | owner, vet, admin |
```

**Effort:** 🟢 Low

---

### SEED-008: No Seed Verification

**The Crime:**

After seeding, how do you know it worked?

```bash
npm run seed:demo
# ... lots of output ...
# "Done!" or "Failed" with cryptic error
```

No verification queries. No counts. No sanity checks.

**The Fix:**

Add verification step:
```typescript
// db/seeds/scripts/verify.ts
async function verifySeed(client: SupabaseClient): Promise<SeedReport> {
  const checks = [
    { table: 'tenants', expected: 2 },
    { table: 'profiles', expected: 6, where: "role IN ('vet', 'admin', 'owner')" },
    { table: 'pets', expected: 18 },
    { table: 'appointments', expected: 20 },
    { table: 'products', expected: 1000, tolerance: 0.1 },  // ±10%
  ]

  const results = await Promise.all(checks.map(async check => {
    const { count } = await client
      .from(check.table)
      .select('*', { count: 'exact', head: true })

    return {
      table: check.table,
      expected: check.expected,
      actual: count,
      pass: Math.abs(count - check.expected) / check.expected < (check.tolerance || 0)
    }
  }))

  return {
    success: results.every(r => r.pass),
    results
  }
}
```

**Effort:** 🟢 Low

---

## 📊 Seeding Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| FK validation | No | Yes | 🔴 |
| Relative dates | No | Yes | 🟠 |
| Edge case data | Minimal | Comprehensive | 🟡 |
| Data documentation | No | Yes | 🟡 |
| Seed verification | No | Yes | 🟡 |
| Password security | Hints in JSON | Env vars | 🔴 |

---

## Seed Command Reference

```bash
# Development
npm run seed:v2:demo              # Full demo with all data
npm run seed:v2:basic             # Just tenants + accounts
npm run seed:v2:integration       # For integration tests

# Testing
npm run seed:v2:dry-run           # Preview without changes
npm run seed:v2:verbose           # Debug output

# Maintenance
npm run seed:v2:reset             # Clear all + reseed
npm run seed:v2:adris             # Single tenant only
```

---

## Summary

The seeding infrastructure is genuinely impressive—variant support, TypeScript orchestration, multi-tenant awareness. But the data quality has drift issues: fixed dates that age poorly, fragmented product files, missing edge cases, and no validation of the relationships.

**Priority Actions:**
1. Move passwords to environment variables (today)
2. Add FK validation to orchestrator (this week)
3. Migrate to relative dates (this week)
4. Add seed verification step (this sprint)

*"Good seed data is like a good backstory. It makes everything that follows make sense."*
